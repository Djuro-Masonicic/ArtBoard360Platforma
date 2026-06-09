import { Module } from "@nestjs/common";

import { ArtworksModule } from "./modules/artworks/artworks.module";
import { ArtistsModule } from "./modules/artists/artists.module";
import { ArtistSubmissionsModule } from "./modules/artist-submissions/artist-submissions.module";
import { AuthModule } from "./modules/auth/auth.module";
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
    ArtworksModule,
    TestimonialsModule,
  ],
})
export class AppModule {}
