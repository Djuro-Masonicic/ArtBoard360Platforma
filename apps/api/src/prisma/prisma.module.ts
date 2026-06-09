import { Global, Module } from "@nestjs/common";

import { PrismaService } from "./prisma.service";

/**
 * Prisma is shared across the app, so we expose it as a global module.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
