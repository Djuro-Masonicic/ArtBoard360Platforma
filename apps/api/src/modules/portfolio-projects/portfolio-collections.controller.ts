import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Response } from "express";
import { env } from "../../config/env";
import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import { PortfolioCollectionCommandDto, PortfolioRevisionDto } from "./portfolio-collections.dto";
import { UpdatePortfolioProjectDto } from "./portfolio-projects.dto";
import { PortfolioCollectionsService } from "./portfolio-collections.service";
import { PortfolioProjectsService } from "./portfolio-projects.service";
import { PortfolioCollectionsEnabledGuard } from "./portfolio-collections-enabled.guard";

@Controller("portfolio-projects/me/:id/collections")
@UseGuards(ArtistAuthGuard, PortfolioCollectionsEnabledGuard)
export class PortfolioCollectionsController {
  constructor(private readonly collections: PortfolioCollectionsService, private readonly projects: PortfolioProjectsService) {}

  @Get("catalog") @Header("Cache-Control", "no-store")
  catalog(@Req() req: ArtistRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string) { return this.collections.catalog(req.artistUser!.id, id); }

  @Get("source-changes") @Header("Cache-Control", "no-store")
  changes(@Req() req: ArtistRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string) { return this.collections.sourceChanges(req.artistUser!.id, id); }

  @Get(":collectionId/publish-plan") @Header("Cache-Control", "no-store")
  publishPlan(@Req() req: ArtistRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("collectionId", new ParseUUIDPipe({ version: "4" })) collectionId: string) {
    return this.collections.publishPlan(req.artistUser!.id, id, collectionId);
  }

  @Post("commands")
  async command(@Req() req: ArtistRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Body() dto: PortfolioCollectionCommandDto) {
    await this.collections.execute(req.artistUser!.id, id, dto);
    return this.projects.getForArtist(req.artistUser!.id, id);
  }

  @Post("preview-pdf")
  async preview(@Req() req: ArtistRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdatePortfolioProjectDto, @Res() response: Response) {
    const preview = await this.projects.generateTransientPreview(id, req.artistUser!.id, dto);
    response.setHeader("Content-Type", "application/pdf"); response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Portfolio-Page-Count", preview.pageCount); response.send(preview.buffer);
  }

  @Post(":collectionId/cover")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: env.maxUploadFileSizeBytes } }))
  async cover(@Req() req: ArtistRequest, @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("collectionId", new ParseUUIDPipe({ version: "4" })) collectionId: string,
    @Body() dto: PortfolioRevisionDto, @UploadedFile() file: Express.Multer.File | undefined) {
    await this.collections.uploadCover(req.artistUser!.id, id, collectionId, dto.expectedRevision, file);
    return this.projects.getForArtist(req.artistUser!.id, id);
  }
}
