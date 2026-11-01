const assert = require("node:assert/strict");
const { createHash, randomUUID } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

// Local-only maintenance, never an application startup hook. All restore/test
// databases and backup files are retained; this script never drops anything.
const root = path.resolve(__dirname, "../../..");
const environment = require("dotenv").parse(fs.readFileSync(path.join(root, ".env")));
const target = new URL(environment.DIRECT_URL || environment.DATABASE_URL);
assert.equal(target.hostname, "localhost", "Only the reviewed local database is allowed");
assert.equal(target.port, "5433");
assert.equal(target.pathname, "/artboard_platforma");
const migration = "20261026193000_portfolio_profile_fields";
const container = "artboardplatforma-postgres-1";
const applyLocal = process.argv.includes("--apply-local");
assert(process.argv.slice(2).every((arg) => arg === "--apply-local"), "Unknown argument");
const suffix = `${new Date().toISOString().slice(0, 10).replaceAll("-", "")}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
const restoreDatabase = `artboard_restore_${suffix}`;
const backupDirectory = path.join(root, ".backups", suffix);
const backupPath = path.join(backupDirectory, "before-profile-fields.dump");
const containerBackup = `/tmp/artboard_${suffix}.dump`;
const reportPath = path.join(backupDirectory, "verification.json");
const quote = (value) => `"${value.replaceAll('"', '""')}"`;
const restoreUrl = new URL(target);
restoreUrl.pathname = `/${restoreDatabase}`;
const report = {
  startedAt: new Date().toISOString(),
  target: "localhost:5433/artboard_platforma",
  migration,
  restoreDatabase,
  backupPath: path.relative(root, backupPath),
  appliedLocal: false,
  phase: "preflight",
};

function docker(args) {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

async function connection(url, callback) {
  const client = new Client({ connectionString: url.toString(), application_name: "artboard_verified_local_migration" });
  await client.connect();
  try {
    await client.query("SET TIME ZONE 'UTC'");
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function manifest(client, columnsByTable) {
  const tables = columnsByTable || Object.fromEntries((await client.query(`
    SELECT table_name, array_agg(column_name::text ORDER BY ordinal_position) AS columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname='public')
    GROUP BY table_name ORDER BY table_name
  `)).rows.map((row) => [row.table_name, row.columns]));
  const result = {};
  for (const [table, columns] of Object.entries(tables)) {
    const rows = await client.query(`SELECT row_to_json(t)::text AS payload FROM
      (SELECT ${columns.map(quote).join(",")} FROM public.${quote(table)}) t
      ORDER BY to_jsonb(t)::text COLLATE "C"`);
    const digest = createHash("sha256");
    for (const row of rows.rows) digest.update(row.payload).update("\n");
    result[table] = { columns, count: rows.rowCount, sha256: digest.digest("hex") };
  }
  return result;
}

async function readManifest(url, columns) {
  return connection(url, async (client) => {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    try { return await manifest(client, columns); }
    finally { await client.query("ROLLBACK"); }
  });
}

function migrationDeploy(url) {
  const cli = require.resolve("prisma/build/index.js");
  // Both URL variables point at the same explicitly checked target. CLI
  // arguments/output never include credentials. No migrate dev/reset/seed.
  const output = execFileSync(process.execPath, [cli, "migrate", "deploy"], {
    cwd: path.join(root, "apps/api"), encoding: "utf8",
    env: { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString() },
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert(output.includes(migration), "Expected migration was not applied");
}

async function verifyMigration(url, original) {
  const columns = Object.fromEntries(Object.entries(original)
    .filter(([table]) => table !== "_prisma_migrations")
    .map(([table, value]) => [table, value.columns]));
  const actual = await readManifest(url, columns);
  for (const [table, value] of Object.entries(actual)) assert.deepEqual(value, original[table], `${table}: existing data changed`);
  await connection(url, async (client) => {
    const status = await client.query('SELECT finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name=$1', [migration]);
    assert.equal(status.rowCount, 1);
    assert(status.rows[0].finished_at && !status.rows[0].rolled_back_at);
    const nonNull = await client.query(`SELECT
      (SELECT count(*)::int FROM "Artist" WHERE "dateOfBirth" IS NOT NULL) AS artists,
      (SELECT count(*)::int FROM "PortfolioProject" WHERE "dateOfBirth" IS NOT NULL
        OR "behanceUrl" IS NOT NULL OR motto IS NOT NULL OR "mottoAuthor" IS NOT NULL
        OR "coverImageStoragePath" IS NOT NULL) AS projects`);
    assert.deepEqual(nonNull.rows[0], { artists: 0, projects: 0 });
  });
  return Object.fromEntries(Object.entries(actual).map(([table, value]) => [table, { count: value.count, sha256: value.sha256 }]));
}

async function main() {
  // Refuse another pending migration or a partially applied migration. A
  // deploy command must not silently bundle unrelated changes.
  await connection(target, async (client) => {
    const applied = await client.query('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"');
    assert(applied.rows.every((row) => row.finished_at && !row.rolled_back_at), "Resolve migration history first");
    const existing = new Set(applied.rows.map((row) => row.migration_name));
    const pending = fs.readdirSync(path.join(root, "apps/api/prisma/migrations"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !existing.has(entry.name)).map((entry) => entry.name);
    assert.deepEqual(pending, [migration], "Only the profile-fields migration may be pending");
  });
  const sql = fs.readFileSync(path.join(root, "apps/api/prisma/migrations", migration, "migration.sql"), "utf8");
  assert(!/\b(DROP|DELETE|UPDATE|TRUNCATE|RENAME)\b/i.test(sql.replace(/^--.*$/gm, "")));
  assert.equal((sql.match(/ADD COLUMN/g) || []).length, 6);
  fs.mkdirSync(backupDirectory, { recursive: true });
  report.phase = "backup";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  // pg_dump and the data manifest use the SAME exported snapshot.
  const original = await connection(target, async (client) => {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    try {
      const snapshot = (await client.query("SELECT pg_export_snapshot() AS id")).rows[0].id;
      docker(["exec", container, "pg_dump", "-U", "postgres", "-d", "artboard_platforma", "--format=custom", `--snapshot=${snapshot}`, `--file=${containerBackup}`]);
      return await manifest(client);
    } finally { await client.query("ROLLBACK"); }
  });
  docker(["cp", `${container}:${containerBackup}`, backupPath]);
  report.backupSha256 = createHash("sha256").update(fs.readFileSync(backupPath)).digest("hex");
  report.originalManifest = original;
  report.phase = "restore";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const adminUrl = new URL(target);
  adminUrl.pathname = "/postgres";
  await connection(adminUrl, (client) => client.query(`CREATE DATABASE ${quote(restoreDatabase)} TEMPLATE template0`));
  // Restore the HOST copy that would be used in recovery, not the original
  // dump inside the container. This also checks the copied backup archive.
  const restoreArchive = `/tmp/artboard_restore_${suffix}.dump`;
  docker(["cp", backupPath, `${container}:${restoreArchive}`]);
  docker(["exec", container, "pg_restore", "-U", "postgres", "--exit-on-error", "--no-owner", `--dbname=${restoreDatabase}`, restoreArchive]);
  assert.deepEqual(await readManifest(restoreUrl), original, "Backup restore did not reproduce all tables/data");
  report.restoreVerified = true;
  report.phase = "isolated-migration";
  migrationDeploy(restoreUrl);
  report.isolatedMigrationVerified = await verifyMigration(restoreUrl, original);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  if (applyLocal) {
    assert.deepEqual(await readManifest(target), original, "Local database changed since backup; create a fresh backup");
    report.phase = "local-migration";
    report.localDeploymentAttempted = true;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    migrationDeploy(target);
    report.appliedLocal = true;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    report.localMigrationVerified = await verifyMigration(target, original);
  }
  report.phase = "complete";
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ restoreVerified: true, isolatedMigrationVerified: true, appliedLocal: report.appliedLocal,
    restoreDatabase, backupPath: report.backupPath, reportPath: path.relative(root, reportPath),
    tablesVerified: Object.keys(original).length }, null, 2));
}

main().catch((error) => {
  // Do not print connection objects, child-process environments or database
  // row values, including assertion diffs, into a terminal/log.
  report.failed = true;
  report.failureType = error.name;
  if (fs.existsSync(backupDirectory)) fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.error(`Migration verification stopped (${error.name}). No cleanup/deletion was attempted. Inspect the private verification report.`);
  process.exitCode = 1;
});
