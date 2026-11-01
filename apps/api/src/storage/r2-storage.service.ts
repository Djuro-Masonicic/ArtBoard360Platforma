import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BadRequestException, Injectable, InternalServerErrorException, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import sharp from "sharp";

import { createSlug } from "../common/utils/text";
import { env } from "../config/env";
import type { UploadEntityType } from "./storage.types";

interface UploadFileInput {
  visibility?: "private";
  recordId: string;
  entityType: UploadEntityType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  body: Buffer;
}

interface StoredObject {
  bucket: string;
  path: string;
  publicUrl: string;
}

/**
 * Cloudflare R2 exposes an S3-compatible API, so the AWS SDK gives us a very
 * readable integration without forcing application code to know storage details.
 *
 * The rest of the backend asks for simple operations such as "upload file" or
 * "delete file" and does not need to know anything about S3 commands.
 */
@Injectable()
export class R2StorageService {
  async readPromotionArtifact(id: string, key: string) {
    if (!key.startsWith(`promotions/${id}/`) || !env.r2PrivatePdfBucketName || env.r2PrivatePdfBucketName === env.r2BucketName) throw new BadRequestException("Fajl objave nije dostupan.");
    const object = await this.createClient().send(new GetObjectCommand({ Bucket: env.r2PrivatePdfBucketName, Key: key }), { abortSignal: AbortSignal.timeout(20000) });
    if (!object.Body || (object.ContentLength ?? 0) > 12 * 1024 * 1024) throw new BadRequestException();
    const parts: Buffer[] = []; let size = 0;
    for await (const p of object.Body as AsyncIterable<Uint8Array>) { size += p.length; if (size > 12 * 1024 * 1024) throw new BadRequestException(); parts.push(Buffer.from(p)); }
    return Buffer.concat(parts);
  }
  /** Only keys resolved from the authenticated QR export record reach here. */
  async readQrArtifact(exportId: string, storagePath: string) {
    if (!storagePath.startsWith(`qr-cards/${exportId}/`) || !env.r2PrivatePdfBucketName || env.r2PrivatePdfBucketName === env.r2BucketName) throw new BadRequestException("Nedostupan fajl vizit karte.");
    const object = await this.createClient().send(new GetObjectCommand({ Bucket: env.r2PrivatePdfBucketName, Key: storagePath }), { abortSignal: AbortSignal.timeout(20000) });
    if (!object.Body || (object.ContentLength ?? 0) > 12 * 1024 * 1024) throw new BadRequestException("Fajl nije dostupan.");
    const parts: Buffer[] = []; let size = 0;
    for await (const part of object.Body as AsyncIterable<Uint8Array>) { size += part.length; if (size > 12 * 1024 * 1024) throw new BadRequestException("Fajl je prevelik."); parts.push(Buffer.from(part)); }
    return Buffer.concat(parts);
  }

  /** Source URL comes from an owned Artist/Artwork, never from card JSON. */
  async readQrSourceImage(value: string, maxSide = 1500) {
    const url = new URL(value), base = new URL(env.r2PublicUrl.endsWith("/") ? env.r2PublicUrl : env.r2PublicUrl + "/");
    let body: Buffer;
    if (url.origin === base.origin && url.pathname.startsWith(base.pathname)) {
      const key = decodeURIComponent(url.pathname.slice(base.pathname.length));
      const object = await this.createClient().send(new GetObjectCommand({ Bucket: env.r2BucketName, Key: key }), { abortSignal: AbortSignal.timeout(15000) });
      if (!object.Body) throw new BadRequestException("Slika nije dostupna.");
      const parts: Buffer[] = []; let size = 0;
      for await (const part of object.Body as AsyncIterable<Uint8Array>) { size += part.length; if (size > env.maxUploadFileSizeBytes) throw new BadRequestException("Slika je prevelika."); parts.push(Buffer.from(part)); }
      body = Buffer.concat(parts);
    } else {
      const hosts = new Set(["cdn.prod.website-files.com", "uploads-ssl.webflow.com", "assets.website-files.com", "images.unsplash.com"]);
      if (url.protocol !== "https:" || url.port || url.username || url.password || !hosts.has(url.hostname)) throw new BadRequestException("Izvor slike nije podržan.");
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
      if (!response.ok || !response.body) throw new BadRequestException("Slika nije dostupna.");
      const reader = response.body.getReader(), parts: Buffer[] = []; let size = 0;
      try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > env.maxUploadFileSizeBytes) throw new BadRequestException("Slika je prevelika."); parts.push(Buffer.from(part.value)); } } finally { await reader.cancel(); }
      body = Buffer.concat(parts);
    }
    const normalized = await sharp(body, { limitInputPixels: 40000000 }).rotate().resize(maxSide,maxSide,{ fit:"inside",withoutEnlargement:true }).png().toBuffer();
    return `data:image/png;base64,${normalized.toString("base64")}`;
  }
  /** Independent portfolio object. Source is always resolved from an owned DB
   * record by the caller, never from an arbitrary request URL or storage key. */
  async clonePortfolioImage(input: { recordId: string; imageUrl: string; storagePath?: string | null;
    entityType: "portfolio-artwork" | "portfolio-profile" | "portfolio-cover" | "portfolio-collection-cover" | "artist-collection-cover" }) {
    const publicBase = new URL(env.r2PublicUrl.endsWith("/") ? env.r2PublicUrl : `${env.r2PublicUrl}/`);
    let url: URL;
    try { url = new URL(input.imageUrl); } catch { throw new BadRequestException("Izvorna slika nema ispravan URL."); }
    if (url.username || url.password) throw new BadRequestException("Izvorna slika nema ispravan URL.");
    const maxBytes = env.maxUploadFileSizeBytes;
    const chunks: Buffer[] = [];
    let total = 0;
    const append = (chunk: Uint8Array) => {
      total += chunk.byteLength;
      if (total > maxBytes) throw new BadRequestException("Izvorna slika prelazi dozvoljenu veličinu.");
      chunks.push(Buffer.from(chunk));
    };
    if (url.origin === publicBase.origin && url.pathname.startsWith(publicBase.pathname)) {
      const key = decodeURIComponent(url.pathname.slice(publicBase.pathname.length));
      if (!key || (input.storagePath && input.storagePath !== key)) throw new BadRequestException("Putanja izvorne slike nije dosljedna.");
      const object = await this.createClient().send(new GetObjectCommand({ Bucket: env.r2BucketName, Key: key }), { abortSignal: AbortSignal.timeout(20_000) });
      if (!object.Body || (object.ContentLength && object.ContentLength > maxBytes)) throw new BadRequestException("Izvorna slika nije dostupna u dozvoljenoj veličini.");
      for await (const chunk of object.Body as AsyncIterable<Uint8Array>) append(chunk);
    } else {
      // Historical Webflow originals are URL-only. Redirects are checked at
      // every hop; private hosts, arbitrary URLs and protocols are not fetched.
      const hosts = new Set(["cdn.prod.website-files.com", "uploads-ssl.webflow.com", "assets.website-files.com", "images.unsplash.com"]);
      let response: Response | undefined;
      for (let attempt = 0; attempt < 4; attempt++) {
        if (url.protocol !== "https:" || url.username || url.password || url.port || !hosts.has(url.hostname)) throw new BadRequestException("Izvor slike nije podržan za bezbjedno kopiranje.");
        response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20_000) });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location"); await response.body?.cancel();
          if (!location) throw new BadRequestException("Preusmjerenje slike nije ispravno.");
          url = new URL(location, url); continue;
        }
        break;
      }
      if (!response?.ok || !response.body || Number(response.headers.get("content-length") || 0) > maxBytes) throw new BadRequestException("Izvorna slika nije dostupna.");
      const reader = response.body.getReader();
      try { while (true) { const next = await reader.read(); if (next.done) break; append(next.value); } }
      finally { await reader.cancel(); }
    }
    const body = Buffer.concat(chunks);
    let format: string;
    try {
      const metadata = await sharp(body, { limitInputPixels: 40_000_000 }).metadata();
      if (!metadata.width || !metadata.height) throw Error("Invalid image");
      format = metadata.format === "heif" && metadata.compression === "av1" ? "avif" : metadata.format ?? "";
    } catch { throw new BadRequestException("Izvorna slika nije ispravna ili je prevelike rezolucije."); }
    const types: Record<string, [string, string]> = { jpeg: ["image/jpeg", "jpg"], png: ["image/png", "png"], webp: ["image/webp", "webp"], avif: ["image/avif", "avif"] };
    const type = types[format];
    if (!type) throw new BadRequestException("Format izvorne slike nije podržan.");
    return this.uploadFile({ recordId: input.recordId, entityType: input.entityType,
      fileName: `snapshot.${type[1]}`, mimeType: type[0], fileSizeBytes: body.length, body });
  }

  private readonly allowedImageMimeTypes = new Set([
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ]);
  private readonly allowedPdfMimeTypes = new Set(["application/pdf"]);

  private createClient() {
    return new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey,
      },
    });
  }

  /**
   * Validation is centralized so every upload path stays consistent.
   * Today we allow images only, but the structure is intentionally easy to
   * expand for video uploads later.
   */
  validateUpload(fileSizeBytes: number, mimeType: string, entityType: UploadEntityType) {
    if (entityType === "promotion-png" && mimeType !== "image/png") throw new BadRequestException("Neispravan format objave.");
    if (entityType === "qr-card-pdf" && mimeType !== "application/pdf" || entityType === "qr-card-png" && mimeType !== "image/png") throw new BadRequestException("Neispravan QR format.");
    if (
      entityType === "artwork" ||
      entityType === "artist-collection-cover" ||
      entityType === "profile" ||
      entityType === "portfolio-artwork" ||
      entityType === "portfolio-collection-cover" ||
      entityType === "portfolio-profile" ||
      entityType === "portfolio-cover" ||
      entityType === "submission-artwork" ||
      entityType === "submission-profile" ||
      entityType === "submission-cover" ||
      entityType === "opportunity-cover"
    ) {
      if (!this.allowedImageMimeTypes.has(mimeType)) {
        throw new BadRequestException(
          "Unsupported file type. Current uploads support jpeg, png, webp, and avif images.",
        );
      }
    }

    if (
      (entityType === "submission-portfolio-pdf" || entityType === "portfolio-pdf") &&
      !this.allowedPdfMimeTypes.has(mimeType)
    ) {
      throw new BadRequestException("Unsupported file type. Portfolio uploads must be PDF files.");
    }

    // Generated portfolio PDFs can legitimately be larger than a single image
    // because they may contain up to 30 works. User uploads still use the
    // stricter shared upload limit.
    const maxAllowedSize =
      entityType === "portfolio-pdf"
        ? Math.max(env.maxUploadFileSizeBytes, 50 * 1024 * 1024)
        : env.maxUploadFileSizeBytes;

    if (fileSizeBytes > maxAllowedSize) {
      throw new BadRequestException(
        `File is too large. Maximum size is ${maxAllowedSize} bytes.`,
      );
    }
  }

  /**
   * Stable path generation keeps files grouped by artist and media type.
   * That makes manual debugging, future cleanup jobs, and CDN path rules easier.
   */
  buildStoragePath(recordId: string, entityType: UploadEntityType, fileName: string) {
    if (entityType === "promotion-png") return `promotions/${recordId}/${randomUUID()}.png`;
    if (entityType === "qr-card-pdf" || entityType === "qr-card-png") return `qr-cards/${recordId}/${randomUUID()}${extname(fileName)}`;
    const extension = extname(fileName) || ".bin";
    const baseName = fileName.replace(extension, "");
    const safeBaseName = createSlug(baseName);
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const normalizedExtension = extension.toLowerCase();

    if (entityType === "artwork" || entityType === "profile") {
      return `artists/${recordId}/${entityType}/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
    }

    if (entityType === "artist-collection-cover") {
      return `artist-collections/${recordId}/cover/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
    }

    if (entityType === "submission-artwork") {
      return `artist-submissions/${recordId}/artworks/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
    }

    if (entityType === "submission-profile") {
      return `artist-submissions/${recordId}/profile/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
    }

    if (entityType === "portfolio-artwork") {
      return `portfolio-projects/${recordId}/artworks/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
    }

    if (entityType === "portfolio-profile") {
      return `portfolio-projects/${recordId}/profile/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
    }

    if (entityType === "portfolio-cover") {
      return `portfolio-projects/${recordId}/cover/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
    }

    if (entityType === "portfolio-collection-cover") {
      return `portfolio-projects/${recordId}/collection-cover/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
    }

    if (entityType === "portfolio-pdf") {
      return `portfolio-projects/${recordId}/pdf/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
    }

    if (entityType === "opportunity-cover") {
      return `opportunities/${recordId}/cover/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
    }

    return `artist-submissions/${recordId}/portfolio-pdf/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
  }

  getPublicUrl(path: string) {
    const trimmedBase = env.r2PublicUrl.replace(/\/+$/, "");
    const trimmedPath = path.replace(/^\/+/, "");
    return `${trimmedBase}/${trimmedPath}`;
  }

  async uploadFile(input: UploadFileInput): Promise<StoredObject> {
    this.validateUpload(input.fileSizeBytes, input.mimeType, input.entityType);
    const isPrivate = input.visibility === "private";
    if (isPrivate && !["portfolio-pdf", "qr-card-pdf", "qr-card-png", "promotion-png"].includes(input.entityType)) throw new BadRequestException("Unsupported private upload.");
    const bucket = isPrivate ? env.r2PrivatePdfBucketName : env.r2BucketName;
    if (!bucket || (isPrivate && bucket === env.r2BucketName)) throw new ServiceUnavailableException("Privatni PDF bucket mora biti podešen odvojeno od javnog storagea.");

    const path = this.buildStoragePath(input.recordId, input.entityType, input.fileName);
    const normalizedBody = Buffer.isBuffer(input.body) ? Buffer.from(input.body) : Buffer.from(input.body);

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await this.createClient().send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: path,
            Body: normalizedBody,
            ContentType: input.mimeType,
            ContentLength: input.fileSizeBytes,
          }),
        );

        return {
          bucket,
          path,
          publicUrl: isPrivate ? `r2-private:${path}` : this.getPublicUrl(path),
        };
      } catch (error) {
        console.error(
          `R2 upload failed for ${input.entityType} (${input.fileName}, ${input.mimeType}, ${input.fileSizeBytes} bytes) at path ${path} on attempt ${attempt}.`,
          error,
        );

        if (attempt === 2) {
          throw new InternalServerErrorException("The file could not be uploaded to object storage.");
        }

        await sleep(250);
      }
    }

    throw new InternalServerErrorException("The file could not be uploaded to object storage.");
  }

  async getOrCreatePurchasePdf(purchaseId: string, render: () => Promise<Buffer>, portfolioId = purchaseId) {
    if (!/^[a-f0-9-]{36}$/i.test(purchaseId)) throw new BadRequestException("Neispravna narudžbina.");
    if (!/^[a-f0-9-]{36}$/i.test(portfolioId)) throw new BadRequestException("Neispravan portfolio.");
    const path = `portfolio-projects/${portfolioId}/pdf/purchase-${purchaseId}.pdf`;
    if (!env.r2PrivatePdfBucketName || env.r2PrivatePdfBucketName === env.r2BucketName) throw new ServiceUnavailableException("Privatna PDF isporuka nije podešena.");
    try { return await this.readPortfolioPdf({ portfolioId, storagePath: path, privateObject: true }); }
    catch (error: any) { if (error?.name !== "NoSuchKey" && error?.$metadata?.httpStatusCode !== 404) throw error; }
    const buffer = await render();
    this.validateUpload(buffer.length, "application/pdf", "portfolio-pdf");
    await this.createClient().send(new PutObjectCommand({ Bucket: env.r2PrivatePdfBucketName, Key: path, Body: buffer, ContentType: "application/pdf", ContentLength: buffer.length }), { abortSignal: AbortSignal.timeout(20_000) });
    return buffer;
  }

  async readPortfolioPdf(input: { portfolioId: string; storagePath: string; privateObject: boolean }) {
    if (!input.storagePath.startsWith(`portfolio-projects/${input.portfolioId}/pdf/`) || input.storagePath.includes("..")) throw new BadRequestException("Neispravna putanja PDF verzije.");
    const bucket = input.privateObject ? env.r2PrivatePdfBucketName : env.r2BucketName;
    if (!bucket || (input.privateObject && bucket === env.r2BucketName)) throw new ServiceUnavailableException("Privatna PDF isporuka nije podešena.");
    const object = await this.createClient().send(new GetObjectCommand({ Bucket: bucket, Key: input.storagePath }), { abortSignal: AbortSignal.timeout(20_000) });
    if (!object.Body || (object.ContentLength ?? 0) > env.maxUploadFileSizeBytes) throw new ServiceUnavailableException("PDF nije dostupan u dozvoljenoj veličini.");
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
      size += chunk.byteLength;
      if (size > env.maxUploadFileSizeBytes) throw new ServiceUnavailableException("PDF prelazi dozvoljenu veličinu.");
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.subarray(0, 5).toString() !== "%PDF-") throw new ServiceUnavailableException("Storage objekat nije ispravan PDF.");
    return buffer;
  }

  /**
   * The older API offered signed uploads. We keep that capability so the route
   * remains available, even though the current frontend now prefers a backend-
   * managed upload flow.
   */
  async createSignedUpload(
    recordId: string,
    entityType: UploadEntityType,
    fileName: string,
    mimeType: string,
    fileSizeBytes: number,
  ) {
    this.validateUpload(fileSizeBytes, mimeType, entityType);

    const path = this.buildStoragePath(recordId, entityType, fileName);

    try {
      const signedUrl = await getSignedUrl(
        this.createClient(),
        new PutObjectCommand({
          Bucket: env.r2BucketName,
          Key: path,
          ContentType: mimeType,
        }),
        {
          expiresIn: env.maxSignedUploadExpirySeconds,
        },
      );

      return {
        bucket: env.r2BucketName,
        token: "",
        path,
        signedUrl,
        publicUrl: this.getPublicUrl(path),
      };
    } catch (error) {
      console.error("R2 presigned upload generation failed.", error);
      throw new InternalServerErrorException("Could not create a signed upload URL.");
    }
  }

  /**
   * Application workflows must not physically delete objects yet. References
   * exist in both storage-path and URL-only fields, and reference creation is
   * not coordinated with deletion. Even "check then delete" races with an
   * import or replacement. Retain ALL candidates, including failed-upload
   * cleanup and PDFs, until a separately approved collector can coordinate
   * every reference writer. This method does not enqueue a cleanup job.
   */
  async deleteFile(path: string) {
    console.warn("R2 physical deletion deferred; object retained for separately approved cleanup.", { path });
    return { deleted: false, deferred: true } as const;
  }
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
