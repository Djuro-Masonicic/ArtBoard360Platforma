import { Body, Controller, Delete, Param, ParseUUIDPipe, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { env } from "../../config/env";
import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import { ArtworksService } from "./artworks.service";
import {
  CreateArtworkDto,
  DeleteArtworkDto,
  ReorderArtworksDto,
  RequestUploadUrlDto,
  UpdateArtworkDto,
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
  @UseGuards(ArtistAuthGuard)
  requestUploadUrl(@Req() request: ArtistRequest, @Body() dto: RequestUploadUrlDto) {
    return this.artworksService.requestUploadUrl(request.artistUser!.artistId, dto);
  }

  @Post("upload")
  @UseGuards(ArtistAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: env.maxUploadFileSizeBytes,
      },
    }),
  )
  uploadArtwork(
    @Req() request: ArtistRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadArtworkFileDto,
  ) {
    return this.artworksService.uploadArtworkFile(request.artistUser!.artistId, file, dto);
  }

  @Post()
  @UseGuards(ArtistAuthGuard)
  createArtwork(@Req() request: ArtistRequest, @Body() dto: CreateArtworkDto) {
    return this.artworksService.createArtwork(request.artistUser!.artistId, dto);
  }

  @Post("reorder")
  @UseGuards(ArtistAuthGuard)
  reorderArtworks(@Req() request: ArtistRequest, @Body() dto: ReorderArtworksDto) {
    return this.artworksService.reorderArtworks(request.artistUser!.artistId, dto);
  }

  @Patch(":id")
  @UseGuards(ArtistAuthGuard)
  updateArtwork(
    @Req() request: ArtistRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateArtworkDto,
  ) {
    return this.artworksService.updateArtwork(request.artistUser!.artistId, id, dto);
  }

  @Post(":id/image") @UseGuards(ArtistAuthGuard)
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: env.maxUploadFileSizeBytes } }))
  replaceImage(@Req() request: ArtistRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @UploadedFile() file?: Express.Multer.File) {
    return this.artworksService.replaceImage(request.artistUser!.artistId, id, file);
  }

  @Delete(":id")
  @UseGuards(ArtistAuthGuard)
  deleteArtwork(
    @Req() request: ArtistRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DeleteArtworkDto,
  ) {
    return this.artworksService.deleteArtwork(request.artistUser!.artistId, id, dto);
  }
}
