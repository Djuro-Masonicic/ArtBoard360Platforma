import { Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Patch, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { env } from "../../config/env";
import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import { CollectionVersionDto, CreateArtistCollectionDto, MoveCollectionArtworksDto, ReorderArtistCollectionsDto, ReorderCollectionArtworksDto, UpdateArtistCollectionDto } from "./artist-collections.dto";
import { ArtistCollectionsService } from "./artist-collections.service";
import { SaveArtistCollectionDto } from "./artist-collections.dto";

@Controller("artist/collections")
@UseGuards(ArtistAuthGuard)
export class ArtistCollectionsController {
  constructor(private readonly collections: ArtistCollectionsService) {}

  @Get() @Header("Cache-Control", "no-store")
  get(@Req() req: ArtistRequest) { return this.collections.get(req.artistUser!.artistId); }

  @Post()
  create(@Req() req: ArtistRequest, @Body() dto: CreateArtistCollectionDto) { return this.collections.create(req.artistUser!.artistId, dto); }

  @Put("order")
  reorder(@Req() req: ArtistRequest, @Body() dto: ReorderArtistCollectionsDto) { return this.collections.reorder(req.artistUser!.artistId, dto.expectedVersion, dto.ids); }

  @Put("snapshot")
  save(@Req() req: ArtistRequest, @Body() dto: SaveArtistCollectionDto) { return this.collections.save(req.artistUser!.artistId, dto); }

  @Put("membership")
  move(@Req() req: ArtistRequest, @Body() dto: MoveCollectionArtworksDto) { return this.collections.move(req.artistUser!.artistId, dto); }

  @Patch(":id")
  update(@Req() req: ArtistRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Body() dto: UpdateArtistCollectionDto) {
    return this.collections.update(req.artistUser!.artistId, id, dto);
  }

  @Put(":id/artworks/order")
  reorderArtworks(@Req() req: ArtistRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Body() dto: ReorderCollectionArtworksDto) {
    return this.collections.reorderArtworks(req.artistUser!.artistId, id, dto.expectedVersion, dto.artworkIds);
  }

  @Delete(":id")
  remove(@Req() req: ArtistRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Body() dto: CollectionVersionDto) {
    return this.collections.remove(req.artistUser!.artistId, id, dto.expectedVersion);
  }

  @Post(":id/cover")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: env.maxUploadFileSizeBytes } }))
  uploadCover(@Req() req: ArtistRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: CollectionVersionDto, @UploadedFile() file: Express.Multer.File | undefined) {
    return this.collections.uploadCover(req.artistUser!.artistId, id, dto.expectedVersion, file);
  }
}
