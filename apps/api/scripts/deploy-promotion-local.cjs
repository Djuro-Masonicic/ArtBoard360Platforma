const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  { Client } = require("pg"),
  { execFileSync } = require("child_process");
const root = path.resolve(__dirname, "../../.."),
  migration = "20261031150000_promotion_generator",
  env = require("dotenv").parse(fs.readFileSync(path.join(root, ".env"))),
  u = new URL(env.DIRECT_URL || env.DATABASE_URL);
assert(
  ["localhost", "127.0.0.1"].includes(u.hostname) &&
    u.port === "5433" &&
    u.pathname === "/artboard_platforma",
  "Local working database only",
);
(async () => {
  const c = new Client({ connectionString: u.href });
  await c.connect();
  try {
    const migrations = (
      await c.query(
        'SELECT migration_name,finished_at,rolled_back_at FROM "_prisma_migrations"',
      )
    ).rows;
    const pending = fs
      .readdirSync(path.join(root, "apps/api/prisma/migrations"))
      .filter(
        (n) =>
          fs.existsSync(
            path.join(root, "apps/api/prisma/migrations", n, "migration.sql"),
          ) &&
          !migrations.some(
            (m) => m.migration_name === n && m.finished_at && !m.rolled_back_at,
          ),
      );
    assert(
      !migrations.some((m) => !m.finished_at && !m.rolled_back_at),
      "Unresolved migration",
    );
    assert(
      pending.length === 0 ||
        (pending.length === 1 && pending[0] === migration),
      "Unexpected pending migration",
    );
    const count = async () => {
      const result = {};
      for (const table of [
        "Artist",
        "ArtistAccount",
        "Artwork",
        "ArtistCollection",
        "PortfolioProject",
        "PortfolioPurchase",
      ])
        result[table] = Number(
          (await c.query(`SELECT count(*) FROM "${table}"`)).rows[0].count,
        );
      return result;
    };
    const before = await count();
    console.log(
      JSON.stringify({
        pending,
        before,
        sql: "apps/api/prisma/migrations/" + migration + "/migration.sql",
      }),
    );
    if (!process.argv.includes("--apply")) return;
    execFileSync(
      process.execPath,
      [
        path.join(root, "node_modules/prisma/build/index.js"),
        "migrate",
        "deploy",
      ],
      {
        cwd: path.join(root, "apps/api"),
        env: { ...process.env, ...env },
        stdio: "pipe",
      },
    );
    const after = await count();
    assert.deepEqual(after, before, "Existing record counts changed");
    const result = { migration, applied: true, before, after };
    fs.mkdirSync(path.join(root, ".tmp/promotion"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".tmp/promotion/local-migration.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result));
  } finally {
    await c.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
