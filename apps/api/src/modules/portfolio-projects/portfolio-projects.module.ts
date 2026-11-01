import { Module } from "@nestjs/common";

import { StorageModule } from "../../storage/storage.module";
import { AuthModule } from "../auth/auth.module";
import { AdminPortfolioProjectsController } from "./admin-portfolio-projects.controller";
import { PortfolioProjectsController } from "./portfolio-projects.controller";
import { PortfolioProjectsService } from "./portfolio-projects.service";
import { PortfolioAccessGuard } from "./portfolio-access.guard";
import { PortfolioCollectionsService } from "./portfolio-collections.service";
import { PortfolioCollectionsController } from "./portfolio-collections.controller";
import { PortfolioCollectionsEnabledGuard } from "./portfolio-collections-enabled.guard";
import { PortfolioCommerceService } from "./portfolio-commerce.service";
import { PortfolioGuestService } from "./portfolio-guest.service";
import { PortfolioCommerceController, AdminPortfolioPurchasesController, GuestProcessingGuard } from "./portfolio-commerce.controller";
import { PortfolioEditorController, PortfolioEditorProcessingGuard } from "./portfolio-editor.controller";
import { PortfolioEditorService } from "./portfolio-editor.service";
import { PortfolioPaymentContextController } from "./portfolio-payment-context.controller";
import { PortfolioPaymentContextService } from "./portfolio-payment-context.service";
import { MockPaymentsController, MockPaymentsGuard } from './mock-payments.controller';
import { MockPaymentsService } from './mock-payments.service';
import { PromotionPurchaseService } from '../promotions/promotion-purchase.service';

// Portfolio Builder is intentionally its own module because it will grow into:
// PDF generation, payment tracking, public share links, and admin review.
@Module({
  imports: [AuthModule, StorageModule],
  controllers: [PortfolioProjectsController, AdminPortfolioProjectsController, PortfolioCollectionsController, PortfolioCommerceController, AdminPortfolioPurchasesController, PortfolioEditorController, PortfolioPaymentContextController, MockPaymentsController],
  providers: [PortfolioProjectsService, PortfolioAccessGuard, PortfolioCollectionsService, PortfolioCollectionsEnabledGuard, PortfolioCommerceService, PortfolioGuestService, GuestProcessingGuard, PortfolioEditorService, PortfolioEditorProcessingGuard, PortfolioPaymentContextService, MockPaymentsService, MockPaymentsGuard, PromotionPurchaseService],
  exports: [PortfolioCommerceService],
})
export class PortfolioProjectsModule {}
