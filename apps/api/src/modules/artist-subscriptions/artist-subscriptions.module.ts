import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ArtistSubscriptionsController } from "./artist-subscriptions.controller";
import { ArtistSubscriptionsService } from "./artist-subscriptions.service";

@Module({
  imports: [AuthModule],
  controllers: [ArtistSubscriptionsController],
  providers: [ArtistSubscriptionsService],
})
export class ArtistSubscriptionsModule {}
