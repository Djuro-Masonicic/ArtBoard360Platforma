import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import sharp from "sharp";
import {
  CreateArtworkDto,
  DeleteArtworkDto,
  ReorderArtworksDto,
  RequestUploadUrlDto,
  UpdateArtworkDto,
  UploadArtworkFileDto,
} from "./artworks.dto";

/**
 * Artwork creation supports two flows:
 * 1. A backend-managed multipart upload used by the current frontend.
 * 2. A signed-upload helper kept for compatibility and future flexibility.
 */
@Injectable()
export class ArtworksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: R2StorageService,
  ) {}

  async requestUploadUrl(artistId: string, dto: RequestUploadUrlDto) {
    this.assertMatchingArtist(artistId, dto.artistId);
    await this.assertArtistExists(artistId);

    return this.storageService.createSignedUpload(
      artistId,
      dto.entityType,
      dto.fileName,
      dto.mimeType,
      dto.fileSizeBytes,
    );
  }

  async uploadArtworkFile(artistId: string, file: Express.Multer.File | undefined, dto: UploadArtworkFileDto) {
    this.assertMatchingArtist(artistId, dto.artistId);
    await this.assertArtistExists(artistId);

    if (!file) {
      throw new BadRequestException("A file is required for artwork uploads.");
    }

    const uploadedFile = await this.storageService.uploadFile({
      recordId: artistId,
      entityType: "artwork",
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      body: file.buffer,
    });

    try {
      return await this.createArtwork(artistId, {
        imageUrl: uploadedFile.publicUrl,
        storagePath: uploadedFile.path,
        title: dto.title ?? file.originalname.replace(/\.[^.]+$/u, "").trim().slice(0, 180),
        description: dto.description,
        altText: dto.altText,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        isFeatured: dto.isFeatured,
        isBackground: dto.isBackground,
        orderIndex: dto.orderIndex,
      });
    } catch (error) {
      // The storage service retains cleanup candidates until safe collection
      // is available. Never remove a possibly referenced object on this path.
      try {
        await this.storageService.deleteFile(uploadedFile.path);
      } catch (cleanupError) {
        console.error("Could not clean up orphaned R2 object after database failure.", cleanupError);
      }
      throw error;
    }
  }

  async createArtwork(artistId: string, dto: CreateArtworkDto) {
    this.assertMatchingArtist(artistId, dto.artistId);
    await this.assertArtistExists(artistId);

    if (dto.storagePath && !dto.storagePath.startsWith(`artists/${artistId}/`)) {
      throw new BadRequestException("The provided storage path does not belong to the selected artist.");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Artist" WHERE "id"=${artistId}::uuid FOR UPDATE`;
      const last = dto.orderIndex === undefined ? await tx.artwork.aggregate({ where: { artistId }, _max: { orderIndex: true } }) : null;
      const nextOrder = dto.orderIndex ?? ((last?._max.orderIndex ?? -1) + 1);
      if (dto.isBackground) {
        await tx.artwork.updateMany({
          where: {
            artistId,
            isBackground: true,
          },
          data: {
            isBackground: false,
          },
        });
      }

      const saved = await tx.artwork.upsert({
        where: {
          artistId_imageUrl: {
            artistId,
            imageUrl: dto.imageUrl,
          },
        },
        update: {
          storagePath: dto.storagePath ?? null,
          title: dto.title?.trim() || null,
          description: dto.description?.trim() || null,
          altText: dto.altText?.trim() || null,
          mimeType: dto.mimeType ?? null,
          fileSizeBytes: dto.fileSizeBytes ?? null,
          width: dto.width ?? null,
          height: dto.height ?? null,
          isFeatured: dto.isFeatured,
          isBackground: dto.isBackground,
          orderIndex: dto.orderIndex,
        },
        create: {
          artistId,
          imageUrl: dto.imageUrl,
          storagePath: dto.storagePath ?? null,
          title: dto.title?.trim() || null,
          description: dto.description?.trim() || null,
          altText: dto.altText?.trim() || null,
          mimeType: dto.mimeType ?? null,
          fileSizeBytes: dto.fileSizeBytes ?? null,
          width: dto.width ?? null,
          height: dto.height ?? null,
          isFeatured: dto.isFeatured ?? false,
          isBackground: dto.isBackground ?? false,
          orderIndex: nextOrder,
        },
      });
      if (dto.isBackground) await tx.artist.update({ where: { id: artistId }, data: { coverImageUrl: saved.imageUrl } });
      return saved;
    });
  }

  async updateArtwork(artistId: string, id: string, dto: UpdateArtworkDto) {
    this.assertMatchingArtist(artistId, dto.artistId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Artist" WHERE "id"=${artistId}::uuid FOR UPDATE`;
      const artwork = await tx.artwork.findFirst({
        where: { id, artistId },
        select: { id: true, imageUrl: true, isBackground: true },
      });

      if (!artwork) {
        throw new NotFoundException("The selected artwork was not found for this artist.");
      }

      if (dto.isBackground === true) {
        await tx.artist.update({ where: { id: artistId }, data: { coverImageUrl: artwork.imageUrl } });
        await tx.artwork.updateMany({
          where: {
            artistId,
            isBackground: true,
            id: {
              not: id,
            },
          },
          data: {
            isBackground: false,
          },
        });
      }
      if (dto.isBackground === false && artwork.isBackground) await tx.artist.updateMany({ where: { id: artistId, coverImageUrl: artwork.imageUrl }, data: { coverImageUrl: null } });

      return tx.artwork.update({
        where: { id, artistId },
        data: {
          title: dto.title !== undefined ? dto.title.trim() || null : undefined,
          description: dto.description !== undefined ? dto.description.trim() || null : undefined,
          altText: dto.altText !== undefined ? dto.altText.trim() || null : undefined,
          isFeatured: dto.isFeatured,
          isBackground: dto.isBackground,
        },
      });
    });
  }

  async replaceImage(artistId: string, id: string, file?: Express.Multer.File) {
    const owned = await this.prisma.artwork.findFirst({ where: { id, artistId }, select: { id: true } });
    if (!owned) throw new NotFoundException("Rad nije pronađen.");
    if (!file) throw new BadRequestException("Izaberi fotografiju.");
    this.storageService.validateUpload(file.size, file.mimetype, "artwork");
    try { await sharp(file.buffer, { limitInputPixels: 40_000_000 }).metadata(); }
    catch { throw new BadRequestException("Fotografija nije ispravna ili je prevelika."); }
    const uploaded = await this.storageService.uploadFile({ recordId: artistId, entityType: "artwork", fileName: file.originalname, mimeType: file.mimetype, fileSizeBytes: file.size, body: file.buffer });
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Artist" WHERE "id"=${artistId}::uuid FOR UPDATE`;
      if (!(await tx.artwork.findFirst({ where: { id, artistId }, select: { id: true } }))) throw new NotFoundException("Rad nije pronađen.");
      const updated = await tx.artwork.update({ where: { id, artistId }, data: { imageUrl: uploaded.publicUrl, storagePath: uploaded.path, mimeType: file.mimetype, fileSizeBytes: file.size } });
      if (updated.isBackground) await tx.artist.update({ where: { id: artistId }, data: { coverImageUrl: updated.imageUrl } });
      return updated;
    });
  }

  async reorderArtworks(artistId: string, dto: ReorderArtworksDto) {
    this.assertMatchingArtist(artistId, dto.artistId);
    await this.assertArtistExists(artistId);

    const artworkIds = dto.items.map((item) => item.id);
    if (new Set(artworkIds).size !== artworkIds.length) {
      throw new BadRequestException("Artwork ids must not be repeated.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Artist" WHERE "id"=${artistId}::uuid FOR UPDATE`;
      const existingCount = await tx.artwork.count({
        where: {
          artistId,
          id: { in: artworkIds },
        },
      });

      if (existingCount !== artworkIds.length) {
        throw new NotFoundException("One or more artworks were not found for the selected artist.");
      }

      for (const item of dto.items) {
        await tx.artwork.update({
          where: { id: item.id, artistId },
          data: { orderIndex: item.orderIndex },
        });
      }
    });

    return {
      success: true,
      updatedCount: dto.items.length,
    };
  }

  async deleteArtwork(artistId: string, id: string, dto: DeleteArtworkDto) {
    this.assertMatchingArtist(artistId, dto.artistId);
    const artwork = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Artist" WHERE "id"=${artistId}::uuid FOR UPDATE`;
      const found = await tx.artwork.findFirst({
      where: {
        id,
        artistId,
      },
      });
      if (!found) {
      throw new NotFoundException("The selected artwork was not found for this artist.");
      }
      await tx.artwork.delete({
      where: { id, artistId },
      });
      if (found.isBackground) await tx.artist.updateMany({ where: { id: artistId, coverImageUrl: found.imageUrl }, data: { coverImageUrl: null } });
      return found;
    });

    if (dto.deleteFromStorage !== false && artwork.storagePath) {
      try {
        await this.storageService.deleteFile(artwork.storagePath);
      } catch (error) {
        console.error("Could not delete artwork object after metadata removal.", error);
      }
    }

    return {
      success: true,
      deletedArtworkId: id,
    };
  }

  private assertMatchingArtist(artistId: string, claimedArtistId: string | undefined) {
    if (claimedArtistId !== undefined && claimedArtistId !== artistId) {
      throw new ForbiddenException("Artwork ownership cannot be changed.");
    }
  }

  private async assertArtistExists(artistId: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { id: true },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with id "${artistId}" was not found.`);
    }
  }
}
