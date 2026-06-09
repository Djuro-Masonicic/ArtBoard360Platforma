import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import {
  CreateArtworkDto,
  ReorderArtworksDto,
  RequestUploadUrlDto,
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

  async requestUploadUrl(dto: RequestUploadUrlDto) {
    await this.assertArtistExists(dto.artistId);

    return this.storageService.createSignedUpload(
      dto.artistId,
      dto.entityType,
      dto.fileName,
      dto.mimeType,
      dto.fileSizeBytes,
    );
  }

  async uploadArtworkFile(file: Express.Multer.File | undefined, dto: UploadArtworkFileDto) {
    await this.assertArtistExists(dto.artistId);

    if (!file) {
      throw new BadRequestException("A file is required for artwork uploads.");
    }

    const uploadedFile = await this.storageService.uploadFile({
      recordId: dto.artistId,
      entityType: "artwork",
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      body: file.buffer,
    });

    try {
      return await this.createArtwork({
        artistId: dto.artistId,
        imageUrl: uploadedFile.publicUrl,
        storagePath: uploadedFile.path,
        title: dto.title,
        description: dto.description,
        altText: dto.altText,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        orderIndex: dto.orderIndex,
      });
    } catch (error) {
      // If metadata persistence fails after the binary file is already stored,
      // we try to delete the orphaned object so storage and database stay aligned.
      try {
        await this.storageService.deleteFile(uploadedFile.path);
      } catch (cleanupError) {
        console.error("Could not clean up orphaned R2 object after database failure.", cleanupError);
      }
      throw error;
    }
  }

  async createArtwork(dto: CreateArtworkDto) {
    await this.assertArtistExists(dto.artistId);

    if (dto.storagePath && !dto.storagePath.startsWith(`artists/${dto.artistId}/`)) {
      throw new BadRequestException("The provided storage path does not belong to the selected artist.");
    }

    return this.prisma.artwork.upsert({
      where: {
        artistId_imageUrl: {
          artistId: dto.artistId,
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
        orderIndex: dto.orderIndex ?? 0,
      },
      create: {
        artistId: dto.artistId,
        imageUrl: dto.imageUrl,
        storagePath: dto.storagePath ?? null,
        title: dto.title?.trim() || null,
        description: dto.description?.trim() || null,
        altText: dto.altText?.trim() || null,
        mimeType: dto.mimeType ?? null,
        fileSizeBytes: dto.fileSizeBytes ?? null,
        width: dto.width ?? null,
        height: dto.height ?? null,
        orderIndex: dto.orderIndex ?? 0,
      },
    });
  }

  async reorderArtworks(dto: ReorderArtworksDto) {
    await this.assertArtistExists(dto.artistId);

    const artworkIds = dto.items.map((item) => item.id);
    const existingCount = await this.prisma.artwork.count({
      where: {
        artistId: dto.artistId,
        id: {
          in: artworkIds,
        },
      },
    });

    if (existingCount !== artworkIds.length) {
      throw new NotFoundException("One or more artworks were not found for the selected artist.");
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.artwork.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );

    return {
      success: true,
      updatedCount: dto.items.length,
    };
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
