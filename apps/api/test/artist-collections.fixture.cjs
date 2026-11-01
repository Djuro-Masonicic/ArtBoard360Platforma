const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const root = path.resolve(__dirname, "../../..");
const sourceEnv = require("dotenv").parse(fs.readFileSync(path.join(root, ".env")));
const configured = new URL(sourceEnv.DIRECT_URL || sourceEnv.DATABASE_URL);
assert.equal(configured.hostname, "localhost"); assert.equal(configured.port, "5433"); assert.equal(configured.pathname, "/artboard_platforma");
const template = process.env.ARTBOARD_COLLECTIONS_RESTORE_DATABASE;
assert.match(template || "", /^artboard_restore_\d{8}_[a-f0-9]{12}$/);
const database = `artboard_collections_api_${randomUUID().replaceAll("-", "")}`;
const legacyDatabase = `artboard_collections_compat_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = new URL(configured); databaseUrl.pathname = `/${database}`;
const legacyUrl = new URL(configured); legacyUrl.pathname = `/${legacyDatabase}`;
Object.assign(process.env, {
  NODE_ENV: "test", DATABASE_URL: databaseUrl.toString(), DIRECT_URL: databaseUrl.toString(), ARTIST_COLLECTIONS_ENABLED: "true",
  MOCK_PAYMENTS_ENABLED: "false",
  API_PORT: "0", PORT: "0", R2_ACCOUNT_ID: "unused", R2_ACCESS_KEY_ID: "unused", R2_SECRET_ACCESS_KEY: "unused",
  R2_BUCKET_NAME: "unused", R2_PUBLIC_URL: "https://storage.invalid", RESEND_API_KEY: "",
  ADMIN_AUTH_SECRET: "collections-isolated-tests-only", MAX_UPLOAD_FILE_SIZE_BYTES: "10485760",
});
require("ts-node").register({ project: path.join(root, "apps/api/tsconfig.json"), transpileOnly: true });
require("reflect-metadata");
const { Global, Module, ValidationPipe } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");
const { PrismaService } = require("../src/prisma/prisma.service");
const { CollectionsPrismaService } = require("../src/modules/artist-collections/collections-prisma.service");
const { ArtistCollectionsModule } = require("../src/modules/artist-collections/artist-collections.module");
const { ArtworksModule } = require("../src/modules/artworks/artworks.module");
const { R2StorageService } = require("../src/storage/r2-storage.service");
const { GlobalHttpExceptionFilter } = require("../src/common/filters/http-exception.filter");
const { signSessionToken } = require("../src/modules/auth/auth-crypto");
const { env } = require("../src/config/env");

async function startHarness(options = {}) {
  const adminUrl = new URL(configured); adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    for (const name of [database, legacyDatabase]) await admin.query(`CREATE DATABASE "${name}" TEMPLATE "${template}"`);
  } finally { await admin.end(); }
  const connection = new Client({ connectionString: databaseUrl.toString() });
  await connection.connect();
  try {
    const sql = fs.readFileSync(path.join(root, "apps/api/prisma/migrations/20261026213000_artist_portfolio_collections/migration.sql"), "utf8");
    const previous = fs.readFileSync(path.join(root, "apps/api/prisma/proposals/collections-v2/migration.sql"), "utf8");
    assert(sql.includes(previous), "Final migration must include the reviewed package-1 SQL");
    assert(sql.includes("BEGIN;") && sql.includes("COMMIT;"));
    await connection.query(sql); // Only the newly named isolated database.
    if (options.portfolio) {
      const commerce = fs.readFileSync(path.join(root, "apps/api/prisma/migrations/20261027143000_portfolio_commerce_foundation/migration.sql"), "utf8");
      await connection.query(commerce); // New generated client selects commerce version metadata.
    }
    // The active Prisma client now includes dashboard and QR fields. Keep the
    // compatibility database untouched; extend only this isolated active DB.
    for (const [table, migration] of [["ArtistDeletionRequest", "20261029210000_artist_dashboard"], ["QrCardDraft", "20261030190000_qr_cards"]]) {
      const present = (await connection.query(`SELECT to_regclass('public."${table}"') IS NOT NULL AS ready`)).rows[0].ready;
      if (!present) await connection.query(fs.readFileSync(path.join(root, "apps/api/prisma/migrations", migration, "migration.sql"), "utf8"));
    }
  } finally { await connection.end(); }

  const legacy = new PrismaService();
  const realStorage = new R2StorageService();
  const storage = {
    calls: [], deletes: [], fail: false, onUpload: null, objects: new Map(), copies: [], failCopy: false,
    validateUpload: realStorage.validateUpload.bind(realStorage),
    async uploadFile(input) {
      this.calls.push({ recordId: input.recordId, entityType: input.entityType });
      if (this.fail) throw new Error("Isolated storage error");
      if (this.onUpload) { const callback = this.onUpload; this.onUpload = null; await callback(input); }
      const key = input.entityType.startsWith("portfolio-") ? `portfolio-projects/${input.recordId}/${input.entityType === 'portfolio-pdf' ? 'pdf' : input.entityType}/${randomUUID()}.${input.entityType === "portfolio-pdf" ? "pdf" : "png"}` : `artist-collections/${input.recordId}/cover/${randomUUID()}.png`;
      const publicUrl = input.visibility === 'private' ? `r2-private:${key}` : `https://storage.invalid/${key}`; this.objects.set(publicUrl, Buffer.from(input.body)); return { path: key, publicUrl };
    },
    async deleteFile(value) { this.deletes.push(value); return { deleted: false, deferred: true }; },
  };
  const testImage = await require("sharp")({ create: { width: 4, height: 5, channels: 3, background: "#6633aa" } }).png().toBuffer();
  storage.clonePortfolioImage = async function(input) {
    this.copies.push(input); if(this.failCopy)throw new Error("Isolated copy failure");
    const body=this.objects.get(input.imageUrl);if(!body)throw new Error("Unknown test source image");
    return this.uploadFile({recordId:input.recordId,entityType:input.entityType,fileName:"copy.png",mimeType:"image/png",fileSizeBytes:body.length,body});
  };
  if(options.portfolio){
    R2StorageService.prototype.uploadFile=storage.uploadFile.bind(storage);R2StorageService.prototype.clonePortfolioImage=storage.clonePortfolioImage.bind(storage);
    R2StorageService.prototype.deleteFile=storage.deleteFile.bind(storage);
    R2StorageService.prototype.readPortfolioPdf=async function(input){assert(input.storagePath.startsWith(`portfolio-projects/${input.portfolioId}/pdf/`));const bytes=storage.objects.get(input.privateObject?`r2-private:${input.storagePath}`:`https://storage.invalid/${input.storagePath}`);if(!bytes)throw Error('Missing isolated PDF');return bytes;};
    R2StorageService.prototype.createClient=()=>{throw Error("Real R2 is forbidden in tests")};
  }
  const realFetch=global.fetch;
  if(options.portfolio)global.fetch=async(input,init)=>{const target=new URL(typeof input==="string"?input:input instanceof URL?input.toString():input.url);if(target.hostname==="storage.invalid"){const image=storage.objects.get(target.toString());return image?new Response(image,{headers:{"Content-Type":"image/png"}}):new Response("missing",{status:404});}return realFetch(input,init);};
  const extraModules=options.portfolio?[require("../src/modules/portfolio-projects/portfolio-projects.module").PortfolioProjectsModule,require("../src/modules/artists/artists.module").ArtistsModule]:[];
  if(options.subscriptions)extraModules.push(require("../src/modules/artist-subscriptions/artist-subscriptions.module").ArtistSubscriptionsModule);
  class Infrastructure {}
  Global()(Infrastructure);
  Module({ providers: [{ provide: PrismaService, useValue: legacy }, { provide: R2StorageService, useValue: storage }], exports: [PrismaService, R2StorageService] })(Infrastructure);
  class TestApp {}
  Module({ imports: [Infrastructure, ArtistCollectionsModule, ArtworksModule, ...extraModules] })(TestApp);
  const app = await NestFactory.create(TestApp, { logger: false, abortOnError: false });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const baseUrl = await app.getUrl();
  const prisma = app.get(CollectionsPrismaService);
  async function fresh() {
    const people = [];
    for (const label of ["A", "B"]) {
      const id = randomUUID(), accountId = randomUUID();
      const artist = await legacy.artist.create({ data: { id, name: `Isolated ${label}`, slug: `isolated-${id}` } });
      const account = await legacy.artistAccount.create({ data: { id: accountId, artistId: id, name: `Account ${label}`, email: `${accountId}@example.invalid` } });
      const artworks = [];
      for (let index = 0; index < (label === "A" ? 3 : 1); index++) artworks.push(await legacy.artwork.create({ data: {
        artistId: artist.id, title: `${label} work ${index + 1}`, imageUrl: `https://storage.invalid/${randomUUID()}.png`,
        storagePath: `artists/${id}/artwork/${randomUUID()}.png`, orderIndex: index * 10,
      } }));
      for(const work of artworks)storage.objects.set(work.imageUrl,testImage);
      const token = signSessionToken({ sub: account.id, email: account.email, kind: "artist", exp: Math.floor(Date.now() / 1000) + 7200 }, env.adminAuthSecret);
      people.push({ artist, account, artworks, token });
    }
    return { a: people[0], b: people[1] };
  }
  async function send(method, operation = "", body, token, prefix = "/artist/collections") {
    const response = await fetch(`${baseUrl}${prefix}${operation ? `/${operation}` : ""}`, { method,
      headers: { Connection: "close", ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  }
  return { app, prisma, legacy, storage, database, legacyDatabase, legacyUrl, baseUrl, fresh, send, env, PrismaService, CollectionsPrismaService,
    async close() { await app.close(); await legacy.$disconnect(); if(options.portfolio)global.fetch=realFetch; } };
}

module.exports = { startHarness };
