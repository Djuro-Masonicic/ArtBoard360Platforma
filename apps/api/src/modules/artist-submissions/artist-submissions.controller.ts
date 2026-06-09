import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { env } from "../../config/env";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import {
  CreateArtistSubmissionDto,
  ListArtistSubmissionsQueryDto,
  UpdateArtistSubmissionDto,
} from "./artist-submissions.dto";
import { ArtistSubmissionsService } from "./artist-submissions.service";

interface ArtistSubmissionFiles {
  portfolioPdf?: Express.Multer.File[];
  profilePhoto?: Express.Multer.File[];
  featuredWorks?: Express.Multer.File[];
}

@Controller("artist-submissions")
export class ArtistSubmissionsController {
  constructor(private readonly artistSubmissionsService: ArtistSubmissionsService) {}

  @UseGuards(AdminAuthGuard)
  @Get()
  listSubmissions(@Query() query: ListArtistSubmissionsQueryDto) {
    return this.artistSubmissionsService.listSubmissions(query);
  }

  @UseGuards(AdminAuthGuard)
  @Get(":id")
  getSubmissionById(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
    return this.artistSubmissionsService.getSubmissionById(id);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "portfolioPdf", maxCount: 1 },
        { name: "profilePhoto", maxCount: 1 },
        { name: "featuredWorks", maxCount: 25 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: env.maxUploadFileSizeBytes,
        },
      },
    ),
  )
  createSubmission(
    @UploadedFiles() files: ArtistSubmissionFiles,
    @Body() dto: CreateArtistSubmissionDto,
  ) {
    return this.artistSubmissionsService.createSubmission(dto, files);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(":id")
  updateSubmission(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateArtistSubmissionDto,
  ) {
    return this.artistSubmissionsService.updateSubmission(id, dto);
  }
}
