import {
  Body,
  Controller,
  Get,
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
  ListPortfolioProjectsQueryDto,
  UpdatePortfolioArtworkDto,
  UpdatePortfolioProjectDto,
} from "./portfolio-projects.dto";
import { PortfolioProjectsService } from "./portfolio-projects.service";
import type { Response } from "express";

@Controller("portfolio-projects")
export class PortfolioProjectsController {
  constructor(private readonly portfolioProjectsService: PortfolioProjectsService) {}

  // Public guest entry point. This supports artists who do not have an
  // ArtBoard profile yet, but still want to start building a portfolio.
  @Post("guest")
  createGuestProject(@Body() dto: CreateGuestPortfolioProjectDto) {
    return this.portfolioProjectsService.createGuestProject(dto);
  }

  // Public preview/read endpoint for MVP drafts. The id is still a UUID, but
  // later we can replace this with share tokens and stricter permissions.
  @Get("public/:id")
  getPublicProject(@Param("id") id: string) {
    return this.portfolioProjectsService.getPublic(id);
  }

  // MVP editing endpoint. For a production share-flow we should replace this
  // public id write access with edit tokens, but this lets the builder become
  // a real saved draft now instead of only a local React prototype.
  @Patch("public/:id")
  updatePublicProject(@Param("id") id: string, @Body() dto: UpdatePortfolioProjectDto) {
    return this.portfolioProjectsService.updatePublicProject(id, dto);
  }

  @Patch("public/:id/artworks/:artworkId")
  updatePublicArtwork(
    @Param("id") id: string,
    @Param("artworkId") artworkId: string,
    @Body() dto: UpdatePortfolioArtworkDto,
  ) {
    return this.portfolioProjectsService.updatePublicArtwork(id, artworkId, dto);
  }

  // Upload a new image directly into a portfolio draft. We keep this on the
  // portfolio project instead of the global artworks API because guest builders
  // may not have a full ArtBoard artist profile yet.
  @Post("public/:id/artworks/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: env.maxUploadFileSizeBytes,
      },
    }),
  )
  uploadPublicArtwork(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.portfolioProjectsService.uploadPublicArtwork(id, file);
  }

  @Post("public/:id/profile-image")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: env.maxUploadFileSizeBytes,
      },
    }),
  )
  uploadPublicProfileImage(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.portfolioProjectsService.uploadPublicProfileImage(id, file);
  }

  @Post("public/:id/collection-cover")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: env.maxUploadFileSizeBytes,
      },
    }),
  )
  uploadPublicCollectionCover(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.portfolioProjectsService.uploadPublicCollectionCover(id, file);
  }

  // MVP demo payment. This intentionally does not process real card data yet;
  // it marks the portfolio as paid so we can test the locked/unlocked PDF flow.
  @Post("public/:id/demo-payment")
  completeDemoPayment(@Param("id") id: string) {
    return this.portfolioProjectsService.completeDemoPayment(id);
  }

  // Generates the real PDF file and stores it in R2. Public generation is only
  // allowed after the clean PDF is unlocked through payment or premium access.
  @Post("public/:id/generate-pdf")
  generatePublicPdf(@Param("id") id: string) {
    return this.portfolioProjectsService.generatePdf(id, {
      requireCleanAccess: true,
    });
  }

  // Preview PDFs are intentionally watermarked and streamed inline. They are
  // not saved as generated versions and do not unlock the clean download flow.
  @Get("public/:id/preview-pdf")
  async previewPdf(@Param("id") id: string, @Res() response: Response) {
    const previewPdf = await this.portfolioProjectsService.generatePreviewPdf(id);

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
  async downloadCoverTestPdf(@Param("id") id: string, @Res() response: Response) {
    const coverPdf = await this.portfolioProjectsService.generateCoverTestPdf(id);

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${coverPdf.filename}"`,
    );
    response.send(coverPdf.buffer);
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
  listMyProjects(
    @Req() request: ArtistRequest,
    @Query() query: ListPortfolioProjectsQueryDto,
  ) {
    return this.portfolioProjectsService.listForArtist(request.artistUser!.id, query);
  }

  @UseGuards(ArtistAuthGuard)
  @Get("me/:id")
  getMyProject(@Req() request: ArtistRequest, @Param("id") id: string) {
    return this.portfolioProjectsService.getForArtist(request.artistUser!.id, id);
  }
}
