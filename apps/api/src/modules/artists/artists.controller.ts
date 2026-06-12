import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { env } from "../../config/env";
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
  createArtist(@Body() dto: CreateArtistDto) {
    return this.artistsService.createArtist(dto);
  }

  @Patch(":id")
  updateArtist(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateArtistDto,
  ) {
    return this.artistsService.updateArtist(id, dto);
  }

  @Post(":id/profile-image")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: env.maxUploadFileSizeBytes,
      },
    }),
  )
  uploadProfileImage(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.artistsService.uploadProfileImage(id, file);
  }
}
