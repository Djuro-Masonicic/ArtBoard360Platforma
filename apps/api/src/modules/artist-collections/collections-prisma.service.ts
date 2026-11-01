import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from ".prisma/collections-client";
import { env } from "../../config/env";

/** New model client; legacy services retain the pre-migration write schema. */
@Injectable()
export class CollectionsPrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: env.databaseUrl }) });
  }
  async onModuleDestroy() { await this.$disconnect(); }
}
