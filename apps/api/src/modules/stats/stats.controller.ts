import { Controller, Get } from "@nestjs/common";

import { StatsService } from "./stats.service";

/**
 * Public statistics endpoint.
 *
 * The frontend uses this for homepage proof counters, so those values come
 * from Postgres instead of being hardcoded or estimated from a partial API list.
 */
@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get("artboard")
  getArtBoardStats() {
    return this.statsService.getArtBoardStats();
  }
}
