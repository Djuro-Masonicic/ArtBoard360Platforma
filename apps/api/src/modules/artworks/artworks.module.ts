import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AdminArtworksController } from "./admin-artworks.controller";
import { ArtworksController } from "./artworks.controller";
import { ArtworksService } from "./artworks.service";

@Module({
  imports: [AuthModule],
  controllers: [ArtworksController, AdminArtworksController],
  providers: [ArtworksService],
})
export class ArtworksModule {}
