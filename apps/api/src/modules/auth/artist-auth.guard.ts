import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { AuthService, type ArtistSessionUser } from "./auth.service";

export type ArtistRequest = Request & {
  artistUser?: ArtistSessionUser;
};

/**
 * Artist routes use the same bearer-token approach as admin routes,
 * but they resolve to the artist account attached to the session.
 */
@Injectable()
export class ArtistAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ArtistRequest>();
    const authorizationHeader = request.headers.authorization;
    const accessToken = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      throw new UnauthorizedException("Missing artist access token.");
    }

    request.artistUser = await this.authService.getAuthenticatedArtistUser(accessToken);
    return true;
  }
}
