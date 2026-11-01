import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";

// Legacy aliases pass verified identity to the ownership checks in the service.
// Anonymous Guest documents use the separate transient commerce endpoints;
// stored Guest/orphan records never gain editor access through these aliases.
@Injectable()
export class PortfolioAccessGuard implements CanActivate {
  constructor(private readonly artistAuthGuard: ArtistAuthGuard) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ArtistRequest>();
    if (!request.headers.authorization) return true;
    return this.artistAuthGuard.canActivate(context);
  }
}
