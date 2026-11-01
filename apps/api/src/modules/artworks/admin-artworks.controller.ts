import { BadRequestException, Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { env } from "../../config/env";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { ArtworksService } from "./artworks.service";
import { UploadArtworkFileDto } from "./artworks.dto";

// The existing upload tool selects an artist. Only a verified administrator
// can upload on another artist's behalf; artist routes always use the session.
@UseGuards(AdminAuthGuard)
@Controller("admin/artworks")
export class AdminArtworksController {
  constructor(private readonly artworksService: ArtworksService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", {
    storage: memoryStorage(),
    limits: { fileSize: env.maxUploadFileSizeBytes },
  }))
  uploadArtwork(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadArtworkFileDto,
  ) {
    if (!dto.artistId) {
      throw new BadRequestException("An artist id is required for administrator uploads.");
    }
    return this.artworksService.uploadArtworkFile(dto.artistId, file, dto);
  }
}
