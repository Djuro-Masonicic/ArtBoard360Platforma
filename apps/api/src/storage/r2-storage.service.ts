import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { createSlug } from "../common/utils/text";
import { env } from "../config/env";
import type { UploadEntityType } from "./storage.types";

interface UploadFileInput {
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
  private readonly allowedImageMimeTypes = new Set([
    "image/jpeg",
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
    if (
      entityType === "artwork" ||
      entityType === "profile" ||
      entityType === "portfolio-artwork" ||
      entityType === "portfolio-collection-cover" ||
      entityType === "portfolio-profile" ||
      entityType === "submission-artwork" ||
      entityType === "submission-profile"
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

    if (entityType === "portfolio-collection-cover") {
      return `portfolio-projects/${recordId}/collection-cover/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
    }

    if (entityType === "portfolio-pdf") {
      return `portfolio-projects/${recordId}/pdf/${year}/${month}/${safeBaseName}-${randomUUID()}${normalizedExtension}`;
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

    const path = this.buildStoragePath(input.recordId, input.entityType, input.fileName);
    const normalizedBody = Buffer.isBuffer(input.body) ? Buffer.from(input.body) : Buffer.from(input.body);

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await this.createClient().send(
          new PutObjectCommand({
            Bucket: env.r2BucketName,
            Key: path,
            Body: normalizedBody,
            ContentType: input.mimeType,
            ContentLength: input.fileSizeBytes,
          }),
        );

        return {
          bucket: env.r2BucketName,
          path,
          publicUrl: this.getPublicUrl(path),
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
   * Delete support is included now so later replacement and cleanup flows can
   * reuse the same readable storage abstraction.
   */
  async deleteFile(path: string) {
    try {
      await this.createClient().send(
        new DeleteObjectCommand({
          Bucket: env.r2BucketName,
          Key: path,
        }),
      );
    } catch (error) {
      console.error("R2 delete failed.", error);
      throw new InternalServerErrorException("The file could not be deleted from object storage.");
    }
  }
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
