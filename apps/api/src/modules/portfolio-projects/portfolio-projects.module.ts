import { Module } from "@nestjs/common";

import { StorageModule } from "../../storage/storage.module";
import { AuthModule } from "../auth/auth.module";
import { AdminPortfolioProjectsController } from "./admin-portfolio-projects.controller";
import { PortfolioProjectsController } from "./portfolio-projects.controller";
import { PortfolioProjectsService } from "./portfolio-projects.service";

// Portfolio Builder is intentionally its own module because it will grow into:
// PDF generation, payment tracking, public share links, and admin review.
@Module({
  imports: [AuthModule, StorageModule],
  controllers: [PortfolioProjectsController, AdminPortfolioProjectsController],
  providers: [PortfolioProjectsService],
})
export class PortfolioProjectsModule {}
