import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { env } from "../../config/env";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { ArtistAuthGuard, ArtistRequest } from "../auth/artist-auth.guard";
import {
  CreateOpportunityDto,
  CreatePublicOpportunitySubmissionDto,
  ListOpportunitiesQueryDto,
  UpdateOpportunityDto,
} from "./opportunities.dto";
import { OpportunitiesService } from "./opportunities.service";

@Controller("opportunities")
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  listOpportunities(@Query() query: ListOpportunitiesQueryDto) {
    return this.opportunitiesService.listOpportunities(query);
  }

  @UseGuards(AdminAuthGuard)
  @Get("admin")
  listAdminOpportunities(@Query() query: ListOpportunitiesQueryDto) {
    return this.opportunitiesService.listAdminOpportunities(query);
  }

  @Get("public/:identifier")
  getPublicOpportunity(@Param("identifier") identifier: string) {
    return this.opportunitiesService.getPublicOpportunity(identifier);
  }

  @Post(":id/view")
  recordPublicView(@Param("id", ParseUUIDPipe) id: string) {
    return this.opportunitiesService.recordPublicView(id);
  }

  @UseGuards(AdminAuthGuard)
  @Get(":id")
  getOpportunity(@Param("id", ParseUUIDPipe) id: string) {
    return this.opportunitiesService.getOpportunityById(id);
  }

  @UseGuards(ArtistAuthGuard)
  @Post(":id/apply")
  applyToOpportunity(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: ArtistRequest,
  ) {
    return this.opportunitiesService.applyToOpportunity(id, request.artistUser!.id);
  }

  @Post("submit")
  @UseInterceptors(
    FileInterceptor("coverImage", {
      storage: memoryStorage(),
      limits: {
        fileSize: Math.min(env.maxUploadFileSizeBytes, 5 * 1024 * 1024),
      },
    }),
  )
  submitOpportunity(
    @UploadedFile() coverImage: Express.Multer.File | undefined,
    @Body() dto: CreatePublicOpportunitySubmissionDto,
  ) {
    return this.opportunitiesService.createPublicSubmission(dto, coverImage);
  }

  @UseGuards(AdminAuthGuard)
  @Post()
  createOpportunity(@Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.createOpportunity(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(":id")
  updateOpportunity(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.opportunitiesService.updateOpportunity(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(":id")
  deleteOpportunity(@Param("id", ParseUUIDPipe) id: string) {
    return this.opportunitiesService.deleteOpportunity(id);
  }
}
