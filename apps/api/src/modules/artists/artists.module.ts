import { Module } from "@nestjs/common";

import { ArtistsController } from "./artists.controller";
import { ArtistsService } from "./artists.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [ArtistsController],
  providers: [ArtistsService],
  exports: [ArtistsService],
})
export class ArtistsModule {}
