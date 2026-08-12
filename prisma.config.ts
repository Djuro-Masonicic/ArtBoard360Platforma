import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 no longer reads database URLs from schema.prisma.
 *
 * This config gives Prisma CLI commands one clear place to find:
 * - the schema file used by the API workspace
 * - the migrations folder
 * - the active DATABASE_URL from the root .env file
 */
export default defineConfig({
  schema: "apps/api/prisma/schema.prisma",
  migrations: {
    path: "apps/api/prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
