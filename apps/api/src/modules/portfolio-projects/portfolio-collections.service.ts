import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { hasPremiumAccess } from "../artist-subscriptions/subscription-access";
import { createHash, randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { PrismaService } from "../../prisma/prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import { PortfolioCollectionCommandDto } from "./portfolio-collections.dto";
import sharp from "sharp";

const projectInclude = { artworks: { orderBy: [{ orderIndex: "asc" as const }, { id: "asc" as const }] }, collections: { orderBy: [{ orderIndex: "asc" as const }, { id: "asc" as const }] } } satisfies Prisma.PortfolioProjectInclude;
type Project = Prisma.PortfolioProjectGetPayload<{ include: typeof projectInclude }>;
type Tx = Prisma.TransactionClient;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const object = (value: Prisma.JsonValue | null | undefined): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};

@Injectable()
export class PortfolioCollectionsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: R2StorageService) {}

  async owned(accountId: string, id: string, tx: Tx | PrismaService = this.prisma): Promise<Project> {
    if (tx === this.prisma) return this.prisma.$transaction(inner => this.owned(accountId, id, inner), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    const p = await tx.portfolioProject.findFirst({ where: { id, artistAccountId: accountId }, include: projectInclude });
    if (!p) throw new NotFoundException("Portfolio nije pronađen.");
    return p;
  }

  private async source(accountId: string, tx: Tx | PrismaService = this.prisma) {
    const account = await tx.artistAccount.findUnique({ where: { id: accountId }, include: { subscription: true,
      artist: { include: { artworks: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] }, collections: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] },
        socialLinks: { orderBy: { id: "asc" } }, disciplines: { include: { discipline: true }, orderBy: { disciplineId: "asc" } } } } } });
    if (!account?.isActive || !account.artist) throw new NotFoundException("Profil nije pronađen.");
    const artist = account.artist;
    const profile = { artistName: artist.name, biography: artist.bio, artistStatement: artist.artistStatement, motto: artist.quote,
      email: artist.email ?? account.email, dateOfBirth: artist.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      discipline: artist.disciplines.map(x => x.discipline.name).join(", ") || null,
      behanceUrl: artist.socialLinks.find(x => x.platform === "BEHANCE")?.url ?? null,
      websiteUrl: artist.socialLinks.find(x => x.platform === "PERSONAL_WEBSITE")?.url ?? null,
      instagramUrl: artist.socialLinks.find(x => x.platform === "INSTAGRAM")?.url ?? null,
      profileImageUrl: artist.profileImageUrl ?? artist.profileThumbnailUrl,
      coverImageUrl: artist.coverImageUrl ?? artist.artworks.find(w => w.isFeatured)?.imageUrl ?? artist.artworks[0]?.imageUrl ?? artist.thumbnailUrl };
    const artworks = artist.artworks.map(w => ({ id: w.id, title: w.title, description: w.description, imageUrl: w.imageUrl,
      storagePath: w.storagePath, artistCollectionId: w.artistCollectionId, collectionOrderIndex: w.collectionOrderIndex, orderIndex: w.orderIndex, updatedAt: w.updatedAt }));
    const collections = artist.collections.map(c => ({ id: c.id, title: c.title, description: c.description, year: c.year,
      coverImageUrl: c.coverImageUrl, coverImageStoragePath: c.coverImageStoragePath, orderIndex: c.orderIndex, updatedAt: c.updatedAt,
      members: artworks.filter(w => w.artistCollectionId === c.id).sort((a, b) => (a.collectionOrderIndex ?? a.orderIndex) - (b.collectionOrderIndex ?? b.orderIndex)).map(w => w.id) }));
    return { account, artistId: artist.id, profile, artworks, collections, version: digest({ profile, artworks, collections }) };
  }

  captureSource(accountId: string, tx?: Tx) {
    if (tx) return this.source(accountId, tx);
    return this.prisma.$transaction(tx => this.source(accountId, tx), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private baseline(source: Awaited<ReturnType<PortfolioCollectionsService["source"]>>, unknownHistory = false) {
    return json({ version: 1, artist: source.profile, artworkIds: source.artworks.map(w => w.id), collectionIds: source.collections.map(c => c.id), historyUnknown: unknownHistory });
  }

  private copier(portfolioId: string) {
    const cache = new Map<string, Promise<{ path: string; publicUrl: string }>>();
    return async (imageUrl: string | null | undefined, storagePath?: string | null,
      entityType: "portfolio-artwork" | "portfolio-profile" | "portfolio-cover" | "portfolio-collection-cover" = "portfolio-artwork") => {
      if (!imageUrl) return null;
      let result = cache.get(imageUrl);
      if (!result) { result = this.storage.clonePortfolioImage({ recordId: portfolioId, imageUrl, storagePath, entityType }); cache.set(imageUrl, result); }
      return result;
    };
  }

  async createFromProfile(accountId: string) {
    const source = await this.captureSource(accountId);
    if (source.artworks.length > 30) throw new BadRequestException("Profil ima više od 30 radova. Za ovaj portfolio odaberi najviše 30 radova.");
    const id = randomUUID(), copy = this.copier(id);
    const collectionIds = new Map(source.collections.map(c => [c.id, randomUUID()]));
    const works: Array<Omit<Prisma.PortfolioArtworkCreateManyInput, "portfolioId">> = [];
    for (const [index, w] of source.artworks.entries()) {
      const image = await copy(w.imageUrl, w.storagePath);
      if (!image) throw new BadRequestException("Slika rada nije dostupna.");
      works.push({ sourceArtworkId: w.id, portfolioCollectionId: w.artistCollectionId ? collectionIds.get(w.artistCollectionId) : null,
        imageUrl: image.publicUrl, storagePath: image.path, title: w.title, description: w.description,
        orderIndex: index, collectionOrderIndex: w.collectionOrderIndex ?? index, isSelected: index < 10,
        sourceBaseline: json({ ...w, copiedImageUrl: image.publicUrl, copiedImageSourceUrl: w.imageUrl }) });
    }
    const collections: Array<Omit<Prisma.PortfolioCollectionCreateManyInput, "portfolioId">> = [];
    for (const c of source.collections) {
      const cover = await copy(c.coverImageUrl, c.coverImageStoragePath, "portfolio-collection-cover");
      collections.push({ id: collectionIds.get(c.id)!, sourceCollectionId: c.id, title: c.title, description: c.description, year: c.year,
        coverImageUrl: cover?.publicUrl, coverImageStoragePath: cover?.path, orderIndex: c.orderIndex,
        sourceBaseline: json({ ...c, copiedImageUrl: cover?.publicUrl ?? null, copiedImageSourceUrl: c.coverImageUrl }) });
    }
    const avatar = await copy(source.profile.profileImageUrl, null, "portfolio-profile");
    const cover = await copy(source.profile.coverImageUrl, null, "portfolio-cover");
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Artist" WHERE id=${source.artistId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "ArtistCollection" WHERE "artistId"=${source.artistId}::uuid ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Artwork" WHERE "artistId"=${source.artistId}::uuid ORDER BY id FOR UPDATE`;
      if ((await this.source(accountId, tx)).version !== source.version) throw new ConflictException("Profil je promijenjen tokom kopiranja. Ponovo kreiraj portfolio.");
      await tx.portfolioProject.create({ data: { id, artistAccountId: accountId, sourceArtistId: source.artistId,
        source: "ARTBOARD_PROFILE", title: `${source.profile.artistName} Portfolio`, ...source.profile,
        dateOfBirth: source.profile.dateOfBirth ? new Date(`${source.profile.dateOfBirth}T00:00:00Z`) : null,
        artboardProfileUrl: `${env.siteBaseUrl}/artists/${source.account.artist.slug}`,
        profileImageUrl: avatar?.publicUrl, profileImageStoragePath: avatar?.path, coverImageUrl: cover?.publicUrl, coverImageStoragePath: cover?.path,
        collectionSchemaVersion: 2, sourceProfileBaseline: json({ ...object(this.baseline(source) as Prisma.JsonValue), copiedImages: {
          profileImageUrl: { url: avatar?.publicUrl ?? null, source: source.profile.profileImageUrl },
          coverImageUrl: { url: cover?.publicUrl ?? null, source: source.profile.coverImageUrl } } }),
        paymentStatus: hasPremiumAccess(source.account.subscription) ? "NOT_REQUIRED" : "REQUIRED" } });
      for (const c of collections) await tx.portfolioCollection.create({ data: { ...c, portfolioId: id } });
      for (const w of works) await tx.portfolioArtwork.create({ data: { ...w, portfolioId: id } });
    }, { timeout: 15000 });
    return id;
  }

  async catalog(accountId: string, id: string) {
    await this.owned(accountId, id);
    const source = await this.captureSource(accountId);
    return { version: source.version, collections: source.collections, artworks: source.artworks };
  }

  async uploadCover(accountId: string, id: string, collectionId: string, expectedRevision: number | undefined, file: Express.Multer.File | undefined) {
    const p = await this.owned(accountId, id); this.collection(p, collectionId);
    if (p.collectionSchemaVersion !== 2 || expectedRevision !== p.revision) throw new ConflictException("Osvježi portfolio prije slanja slike.");
    if (!file?.size) throw new BadRequestException("Izaberi sliku.");
    this.storage.validateUpload(file.size, file.mimetype, "portfolio-collection-cover");
    try { const metadata = await sharp(file.buffer, { limitInputPixels: 40_000_000 }).metadata(); if (!metadata.width || !metadata.height) throw Error("Invalid image"); }
    catch { throw new BadRequestException("Slika nije ispravna."); }
    const image = await this.storage.uploadFile({ recordId: id, entityType: "portfolio-collection-cover", fileName: file.originalname, mimeType: file.mimetype, fileSizeBytes: file.size, body: file.buffer });
    await this.mutate(accountId, id, expectedRevision, async (tx, current) => {
      this.collection(current, collectionId);
      await tx.portfolioCollection.update({ where: { id: collectionId, portfolioId: id }, data: { coverImageUrl: image.publicUrl, coverImageStoragePath: image.path } });
    });
  }

  private async mutate(accountId: string, id: string, revision: number,
    change: (tx: Tx, current: Project) => Promise<void>, sourceVersion?: string) {
    try { return await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
      const account = await tx.artistAccount.findUnique({ where: { id: accountId }, select: { artistId: true } });
      if (!account) throw new NotFoundException("Profil nije pronađen.");
      await tx.$queryRaw`SELECT id FROM "Artist" WHERE id=${account.artistId}::uuid FOR UPDATE`;
      if (sourceVersion) {
        await tx.$queryRaw`SELECT id FROM "ArtistCollection" WHERE "artistId"=${account.artistId}::uuid ORDER BY id FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "Artwork" WHERE "artistId"=${account.artistId}::uuid ORDER BY id FOR UPDATE`;
        if ((await this.source(accountId, tx)).version !== sourceVersion) throw new ConflictException("Profil je promijenjen. Ponovo pregledaj razlike ili izbor radova.");
      }
      await tx.$queryRaw`SELECT id FROM "PortfolioProject" WHERE id=${id}::uuid AND "artistAccountId"=${accountId}::uuid FOR UPDATE`;
      const current = await this.owned(accountId, id, tx);
      if (current.revision !== revision) throw new ConflictException("Portfolio je promijenjen. Osvježi prikaz i ponovo potvrdi izmjenu.");
      await change(tx, current);
      await tx.portfolioProject.update({ where: { id, artistAccountId: accountId }, data: { revision: { increment: 1 }, latestPdfUrl: null, latestPdfStoragePath: null } });
    }, { timeout: 20000, maxWait: 5000 }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (["P2034", "P2028"].includes(error.code)
        || (error.code === "P2010" && ["40P01", "55P03"].includes(String(error.meta?.code))))) throw new ConflictException("Istovremena izmjena. Ponovo pregledaj stanje i potvrdi zahtjev.");
      throw error;
    }
  }

  private collection(p: Project, id?: string | null) {
    const result = p.collections.find(c => c.id === id);
    if (!result) throw new NotFoundException("Portfolio kolekcija nije pronađena.");
    return result;
  }

  private exact(ids: string[], expected: string[]) {
    if (new Set(ids).size !== ids.length || ids.length !== expected.length || ids.some(id => !expected.includes(id))) throw new BadRequestException("Potreban je potpun redosljed bez duplih ili tuđih stavki.");
  }

  private requiredTitle(value: string | undefined) {
    if (!value?.trim()) throw new BadRequestException("Unesi naziv kolekcije.");
    return value.trim();
  }

  async execute(accountId: string, id: string, dto: PortfolioCollectionCommandDto) {
    const p = await this.owned(accountId, id);
    if (p.revision !== dto.expectedRevision) throw new ConflictException("Portfolio je promijenjen. Osvježi prikaz.");
    if (dto.action === "convert") return this.convert(accountId, p, dto);
    if (p.collectionSchemaVersion !== 2) throw new BadRequestException("Prvo izričito prebaci draft na format Kolekcija.");
    if (["move", "reorderWorks", "addWorks"].includes(dto.action) && dto.collectionId === undefined) throw new BadRequestException("Navedi odredišnu kolekciju ili izričito null za radove van kolekcija.");
    if (["import", "addWorks"].includes(dto.action)) return this.add(accountId, p, dto);
    if (dto.action === "publish") return this.publish(accountId, p, dto);
    if (["applySource", "ackSource"].includes(dto.action)) return this.applySource(accountId, p, dto);
    await this.mutate(accountId, id, dto.expectedRevision, async (tx, current) => {
      const cid = dto.collectionId ?? null;
      if (dto.action === "create") {
        await tx.portfolioCollection.create({ data: { portfolioId: id, title: this.requiredTitle(dto.title), description: dto.description?.trim() || null,
          year: dto.year?.trim() || null, orderIndex: Math.max(-1, ...current.collections.map(c => c.orderIndex)) + 1 } });
      } else if (["update", "toggle", "delete"].includes(dto.action)) {
        const c = this.collection(current, cid);
        if (dto.action === "delete") {
          await tx.portfolioArtwork.updateMany({ where: { portfolioId: id, portfolioCollectionId: c.id }, data: { portfolioCollectionId: null, collectionOrderIndex: null } });
          await tx.portfolioCollection.delete({ where: { id: c.id, portfolioId: id } });
        } else if (dto.action === "toggle") {
          if (typeof dto.included !== "boolean") throw new BadRequestException("Nedostaje stanje kolekcije.");
          await tx.portfolioCollection.update({ where: { id: c.id, portfolioId: id }, data: { isIncluded: dto.included } });
        } else {
          const image = dto.coverArtworkId ? current.artworks.find(w => w.id === dto.coverArtworkId) : null;
          if (dto.coverArtworkId && !image) throw new NotFoundException("Rad nije pronađen u portfoliju.");
          await tx.portfolioCollection.update({ where: { id: c.id, portfolioId: id }, data: {
            title: dto.title === undefined ? undefined : this.requiredTitle(dto.title),
            description: dto.description === undefined ? undefined : dto.description?.trim() || null,
            year: dto.year === undefined ? undefined : dto.year?.trim() || null,
            ...(dto.coverArtworkId === undefined ? {} : { coverImageUrl: image?.imageUrl ?? null, coverImageStoragePath: image?.storagePath ?? null }),
          } });
        }
      } else if (dto.action === "toggleOutside") {
        if (typeof dto.included !== "boolean") throw new BadRequestException("Nedostaje stanje grupe.");
        await tx.portfolioProject.update({ where: { id }, data: { includeUncollectedArtworks: dto.included } });
      } else if (dto.action === "reorder") {
        const ids = dto.collectionIds ?? []; this.exact(ids, current.collections.map(c => c.id));
        for (const [orderIndex, collectionId] of ids.entries()) await tx.portfolioCollection.update({ where: { id: collectionId, portfolioId: id }, data: { orderIndex } });
      } else if (dto.action === "reorderWorks") {
        if (cid) this.collection(current, cid);
        const ids = dto.artworkIds ?? []; this.exact(ids, current.artworks.filter(w => w.portfolioCollectionId === cid).map(w => w.id));
        for (const [rank, artworkId] of ids.entries()) await tx.portfolioArtwork.update({ where: { id: artworkId, portfolioId: id }, data: cid ? { collectionOrderIndex: rank } : { orderIndex: rank } });
      } else if (["move", "select"].includes(dto.action)) {
        const ids = dto.artworkIds ?? [];
        if (!ids.length || ids.some(artworkId => !current.artworks.some(w => w.id === artworkId))) throw new NotFoundException("Rad nije pronađen u portfoliju.");
        if (dto.action === "select") {
          if (typeof dto.selected !== "boolean") throw new BadRequestException("Nedostaje izbor rada.");
          await tx.portfolioArtwork.updateMany({ where: { portfolioId: id, id: { in: ids } }, data: { isSelected: dto.selected } });
        } else {
          if (cid) this.collection(current, cid);
          let rank = Math.max(-1, ...current.artworks.filter(w => w.portfolioCollectionId === cid).map(w => w.collectionOrderIndex ?? w.orderIndex)) + 1;
          for (const artworkId of ids) await tx.portfolioArtwork.update({ where: { id: artworkId, portfolioId: id }, data: { portfolioCollectionId: cid, collectionOrderIndex: cid ? rank++ : null } });
        }
      } else throw new BadRequestException("Nepoznata kolekcijska operacija.");
    });
  }

  private async convert(accountId: string, p: Project, dto: PortfolioCollectionCommandDto) {
    if (p.collectionSchemaVersion === 2) throw new BadRequestException("Draft već koristi Kolekcije.");
    if (dto.expectedUpdatedAt !== p.updatedAt.toISOString()) throw new ConflictException("Draft je promijenjen. Osvježi prikaz prije konverzije.");
    const source = await this.captureSource(accountId), copy = this.copier(p.id), fingerprint = digest(p);
    const images = new Map<string, { path: string; publicUrl: string }>();
    for (const w of p.artworks) { const image = await copy(w.imageUrl, w.storagePath); if (image) images.set(w.id, image); }
    const avatar = await copy(p.profileImageUrl, p.profileImageStoragePath, "portfolio-profile");
    const cover = await copy(p.coverImageUrl, p.coverImageStoragePath, "portfolio-cover");
    const collectionCover = await copy(p.collectionCoverUrl, p.collectionCoverStoragePath, "portfolio-collection-cover");
    await this.mutate(accountId, p.id, dto.expectedRevision, async (tx, current) => {
      if (digest(current) !== fingerprint) throw new ConflictException("Draft je promijenjen tokom kopiranja slika.");
      const cid = p.collectionName?.trim() ? randomUUID() : null;
      if (cid) await tx.portfolioCollection.create({ data: { id: cid, portfolioId: p.id, title: p.collectionName!.trim(),
        year: p.collectionYear, description: p.collectionDescription, coverImageUrl: collectionCover?.publicUrl, coverImageStoragePath: collectionCover?.path } });
      for (const w of current.artworks) {
        const image = images.get(w.id); if (!image) throw new BadRequestException("Slika rada nije kopirana.");
        const original = source.artworks.find(item => item.id === w.sourceArtworkId);
        await tx.portfolioArtwork.update({ where: { id: w.id, portfolioId: p.id }, data: { imageUrl: image.publicUrl, storagePath: image.path,
          portfolioCollectionId: cid, collectionOrderIndex: w.orderIndex,
          sourceBaseline: original ? json({ ...original, historyUnknown: true, copiedImageUrl: image.publicUrl, copiedImageSourceUrl: w.imageUrl }) : undefined } });
      }
      await tx.portfolioProject.update({ where: { id: p.id }, data: { collectionSchemaVersion: 2,
        sourceProfileBaseline: json({ ...object(this.baseline(source, true) as Prisma.JsonValue), copiedImages: {
          profileImageUrl: { url: avatar?.publicUrl ?? null, source: p.profileImageUrl }, coverImageUrl: { url: cover?.publicUrl ?? null, source: p.coverImageUrl } } }),
        profileImageUrl: avatar?.publicUrl ?? null, profileImageStoragePath: avatar?.path ?? null,
        coverImageUrl: cover?.publicUrl ?? null, coverImageStoragePath: cover?.path ?? null,
        collectionCoverUrl: collectionCover?.publicUrl ?? null, collectionCoverStoragePath: collectionCover?.path ?? null } });
    });
  }

  private async add(accountId: string, p: Project, dto: PortfolioCollectionCommandDto) {
    const source = await this.captureSource(accountId);
    if (!dto.sourceVersion || dto.sourceVersion !== source.version) throw new ConflictException("Profil je promijenjen. Osvježi izbor radova.");
    const imported = dto.action === "import" ? source.collections.filter(c => dto.collectionIds?.includes(c.id)) : [];
    if (dto.action === "import" && (!imported.length || imported.length !== dto.collectionIds?.length)) throw new NotFoundException("Izvorna kolekcija nije pronađena.");
    const wanted = dto.action === "import" ? [...new Set(imported.flatMap(c => c.members))] : dto.artworkIds ?? [];
    if (wanted.some(id => !source.artworks.some(w => w.id === id))) throw new NotFoundException("Izvorni rad nije pronađen.");
    const additions = wanted.filter(id => !p.artworks.some(w => w.sourceArtworkId === id));
    if (p.artworks.length + additions.length > 30) throw new BadRequestException("Portfolio može imati najviše 30 sačuvanih radova. Nijedan rad nije dodat.");
    const targetIds = new Map(imported.map(c => [c.id, p.collections.find(pc => pc.sourceCollectionId === c.id)?.id ?? randomUUID()]));
    if (dto.action === "addWorks" && dto.collectionId) this.collection(p, dto.collectionId);
    const destination = (originalId: string) => dto.action === "import" ? targetIds.get(source.artworks.find(w => w.id === originalId)!.artistCollectionId!)! : dto.collectionId ?? null;
    for (const originalId of wanted) {
      const old = p.artworks.find(w => w.sourceArtworkId === originalId);
      if (old && old.portfolioCollectionId !== destination(originalId) && !dto.confirmedMoves?.includes(old.id)) throw new ConflictException("Potvrdi premještanje već dodatog rada. Duplikat neće biti kreiran.");
    }
    const copy = this.copier(p.id), prepared = new Map<string, { path: string; publicUrl: string }>();
    for (const id of additions) { const w = source.artworks.find(item => item.id === id)!; const image = await copy(w.imageUrl, w.storagePath); if (image) prepared.set(id, image); }
    const covers = new Map<string, { path: string; publicUrl: string }>();
    for (const c of imported.filter(c => !p.collections.some(pc => pc.sourceCollectionId === c.id))) { const image = await copy(c.coverImageUrl, c.coverImageStoragePath, "portfolio-collection-cover"); if (image) covers.set(c.id, image); }
    await this.mutate(accountId, p.id, dto.expectedRevision, async (tx, current) => {
      let collectionRank = Math.max(-1, ...current.collections.map(c => c.orderIndex)) + 1;
      for (const c of imported.filter(c => !current.collections.some(pc => pc.sourceCollectionId === c.id))) {
        const cover = covers.get(c.id);
        await tx.portfolioCollection.create({ data: { id: targetIds.get(c.id), portfolioId: p.id, sourceCollectionId: c.id,
          title: c.title, description: c.description, year: c.year, coverImageUrl: cover?.publicUrl, coverImageStoragePath: cover?.path,
          orderIndex: collectionRank++, sourceBaseline: json({ ...c, copiedImageUrl: cover?.publicUrl ?? null, copiedImageSourceUrl: c.coverImageUrl }) } });
      }
      let globalRank = Math.max(-1, ...current.artworks.map(w => w.orderIndex)) + 1;
      const ranks = new Map<string | null, number>();
      for (const originalId of wanted) {
        const original = source.artworks.find(w => w.id === originalId)!, target = destination(originalId);
        let rank = ranks.get(target) ?? Math.max(-1, ...current.artworks.filter(w => w.portfolioCollectionId === target).map(w => w.collectionOrderIndex ?? w.orderIndex)) + 1;
        const old = current.artworks.find(w => w.sourceArtworkId === originalId);
        if (old) {
          await tx.portfolioArtwork.update({ where: { id: old.id, portfolioId: p.id }, data: { isSelected: true,
            ...(old.portfolioCollectionId === target ? {} : { portfolioCollectionId: target, collectionOrderIndex: target ? rank++ : null }) } });
        } else {
          const image = prepared.get(originalId); if (!image) throw new BadRequestException("Slika rada nije kopirana.");
          await tx.portfolioArtwork.create({ data: { portfolioId: p.id, sourceArtworkId: originalId, portfolioCollectionId: target,
            imageUrl: image.publicUrl, storagePath: image.path, title: original.title, description: original.description,
            isSelected: true, orderIndex: globalRank++, collectionOrderIndex: target ? rank++ : null,
            sourceBaseline: json({ ...original, copiedImageUrl: image.publicUrl, copiedImageSourceUrl: original.imageUrl }) } });
        }
        ranks.set(target, rank);
      }
    }, source.version);
  }

  async publishPlan(accountId: string, id: string, collectionId: string) {
    const p = await this.owned(accountId, id), c = this.collection(p, collectionId), source = await this.captureSource(accountId);
    const works = p.artworks.filter(w => w.portfolioCollectionId === c.id).sort((a, b) => (a.collectionOrderIndex ?? a.orderIndex) - (b.collectionOrderIndex ?? b.orderIndex));
    return { sourceVersion: source.version, revision: p.revision, title: c.title,
      alreadyPublished: Boolean(c.sourceCollectionId || object(c.sourceBaseline).id),
      unsupported: works.filter(w => !source.artworks.some(original => original.id === w.sourceArtworkId)).map(w => ({ id: w.id, title: w.title })),
      moves: works.map(w => source.artworks.find(original => original.id === w.sourceArtworkId)).filter(w => Boolean(w?.artistCollectionId))
        .map(w => ({ artworkId: w!.id, title: w!.title, from: source.collections.find(original => original.id === w!.artistCollectionId)?.title ?? "Kolekcija", to: c.title })) };
  }

  private async publish(accountId: string, p: Project, dto: PortfolioCollectionCommandDto): Promise<void> {
    const c = this.collection(p, dto.collectionId), source = await this.captureSource(accountId);
    if (c.sourceCollectionId || object(c.sourceBaseline).id) throw new BadRequestException("Kolekcija već ima izvorni profil. Nema automatske dvosmjerne sinhronizacije.");
    if (source.version !== dto.sourceVersion) throw new ConflictException("Profil je promijenjen. Ponovo potvrdi premještanja.");
    const works = p.artworks.filter(w => w.portfolioCollectionId === c.id).sort((a, b) => (a.collectionOrderIndex ?? a.orderIndex) - (b.collectionOrderIndex ?? b.orderIndex));
    const originals = works.map(w => source.artworks.find(original => original.id === w.sourceArtworkId));
    if (originals.some(w => !w)) throw new BadRequestException("Kolekcija sadrži rad koji nema postojeći izvor na tvom profilu. Takvi radovi se ne objavljuju automatski.");
    const conflicts = originals.filter(w => w!.artistCollectionId).map(w => w!.id);
    if (conflicts.some(id => !dto.confirmedMoves?.includes(id))) throw new ConflictException("Potrebna je izričita potvrda premještanja svih navedenih izvornih radova.");
    const sourceId = randomUUID();
    const cover = c.coverImageUrl ? await this.storage.clonePortfolioImage({ recordId: sourceId, imageUrl: c.coverImageUrl, storagePath: c.coverImageStoragePath, entityType: "artist-collection-cover" }) : null;
    await this.mutate(accountId, p.id, dto.expectedRevision, async (tx, current) => {
      this.collection(current, c.id);
      const created = await tx.artistCollection.create({ data: { id: sourceId, artistId: source.artistId, title: c.title, description: c.description,
        year: c.year, coverImageUrl: cover?.publicUrl, coverImageStoragePath: cover?.path,
        orderIndex: Math.max(-1, ...source.collections.map(item => item.orderIndex)) + 1 } });
      for (const [rank, original] of originals.entries()) await tx.artwork.update({ where: { id: original!.id, artistId: source.artistId }, data: { artistCollectionId: created.id, collectionOrderIndex: rank } });
      await tx.portfolioCollection.update({ where: { id: c.id, portfolioId: p.id }, data: { sourceCollectionId: created.id,
        sourceBaseline: json({ ...created, members: originals.map(w => w!.id), copiedImageUrl: c.coverImageUrl, copiedImageSourceUrl: created.coverImageUrl }) } });
      const baseline = object(current.sourceProfileBaseline);
      await tx.portfolioProject.update({ where: { id: p.id }, data: { sourceProfileBaseline: json({ ...baseline,
        collectionIds: [...(Array.isArray(baseline.collectionIds) ? baseline.collectionIds : []), created.id] }) } });
      for (const w of works) await tx.portfolioArtwork.update({ where: { id: w.id }, data: {
        sourceBaseline: json({ ...object(w.sourceBaseline), artistCollectionId: created.id, collectionOrderIndex: originals.findIndex(original => original!.id === w.sourceArtworkId) }) } });
      // Only acknowledge membership changes caused by this explicit action;
      // unrelated source edits remain visible in the source review.
      const moved = new Set(originals.map(w => w!.id));
      for (const other of current.collections.filter(item => item.id !== c.id && item.sourceCollectionId)) {
        const old = object(other.sourceBaseline);
        if (Array.isArray(old.members) && old.members.some((id: string) => moved.has(id))) await tx.portfolioCollection.update({ where: { id: other.id },
          data: { sourceBaseline: json({ ...old, members: old.members.filter((id: string) => !moved.has(id)) }) } });
      }
    }, source.version);
  }

  private diff(p: Project, source: Awaited<ReturnType<PortfolioCollectionsService["source"]>>) {
    const baseline = object(p.sourceProfileBaseline), unknown = Boolean(baseline.historyUnknown);
    const changes: Array<{ key: string; scope: string; id: string; field: string; label: string; before: unknown; local: unknown; source: unknown; conflict: boolean; actionable: boolean }> = [];
    const equal = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    const add = (scope: string, id: string, field: string, label: string, before: unknown, local: unknown, next: unknown, actionable: boolean, initial = unknown) => {
      if (equal(before, next) && !(initial && !equal(local, next))) return;
      changes.push({ key: `${scope}:${id}:${field}`, scope, id, field, label, before: before ?? null, local: local ?? null, source: next ?? null,
        conflict: !equal(local, before) && !equal(local, next), actionable });
    };
    const copiedImages = baseline.copiedImages ?? {};
    for (const [field, value] of Object.entries(source.profile)) {
      const current = field === "dateOfBirth" ? p.dateOfBirth?.toISOString().slice(0, 10) ?? null : (p as unknown as Record<string, unknown>)[field];
      const mapping = copiedImages[field];
      const equivalent = mapping && current === mapping.url ? mapping.source : current;
      add("profile", p.id, field, field, baseline.artist?.[field], equivalent, value, true);
    }
    for (const w of p.artworks) {
      const old = object(w.sourceBaseline), originalId = w.sourceArtworkId ?? old.id;
      if (!originalId) continue;
      const original = source.artworks.find(item => item.id === originalId);
      if (!original) { if (!old.missing) changes.push({ key: `artwork:${w.id}:deleted`, scope: "artwork", id: w.id, field: "deleted", label: w.title ?? "Rad", before: originalId, local: "Sačuvana kopija", source: "Izvor je uklonjen", conflict: false, actionable: false }); continue; }
      for (const field of ["title", "description", "imageUrl"] as const) {
        const current = field === "imageUrl" && w.imageUrl === old.copiedImageUrl ? old.copiedImageSourceUrl : w[field];
        add("artwork", w.id, field, w.title ?? "Rad", old[field], current, original[field], true, unknown || Boolean(old.historyUnknown));
      }
      const localCollection = p.collections.find(c => c.id === w.portfolioCollectionId);
      add("artwork", w.id, "artistCollectionId", w.title ?? "Rad", old.artistCollectionId, localCollection?.sourceCollectionId ?? null, original.artistCollectionId, false, false);
      add("artwork", w.id, "collectionOrderIndex", w.title ?? "Rad", old.collectionOrderIndex, w.collectionOrderIndex, original.collectionOrderIndex, false, false);
    }
    for (const c of p.collections) {
      const old = object(c.sourceBaseline), originalId = c.sourceCollectionId ?? old.id;
      if (!originalId) continue;
      const original = source.collections.find(item => item.id === originalId);
      if (!original) { if (!old.missing) changes.push({ key: `collection:${c.id}:deleted`, scope: "collection", id: c.id, field: "deleted", label: c.title, before: originalId, local: "Sačuvana kolekcija", source: "Izvor je uklonjen", conflict: false, actionable: false }); continue; }
      for (const field of ["title", "description", "year", "coverImageUrl"] as const) {
        const current = field === "coverImageUrl" && c.coverImageUrl === old.copiedImageUrl ? old.copiedImageSourceUrl : c[field];
        add("collection", c.id, field, c.title, old[field], current, original[field], true);
      }
      add("collection", c.id, "members", c.title, old.members, p.artworks.filter(w => w.portfolioCollectionId === c.id).map(w => w.sourceArtworkId), original.members, false, false);
      add("collection", c.id, "orderIndex", c.title, old.orderIndex, c.orderIndex, original.orderIndex, false, false);
    }
    for (const w of source.artworks.filter(item => Array.isArray(baseline.artworkIds) && !baseline.artworkIds.includes(item.id))) changes.push({ key: `newArtwork:${w.id}:new`, scope: "newArtwork", id: w.id, field: "new", label: w.title ?? "Novi rad", before: null, local: null, source: "Novi rad na profilu — dodaj ga kroz izbor radova", conflict: false, actionable: false });
    for (const c of source.collections.filter(item => Array.isArray(baseline.collectionIds) && !baseline.collectionIds.includes(item.id))) changes.push({ key: `newCollection:${c.id}:new`, scope: "newCollection", id: c.id, field: "new", label: c.title, before: null, local: null, source: "Nova kolekcija — preuzmi je kroz izbor kolekcija", conflict: false, actionable: false });
    for (const change of changes) {
      if (change.field === "artistCollectionId") {
        const work = p.artworks.find(w => w.id === change.id), current = p.collections.find(c => c.id === work?.portfolioCollectionId);
        change.local = current?.title ?? "Radovi van kolekcija";
        change.before = source.collections.find(c => c.id === change.before)?.title ?? (change.before ? "Prethodna izvorna kolekcija" : "Radovi van kolekcija");
        change.source = source.collections.find(c => c.id === change.source)?.title ?? "Radovi van kolekcija";
      } else if (change.field === "members") {
        change.local = p.artworks.filter(w => w.portfolioCollectionId === change.id).sort((a, b) => (a.collectionOrderIndex ?? a.orderIndex) - (b.collectionOrderIndex ?? b.orderIndex)).map(w => w.title || "Bez naziva").join(", ");
        change.source = Array.isArray(change.source) ? change.source.map(id => source.artworks.find(w => w.id === id)?.title || "Bez naziva").join(", ") : change.source;
      } else if (change.field === "orderIndex" || change.field === "collectionOrderIndex") {
        change.local = change.local == null ? "Van kolekcije" : `Pozicija ${Number(change.local) + 1}`;
        change.source = change.source == null ? "Van kolekcije" : `Pozicija ${Number(change.source) + 1}`;
      }
    }
    return { changes, historyUnknown: unknown, sourceVersion: source.version, revision: p.revision };
  }

  async sourceChanges(accountId: string, id: string) {
    const p = await this.owned(accountId, id);
    if (p.collectionSchemaVersion !== 2) return { changes: [], historyUnknown: true, revision: p.revision, sourceVersion: "" };
    return this.diff(p, await this.captureSource(accountId));
  }

  private async applySource(accountId: string, p: Project, dto: PortfolioCollectionCommandDto): Promise<void> {
    const source = await this.captureSource(accountId), review = this.diff(p, source);
    if (dto.sourceVersion !== source.version) throw new ConflictException("Profil je promijenjen. Ponovo pregledaj razlike.");
    const selected = dto.action === "ackSource" ? [] : dto.changes ?? [];
    if (selected.some(key => !review.changes.some(change => change.key === key && change.actionable))) throw new BadRequestException("Izabrana promjena nije dostupna za preuzimanje.");
    const copy = this.copier(p.id), images = new Map<string, { path: string; publicUrl: string } | null>();
    for (const change of review.changes.filter(item => selected.includes(item.key) && ["imageUrl", "coverImageUrl", "profileImageUrl"].includes(item.field))) {
      const nativeArtwork = change.scope === "artwork" ? source.artworks.find(w => w.id === (p.artworks.find(w => w.id === change.id)?.sourceArtworkId ?? object(p.artworks.find(w => w.id === change.id)?.sourceBaseline).id)) : null;
      const nativeCollection = change.scope === "collection" ? source.collections.find(c => c.id === (p.collections.find(c => c.id === change.id)?.sourceCollectionId ?? object(p.collections.find(c => c.id === change.id)?.sourceBaseline).id)) : null;
      images.set(change.key, await copy(change.source as string | null, nativeArtwork?.storagePath ?? nativeCollection?.coverImageStoragePath,
        change.scope === "artwork" ? "portfolio-artwork" : change.scope === "collection" ? "portfolio-collection-cover" : change.field === "profileImageUrl" ? "portfolio-profile" : "portfolio-cover"));
    }
    await this.mutate(accountId, p.id, dto.expectedRevision, async (tx, current) => {
      const rootBaseline = object(current.sourceProfileBaseline), copiedImages = { ...(rootBaseline.copiedImages ?? {}) };
      for (const change of review.changes.filter(item => selected.includes(item.key))) {
        const image = images.get(change.key), value = images.has(change.key) ? image?.publicUrl ?? null : change.source;
        if (change.scope === "profile") {
          const data: Record<string, any> = { [change.field]: change.field === "dateOfBirth" ? value ? new Date(`${value}T00:00:00Z`) : null : value };
          if (images.has(change.key)) { data[change.field === "profileImageUrl" ? "profileImageStoragePath" : "coverImageStoragePath"] = image?.path ?? null; copiedImages[change.field] = { url: value, source: change.source }; }
          await tx.portfolioProject.update({ where: { id: p.id }, data });
        } else if (change.scope === "artwork") {
          await tx.portfolioArtwork.update({ where: { id: change.id, portfolioId: p.id }, data: { [change.field]: value, ...(images.has(change.key) ? { storagePath: image?.path ?? null } : {}) } });
        } else if (change.scope === "collection") {
          await tx.portfolioCollection.update({ where: { id: change.id, portfolioId: p.id }, data: { [change.field]: value, ...(images.has(change.key) ? { coverImageStoragePath: image?.path ?? null } : {}) } });
        }
      }
      for (const w of current.artworks) {
        const old = object(w.sourceBaseline), original = source.artworks.find(item => item.id === (w.sourceArtworkId ?? old.id));
        if (!original) { if (w.sourceArtworkId || old.id) await tx.portfolioArtwork.update({ where: { id: w.id }, data: { sourceBaseline: json({ ...old, missing: true }) } }); continue; }
        const imageKey = `artwork:${w.id}:imageUrl`, copied = images.get(imageKey);
        await tx.portfolioArtwork.update({ where: { id: w.id }, data: { sourceBaseline: json({ ...original,
          copiedImageUrl: images.has(imageKey) ? copied?.publicUrl ?? null : old.copiedImageUrl,
          copiedImageSourceUrl: images.has(imageKey) ? original.imageUrl : old.copiedImageSourceUrl }) } });
      }
      for (const c of current.collections) {
        const old = object(c.sourceBaseline), original = source.collections.find(item => item.id === (c.sourceCollectionId ?? old.id));
        if (!original) { if (c.sourceCollectionId || old.id) await tx.portfolioCollection.update({ where: { id: c.id }, data: { sourceBaseline: json({ ...old, missing: true }) } }); continue; }
        const imageKey = `collection:${c.id}:coverImageUrl`, copied = images.get(imageKey);
        await tx.portfolioCollection.update({ where: { id: c.id }, data: { sourceBaseline: json({ ...original,
          copiedImageUrl: images.has(imageKey) ? copied?.publicUrl ?? null : old.copiedImageUrl,
          copiedImageSourceUrl: images.has(imageKey) ? original.coverImageUrl : old.copiedImageSourceUrl }) } });
      }
      await tx.portfolioProject.update({ where: { id: p.id }, data: { sourceProfileBaseline: json({ ...object(this.baseline(source) as Prisma.JsonValue), copiedImages }) } });
    }, source.version);
  }
}
