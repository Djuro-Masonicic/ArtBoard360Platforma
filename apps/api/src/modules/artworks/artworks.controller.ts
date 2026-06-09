import { Body, Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { env } from "../../config/env";
import { ArtworksService } from "./artworks.service";
import {
  CreateArtworkDto,
  ReorderArtworksDto,
  RequestUploadUrlDto,
  UploadArtworkFileDto,
} from "./artworks.dto";

/**
 * These routes manage both artwork metadata and media uploads.
 * The signed-upload route is kept for compatibility, but the primary frontend
 * flow now posts files to the backend, which uploads them to Cloudflare R2.
 */
@Controller("artworks")
export class ArtworksController {
  constructor(private readonly artworksService: ArtworksService) {}

  @Post("upload-url")
  requestUploadUrl(@Body() dto: RequestUploadUrlDto) {
    return this.artworksService.requestUploadUrl(dto);
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: env.maxUploadFileSizeBytes,
      },
    }),
  )
  uploadArtwork(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadArtworkFileDto,
  ) {
    return this.artworksService.uploadArtworkFile(file, dto);
  }

  @Post()
  createArtwork(@Body() dto: CreateArtworkDto) {
    return this.artworksService.createArtwork(dto);
  }

  @Post("reorder")
  reorderArtworks(@Body() dto: ReorderArtworksDto) {
    return this.artworksService.reorderArtworks(dto);
  }
}
