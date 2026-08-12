import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { OpportunitiesController } from "./opportunities.controller";
import { OpportunitiesService } from "./opportunities.service";

/**
 * Opportunities module.
 *
 * Keeps the future jobs/calls feature isolated from artists and portfolio
 * builder logic. Public users can read published opportunities, while admins
 * can create and maintain them through guarded endpoints.
 */
@Module({
  imports: [AuthModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
})
export class OpportunitiesModule {}
