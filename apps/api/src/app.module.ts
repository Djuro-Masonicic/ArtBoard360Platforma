import { Module } from "@nestjs/common";

import { ArtworksModule } from "./modules/artworks/artworks.module";
import { ArtistsModule } from "./modules/artists/artists.module";
import { ArtistSubmissionsModule } from "./modules/artist-submissions/artist-submissions.module";
import { ArtistSubscriptionsModule } from "./modules/artist-subscriptions/artist-subscriptions.module";
import { AuthModule } from "./modules/auth/auth.module";
import { FaqsModule } from "./modules/faqs/faqs.module";
import { OpportunitiesModule } from "./modules/opportunities/opportunities.module";
import { PortfolioProjectsModule } from "./modules/portfolio-projects/portfolio-projects.module";
import { StatsModule } from "./modules/stats/stats.module";
import { TestimonialsModule } from "./modules/testimonials/testimonials.module";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";

/**
 * The root module is intentionally small.
 * We wire shared infrastructure here and keep feature logic inside modules.
 */
@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AuthModule,
    ArtistsModule,
    ArtistSubmissionsModule,
    ArtistSubscriptionsModule,
    ArtworksModule,
    FaqsModule,
    OpportunitiesModule,
    PortfolioProjectsModule,
    StatsModule,
    TestimonialsModule,
  ],
})
export class AppModule {}
