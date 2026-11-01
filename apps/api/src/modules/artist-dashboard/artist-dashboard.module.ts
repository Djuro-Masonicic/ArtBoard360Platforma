import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ArtistsModule } from "../artists/artists.module";
import { ArtistSubscriptionsModule } from "../artist-subscriptions/artist-subscriptions.module";
import { MailModule } from "../../mail/mail.module";
import { ArtistDashboardController, AdminArtistDeletionController, ArtistSensitiveActionGuard } from "./artist-dashboard.controller";
import { ArtistDashboardService } from "./artist-dashboard.service";
@Module({ imports: [AuthModule, ArtistsModule, ArtistSubscriptionsModule, MailModule], controllers: [ArtistDashboardController, AdminArtistDeletionController], providers: [ArtistDashboardService, ArtistSensitiveActionGuard] })
export class ArtistDashboardModule {}
