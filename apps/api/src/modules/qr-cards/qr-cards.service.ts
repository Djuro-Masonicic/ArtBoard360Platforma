import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import QRCode from "qrcode";
import { isEmail } from "class-validator";
import { Prisma, type QrCardExport } from "@prisma/client";
import {
  hasNativeBleed,
  usesCover,
  type CardConfig,
} from "@artboard/qr-card-renderer";
import { PrismaService } from "../../prisma/prisma.service";
import { env } from "../../config/env";
import { qrEntitlement } from "./qr-card.access";
import { ExportCardDto, SaveCardDto } from "./qr-cards.dto";
import { QrCardGenerator } from "./qr-card.generator";
import { qrBundle } from "./qr-card.zip";
import { QrCardStorage } from "./qr-card.storage";
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const publicVersion = (r: QrCardExport) => ({
  id: r.id,
  versionNumber: r.versionNumber,
  status: r.status,
  kind: r.kind,
  config: (r.snapshot as unknown as { config: CardConfig }).config,
  createdAt: r.createdAt,
  completedAt: r.completedAt,
  errorCode: r.errorCode,
  downloadCount: r.downloadCount,
  lastDownloadedAt: r.lastDownloadedAt,
});
@Injectable()
export class QrCardsService {
  private running = 0;
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: QrCardStorage,
    private readonly generator: QrCardGenerator,
  ) {}
  private async source(owner: string) {
    const account = await this.prisma.artistAccount.findUnique({
      where: { id: owner },
      include: {
        artist: {
          include: {
            artworks: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] },
            socialLinks: true,
            approvedSubmission: { select: { phone: true } },
          },
        },
        subscription: true,
      },
    });
    if (!account?.isActive) throw new NotFoundException("Nalog nije dostupan.");
    const a = account.artist,
      base = new URL(env.siteBaseUrl);
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.username ||
      base.password
    )
      throw new ServiceUnavailableException("Javni domen nije podešen.");
    const profileUrl = new URL(`/umjetnik/${encodeURIComponent(a.slug)}`, base)
      .href;
    const choices = [
      ...(a.coverImageUrl
        ? [{ id: "cover", title: "Naslovna", url: a.coverImageUrl }]
        : []),
      ...a.artworks.map((w) => ({
        id: w.id,
        title: w.title || "Rad",
        url: w.imageUrl,
      })),
    ];
    return {
      account,
      profileUrl,
      publicAvailable: !a.isDraft && !a.isArchived,
      choices,
      avatar: a.profileImageUrl,
    };
  }
  private defaults(
    s: Awaited<ReturnType<QrCardsService["source"]>>,
  ): CardConfig {
    const a = s.account.artist,
      contacts = {
        email: a.email || "",
        phone: a.approvedSubmission?.phone || "",
        instagram:
          a.socialLinks.find((l) => l.platform === "INSTAGRAM")?.url || "",
        behance: a.socialLinks.find((l) => l.platform === "BEHANCE")?.url || "",
      };
    return {
      name: a.name,
      contacts,
      selectedContacts: (
        Object.keys(contacts) as CardConfig["selectedContacts"]
      )
        .filter((k) => Boolean(contacts[k]))
        .slice(0, 3),
      imageId: s.choices[0]?.id || "",
      templateId: "basic",
      variant: "standard",
      cardColor: "light",
      language: "ME",
      backTitle: "profile",
    };
  }
  private validate(
    c: CardConfig,
    s: Awaited<ReturnType<QrCardsService["source"]>>,
    final = false,
  ) {
    if (
      !c.name.trim() ||
      /[\p{Cc}]/u.test(c.name) ||
      Object.values(c.contacts).some((v) => /[\p{Cc}]/u.test(v))
    )
      throw new BadRequestException("Provjeri ime i kontakt podatke.");
    if (c.contacts.email && !isEmail(c.contacts.email))
      throw new BadRequestException("Email nije ispravan.");
    if (c.contacts.phone && !/^[+\d\s()./-]{3,40}$/.test(c.contacts.phone))
      throw new BadRequestException("Telefon nije ispravan.");
    for (const key of ["instagram", "behance"] as const)
      if (c.contacts[key]) {
        let u: URL;
        try {
          u = new URL(c.contacts[key]);
        } catch {
          throw new BadRequestException("Unesi punu HTTPS adresu kontakta.");
        }
        const host = key === "instagram" ? "instagram.com" : "behance.net";
        if (
          u.protocol !== "https:" ||
          u.username ||
          u.password ||
          u.port ||
          ![host, `www.${host}`].includes(u.hostname)
        )
          throw new BadRequestException("Provjeri adresu kontakta.");
      }
    // An old cover selection must not block templates which never read it.
    // Used covers still resolve exclusively from this authenticated source.
    if (
      usesCover(c.templateId) &&
      c.imageId &&
      !s.choices.some((i) => i.id === c.imageId)
    )
      throw new BadRequestException(
        "Izabrana slika više nije dostupna na tvom profilu.",
      );
    if (
      final &&
      (!s.publicAvailable ||
        !c.selectedContacts.length ||
        c.selectedContacts.some((k) => !c.contacts[k].trim()))
    )
      throw new BadRequestException(
        "Za izvoz su potrebni objavljen profil, ime i najmanje jedan uključen kontakt.",
      );
    return c;
  }
  private async access(
    owner: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const a = await tx.artistAccount.findUnique({
      where: { id: owner },
      include: { subscription: true },
    });
    if (!a?.isActive) throw new NotFoundException("Nalog nije dostupan.");
    await tx.qrCardExport.updateMany({
      where: {
        artistAccountId: owner,
        status: "PROCESSING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "FAILED", errorCode: "INTERRUPTED" },
    });
    return qrEntitlement(tx, owner, a.subscription);
  }
  async get(owner: string, page = 1) {
    const [s, draft, entitlement, items, total] = await Promise.all([
      this.source(owner),
      this.prisma.qrCardDraft.findUnique({ where: { artistAccountId: owner } }),
      this.access(owner),
      this.prisma.qrCardExport.findMany({
        where: { artistAccountId: owner },
        orderBy: { versionNumber: "desc" },
        skip: (page - 1) * 10,
        take: 10,
      }),
      this.prisma.qrCardExport.count({ where: { artistAccountId: owner } }),
    ]);
    return {
      artist: { name: s.account.artist.name, avatar: s.avatar },
      profileUrl: s.profileUrl,
      publicAvailable: s.publicAvailable,
      storageAvailable: this.storage.mode !== "UNAVAILABLE",
      choices: s.choices,
      theme: s.account.uiTheme,
      draft: draft
        ? {
            config: draft.config,
            revision: draft.revision,
            savedAt: draft.updatedAt,
          }
        : { config: this.defaults(s), revision: 0, savedAt: null },
      entitlement,
      history: {
        items: items.map(publicVersion),
        page,
        total,
        totalPages: Math.max(1, Math.ceil(total / 10)),
      },
      qrSvg: await QRCode.toString(s.profileUrl, {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 4,
      }),
    };
  }
  async save(owner: string, d: SaveCardDto) {
    const s = await this.source(owner);
    this.validate(d.config, s);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ArtistAccount" WHERE "id"=${owner}::uuid FOR UPDATE`;
      const old = await tx.qrCardDraft.findUnique({
        where: { artistAccountId: owner },
      });
      if ((old?.revision || 0) !== d.revision)
        throw new ConflictException(
          "Draft je promijenjen u drugom prozoru. Ponovo učitaj prije čuvanja.",
        );
      const row = await tx.qrCardDraft.upsert({
        where: { artistAccountId: owner },
        create: { artistAccountId: owner, config: json(d.config) },
        update: { config: json(d.config), revision: { increment: 1 } },
      });
      return {
        config: row.config,
        revision: row.revision,
        savedAt: row.updatedAt,
      };
    });
  }
  async export(owner: string, d: ExportCardDto) {
    if (this.storage.mode === "UNAVAILABLE")
      throw new ServiceUnavailableException(
        "Izvoz trenutno nije dostupan. Draft i ranije verzije ostaju sačuvani.",
      );
    const s = await this.source(owner),
      config = this.validate(d.config, s, true),
      snapshot = {
        config,
        profileUrl: s.profileUrl,
        avatar: s.avatar,
        cover: s.choices.find((i) => i.id === config.imageId)?.url || null,
        rendererVersion: hasNativeBleed(config.templateId) ? 2 : 1,
      },
      hash = createHash("sha256")
        .update(JSON.stringify(snapshot))
        .digest("hex");
    const reserved = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ArtistAccount" WHERE "id"=${owner}::uuid FOR UPDATE`;
      const rights = await this.access(owner, tx),
        old = await tx.qrCardExport.findUnique({
          where: {
            artistAccountId_operationKey: {
              artistAccountId: owner,
              operationKey: d.operationKey,
            },
          },
        });
      if (old) {
        if (old.contentHash !== hash)
          throw new ConflictException(
            "Isti zahtjev ne može imati drugačiji sadržaj.",
          );
        if (old.status !== "FAILED") return { row: old, work: false };
      }
      if (!rights.available)
        throw new ForbiddenException("Nova verzija zahtijeva aktivan Premium.");
      if (rights.processing)
        throw new ConflictException("Prethodna vizit karta se još priprema.");
      if (this.running >= 2)
        throw new ServiceUnavailableException(
          "Izvoz je zauzet. Pokušaj ponovo za trenutak.",
        );
      const data = {
        status: "PROCESSING",
        kind: rights.premium ? "PREMIUM" : "FREE",
        errorCode: null,
        expiresAt: new Date(Date.now() + 120000),
      };
      if (old)
        return {
          row: await tx.qrCardExport.update({ where: { id: old.id }, data }),
          work: true,
        };
      const max = await tx.qrCardExport.aggregate({
        where: { artistAccountId: owner },
        _max: { versionNumber: true },
      });
      return {
        row: await tx.qrCardExport.create({
          data: {
            ...data,
            artistAccountId: owner,
            operationKey: d.operationKey,
            versionNumber: (max._max.versionNumber || 0) + 1,
            snapshot: json(snapshot),
            contentHash: hash,
          },
        }),
        work: true,
      };
    });
    if (!reserved.work) return publicVersion(reserved.row);
    // Transactions on different accounts may finish at the same instant.
    // Acquire the process slot synchronously, after committing the reservation.
    if (this.running >= 2) {
      await this.prisma.qrCardExport.updateMany({
        where: {
          id: reserved.row.id,
          status: "PROCESSING",
          expiresAt: reserved.row.expiresAt,
        },
        data: { status: "FAILED", errorCode: "BUSY" },
      });
      return this.version(owner, reserved.row.id);
    }
    this.running++;
    try {
      const files = await this.generator.generate(snapshot),
        paths: Record<string, string> = {};
      for (const key of ["pdf", "front", "back"] as const)
        paths[key] = await this.storage.write(reserved.row.id, key, files[key]);
      const committed = await this.prisma.qrCardExport.updateMany({
        where: {
          id: reserved.row.id,
          status: "PROCESSING",
          expiresAt: { equals: reserved.row.expiresAt, gt: new Date() },
        },
        data: {
          status: "READY",
          completedAt: new Date(),
          pdfPath: paths.pdf,
          frontPath: paths.front,
          backPath: paths.back,
        },
      });
      if (!committed.count)
        await this.prisma.qrCardExport.updateMany({
          where: {
            id: reserved.row.id,
            status: "PROCESSING",
            expiresAt: reserved.row.expiresAt,
          },
          data: { status: "FAILED", errorCode: "INTERRUPTED" },
        });
    } catch {
      await this.prisma.qrCardExport.updateMany({
        where: {
          id: reserved.row.id,
          status: "PROCESSING",
          expiresAt: reserved.row.expiresAt,
        },
        data: { status: "FAILED", errorCode: "GENERATION_FAILED" },
      });
    } finally {
      this.running--;
    }
    return this.version(owner, reserved.row.id);
  }
  async version(owner: string, id: string) {
    await this.prisma.qrCardExport.updateMany({
      where: {
        id,
        artistAccountId: owner,
        status: "PROCESSING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "FAILED", errorCode: "INTERRUPTED" },
    });
    const row = await this.prisma.qrCardExport.findFirst({
      where: { id, artistAccountId: owner },
    });
    if (!row) throw new NotFoundException("Verzija nije dostupna.");
    return publicVersion(row);
  }
  async download(
    owner: string,
    id: string,
    format: "pdf" | "front" | "back" | "bundle",
  ) {
    const row = await this.prisma.qrCardExport.findFirst({
      where: { id, artistAccountId: owner, status: "READY" },
    });
    if (!row) throw new NotFoundException("Verzija nije dostupna.");
    if (format === "bundle") {
      const keys = [row.pdfPath, row.frontPath, row.backPath];
      if (keys.some((k) => !k)) throw new NotFoundException();
      const bodies = await Promise.all(
          keys.map((key) => this.storage.read(id, key!)),
        ),
        base = `ArtBoard-vizit-karta-v${row.versionNumber}`;
      const body = qrBundle(
        bodies.map((body, i) => ({
          name: `${base}-${["print.pdf", "prednja.png", "zadnja.png"][i]}`,
          body,
        })),
      );
      await this.prisma.qrCardExport.update({
        where: { id },
        data: { downloadCount: { increment: 1 }, lastDownloadedAt: new Date() },
      });
      return { body, name: `${base}.zip`, mime: "application/zip" };
    }
    const key =
      format === "pdf"
        ? row.pdfPath
        : format === "front"
          ? row.frontPath
          : row.backPath;
    if (!key) throw new NotFoundException();
    const body = await this.storage.read(id, key);
    await this.prisma.qrCardExport.update({
      where: { id },
      data: { downloadCount: { increment: 1 }, lastDownloadedAt: new Date() },
    });
    return {
      body,
      name: `ArtBoard-vizit-karta-v${row.versionNumber}-${format}.${format === "pdf" ? "pdf" : "png"}`,
      mime: format === "pdf" ? "application/pdf" : "image/png",
    };
  }
}
