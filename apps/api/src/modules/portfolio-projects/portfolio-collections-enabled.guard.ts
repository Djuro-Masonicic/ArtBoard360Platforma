import { CanActivate, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { env } from "../../config/env";
@Injectable()
export class PortfolioCollectionsEnabledGuard implements CanActivate {
  canActivate() {
    if (!env.portfolioCollectionsEnabled) throw new ServiceUnavailableException("Kolekcijski tok još nije uključen.");
    return true;
  }
}
