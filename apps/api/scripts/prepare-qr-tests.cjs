// Empty, isolated schema only; never copies user records or deletes a database.
const fs = require("fs"),
  path = require("path"),
  os = require("os"),
  { execFileSync } = require("child_process"),
  { randomUUID } = require("crypto"),
  { Client } = require("pg");
const root = path.resolve(__dirname, "../../.."),
  out = path.join(root, ".tmp/qr-cards");
fs.mkdirSync(out, { recursive: true });
for (const [theme, file] of [
  ["light", "qr-vizit-karta-svijetla.html"],
  ["dark", "qr-vizit-karta-tamna.html"],
]) {
  const p = path.join(
    process.env.ARTBOARD_QR_REFERENCE_DIR ||
      path.join(os.homedir(), "Downloads"),
    file,
  );
  if (fs.existsSync(p)) {
    const h = fs.readFileSync(p, "utf8"),
      m = /<script type="__bundler\/template">([\s\S]*?)<\/script>/.exec(h);
    if (m)
      fs.writeFileSync(
        path.join(out, theme + "-source.html"),
        JSON.parse(m[1]),
      );
  }
}
(async () => {
  const env = require("dotenv").parse(fs.readFileSync(path.join(root, ".env"))),
    u = new URL(env.DIRECT_URL || env.DATABASE_URL);
  if (
    !["localhost", "127.0.0.1"].includes(u.hostname) ||
    u.port !== "5433" ||
    u.pathname !== "/artboard_platforma"
  )
    throw Error("Expected local working database");
  const schema = execFileSync(
    "docker",
    [
      "exec",
      "artboardplatforma-postgres-1",
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "artboard_platforma",
      "--schema-only",
      "--no-owner",
      "--no-privileges",
    ],
    { encoding: "utf8", maxBuffer: 20000000 },
  );
  const database = "artboard_qr_test_" + randomUUID().replaceAll("-", ""),
    adminUrl = new URL(u);
  adminUrl.pathname = "/postgres";
  const a = new Client({ connectionString: adminUrl.href });
  await a.connect();
  await a.query(`CREATE DATABASE "${database}"`);
  await a.end();
  u.pathname = "/" + database;
  const db = new Client({ connectionString: u.href });
  await db.connect();
  try {
    await db.query(schema.replace(/^\\(?:un)?restrict .*$/gm, ""));
    await db.query("SET search_path=public");
    const ready = (
      await db.query(
        `SELECT to_regclass('public."QrCardDraft"') IS NOT NULL AS ready`,
      )
    ).rows[0].ready;
    if (!ready)
      await db.query(
        fs.readFileSync(
          path.join(
            root,
            "apps/api/prisma/migrations/20261030190000_qr_cards/migration.sql",
          ),
          "utf8",
        ),
      );
    fs.writeFileSync(
      path.join(out, "isolated.json"),
      JSON.stringify({ database }),
    );
    console.log(JSON.stringify({ database, empty: true }));
  } finally {
    await db.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
