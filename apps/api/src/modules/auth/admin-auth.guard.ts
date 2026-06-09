import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { AuthService, type AdminSessionUser } from "./auth.service";

export type AdminRequest = Request & {
  adminUser?: AdminSessionUser;
};

/**
 * We keep the guard explicit and token-based so admin routes can opt in
 * without bringing in a heavier auth framework before we actually need one.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const authorizationHeader = request.headers.authorization;
    const accessToken = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      throw new UnauthorizedException("Missing admin access token.");
    }

    request.adminUser = await this.authService.getAuthenticatedAdminUser(accessToken);
    return true;
  }
}
