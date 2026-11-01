import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ArtistSubscriptionsController } from "./artist-subscriptions.controller";
import { ArtistSubscriptionsService } from "./artist-subscriptions.service";
import { SubscriptionOverviewService } from "./subscription-overview.service";
import { PortfolioProjectsModule } from "../portfolio-projects/portfolio-projects.module";

@Module({
  imports: [AuthModule, PortfolioProjectsModule],
  controllers: [ArtistSubscriptionsController],
  providers: [ArtistSubscriptionsService, SubscriptionOverviewService],
  exports: [SubscriptionOverviewService],
})
export class ArtistSubscriptionsModule {}
