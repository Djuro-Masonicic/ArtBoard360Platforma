import { defineConfig } from "prisma/config";

/**
 * Prisma 7 reads connection details from this config file instead of the schema.
 * We keep the schema focused on data modeling and the config focused on CLI/runtime setup.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI operations such as migrations prefer a direct connection when
    // one is available. That maps well to Railway setups where runtime traffic
    // and migration traffic may use different connection strings.
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/artboard_platforma",
  },
});
