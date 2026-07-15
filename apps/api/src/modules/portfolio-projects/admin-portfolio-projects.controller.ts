import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";

import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { ListPortfolioProjectsQueryDto } from "./portfolio-projects.dto";
import { PortfolioProjectsService } from "./portfolio-projects.service";

@UseGuards(AdminAuthGuard)
@Controller("admin/portfolio-projects")
export class AdminPortfolioProjectsController {
  constructor(private readonly portfolioProjectsService: PortfolioProjectsService) {}

  // Admin pregled je potreban jer portfolio builder ima i guest tok i placanja.
  // U MVP-u ovdje samo citamo projekte; kasnije dodajemo status placanja i PDF akcije.
  @Get()
  listProjects(@Query() query: ListPortfolioProjectsQueryDto) {
    return this.portfolioProjectsService.listForAdmin(query);
  }

  @Get(":id")
  getProject(@Param("id") id: string) {
    return this.portfolioProjectsService.getForAdmin(id);
  }

  // Admin can generate a backend PDF version for review/support purposes.
  // The public user download path still stays locked behind payment/premium.
  @Post(":id/generate-pdf")
  generateProjectPdf(@Param("id") id: string) {
    return this.portfolioProjectsService.generatePdf(id);
  }
}
