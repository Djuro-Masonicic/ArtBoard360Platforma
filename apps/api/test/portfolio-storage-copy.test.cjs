const assert = require("node:assert/strict");
const path = require("node:path");
const { Readable } = require("node:stream");
const { test } = require("node:test");
Object.assign(process.env, { DATABASE_URL: "postgresql://unused@127.0.0.1:1/unused", R2_ACCOUNT_ID: "unused", R2_ACCESS_KEY_ID: "unused", R2_SECRET_ACCESS_KEY: "unused", R2_BUCKET_NAME: "unused", R2_PUBLIC_URL: "https://storage.invalid", MAX_UPLOAD_FILE_SIZE_BYTES: "10485760" });
require("ts-node").register({ project: path.resolve(__dirname, "../tsconfig.json"), transpileOnly: true }); require("reflect-metadata");
const { R2StorageService } = require("../src/storage/r2-storage.service");
const sharp = require("sharp");
function service(buffer, declaredLength = buffer.length) {
  const storage = new R2StorageService(), commands = [];
  storage.createClient = () => ({ async send(command) {
    commands.push(command);
    if (command.constructor.name === "GetObjectCommand") return { Body: Readable.from([buffer]), ContentLength: declaredLength };
    if (command.constructor.name === "PutObjectCommand") return {};
    throw Error("Unexpected storage command");
  } });
  return { storage, commands };
}
const input = { recordId: "portfolio-test", imageUrl: "https://storage.invalid/artists/own/image.png", storagePath: "artists/own/image.png", entityType: "portfolio-artwork" };
test("real copy implementation reads bytes and creates a distinct physical key without deletion", async () => {
  const buffer = await sharp({ create: { width: 3, height: 4, channels: 3, background: "#8844aa" } }).png().toBuffer();
  const h = service(buffer), result = await h.storage.clonePortfolioImage(input);
  assert.notEqual(result.path, input.storagePath); assert(result.path.startsWith("portfolio-projects/portfolio-test/artworks/"));
  const put = h.commands.find(command => command.constructor.name === "PutObjectCommand"); assert.deepEqual(put.input.Body, buffer);
  assert.equal(h.commands.length, 2); assert(h.commands.every(command => command.constructor.name !== "DeleteObjectCommand"));
});
test("URL-only managed images resolve to the existing object while new copies remain unique", async () => {
  const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#123456" } }).png().toBuffer();
  const h = service(buffer), a = await h.storage.clonePortfolioImage({ ...input, storagePath: undefined }), b = await h.storage.clonePortfolioImage({ ...input, recordId: "another-portfolio", storagePath: undefined });
  assert.notEqual(a.path, b.path); assert.equal(h.commands[0].input.Key, input.storagePath);
});
test("mismatched managed URL/path is rejected before any storage I/O", async () => {
  const h = service(Buffer.from("unused")); await assert.rejects(h.storage.clonePortfolioImage({ ...input, storagePath: "other/key.png" }), error => error.getStatus() === 400); assert.equal(h.commands.length, 0);
});
test("private hosts and arbitrary external URLs are never fetched", async () => {
  const h = service(Buffer.from("unused")), original = global.fetch; let fetched = 0; global.fetch = async () => { fetched++; throw Error("Unexpected network"); };
  try { for (const imageUrl of ["http://127.0.0.1/private", "https://attacker.invalid/file.png", "file:///private"]) await assert.rejects(h.storage.clonePortfolioImage({ ...input, imageUrl, storagePath: null }), error => error.getStatus() === 400); }
  finally { global.fetch = original; } assert.equal(fetched, 0);
});
test("trusted external redirects cannot escape the image allowlist", async () => {
  const h = service(Buffer.from("unused")), original = global.fetch; let fetched = 0;
  global.fetch = async () => { fetched++; return new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/private" } }); };
  try { await assert.rejects(h.storage.clonePortfolioImage({ ...input, imageUrl: "https://cdn.prod.website-files.com/image.png", storagePath: null }), error => error.getStatus() === 400); }
  finally { global.fetch = original; } assert.equal(fetched, 1); assert.equal(h.commands.length, 0);
});
test("oversized and malformed original objects are rejected without creating a copy", async () => {
  const large = service(Buffer.from("small"), 20 * 1024 * 1024), malformed = service(Buffer.from("not an image"));
  await assert.rejects(large.storage.clonePortfolioImage(input), error => error.getStatus() === 400);
  await assert.rejects(malformed.storage.clonePortfolioImage(input), error => error.getStatus() === 400);
  assert.equal(large.commands.length, 1); assert.equal(malformed.commands.length, 1);
});
