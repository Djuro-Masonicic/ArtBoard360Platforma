import { Module } from "@nestjs/common";

import { MailModule } from "../../mail/mail.module";
import { AuthController } from "./auth.controller";
import { AdminAuthGuard } from "./admin-auth.guard";
import { ArtistAuthGuard } from "./artist-auth.guard";
import { AuthService } from "./auth.service";

/**
 * The auth module currently covers admin-only access for the editorial area.
 * It can later grow into role-based auth without changing the existing login flow.
 */
@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [AuthService, AdminAuthGuard, ArtistAuthGuard],
  exports: [AuthService, AdminAuthGuard, ArtistAuthGuard],
})
export class AuthModule {}
