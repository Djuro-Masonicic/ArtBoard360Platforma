import {
  Body,
  Headers,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { env } from "../../config/env";
import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import {
  CreateGuestPortfolioProjectDto,
  GeneratePortfolioPdfDto,
  ListPortfolioProjectsQueryDto,
  UpdatePortfolioArtworkDto,
  UpdatePortfolioProjectDto,
} from "./portfolio-projects.dto";
import { PortfolioProjectsService } from "./portfolio-projects.service";
import { PortfolioAccessGuard } from "./portfolio-access.guard";
import { PortfolioRevisionDto } from "./portfolio-collections.dto";
import type { Response } from "express";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

@Controller("portfolio-projects")
export class PortfolioProjectsController {
  constructor(private readonly portfolioProjectsService: PortfolioProjectsService) {}

  // Retired compatibility endpoint: rejects persistent Guest draft creation.
  @Post("guest")
  createGuestProject(@Body() dto: CreateGuestPortfolioProjectDto) {
    return this.portfolioProjectsService.createGuestProject(dto);
  }

  // Legacy route names remain compatible for authenticated account owners.
  @Get("public/:id")
  @Header("Cache-Control", "no-store")
  @UseGuards(PortfolioAccessGuard)
  getPublicProject(@Req() request: ArtistRequest, @Param("id") id: string) {
    return this.portfolioProjectsService.getPublic(id, request.artistUser?.id);
  }

  @Patch("public/:id")
  @UseGuards(PortfolioAccessGuard)
  updatePublicProject(@Req() request: ArtistRequest, @Param("id") id: string, @Body() dto: UpdatePortfolioProjectDto) {
    return this.portfolioProjectsService.updatePublicProject(id, dto, request.artistUser?.id);
  }

  @Patch("public/:id/artworks/:artworkId")
  @UseGuards(PortfolioAccessGuard)
  updatePublicArtwork(
    @Req() request: ArtistRequest,
    @Param("id") id: string,
    @Param("artworkId") artworkId: string,
    @Body() dto: UpdatePortfolioArtworkDto,
  ) {
    return this.portfolioProjectsService.updatePublicArtwork(id, artworkId, dto, request.artistUser?.id);
  }

  // Saved-draft image uploads require the authenticated owner. Guest files
  // remain in the browser until transient preview or explicit checkout.
  @Post("public/:id/artworks/upload")
  @UseGuards(PortfolioAccessGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: env.maxUploadFileSizeBytes,
      },
    }),
  )
  uploadPublicArtwork(
    @Req() request: ArtistRequest,
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: PortfolioRevisionDto,
  ) {
    return this.portfolioProjectsService.uploadPublicArtwork(id, file, request.artistUser?.id, dto.expectedRevision);
  }

  @Post("public/:id/profile-image")
  @UseGuards(PortfolioAccessGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: env.maxUploadFileSizeBytes,
      },
    }),
  )
  uploadPublicProfileImage(
    @Req() request: ArtistRequest,
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: PortfolioRevisionDto,
  ) {
    return this.portfolioProjectsService.uploadPublicProfileImage(id, file, request.artistUser?.id, dto.expectedRevision);
  }

  @Post("public/:id/collection-cover")
  @UseGuards(PortfolioAccessGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: env.maxUploadFileSizeBytes,
      },
    }),
  )
  uploadPublicCollectionCover(
    @Req() request: ArtistRequest,
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: PortfolioRevisionDto,
  ) {
    return this.portfolioProjectsService.uploadPublicCollectionCover(id, file, request.artistUser?.id, dto.expectedRevision);
  }

  @Post("public/:id/cover-image")
  @UseGuards(PortfolioAccessGuard)
  @UseInterceptors(FileInterceptor("file", {
    storage: memoryStorage(), limits: { fileSize: env.maxUploadFileSizeBytes },
  }))
  uploadPublicCoverImage(@Req() request: ArtistRequest, @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined, @Body() dto: PortfolioRevisionDto) {
    return this.portfolioProjectsService.uploadPublicCoverImage(id, file, request.artistUser?.id, dto.expectedRevision);
  }

  // Retired compatibility endpoint: browser assertions never confirm a payment.
  @Post("public/:id/demo-payment")
  @UseGuards(PortfolioAccessGuard)
  completeDemoPayment(@Req() request: ArtistRequest, @Param("id") id: string) {
    return this.portfolioProjectsService.completeDemoPayment(id, request.artistUser?.id);
  }

  // Generates the real PDF file and stores it in R2. Public generation is only
  // allowed only after reserving the verified owner's server-side allowance.
  @Post("public/:id/generate-pdf")
  @UseGuards(PortfolioAccessGuard)
  generatePublicPdf(@Req() request: ArtistRequest, @Param("id") id: string, @Headers("idempotency-key") operationKey?: string, @Body() _dto?: GeneratePortfolioPdfDto) {
    return this.portfolioProjectsService.generatePublicPdf(id, request.artistUser?.id, operationKey);
  }

  // Preview PDFs are intentionally watermarked and streamed inline. They are
  // not saved as generated versions and do not unlock the clean download flow.
  @Get("public/:id/preview-pdf")
  @UseGuards(PortfolioAccessGuard)
  async previewPdf(@Req() request: ArtistRequest, @Param("id") id: string, @Res() response: Response) {
    const previewPdf = await this.portfolioProjectsService.generatePreviewPdf(id, request.artistUser?.id);

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${previewPdf.filename}"`,
    );
    response.setHeader("Cache-Control", "no-store");
    response.send(previewPdf.buffer);
  }

  // Development helper for tuning the first page layout quickly. It returns
  // only the cover page as a PDF download and does not create a saved version.
  @Get("public/:id/cover-test-pdf")
  @UseGuards(PortfolioAccessGuard)
  async downloadCoverTestPdf(@Req() request: ArtistRequest, @Param("id") id: string, @Res() response: Response) {
    const coverPdf = await this.portfolioProjectsService.generateCoverTestPdf(id, request.artistUser?.id);

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${coverPdf.filename}"`,
    );
    response.send(coverPdf.buffer);
  }

  @UseGuards(ArtistAuthGuard)
  @Post("me/:id/share")
  createShare(@Req() request: ArtistRequest, @Param("id") id: string) {
    return this.portfolioProjectsService.createShareLink(request.artistUser!.id, id);
  }

  @UseGuards(ArtistAuthGuard)
  @Delete("me/:id/share")
  revokeShare(@Req() request: ArtistRequest, @Param("id") id: string) {
    return this.portfolioProjectsService.revokeShareLink(request.artistUser!.id, id);
  }

  @UseGuards(ArtistAuthGuard)
  @Get("me/:id/versions")
  listVersions(@Req() request: ArtistRequest, @Param("id") id: string, @Query() query: PaginationQueryDto) {
    return this.portfolioProjectsService.listVersions(request.artistUser!.id, id, query);
  }

  @UseGuards(ArtistAuthGuard)
  @Get("me/:id/versions/:versionId/pdf")
  async versionPdf(@Req() request: ArtistRequest, @Param("id") id: string, @Param("versionId") versionId: string, @Res() response: Response) {
    const pdf = await this.portfolioProjectsService.downloadVersion(request.artistUser!.id, id, versionId);
    response.set({ "Content-Type": "application/pdf", "Cache-Control": "no-store", "Content-Disposition": `inline; filename="${pdf.filename}"`, "X-Content-Type-Options": "nosniff" }); response.send(pdf.buffer);
  }

  @UseGuards(ArtistAuthGuard)
  @Get("me/:id/download-pdf")
  async latestPdf(@Req() request: ArtistRequest, @Param("id") id: string, @Res() response: Response) {
    const pdf = await this.portfolioProjectsService.downloadVersion(request.artistUser!.id, id);
    response.set({ "Content-Type": "application/pdf", "Cache-Control": "no-store", "Content-Disposition": `inline; filename="${pdf.filename}"`, "X-Content-Type-Options": "nosniff" }); response.send(pdf.buffer);
  }

  // Read-only publication is explicit and uses a separate high-entropy token.
  @Get("shared/:token/preview-pdf")
  async sharedPreview(@Param("token") token: string, @Res() response: Response) {
    const pdf = await this.portfolioProjectsService.generateSharedPreviewPdf(token);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", 'inline; filename="portfolio-preview.pdf"');
    response.setHeader("Cache-Control", "no-store");
    response.send(pdf.buffer);
  }

  // Logged-in artists can generate a portfolio draft from their existing
  // ArtBoard profile data instead of typing everything again.
  @UseGuards(ArtistAuthGuard)
  @Post("from-profile")
  createFromArtistProfile(@Req() request: ArtistRequest) {
    return this.portfolioProjectsService.createFromArtistProfile(request.artistUser!.id);
  }

  @UseGuards(ArtistAuthGuard)
  @Get("me")
  @Header("Cache-Control", "no-store")
  listMyProjects(
    @Req() request: ArtistRequest,
    @Query() query: ListPortfolioProjectsQueryDto,
  ) {
    return this.portfolioProjectsService.listForArtist(request.artistUser!.id, query);
  }

  @UseGuards(ArtistAuthGuard)
  @Get("me/:id")
  @Header("Cache-Control", "no-store")
  getMyProject(@Req() request: ArtistRequest, @Param("id") id: string) {
    return this.portfolioProjectsService.getForArtist(request.artistUser!.id, id);
  }

  @UseGuards(ArtistAuthGuard)
  @Delete("me/:id")
  deleteMyDraft(@Req() request: ArtistRequest, @Param("id") id: string) {
    return this.portfolioProjectsService.deleteDraftForArtist(request.artistUser!.id, id);
  }
}
