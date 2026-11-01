import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID, createHash } from "node:crypto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PrismaService } from "../../prisma/prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import { env } from "../../config/env";
import { PortfolioCollectionsService } from "./portfolio-collections.service";
import { PortfolioProjectsService } from "./portfolio-projects.service";
import { PortfolioGuestService } from "./portfolio-guest.service";
import { UpdatePortfolioArtworkDto, UpdatePortfolioProjectDto } from "./portfolio-projects.dto";
import { contentHash } from "./portfolio-commerce.service";
import { buildPortfolioDocumentPlan, parseDocumentSelection, parseMinimalDesign, parsePortfolioCv } from "@artboard/portfolio-document-plan";
import { generatePortfolioPdf } from "./portfolio-pdf.generator";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const json = (value: unknown) => JSON.parse(JSON.stringify(value));
function object(value: any, keys: string[]) { if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new BadRequestException("Nepoznata polja dokumenta."); }
const identity = (value: any) => { if (typeof value !== "string" || !uuid.test(value)) throw new BadRequestException("Neispravan identifikator dokumenta."); return value; };
const text = (value: any, max: number) => { if (value == null) return null; if (typeof value !== "string" || value.length > max) throw new BadRequestException("Neispravan tekst dokumenta."); return value.trim(); };
const flag = (value: any, fallback: boolean) => { if (value === undefined) return fallback; if (typeof value !== "boolean") throw new BadRequestException("Neispravan izbor."); return value; };
const order = (value: any, fallback: number) => { if (value === undefined) return fallback; if (!Number.isInteger(value) || value < 0 || value > 1000) throw new BadRequestException("Neispravan redosljed."); return value; };

@Injectable()
export class PortfolioEditorService {
  constructor(private readonly prisma: PrismaService, private readonly collections: PortfolioCollectionsService,
    private readonly projects: PortfolioProjectsService, private readonly guest: PortfolioGuestService, private readonly storage: R2StorageService) {}

  async seed(owner: string) {
    const s = await this.collections.captureSource(owner);
    if (s.artworks.length > 30) throw new BadRequestException("Profil ima više od 30 radova. Za ovaj portfolio odaberi najviše 30 radova.");
    const id = `profile-memory:${randomUUID()}`, now = new Date(), ids = new Map(s.collections.map(c => [c.id, randomUUID()]));
    const project: any = { ...s.profile, id, artistAccountId: owner, sourceArtistId: s.artistId, source: "ARTBOARD_PROFILE", status: "DRAFT", paymentStatus: "REQUIRED",
      title: `${s.profile.artistName} Portfolio`, artboardProfileUrl: `${env.siteBaseUrl}/artists/${s.account.artist.slug}`,
      template: "INSTITUTIONAL_MINIMAL", language: "ME", pageFormat: "A4", fontStyle: "SANS", includeBranding: true, includePrices: false, includeCv: false,
      dateOfBirth: s.profile.dateOfBirth ? new Date(s.profile.dateOfBirth) : null, createdAt: now, updatedAt: now, revision: 0, collectionSchemaVersion: 2,
      includeUncollectedArtworks: true, designConfig: null, cvSections: null, versions: [], payments: [], latestPdfUrl: null, latestPdfStoragePath: null, publicShareToken: null,
      artistAccount: { id: owner, email: s.account.email, subscription: s.account.subscription }, sourceArtist: { id: s.artistId, name: s.profile.artistName, slug: s.account.artist.slug },
      collections: s.collections.map(c => ({ id: ids.get(c.id), portfolioId: id, sourceCollectionId: c.id, title: c.title, description: c.description, year: c.year, coverImageUrl: c.coverImageUrl, orderIndex: c.orderIndex, isIncluded: true })),
      artworks: s.artworks.map((w, i) => ({ id: randomUUID(), portfolioId: id, sourceArtworkId: w.id, title: w.title, description: w.description, imageUrl: w.imageUrl,
        portfolioCollectionId: w.artistCollectionId ? ids.get(w.artistCollectionId) : null, collectionOrderIndex: w.collectionOrderIndex ?? i, orderIndex: i, isSelected: i < 10, availability: "UNKNOWN", createdAt: now, updatedAt: now })) };
    return { project: await this.projects.serialize(project), sourceVersion: s.version,
      catalog: { version: s.version, artworks: s.artworks, collections: s.collections } };
  }

  private input(document: string) {
    if (typeof document !== "string" || document.length > 128_000) throw new BadRequestException("Dokument je prevelik.");
    let raw: any; try { raw = JSON.parse(document); } catch { throw new BadRequestException("Neispravan dokument."); }
    object(raw, ["project", "artworks", "collections", "includeUncollectedArtworks", "sourceVersion", "baseProjectId", "saveKey"]);
    if (!Array.isArray(raw.artworks) || raw.artworks.length > 30 || !Array.isArray(raw.collections) || raw.collections.length > 100) throw new BadRequestException("Previše radova ili kolekcija.");
    return raw;
  }
  private async prepare(owner: string, raw: any, files: Express.Multer.File[]) {
    const source = raw.baseProjectId ? null : await this.collections.captureSource(owner);
    const base: any = raw.baseProjectId ? await this.collections.owned(owner, identity(raw.baseProjectId)) : null;
    if (source && raw.sourceVersion !== source.version) throw new ConflictException("Izvorni profil je promijenjen. Podaci u editoru nijesu obrisani; ponovo otvori novi portfolio kada sačuvaš svoj unos.");
    const allowed = new Map<string, string | null>();
    const remember = (url: string | null | undefined, path: string | null = null) => { if (url) allowed.set(url, path); };
    const origin: any = source?.profile ?? base;
    remember(origin.profileImageUrl, base?.profileImageStoragePath); remember(origin.coverImageUrl, base?.coverImageStoragePath); remember(base?.collectionCoverUrl, base?.collectionCoverStoragePath);
    for (const w of source?.artworks ?? base.artworks) remember(w.imageUrl, w.storagePath);
    for (const c of source?.collections ?? base.collections) remember(c.coverImageUrl, c.coverImageStoragePath);
    const uploads = await this.guest.normalizeImages(files, 64, 20 * 1024 * 1024);
    const image = (value: any) => { if (!value) return null; if (typeof value !== "string") throw new BadRequestException("Neispravna slika."); if (uploads.has(value)) return uploads.get(value)!; if (allowed.has(value)) return value; throw new BadRequestException("Slika ne pripada ovom nalogu ili dokumentu."); };
    if (!raw.project || typeof raw.project !== "object" || Array.isArray(raw.project)) throw new BadRequestException("Podaci portfolija nijesu ispravni.");
    const dto = plainToInstance(UpdatePortfolioProjectDto, raw.project);
    if ((await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).length || !dto.artistName?.trim()) throw new BadRequestException("Podaci portfolija nijesu ispravni.");
    if (dto.designConfig && dto.designConfig.mode !== "PRESET") throw new BadRequestException("Izaberi jedan PDF stil.");
    if (dto.designConfig) object(dto.designConfig, ["mode", "minimal", "documentSelection"]);
    const template = dto.template ?? "INSTITUTIONAL_MINIMAL";
    const config: any = { mode: "PRESET",
      pages: Object.fromEntries(["cover", "profile", "collection", "artwork", "contact"].map(key => [key, template])),
      footer: template === "ARTBOARD_EDITORIAL" ? "ARTBOARD" : template === "SALES_PRO" ? "SALES" : "MINIMAL" };
    try { if (dto.designConfig?.minimal) config.minimal = parseMinimalDesign(dto.designConfig.minimal); if (dto.cvSections) dto.cvSections = parsePortfolioCv(dto.cvSections) as any;
      if (dto.documentSelection) config.documentSelection = parseDocumentSelection(dto.documentSelection);
      else if (dto.designConfig && "documentSelection" in dto.designConfig) config.documentSelection = parseDocumentSelection((dto.designConfig as any).documentSelection);
    } catch { throw new BadRequestException("CV ili PDF podešavanja nijesu ispravni."); }
    const now = new Date(), p: any = { ...dto, id: "transient-document", source: "ARTBOARD_PROFILE", artistAccountId: owner,
      sourceArtistId: source?.artistId ?? base.sourceArtistId, artboardProfileUrl: source ? `${env.siteBaseUrl}/artists/${source.account.artist.slug}` : base.artboardProfileUrl,
      template: dto.template ?? "INSTITUTIONAL_MINIMAL", pageFormat: dto.pageFormat ?? "A4", language: dto.language ?? "ME", fontStyle: dto.fontStyle ?? "SANS",
      includeBranding: dto.includeBranding ?? true, includeCv: dto.includeCv ?? false, includePrices: dto.includePrices ?? false,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null, designConfig: config, collectionSchemaVersion: 2, revision: 0,
      profileImageUrl: image(dto.profileImageUrl), coverImageUrl: image(dto.coverImageUrl), collectionCoverUrl: image(dto.collectionCoverUrl),
      includeUncollectedArtworks: flag(raw.includeUncollectedArtworks, true), createdAt: base?.createdAt ?? now, updatedAt: now, artworks: [], collections: [] };
    const collectionIds = new Set<string>(), workIds = new Set<string>();
    const collectionSources = new Set<string>(), workSources = new Set<string>();
    for (const c of raw.collections) {
      object(c, ["id", "sourceCollectionId", "title", "description", "year", "coverImageUrl", "orderIndex", "isIncluded"]);
      const id = identity(c.id); if (collectionIds.has(id)) throw new BadRequestException("Dupla kolekcija."); collectionIds.add(id);
      if (c.sourceCollectionId) {
        if (collectionSources.has(c.sourceCollectionId)) throw new BadRequestException("Dupla izvorna kolekcija.");
        collectionSources.add(c.sourceCollectionId);
      }
      if (c.sourceCollectionId && !(source?.collections ?? base.collections).some((row: any) => (source ? row.id : row.sourceCollectionId) === c.sourceCollectionId)) throw new BadRequestException("Tuđa izvorna kolekcija.");
      const title = text(c.title, 160); if (!title) throw new BadRequestException("Naziv kolekcije je obavezan.");
      p.collections.push({ id, sourceCollectionId: c.sourceCollectionId || null, title, description: text(c.description, 4000), year: text(c.year, 40), coverImageUrl: image(c.coverImageUrl), orderIndex: order(c.orderIndex, p.collections.length), isIncluded: flag(c.isIncluded, true) });
    }
    for (const row of raw.artworks) {
      object(row, ["id", "sourceArtworkId", "portfolioCollectionId", "collectionOrderIndex", "imageUrl", "title", "collectionName", "year", "technique", "dimensions", "description", "price", "availability", "isSelected", "orderIndex"]);
      const { id: rawId, sourceArtworkId, portfolioCollectionId, collectionOrderIndex, imageUrl, ...metadata } = row;
      const id = identity(rawId); if (workIds.has(id)) throw new BadRequestException("Dupli rad."); workIds.add(id);
      if (sourceArtworkId) {
        if (workSources.has(sourceArtworkId)) throw new BadRequestException("Dupli izvorni rad.");
        workSources.add(sourceArtworkId);
      }
      if (sourceArtworkId && !(source?.artworks ?? base.artworks).some((w: any) => (source ? w.id : w.sourceArtworkId) === sourceArtworkId)) throw new BadRequestException("Tuđi izvorni rad.");
      const w = plainToInstance(UpdatePortfolioArtworkDto, metadata);
      if ((await validate(w, { whitelist: true, forbidNonWhitelisted: true })).length || (portfolioCollectionId && !collectionIds.has(portfolioCollectionId))) throw new BadRequestException("Neispravni podaci rada.");
      const url = image(imageUrl); if (!url) throw new BadRequestException("Rad mora imati sliku.");
      p.artworks.push({ ...w, id, sourceArtworkId: sourceArtworkId || null, portfolioCollectionId: portfolioCollectionId || null, collectionOrderIndex: order(collectionOrderIndex, p.artworks.length), imageUrl: url, orderIndex: w.orderIndex ?? p.artworks.length, isSelected: w.isSelected ?? true, availability: w.availability ?? "UNKNOWN" });
    }
    return { project: p, source, allowed };
  }
  async render(owner: string, document: string, files: Express.Multer.File[], clean = false) {
    if (clean && env.nodeEnv !== "development") throw new NotFoundException();
    const { project } = await this.prepare(owner, this.input(document), files);
    if (!buildPortfolioDocumentPlan(project).pages.length) throw new BadRequestException("Izaberi sadržaj PDF-a.");
    let count = 0; const buffer = await generatePortfolioPdf(project, { watermark: !clean, onPageCount: n => { count = n; } }); return { buffer, count };
  }
  async save(owner: string, document: string, files: Express.Multer.File[]) {
    const raw = this.input(document), id = identity(raw.saveKey);
    if (raw.baseProjectId) throw new BadRequestException("Sačuvani portfolio uređuje se postojećom rutom.");
    const hash = contentHash({ raw, files: files.map(f => createHash("sha256").update(f.buffer).digest("hex")) });
    const retry = async (tx: any) => {
      const old = await tx.portfolioProject.findUnique({ where: { id } });
      if (!old) return false;
      if (old.artistAccountId !== owner || old.sourceProfileBaseline?.initialSaveHash !== hash) throw new ConflictException("Zahtjev za čuvanje je već iskorišćen.");
      return true;
    };
    if (await retry(this.prisma)) return this.projects.getForArtist(owner, id);
    const { project: p, source: s, allowed } = await this.prepare(owner, raw, files); if (!s) throw new BadRequestException();
    const cache = new Map<string, any>();
    const copy = async (url: string | null, entityType: any) => {
      if (!url) return null; if (cache.has(url)) return cache.get(url);
      const task = url.startsWith("data:image/jpeg;base64,") ? (() => { const body = Buffer.from(url.split(",")[1]!, "base64"); return this.storage.uploadFile({ recordId: id, entityType, fileName: "portfolio.jpg", mimeType: "image/jpeg", fileSizeBytes: body.length, body }); })()
        : this.storage.clonePortfolioImage({ recordId: id, entityType, imageUrl: url, storagePath: allowed.get(url) });
      cache.set(url, task); return task;
    };
    const profile = await copy(p.profileImageUrl, "portfolio-profile"), cover = await copy(p.coverImageUrl, "portfolio-cover"), legacyCover = await copy(p.collectionCoverUrl, "portfolio-collection-cover");
    const collectionIds = new Map(p.collections.map((c: any) => [c.id, randomUUID()]));
    const cs: any[] = []; for (const c of p.collections) { const image = await copy(c.coverImageUrl, "portfolio-collection-cover"), original = s.collections.find(x => x.id === c.sourceCollectionId); cs.push({ ...c, id: collectionIds.get(c.id), coverImageUrl: image?.publicUrl ?? null, coverImageStoragePath: image?.path ?? null, sourceBaseline: original ? json({ ...original, copiedImageUrl: image?.publicUrl ?? null, copiedImageSourceUrl: original.coverImageUrl }) : undefined }); }
    const ws: any[] = []; for (const w of p.artworks) { const image = await copy(w.imageUrl, "portfolio-artwork"), original = s.artworks.find(x => x.id === w.sourceArtworkId); const { expectedRevision, ...data } = w; ws.push({ ...data, id: randomUUID(), portfolioCollectionId: w.portfolioCollectionId ? collectionIds.get(w.portfolioCollectionId) : null, imageUrl: image.publicUrl, storagePath: image.path, sourceBaseline: original ? json({ ...original, copiedImageUrl: image.publicUrl, copiedImageSourceUrl: original.imageUrl }) : undefined }); }
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`portfolio-first-save:${id}`},0))`;
      if (await retry(tx)) return;
      await tx.$queryRaw`SELECT id FROM "Artist" WHERE id=${s.artistId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "ArtistCollection" WHERE "artistId"=${s.artistId}::uuid ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Artwork" WHERE "artistId"=${s.artistId}::uuid ORDER BY id FOR UPDATE`;
      if ((await this.collections.captureSource(owner, tx)).version !== s.version) throw new ConflictException("Profil je promijenjen tokom čuvanja. Portfolio nije djelimično sačuvan.");
      const { artworks, collections, documentSelection, expectedRevision, revision, createdAt, updatedAt, ...metadata } = p;
      await tx.portfolioProject.create({ data: { ...metadata, id, artistAccountId: owner, sourceArtistId: s.artistId, source: "ARTBOARD_PROFILE", status: "DRAFT", paymentStatus: "REQUIRED",
        profileImageUrl: profile?.publicUrl ?? null, profileImageStoragePath: profile?.path ?? null, coverImageUrl: cover?.publicUrl ?? null, coverImageStoragePath: cover?.path ?? null,
        collectionCoverUrl: legacyCover?.publicUrl ?? null, collectionCoverStoragePath: legacyCover?.path ?? null,
        sourceProfileBaseline: json({ version: 1, artist: s.profile, artworkIds: s.artworks.map(w => w.id), collectionIds: s.collections.map(c => c.id), initialSaveHash: hash, copiedImages: { profileImageUrl: { url: profile?.publicUrl ?? null, source: s.profile.profileImageUrl }, coverImageUrl: { url: cover?.publicUrl ?? null, source: s.profile.coverImageUrl } } }) } });
      for (const c of cs) await tx.portfolioCollection.create({ data: { ...c, portfolioId: id } as any });
      for (const w of ws) await tx.portfolioArtwork.create({ data: { ...w, portfolioId: id } as any });
    }, { timeout: 20000 });
    return this.projects.getForArtist(owner, id);
  }
}
