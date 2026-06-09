import { Global, Module } from "@nestjs/common";

import { R2StorageService } from "./r2-storage.service";

/**
 * Storage is a cross-cutting concern, so we expose it globally just like Prisma.
 * That keeps feature modules focused on application logic rather than provider setup.
 */
@Global()
@Module({
  providers: [R2StorageService],
  exports: [R2StorageService],
})
export class StorageModule {}
