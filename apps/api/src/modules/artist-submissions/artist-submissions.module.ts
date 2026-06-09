import { Module } from "@nestjs/common";

import { MailModule } from "../../mail/mail.module";
import { AuthModule } from "../auth/auth.module";
import { ArtistSubmissionsController } from "./artist-submissions.controller";
import { ArtistSubmissionsService } from "./artist-submissions.service";

@Module({
  imports: [MailModule, AuthModule],
  controllers: [ArtistSubmissionsController],
  providers: [ArtistSubmissionsService],
})
export class ArtistSubmissionsModule {}
