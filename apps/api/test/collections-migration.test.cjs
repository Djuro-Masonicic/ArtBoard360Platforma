const assert = require("node:assert/strict");
const { createHash, randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { before, after, test } = require("node:test");
const { Client } = require("pg");

// Explicit opt-in: clone the verified restore database, NEVER the configured
// working database. No application/storage/mail code is loaded by this suite.
const root = path.resolve(__dirname, "../../..");
const proposal = path.join(root, "apps/api/prisma/proposals/collections-v2");
const env = require("dotenv").parse(fs.readFileSync(path.join(root, ".env")));
const configured = new URL(env.DIRECT_URL || env.DATABASE_URL);
const template = process.env.ARTBOARD_COLLECTIONS_RESTORE_DATABASE;
assert.equal(configured.hostname, "localhost");
assert.equal(configured.port, "5433");
assert.equal(configured.pathname, "/artboard_platforma");
assert.match(template || "", /^artboard_restore_\d{8}_[a-f0-9]{12}$/, "Provide the database from the verified restore report");
const database = `artboard_collections_test_${randomUUID().replaceAll("-", "")}`;
const quote = (value) => `"${value.replaceAll('"', '""')}"`;
const url = new URL(configured);
url.pathname = `/${database}`;
const report = { database, template, passed: [], migrationPreservedExistingData: false };
let client;

async function connect(databaseUrl = url) {
  const connection = new Client({ connectionString: databaseUrl.toString(), application_name: "artboard_collections_isolated_test" });
  await connection.connect();
  await connection.query("SET TIME ZONE 'UTC'");
  return connection;
}

async function manifest(connection, originalColumns) {
  const columns = originalColumns || Object.fromEntries((await connection.query(`
    SELECT table_name, array_agg(column_name::text ORDER BY ordinal_position) AS columns
    FROM information_schema.columns WHERE table_schema='public'
    AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname='public')
    GROUP BY table_name ORDER BY table_name
  `)).rows.map((row) => [row.table_name, row.columns]));
  const output = {};
  for (const [table, names] of Object.entries(columns)) {
    const rows = await connection.query(`SELECT row_to_json(t)::text AS payload FROM
      (SELECT ${names.map(quote).join(",")} FROM public.${quote(table)}) t
      ORDER BY to_jsonb(t)::text COLLATE "C"`);
    const hash = createHash("sha256");
    rows.rows.forEach((row) => hash.update(row.payload).update("\n"));
    output[table] = { columns: names, count: rows.rowCount, sha256: hash.digest("hex") };
  }
  return output;
}

async function fixture(connection = client) {
  const ids = Object.fromEntries(["a", "b", "w", "w2", "wb", "c", "c2", "cb", "p", "p2", "pc", "pc2", "foreignPc", "pa"].map((key) => [key, randomUUID()]));
  await connection.query(`INSERT INTO "Artist" (id,name,slug,"updatedAt") VALUES
    ($1::uuid,'Isolated A',$1::text,now()),($2::uuid,'Isolated B',$2::text,now())`, [ids.a, ids.b]);
  await connection.query(`INSERT INTO "ArtistCollection" (id,"artistId",title,"updatedAt") VALUES
    ($1,$2,'Source A',now()),($3,$2,'Source A second',now()),($4,$5,'Source B',now())`, [ids.c, ids.a, ids.c2, ids.cb, ids.b]);
  await connection.query(`INSERT INTO "Artwork" (id,"artistId","imageUrl","artistCollectionId","collectionOrderIndex","orderIndex",title,"updatedAt") VALUES
    ($1::uuid,$2,$1::text,$3,0,10,'Original first',now()),
    ($4::uuid,$2,$4::text,NULL,NULL,20,'Original second',now()),
    ($5::uuid,$6,$5::text,$7,0,0,'Other artist',now())`, [ids.w, ids.a, ids.c, ids.w2, ids.wb, ids.b, ids.cb]);
  await connection.query(`INSERT INTO "PortfolioProject" (id,source,"artistName","updatedAt") VALUES
    ($1,'ARTBOARD_PROFILE','Isolated A',now()),($2,'ARTBOARD_PROFILE','Isolated B',now())`, [ids.p, ids.p2]);
  await connection.query(`INSERT INTO "PortfolioCollection" (id,"portfolioId","sourceCollectionId",title,"updatedAt") VALUES
    ($1,$2,$3,'Snapshot first',now()),($4,$2,NULL,'Local second',now()),($5,$6,NULL,'Other project',now())`, [ids.pc, ids.p, ids.c, ids.pc2, ids.foreignPc, ids.p2]);
  await connection.query(`INSERT INTO "PortfolioArtwork" (id,"portfolioId","sourceArtworkId","portfolioCollectionId","imageUrl","storagePath",title,year,technique,dimensions,price,"isSelected","orderIndex","collectionOrderIndex","sourceBaseline","updatedAt") VALUES
    ($1,$2,$3,$4,'https://storage.invalid/independent','portfolio-projects/isolated/independent.png',
     'Manual title','1999','Manual technique','20 x 30','EUR 123',true,17,0,$5::jsonb,now())`,
  [ids.pa, ids.p, ids.w, ids.pc, JSON.stringify({ version: 1, sourceArtworkId: ids.w, title: "Original first", artistCollectionId: ids.c })]);
  return ids;
}

async function rejectsSql(sql, params, code) {
  await client.query("SAVEPOINT expected_failure");
  try {
    await assert.rejects(client.query(sql, params), (error) => error.code === code);
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT expected_failure");
    await client.query("RELEASE SAVEPOINT expected_failure");
  }
}

function transactionTest(name, callback) {
  test(name, { concurrency: false }, async () => {
    await client.query("BEGIN");
    try {
      await callback(await fixture());
      report.passed.push(name);
    } finally {
      // Every deletion test touches only fixture UUIDs and is rolled back.
      await client.query("ROLLBACK");
    }
  });
}

before(async () => {
  const baseline = JSON.parse(fs.readFileSync(path.join(proposal, "baseline.json"), "utf8"));
  const actualSchemaHash = createHash("sha256").update(fs.readFileSync(path.join(root, "apps/api/prisma/compatibility/schema.prisma"))).digest("hex");
  assert.equal(actualSchemaHash, baseline.activeSchemaSha256, "Compatibility schema changed: rebase and review the baseline first");
  const adminUrl = new URL(configured);
  adminUrl.pathname = "/postgres";
  const admin = await connect(adminUrl);
  try {
    await admin.query(`CREATE DATABASE ${quote(database)} TEMPLATE ${quote(template)}`);
  } finally { await admin.end(); }
  client = await connect();
  const profileMigration = await client.query('SELECT finished_at FROM "_prisma_migrations" WHERE migration_name=$1 AND rolled_back_at IS NULL', ["20261026193000_portfolio_profile_fields"]);
  assert(profileMigration.rows[0]?.finished_at, "Template must have the verified profile-fields migration");
  const original = await manifest(client);
  const sql = fs.readFileSync(path.join(proposal, "migration.sql"), "utf8");
  const statements = sql.replace(/^--.*$/gm, "").split(";").map((part) => part.trim()).filter(Boolean);
  // ON DELETE / ON UPDATE describe FK behavior; they are not DML statements.
  assert(statements.every((statement) => /^(CREATE (UNIQUE )?INDEX |CREATE TABLE |ALTER TABLE "[^"]+" ADD (COLUMN|CONSTRAINT)\b)/.test(statement))
    && !/\b(DROP|TRUNCATE|RENAME)\b/i.test(sql.replace(/^--.*$/gm, "")), "Only additive SQL is allowed");
  await client.query("BEGIN");
  try { await client.query(sql); await client.query("COMMIT"); }
  catch (error) { await client.query("ROLLBACK"); throw error; }
  const oldColumns = Object.fromEntries(Object.entries(original).map(([table, value]) => [table, value.columns]));
  assert.deepEqual(await manifest(client, oldColumns), original, "Migration changed existing values");
  report.migrationPreservedExistingData = true;
  report.originalCounts = Object.fromEntries(Object.entries(original).map(([table, value]) => [table, value.count]));
});

after(async () => {
  if (client) await client.end();
  const resultDirectory = path.join(root, ".tmp/collections-4-2");
  fs.mkdirSync(resultDirectory, { recursive: true });
  fs.writeFileSync(path.join(resultDirectory, "migration-results.json"), JSON.stringify(report, null, 2));
  console.log(`Isolated database retained: ${database}; no working data or R2 objects touched.`);
});

test("migration preserves all old columns and keeps existing projects in format 1", async () => {
  assert(report.migrationPreservedExistingData);
  const invalid = await client.query(`SELECT count(*)::int AS count FROM "PortfolioProject"
    WHERE "collectionSchemaVersion"<>1 OR revision<>0 OR NOT "includeUncollectedArtworks" OR "sourceProfileBaseline" IS NOT NULL`);
  assert.equal(invalid.rows[0].count, 0);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM "ArtistCollection"')).rows[0].count, 0);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM "PortfolioCollection"')).rows[0].count, 0);
  report.passed.push("migration preserves all old columns and keeps existing projects in format 1");
});

transactionTest("local collections allow nullable source and independent metadata", async (i) => {
  await client.query(`INSERT INTO "PortfolioCollection" ("portfolioId",title,description,year,"updatedAt")
    VALUES ($1,'Local third','Local description','2020-2026',now())`, [i.p]);
  const row = (await client.query('SELECT "sourceCollectionId",title,description,year FROM "PortfolioCollection" WHERE "portfolioId"=$1 AND title=$2', [i.p, "Local third"])).rows[0];
  assert.deepEqual(row, { sourceCollectionId: null, title: "Local third", description: "Local description", year: "2020-2026" });
});

transactionTest("source work cannot belong to another artist's collection", async (i) => {
  await rejectsSql('UPDATE "Artwork" SET "artistCollectionId"=$1 WHERE id=$2', [i.cb, i.w], "23503");
  assert.equal((await client.query('SELECT "artistCollectionId" FROM "Artwork" WHERE id=$1', [i.w])).rows[0].artistCollectionId, i.c);
});

transactionTest("portfolio work cannot belong to another project's collection", async (i) => {
  await rejectsSql('UPDATE "PortfolioArtwork" SET "portfolioCollectionId"=$1 WHERE id=$2', [i.foreignPc, i.pa], "23503");
});

transactionTest("one source work cannot be duplicated across portfolio collections", async (i) => {
  await rejectsSql(`INSERT INTO "PortfolioArtwork" ("portfolioId","sourceArtworkId","portfolioCollectionId","imageUrl","updatedAt")
    VALUES ($1,$2,$3,'https://storage.invalid/duplicate',now())`, [i.p, i.w, i.pc2], "23505");
});

transactionTest("one source collection cannot be imported twice into a project", async (i) => {
  await rejectsSql(`INSERT INTO "PortfolioCollection" ("portfolioId","sourceCollectionId",title,"updatedAt")
    VALUES ($1,$2,'Duplicate',now())`, [i.p, i.c], "23505");
});

transactionTest("manual portfolio works with no source remain supported", async (i) => {
  await client.query(`INSERT INTO "PortfolioArtwork" ("portfolioId","imageUrl","updatedAt")
    VALUES ($1,'https://storage.invalid/manual-1',now()),($1,'https://storage.invalid/manual-2',now())`, [i.p]);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM "PortfolioArtwork" WHERE "portfolioId"=$1 AND "sourceArtworkId" IS NULL', [i.p])).rows[0].count, 2);
});

transactionTest("moving a snapshot preserves all manual fields and its independent asset", async (i) => {
  const before = (await client.query('SELECT * FROM "PortfolioArtwork" WHERE id=$1', [i.pa])).rows[0];
  await client.query('UPDATE "PortfolioArtwork" SET "portfolioCollectionId"=$1,"collectionOrderIndex"=3 WHERE id=$2', [i.pc2, i.pa]);
  const after = (await client.query('SELECT * FROM "PortfolioArtwork" WHERE id=$1', [i.pa])).rows[0];
  assert.deepEqual(after, { ...before, portfolioCollectionId: i.pc2, collectionOrderIndex: 3 });
  assert.equal((await client.query('SELECT "artistCollectionId" FROM "Artwork" WHERE id=$1', [i.w])).rows[0].artistCollectionId, i.c);
});

transactionTest("collection exclusion does not change work selection, order or metadata", async (i) => {
  const before = (await client.query('SELECT * FROM "PortfolioArtwork" WHERE id=$1', [i.pa])).rows[0];
  await client.query('UPDATE "PortfolioCollection" SET "isIncluded"=false WHERE id=$1', [i.pc]);
  assert.deepEqual((await client.query('SELECT * FROM "PortfolioArtwork" WHERE id=$1', [i.pa])).rows[0], before);
  await client.query('UPDATE "PortfolioCollection" SET "isIncluded"=true WHERE id=$1', [i.pc]);
  assert.deepEqual((await client.query('SELECT * FROM "PortfolioArtwork" WHERE id=$1', [i.pa])).rows[0], before);
});

transactionTest("uncollected group inclusion is persisted independently of work choices", async (i) => {
  await client.query('UPDATE "PortfolioArtwork" SET "portfolioCollectionId"=NULL WHERE id=$1', [i.pa]);
  await client.query('UPDATE "PortfolioProject" SET "includeUncollectedArtworks"=false WHERE id=$1', [i.p]);
  assert.equal((await client.query('SELECT "isSelected" FROM "PortfolioArtwork" WHERE id=$1', [i.pa])).rows[0].isSelected, true);
});

transactionTest("source collection removal requires explicit detachment and never deletes works", async (i) => {
  await rejectsSql('DELETE FROM "ArtistCollection" WHERE id=$1', [i.c], "23503");
  await client.query('UPDATE "Artwork" SET "artistCollectionId"=NULL,"collectionOrderIndex"=NULL WHERE "artistCollectionId"=$1', [i.c]);
  await client.query('DELETE FROM "ArtistCollection" WHERE id=$1', [i.c]);
  assert.equal((await client.query('SELECT id FROM "Artwork" WHERE id=$1', [i.w])).rowCount, 1);
  assert.equal((await client.query('SELECT "sourceCollectionId" FROM "PortfolioCollection" WHERE id=$1', [i.pc])).rows[0].sourceCollectionId, null);
});

transactionTest("portfolio collection removal preserves detached snapshots", async (i) => {
  await rejectsSql('DELETE FROM "PortfolioCollection" WHERE id=$1', [i.pc], "23503");
  await client.query('UPDATE "PortfolioArtwork" SET "portfolioCollectionId"=NULL,"collectionOrderIndex"=NULL WHERE "portfolioCollectionId"=$1', [i.pc]);
  await client.query('DELETE FROM "PortfolioCollection" WHERE id=$1', [i.pc]);
  const row = (await client.query('SELECT title,"isSelected","storagePath" FROM "PortfolioArtwork" WHERE id=$1', [i.pa])).rows[0];
  assert.deepEqual(row, { title: "Manual title", isSelected: true, storagePath: "portfolio-projects/isolated/independent.png" });
});

transactionTest("source artwork removal retains snapshot, asset and source baseline", async (i) => {
  await client.query('DELETE FROM "Artwork" WHERE id=$1', [i.w]);
  const row = (await client.query('SELECT "sourceArtworkId","sourceBaseline",title,"storagePath" FROM "PortfolioArtwork" WHERE id=$1', [i.pa])).rows[0];
  assert.equal(row.sourceArtworkId, null);
  assert.equal(row.sourceBaseline.sourceArtworkId, i.w);
  assert.equal(row.title, "Manual title");
  assert.equal(row.storagePath, "portfolio-projects/isolated/independent.png");
});

transactionTest("source collection baseline survives source deletion", async (i) => {
  await client.query('UPDATE "PortfolioCollection" SET "sourceBaseline"=$1::jsonb WHERE id=$2', [JSON.stringify({ version: 1, sourceCollectionId: i.c, title: "Source A" }), i.pc]);
  await client.query('UPDATE "Artwork" SET "artistCollectionId"=NULL WHERE "artistCollectionId"=$1', [i.c]);
  await client.query('DELETE FROM "ArtistCollection" WHERE id=$1', [i.c]);
  const row = (await client.query('SELECT "sourceCollectionId","sourceBaseline",title FROM "PortfolioCollection" WHERE id=$1', [i.pc])).rows[0];
  assert.equal(row.sourceCollectionId, null);
  assert.equal(row.sourceBaseline.sourceCollectionId, i.c);
  assert.equal(row.title, "Snapshot first");
});

transactionTest("whole-project cascade remains compatible with collection membership", async (i) => {
  await client.query('DELETE FROM "PortfolioProject" WHERE id=$1', [i.p]);
  assert.equal((await client.query('SELECT id FROM "PortfolioArtwork" WHERE id=$1', [i.pa])).rowCount, 0);
  assert.equal((await client.query('SELECT id FROM "PortfolioCollection" WHERE id=$1', [i.pc])).rowCount, 0);
  assert.equal((await client.query('SELECT id FROM "Artwork" WHERE id=$1', [i.w])).rowCount, 1);
});

transactionTest("whole-artist cascade preserves portfolio snapshots", async (i) => {
  await client.query('DELETE FROM "Artist" WHERE id=$1', [i.a]);
  const row = (await client.query('SELECT "sourceArtworkId",title FROM "PortfolioArtwork" WHERE id=$1', [i.pa])).rows[0];
  assert.deepEqual(row, { sourceArtworkId: null, title: "Manual title" });
  assert.equal((await client.query('SELECT id FROM "PortfolioCollection" WHERE id=$1', [i.pc])).rowCount, 1);
});

transactionTest("global and collection ordering remain independent", async (i) => {
  await client.query('UPDATE "Artwork" SET "collectionOrderIndex"=8 WHERE id=$1', [i.w]);
  await client.query('UPDATE "PortfolioArtwork" SET "collectionOrderIndex"=4 WHERE id=$1', [i.pa]);
  assert.equal((await client.query('SELECT "orderIndex" FROM "Artwork" WHERE id=$1', [i.w])).rows[0].orderIndex, 10);
  assert.equal((await client.query('SELECT "orderIndex" FROM "PortfolioArtwork" WHERE id=$1', [i.pa])).rows[0].orderIndex, 17);
});

transactionTest("a rejected batch rolls back earlier membership changes", async (i) => {
  await client.query("SAVEPOINT batch");
  await client.query('UPDATE "Artwork" SET "artistCollectionId"=$1 WHERE id=$2', [i.c2, i.w]);
  await assert.rejects(client.query('UPDATE "Artwork" SET "artistCollectionId"=$1 WHERE id=$2', [i.cb, i.w2]), (error) => error.code === "23503");
  await client.query("ROLLBACK TO SAVEPOINT batch");
  assert.equal((await client.query('SELECT "artistCollectionId" FROM "Artwork" WHERE id=$1', [i.w])).rows[0].artistCollectionId, i.c);
});

async function waitForLock(observer, pid) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const row = (await observer.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [pid])).rows[0];
    if (row?.wait_event_type === "Lock") return;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  throw new Error("Second connection did not reach the expected lock wait");
}

test("concurrent duplicate imports are rejected by PostgreSQL, not a pre-check", async () => {
  const i = await fixture(); // Committed synthetic fixture in this disposable DB.
  const first = await connect();
  const second = await connect();
  try {
    const secondPid = (await second.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    await first.query("BEGIN");
    await second.query("BEGIN");
    const sql = `INSERT INTO "PortfolioArtwork" ("portfolioId","sourceArtworkId","imageUrl","updatedAt") VALUES ($1,$2,'https://storage.invalid/concurrent',now())`;
    await first.query(sql, [i.p, i.w2]);
    const pending = second.query(sql, [i.p, i.w2]).then(() => null, (error) => error.code);
    await waitForLock(first, secondPid);
    await first.query("COMMIT");
    assert.equal(await pending, "23505");
    await second.query("ROLLBACK");
    assert.equal((await client.query('SELECT count(*)::int AS count FROM "PortfolioArtwork" WHERE "portfolioId"=$1 AND "sourceArtworkId"=$2', [i.p, i.w2])).rows[0].count, 1);
    report.passed.push("concurrent duplicate imports are rejected by PostgreSQL, not a pre-check");
  } finally {
    await first.query("ROLLBACK"); await second.query("ROLLBACK");
    await first.end(); await second.end();
  }
});

test("revision conditional update rejects a stale concurrent writer", async () => {
  const i = await fixture();
  const first = await connect();
  const second = await connect();
  try {
    const secondPid = (await second.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    await first.query("BEGIN"); await second.query("BEGIN");
    const sql = 'UPDATE "PortfolioProject" SET revision=revision+1 WHERE id=$1 AND revision=0';
    assert.equal((await first.query(sql, [i.p])).rowCount, 1);
    const pending = second.query(sql, [i.p]);
    await waitForLock(first, secondPid);
    await first.query("COMMIT");
    assert.equal((await pending).rowCount, 0);
    await second.query("COMMIT");
    assert.equal((await client.query('SELECT revision FROM "PortfolioProject" WHERE id=$1', [i.p])).rows[0].revision, 1);
    report.passed.push("revision conditional update rejects a stale concurrent writer");
  } finally {
    await first.query("ROLLBACK"); await second.query("ROLLBACK");
    await first.end(); await second.end();
  }
});
