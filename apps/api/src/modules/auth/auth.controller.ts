import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";

import { AdminAuthGuard, type AdminRequest } from "./admin-auth.guard";
import { ArtistAuthGuard, type ArtistRequest } from "./artist-auth.guard";
import { CompleteArtistSetupDto, LoginAdminDto, LoginArtistDto } from "./auth.dto";
import { AuthService } from "./auth.service";

/**
 * Admin auth endpoints stay intentionally small:
 * login to create a session token, me to validate it, logout as a client-side
 * cookie cleanup signal.
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginAdminDto) {
    return this.authService.login(dto);
  }

  @Post("artist/login")
  loginArtist(@Body() dto: LoginArtistDto) {
    return this.authService.loginArtist(dto);
  }

  @Get("artist/setup/:token")
  inspectArtistSetupToken(@Req() request: RequestWithParams) {
    return this.authService.inspectArtistSetupToken(request.params.token);
  }

  @Post("artist/setup-password")
  completeArtistSetup(@Body() dto: CompleteArtistSetupDto) {
    return this.authService.completeArtistSetup(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Get("me")
  me(@Req() request: AdminRequest) {
    return {
      user: request.adminUser,
    };
  }

  @UseGuards(ArtistAuthGuard)
  @Get("artist/me")
  artistMe(@Req() request: ArtistRequest) {
    return {
      user: request.artistUser,
    };
  }

  @Post("logout")
  logout() {
    return {
      success: true,
    };
  }
}

interface RequestWithParams {
  params: {
    token: string;
  };
}
