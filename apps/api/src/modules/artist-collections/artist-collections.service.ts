import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from ".prisma/collections-client";
import { createHash } from "node:crypto";
import sharp from "sharp";

import { env } from "../../config/env";
import { CollectionsPrismaService } from "./collections-prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import { CreateArtistCollectionDto, MoveCollectionArtworksDto, UpdateArtistCollectionDto, SaveArtistCollectionDto } from "./artist-collections.dto";

const collectionSelect = {
  id: true, title: true, description: true, year: true, coverImageUrl: true,
  coverImageStoragePath: true, orderIndex: true, updatedAt: true,
} satisfies Prisma.ArtistCollectionSelect;
const artworkSelect = {
  id: true, title: true, imageUrl: true, storagePath: true, orderIndex: true,
  artistCollectionId: true, collectionOrderIndex: true, updatedAt: true,
} satisfies Prisma.ArtworkSelect;
type Tx = Prisma.TransactionClient;

@Injectable()
export class ArtistCollectionsService {
  constructor(private readonly prisma: CollectionsPrismaService, private readonly storage: R2StorageService) {}

  private async available() {
    if (!env.artistCollectionsEnabled) return false;
    // A flag alone must never turn missing columns into a runtime SQL failure.
    const [result] = await this.prisma.$queryRaw<{ ready: boolean }[]>`SELECT
      to_regclass('public."ArtistCollection"') IS NOT NULL
      AND to_regclass('public."PortfolioCollection"') IS NOT NULL
      AND (SELECT count(*)=2 FROM information_schema.columns WHERE table_schema='public'
        AND table_name='Artwork' AND column_name IN ('artistCollectionId','collectionOrderIndex')) AS ready`;
    return result?.ready === true;
  }

  private async requireAvailable() {
    if (!(await this.available())) throw new ServiceUnavailableException("Kolekcije čekaju odobrenje i primjenu migracije.");
  }

  private async snapshot(tx: Tx, artistId: string) {
    const collections = await tx.artistCollection.findMany({ where: { artistId }, select: collectionSelect,
      orderBy: [{ orderIndex: "asc" }, { id: "asc" }] });
    const artworks = await tx.artwork.findMany({ where: { artistId }, select: artworkSelect,
      orderBy: [{ orderIndex: "asc" }, { id: "asc" }] });
    const version = createHash("sha256").update(JSON.stringify({ collections, artworks })).digest("hex");
    return { available: true as const, version, collections, artworks };
  }

  async get(artistId: string) {
    if (!(await this.available())) return { available: false as const, message: "Kolekcije čekaju odobrenje i primjenu migracije." };
    return this.prisma.$transaction((tx) => this.snapshot(tx, artistId), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private async mutate(artistId: string, expectedVersion: string,
    change: (tx: Tx, state: Awaited<ReturnType<ArtistCollectionsService["snapshot"]>>) => Promise<void>) {
    await this.requireAvailable();
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
        // All collection writes for one artist serialize here. Row locks also
        // coordinate with existing artwork edit/delete routes, which already
        // lock their affected rows through UPDATE/DELETE.
        const artist = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Artist" WHERE id=${artistId}::uuid FOR UPDATE`;
        if (!artist.length) throw new NotFoundException("Profil nije pronađen.");
        await tx.$queryRaw`SELECT id FROM "ArtistCollection" WHERE "artistId"=${artistId}::uuid ORDER BY id FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "Artwork" WHERE "artistId"=${artistId}::uuid ORDER BY id FOR UPDATE`;
        const state = await this.snapshot(tx, artistId);
        if (state.version !== expectedVersion) throw new ConflictException("Podaci su promijenjeni. Osvježi prikaz i ponovo potvrdi izmjenu.");
        await change(tx, state);
        return this.snapshot(tx, artistId);
      }, { maxWait: 5000, timeout: 15000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
        (["P2034", "P2028"].includes(error.code) || (error.code === "P2010" && ["40P01", "55P03"].includes(String(error.meta?.code))))) {
        throw new ConflictException("Istovremena izmjena. Osvježi prikaz i pokušaj ponovo.");
      }
      throw error;
    }
  }

  private cover(artworks: Awaited<ReturnType<ArtistCollectionsService["snapshot"]>>["artworks"], id: string | null | undefined) {
    if (id === undefined) return {};
    if (id === null) return { coverImageUrl: null, coverImageStoragePath: null };
    const artwork = artworks.find((item) => item.id === id);
    if (!artwork) throw new NotFoundException("Rad nije pronađen.");
    return { coverImageUrl: artwork.imageUrl, coverImageStoragePath: artwork.storagePath };
  }

  create(artistId: string, dto: CreateArtistCollectionDto) {
    return this.mutate(artistId, dto.expectedVersion, async (tx, state) => {
      await tx.artistCollection.create({ data: {
        artistId, title: dto.title, description: dto.description || null, year: dto.year || null,
        orderIndex: Math.max(-1, ...state.collections.map((item) => item.orderIndex)) + 1,
        ...this.cover(state.artworks, dto.coverArtworkId),
      }, select: { id: true } });
    });
  }

  save(artistId: string, dto: SaveArtistCollectionDto) {
    return this.mutate(artistId, dto.expectedVersion, async (tx, state) => {
      if (dto.artworkIds.some(id => !state.artworks.some(w => w.id === id))) throw new NotFoundException("Rad nije pronađen.");
      const existing = await tx.artistCollection.findUnique({ where: { id: dto.id }, select: { artistId: true } });
      if (existing && existing.artistId !== artistId) throw new NotFoundException("Kolekcija nije pronađena.");
      const data = { title: dto.title, description: dto.description || null, year: dto.year || null, ...this.cover(state.artworks, dto.coverArtworkId) };
      if (existing) await tx.artistCollection.update({ where: { id: dto.id, artistId }, data });
      else await tx.artistCollection.create({ data: { id: dto.id, artistId, ...data, orderIndex: Math.max(-1, ...state.collections.map(c => c.orderIndex)) + 1 } });
      // Metadata, removals, moves and collection ordering commit together.
      // orderIndex remains the independent global gallery order.
      await tx.artwork.updateMany({ where: { artistId, artistCollectionId: dto.id, id: { notIn: dto.artworkIds } }, data: { artistCollectionId: null, collectionOrderIndex: null } });
      for (const [collectionOrderIndex, id] of dto.artworkIds.entries()) await tx.artwork.update({ where: { id, artistId }, data: { artistCollectionId: dto.id, collectionOrderIndex } });
    });
  }

  update(artistId: string, id: string, dto: UpdateArtistCollectionDto) {
    return this.mutate(artistId, dto.expectedVersion, async (tx, state) => {
      if (!state.collections.some((item) => item.id === id)) throw new NotFoundException("Kolekcija nije pronađena.");
      await tx.artistCollection.update({ where: { id, artistId }, data: {
        title: dto.title,
        description: dto.description === undefined ? undefined : dto.description || null,
        year: dto.year === undefined ? undefined : dto.year || null,
        ...this.cover(state.artworks, dto.coverArtworkId),
      }, select: { id: true } });
    });
  }

  reorder(artistId: string, expectedVersion: string, ids: string[]) {
    return this.mutate(artistId, expectedVersion, async (tx, state) => {
      this.exactIds(ids, state.collections.map((item) => item.id));
      for (const [orderIndex, id] of ids.entries()) await tx.artistCollection.update({ where: { id, artistId }, data: { orderIndex }, select: { id: true } });
    });
  }

  move(artistId: string, dto: MoveCollectionArtworksDto) {
    return this.mutate(artistId, dto.expectedVersion, async (tx, state) => {
      if (dto.collectionId !== null && !state.collections.some((item) => item.id === dto.collectionId)) throw new NotFoundException("Kolekcija nije pronađena.");
      if (dto.artworkIds.some((id) => !state.artworks.some((item) => item.id === id))) throw new NotFoundException("Rad nije pronađen.");
      let position = Math.max(-1, ...state.artworks.filter((item) => item.artistCollectionId === dto.collectionId)
        .map((item) => item.collectionOrderIndex ?? item.orderIndex)) + 1;
      for (const id of dto.artworkIds) {
        const artwork = state.artworks.find((item) => item.id === id)!;
        if (artwork.artistCollectionId === dto.collectionId) continue;
        await tx.artwork.update({ where: { id, artistId }, data: {
          artistCollectionId: dto.collectionId,
          collectionOrderIndex: dto.collectionId === null ? null : position++,
        }, select: { id: true } });
      }
    });
  }

  reorderArtworks(artistId: string, id: string, expectedVersion: string, ids: string[]) {
    return this.mutate(artistId, expectedVersion, async (tx, state) => {
      if (!state.collections.some((item) => item.id === id)) throw new NotFoundException("Kolekcija nije pronađena.");
      this.exactIds(ids, state.artworks.filter((item) => item.artistCollectionId === id).map((item) => item.id));
      for (const [collectionOrderIndex, artworkId] of ids.entries()) {
        await tx.artwork.update({ where: { id: artworkId, artistId }, data: { collectionOrderIndex }, select: { id: true } });
      }
    });
  }

  remove(artistId: string, id: string, expectedVersion: string) {
    return this.mutate(artistId, expectedVersion, async (tx, state) => {
      if (!state.collections.some((item) => item.id === id)) throw new NotFoundException("Kolekcija nije pronađena.");
      await tx.artwork.updateMany({ where: { artistId, artistCollectionId: id }, data: { artistCollectionId: null, collectionOrderIndex: null } });
      await tx.artistCollection.delete({ where: { id, artistId }, select: { id: true } });
      // No storage deletion. Snapshot FK handling belongs to the database.
    });
  }

  async uploadCover(artistId: string, id: string, expectedVersion: string, file: Express.Multer.File | undefined) {
    const state = await this.get(artistId);
    if (!state.available) throw new ServiceUnavailableException(state.message);
    if (!state.collections.some((item) => item.id === id)) throw new NotFoundException("Kolekcija nije pronađena.");
    if (state.version !== expectedVersion) throw new ConflictException("Osvježi prikaz prije slanja slike.");
    if (!file?.size) throw new BadRequestException("Izaberi sliku.");
    this.storage.validateUpload(file.size, file.mimetype, "artist-collection-cover");
    try {
      const metadata = await sharp(file.buffer, { limitInputPixels: 40_000_000 }).metadata();
      if (!metadata.width || !metadata.height || !["jpeg", "png", "webp", "avif", "heif"].includes(metadata.format ?? "")) throw new Error("Invalid image");
    } catch { throw new BadRequestException("Slika nije ispravna ili je prevelike rezolucije."); }
    const uploaded = await this.storage.uploadFile({ recordId: id, entityType: "artist-collection-cover",
      fileName: file.originalname, mimeType: file.mimetype, fileSizeBytes: file.size, body: file.buffer });
    // Do not hold a database transaction during R2 I/O. A conflict on recheck
    // retains the unused upload; physical deletion is deliberately disabled.
    return this.mutate(artistId, expectedVersion, async (tx, current) => {
      if (!current.collections.some((item) => item.id === id)) throw new NotFoundException("Kolekcija nije pronađena.");
      await tx.artistCollection.update({ where: { id, artistId }, data: {
        coverImageUrl: uploaded.publicUrl, coverImageStoragePath: uploaded.path,
      }, select: { id: true } });
    });
  }

  private exactIds(ids: string[], expected: string[]) {
    if (new Set(ids).size !== ids.length || ids.length !== expected.length || ids.some((id) => !expected.includes(id))) {
      throw new BadRequestException("Pošalji potpun redosljed bez duplih ili tuđih stavki.");
    }
  }
}
