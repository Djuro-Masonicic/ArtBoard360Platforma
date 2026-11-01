// Creates a new EMPTY test database from the local schema. Never copies data,
// migrates the working database, drops databases or contacts R2/mail providers.
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const { execFileSync } = require("node:child_process"), { randomUUID } = require("node:crypto"), { gunzipSync } = require("node:zlib");
const { Client } = require("pg"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../.."), out = path.join(root, ".tmp/dashboard-analysis");
const refs = process.env.ARTBOARD_DASHBOARD_REFERENCE_DIR || path.join(os.homedir(), "Downloads");
const names = ["dashboard-svijetla.html", "dashboard-tamna.html"];
for (const file of names) assert(fs.existsSync(path.join(refs, file)), `Missing provided reference: ${path.join(refs, file)}. Set ARTBOARD_DASHBOARD_REFERENCE_DIR.`);
fs.mkdirSync(path.join(out, "assets"), { recursive: true });
for (const [index, file] of names.entries()) {
  const html = fs.readFileSync(path.join(refs, file), "utf8");
  const template = /<script type="__bundler\/template">([\s\S]*?)<\/script>/.exec(html);
  assert(template, "Expected the supplied self-contained Artifact HTML.");
  fs.writeFileSync(path.join(out, (index ? "dark" : "light") + "-source.html"), JSON.parse(template[1]));
  if (index) continue;
  const manifest = JSON.parse(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/.exec(html)[1]);
  const resources = JSON.parse(/<script type="__bundler\/ext_resources">([\s\S]*?)<\/script>/.exec(html)[1]);
  for (const resource of resources) {
    if (!/^(art-\d+|avatar)$/.test(resource.id)) continue;
    const asset = manifest[resource.uuid]; assert.equal(asset.mime, "image/png");
    const bytes = Buffer.from(asset.data, "base64");
    fs.writeFileSync(path.join(out, "assets", resource.id + ".png"), asset.compressed ? gunzipSync(bytes) : bytes);
  }
}
async function prepare() {
  const env = require("dotenv").parse(fs.readFileSync(path.join(root, ".env")));
  const configured = new URL(env.DIRECT_URL || env.DATABASE_URL);
  assert(["localhost", "127.0.0.1"].includes(configured.hostname)); assert.equal(configured.port, "5433"); assert.equal(configured.pathname, "/artboard_platforma");
  const schema = execFileSync("docker", ["exec", "artboardplatforma-postgres-1", "pg_dump", "-U", decodeURIComponent(configured.username), "-d", "artboard_platforma", "--schema-only", "--no-owner", "--no-privileges"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  const database = "artboard_dashboard_test_" + randomUUID().replaceAll("-", ""), adminUrl = new URL(configured); adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.href }); await admin.connect();
  try { await admin.query(`CREATE DATABASE "${database}"`); } finally { await admin.end(); }
  const url = new URL(configured); url.pathname = "/" + database;
  const client = new Client({ connectionString: url.href }); await client.connect();
  try {
    await client.query(schema.replace(/^\\(?:un)?restrict .*$/gm, ""));
    await client.query("SET search_path = public");
    const ready = (await client.query(`SELECT to_regclass('public."ArtistDeletionRequest"') IS NOT NULL AS ready`)).rows[0].ready;
    if (!ready) await client.query(fs.readFileSync(path.join(root, "apps/api/prisma/migrations/20261029210000_artist_dashboard/migration.sql"), "utf8"));
    assert.equal(Number((await client.query('SELECT count(*) FROM "Artist"')).rows[0].count), 0, "Test schema must contain no real artist records.");
    fs.writeFileSync(path.join(out, "isolated.json"), JSON.stringify({ database }, null, 2));
    console.log(JSON.stringify({ database, empty: true, referencesPrepared: true }));
  } finally { await client.end(); }
}
prepare().catch(error => { console.error(error.message); process.exitCode = 1; });
