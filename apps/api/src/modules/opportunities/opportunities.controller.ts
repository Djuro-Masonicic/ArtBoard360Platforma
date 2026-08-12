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
  UseGuards,
} from "@nestjs/common";

import { AdminAuthGuard } from "../auth/admin-auth.guard";
import {
  CreateOpportunityDto,
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

  @UseGuards(AdminAuthGuard)
  @Get(":id")
  getOpportunity(@Param("id", ParseUUIDPipe) id: string) {
    return this.opportunitiesService.getOpportunityById(id);
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
