import { Module } from "@nestjs/common";

import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

/**
 * StatsModule contains simple read-only counters for public pages.
 */
@Module({
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
