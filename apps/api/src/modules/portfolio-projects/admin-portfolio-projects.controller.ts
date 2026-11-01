import { Controller, ForbiddenException, Get, Header, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";

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
  @Header("Cache-Control", "no-store")
  listProjects(@Query() query: ListPortfolioProjectsQueryDto) {
    return this.portfolioProjectsService.listForAdmin(query);
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  getProject(@Param("id") id: string) {
    return this.portfolioProjectsService.getForAdmin(id);
  }

  @Get(":id/preview-pdf")
  async previewProject(@Param("id") id: string, @Res() response: Response) {
    const pdf = await this.portfolioProjectsService.generateAdminPreviewPdf(id);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Cache-Control", "no-store");
    response.send(pdf.buffer);
  }

  // Admin can generate a backend PDF version for review/support purposes.
  // The public user download path still stays locked behind payment/premium.
  @Post(":id/generate-pdf")
  generateProjectPdf(@Param("id") id: string) {
    throw new ForbiddenException("Admin pregled koristi watermarked preview; izvoz troši samo pravo prijavljenog vlasnika.");
  }
}
