import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { env } from "../../config/env";
import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { ArtistsService } from "./artists.service";
import { CreateArtistDto, ListArtistsQueryDto, UpdateArtistDto } from "./artists.dto";

/**
 * Public artist endpoints stay intentionally direct.
 * The frontend can talk to these routes without extra translation layers.
 */
@Controller("artists")
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  listArtists(@Query() query: ListArtistsQueryDto) {
    return this.artistsService.listArtists(query);
  }

  @Get(":slug")
  getArtistBySlug(@Param("slug") slug: string) {
    return this.artistsService.getArtistBySlug(slug);
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  createArtist(@Body() dto: CreateArtistDto) {
    return this.artistsService.createArtist(dto);
  }

  @Patch(":id")
  @UseGuards(ArtistAuthGuard)
  updateArtist(
    @Req() request: ArtistRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateArtistDto,
  ) {
    return this.artistsService.updateArtist(id, dto, request.artistUser!.artistId);
  }

  @Post(":id/profile-image")
  @UseGuards(ArtistAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: env.maxUploadFileSizeBytes,
      },
    }),
  )
  uploadProfileImage(
    @Req() request: ArtistRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.artistsService.uploadProfileImage(id, file, request.artistUser!.artistId);
  }
}
