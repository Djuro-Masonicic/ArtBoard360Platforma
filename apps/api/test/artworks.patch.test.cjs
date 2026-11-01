const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { after, afterEach, before, beforeEach, test } = require("node:test");

// Never load .env or instantiate a real database/storage client in this suite.
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/isolated_artworks_test",
  DIRECT_URL: "postgresql://unused:unused@127.0.0.1:1/isolated_artworks_test",
  PORT: "0",
  API_PORT: "0",
  R2_ACCOUNT_ID: "unused",
  R2_ACCESS_KEY_ID: "unused",
  R2_SECRET_ACCESS_KEY: "unused",
  R2_BUCKET_NAME: "unused",
  R2_PUBLIC_URL: "https://storage.invalid",
  ADMIN_AUTH_SECRET: "isolated-artworks-patch-test-secret",
  ADMIN_AUTH_TOKEN_TTL_HOURS: "12",
  RESEND_API_KEY: "",
  MAX_UPLOAD_FILE_SIZE_BYTES: "10485760",
  MAX_SIGNED_UPLOAD_EXPIRY_SECONDS: "900",
});

require("ts-node").register({
  project: path.join(__dirname, "../tsconfig.json"),
  transpileOnly: true,
});
require("reflect-metadata");

const { Global, Module, BadRequestException, InternalServerErrorException, ValidationPipe } = require("@nestjs/common");
const { GUARDS_METADATA } = require("@nestjs/common/constants");
const { NestFactory } = require("@nestjs/core");
const { GlobalHttpExceptionFilter } = require("../src/common/filters/http-exception.filter");
const { ArtworksModule } = require("../src/modules/artworks/artworks.module");
const { ArtworksController } = require("../src/modules/artworks/artworks.controller");
const { ArtistAuthGuard } = require("../src/modules/auth/artist-auth.guard");
const { AdminAuthGuard } = require("../src/modules/auth/admin-auth.guard");
const { AdminArtworksController } = require("../src/modules/artworks/admin-artworks.controller");
const { PortfolioProjectsService } = require("../src/modules/portfolio-projects/portfolio-projects.service");
const { signSessionToken } = require("../src/modules/auth/auth-crypto");
const { PrismaService } = require("../src/prisma/prisma.service");
const { R2StorageService } = require("../src/storage/r2-storage.service");

const ids = Object.fromEntries(
  ["artistA", "artistB", "accountA", "accountB", "artworkA", "backgroundA", "artworkB", "missing"]
    .map((name) => [name, randomUUID()]),
);
const database = { artworks: [], accounts: [], writes: [], failUpdate: false };
const storageCalls = [];
const objects = new Map();
const retainedStorage = new R2StorageService();
let physicalDeletionAttempts = 0;
let allowStorageCalls = false;
retainedStorage.createClient = () => ({
  async send(command) {
    if (command.constructor.name === "DeleteObjectCommand") {
      physicalDeletionAttempts++;
      objects.delete(command.input.Key);
    }
    throw new Error("Tests must not access R2");
  },
});

function resetDatabase() {
  database.artworks = [
    { id: ids.artworkA, artistId: ids.artistA, title: "A original", description: "A description", altText: "A alt", isFeatured: false, isBackground: false },
    { id: ids.backgroundA, artistId: ids.artistA, title: "A background", description: null, altText: null, isFeatured: false, isBackground: true },
    { id: ids.artworkB, artistId: ids.artistB, title: "B private title", description: "B private description", altText: null, isFeatured: false, isBackground: true },
  ];
  for (const [index, artwork] of database.artworks.entries()) {
    artwork.orderIndex = index;
    artwork.storagePath = `artists/${artwork.artistId}/artwork/${artwork.id}.png`;
    artwork.imageUrl = `https://storage.invalid/${artwork.storagePath}`;
  }
  objects.clear();
  for (const artwork of database.artworks) objects.set(artwork.storagePath, Buffer.from("isolated image"));
  database.portfolioArtworks = [{
    sourceArtworkId: ids.artworkA,
    storagePath: database.artworks[0].storagePath,
    imageUrl: database.artworks[0].imageUrl,
  }];
  database.accounts = ["A", "B"].map((suffix) => ({
    id: ids[`account${suffix}`],
    email: `${suffix.toLowerCase()}@example.invalid`,
    name: `Account ${suffix}`,
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    lastLoginAt: null,
    artist: { id: ids[`artist${suffix}`], slug: `artist-${suffix}`, name: `Artist ${suffix}` },
  }));
  database.writes = [];
  database.failUpdate = false;
  database.failUpsert = false;
  database.failUpload = false;
  database.beforeRetention = null;
  physicalDeletionAttempts = 0;
  allowStorageCalls = false;
  storageCalls.length = 0;
}

function matches(row, where) {
  return Object.entries(where).every(([key, value]) =>
    value && typeof value === "object"
      ? (value.in ? value.in.includes(row[key]) : row[key] !== value.not)
      : row[key] === value,
  );
}

function artworkRepository(rows) {
  return {
    async findFirst({ where, select }) {
      const row = rows.find((item) => matches(item, where));
      if (!row) return null;
      return select
        ? Object.fromEntries(Object.keys(select).filter((key) => select[key]).map((key) => [key, row[key]]))
        : structuredClone(row);
    },
    async count({ where }) { return rows.filter((row) => matches(row, where)).length; },
    async aggregate({ where }) { const ordered = rows.filter(row => matches(row, where)); return { _max: { orderIndex: ordered.length ? Math.max(...ordered.map(row => row.orderIndex)) : null } }; },
    async delete({ where }) {
      database.writes.push({ method: "delete", where });
      const index = rows.findIndex((row) => matches(row, where));
      assert.notEqual(index, -1);
      const [removed] = rows.splice(index, 1);
      for (const reference of database.portfolioArtworks) {
        if (reference.sourceArtworkId === removed.id) reference.sourceArtworkId = null;
      }
      return structuredClone(removed);
    },
    async upsert({ where, update, create }) {
      if (database.failUpsert) throw new BadRequestException("Simulated persistence failure.");
      database.writes.push({ method: "upsert", where });
      let row = rows.find((item) => matches(item, where.artistId_imageUrl));
      if (row) {
        for (const [key, value] of Object.entries(update)) if (value !== undefined) row[key] = value;
      } else {
        row = { id: randomUUID(), ...create };
        rows.push(row);
      }
      return structuredClone(row);
    },
    async updateMany({ where, data }) {
      database.writes.push({ method: "updateMany", where });
      const selected = rows.filter((row) => matches(row, where));
      for (const row of selected) Object.assign(row, data);
      return { count: selected.length };
    },
    async update({ where, data }) {
      database.writes.push({ method: "update", where });
      if (database.failUpdate) throw new BadRequestException("Simulated transaction failure.");
      const row = rows.find((item) => matches(item, where));
      assert.ok(row, "The write must match both artwork id and session artist id");
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) row[key] = value;
      }
      return structuredClone(row);
    },
  };
}

// Only persistence is substituted. HTTP routing, module wiring, the real auth
// service, signed tokens, ArtistAuthGuard, validation and ArtworksService run.
const prisma = {
  adminUser: { async findUnique() { return {
    id: "existing-test-admin", email: "admin@example.invalid", name: "Test admin",
    createdAt: new Date(), updatedAt: new Date(), lastLoginAt: null,
  }; } },
  artist: { async findUnique({ where }) {
    return database.accounts.find((account) => account.artist.id === where.id)?.artist ?? null;
  } },
  artistAccount: {
    async findUnique({ where }) {
      return database.accounts.find((account) => account.id === where.id) ?? null;
    },
  },
  async $transaction(callback) {
    const isolatedRows = structuredClone(database.artworks);
    const isolatedAccounts = structuredClone(database.accounts);
    const result = await callback({ artwork: artworkRepository(isolatedRows),
      async $queryRaw(_sql, id) { return isolatedAccounts.filter(account => account.artist.id === id).map(account => ({ id })); },
      artist: {
        async update({ where, data }) { const row = isolatedAccounts.find(account => account.artist.id === where.id)?.artist; assert(row); Object.assign(row, data); return row; },
        async updateMany({ where, data }) { const rows = isolatedAccounts.map(account => account.artist).filter(row => matches(row, where)); for (const row of rows) Object.assign(row, data); return { count: rows.length }; },
      },
    });
    database.artworks = isolatedRows;
    database.accounts = isolatedAccounts;
    return result;
  },
  artwork: {
    async findFirst(args) { return artworkRepository(database.artworks).findFirst(args); },
    async delete(args) { return artworkRepository(database.artworks).delete(args); },
  },
};
const storage = {
  async uploadFile(input) {
    storageCalls.push("uploadFile");
    retainedStorage.validateUpload(input.fileSizeBytes, input.mimeType, input.entityType);
    if (database.failUpload) throw new InternalServerErrorException("Simulated storage outage.");
    const key = `artists/${input.recordId}/artwork/${randomUUID()}.png`;
    objects.set(key, input.body);
    return { path: key, publicUrl: `https://storage.invalid/${key}`, bucket: "unused" };
  },
  async createSignedUpload(artistId) {
    storageCalls.push("createSignedUpload");
    return { path: `artists/${artistId}/artwork/new.png`, signedUrl: "https://storage.invalid/signed-upload" };
  },
  async deleteFile(key) {
    storageCalls.push("deleteFile");
    if (database.beforeRetention) await database.beforeRetention();
    return retainedStorage.deleteFile(key);
  },
};

class IsolatedInfrastructureModule {}
Global()(IsolatedInfrastructureModule);
Module({
  providers: [
    { provide: PrismaService, useValue: prisma },
    { provide: R2StorageService, useValue: storage },
  ],
  exports: [PrismaService, R2StorageService],
})(IsolatedInfrastructureModule);

class TestApplicationModule {}
Module({ imports: [IsolatedInfrastructureModule, ArtworksModule] })(TestApplicationModule);

let app;
let baseUrl;
before(async () => {
  resetDatabase();
  app = await NestFactory.create(TestApplicationModule, { logger: false, abortOnError: false });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  baseUrl = await app.getUrl();
});
beforeEach(resetDatabase);
afterEach(() => {
  if (!allowStorageCalls) assert.deepEqual(storageCalls, []);
  assert.equal(physicalDeletionAttempts, 0, "No test may physically remove an object");
});
after(async () => { if (app) await app.close(); });

function tokenFor(suffix = "A", overrides = {}) {
  return signSessionToken({
    sub: ids[`account${suffix}`],
    email: `${suffix.toLowerCase()}@example.invalid`,
    exp: Math.floor(Date.now() / 1000) + 600,
    kind: "artist",
    ...overrides,
  }, process.env.ADMIN_AUTH_SECRET);
}

async function patch(id, body, token = tokenFor()) {
  const response = await fetch(`${baseUrl}/artworks/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Connection: "close",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function expectUnchanged(id, body, token, status) {
  const before = structuredClone(database.artworks);
  const result = await patch(id, body, token);
  assert.equal(result.status, status);
  assert.deepEqual(database.artworks, before, "Rejected requests must leave all fixture records unchanged");
  assert.deepEqual(database.writes, [], "Rejected authorization/validation must never reach a write");
  return result;
}

test("missing authentication returns 401 without a write", async () => {
  await expectUnchanged(ids.artworkA, { artistId: ids.artistA, title: "Unauthorized" }, null, 401);
});

test("invalid or expired tokens and admin tokens cannot authorize artwork editing", async () => {
  for (const token of ["invalid-token", tokenFor("A", { exp: 1 }), tokenFor("A", { kind: "admin" })]) {
    await expectUnchanged(ids.artworkA, { title: "Unauthorized" }, token, 401);
  }
});

test("inactive artist accounts cannot edit artwork", async () => {
  database.accounts[0].isActive = false;
  await expectUnchanged(ids.artworkA, { title: "Unauthorized" }, tokenFor(), 401);
});

test("artist A cannot edit artist B's artwork or change background flags", async () => {
  const foreign = await expectUnchanged(ids.artworkB, { title: "Unauthorized", isBackground: true }, tokenFor(), 404);
  const missing = await expectUnchanged(ids.missing, { title: "Unauthorized" }, tokenFor(), 404);
  assert.deepEqual(foreign.body.message, missing.body.message);
  assert.ok(!JSON.stringify(foreign.body).includes("B private"), "Do not expose another artist's metadata");
});

test("spoofing the victim's artistId does not grant access", async () => {
  await expectUnchanged(ids.artworkB, { artistId: ids.artistB, title: "Unauthorized" }, tokenFor(), 403);
});

test("claiming the session's artistId does not grant access to a foreign artwork", async () => {
  await expectUnchanged(ids.artworkB, { artistId: ids.artistA, title: "Unauthorized" }, tokenFor(), 404);
});

test("changing ownership of an owned artwork is rejected", async () => {
  await expectUnchanged(ids.artworkA, { artistId: ids.artistB, title: "Unauthorized" }, tokenFor(), 403);
});

test("unsupported ownership fields and nested relations are rejected by the DTO", async () => {
  for (const ownership of [{ userId: ids.accountB }, { ownerId: ids.artistB }, { artist: { connect: { id: ids.artistB } } }]) {
    await expectUnchanged(ids.artworkA, { title: "Unauthorized", ...ownership }, tokenFor(), 400);
  }
});

test("an artist can edit owned artwork without an artistId in the body", async () => {
  const others = structuredClone(database.artworks.slice(1));
  const result = await patch(ids.artworkA, {
    title: "  Updated title  ", description: "  Updated description  ", altText: "  Updated alt  ",
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.title, "Updated title");
  assert.equal(result.body.description, "Updated description");
  assert.equal(result.body.altText, "Updated alt");
  assert.equal(result.body.artistId, ids.artistA);
  assert.deepEqual(database.artworks.slice(1), others);
  assert.equal(database.artworks[0].title, "Updated title");
});

test("existing frontend requests with the session artistId remain valid", async () => {
  const result = await patch(ids.artworkA, { artistId: ids.artistA, title: "Legacy request", isFeatured: true });
  assert.equal(result.status, 200);
  assert.equal(result.body.title, "Legacy request");
  assert.equal(result.body.isFeatured, true);
  assert.equal(result.body.artistId, ids.artistA);
});

test("artist B can edit their own artwork using their distinct account and artist ids", async () => {
  const result = await patch(ids.artworkB, { title: "B updated" }, tokenFor("B"));
  assert.equal(result.status, 200);
  assert.equal(result.body.artistId, ids.artistB);
  assert.equal(result.body.title, "B updated");
  assert.equal(database.artworks[0].title, "A original");
});

test("background editing updates only the authenticated artist's background selection", async () => {
  const foreignBefore = structuredClone(database.artworks[2]);
  const result = await patch(ids.artworkA, { artistId: ids.artistA, isBackground: true });
  assert.equal(result.status, 200);
  assert.equal(database.artworks[0].isBackground, true);
  assert.equal(database.artworks[1].isBackground, false);
  assert.deepEqual(database.artworks[2], foreignBefore);
  assert.deepEqual(database.writes.at(-1).where, { id: ids.artworkA, artistId: ids.artistA });
});

test("empty text still clears fields and false flags remain supported", async () => {
  const result = await patch(ids.backgroundA, {
    title: "  ", description: "", altText: "  ", isBackground: false, isFeatured: false,
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.title, null);
  assert.equal(result.body.description, null);
  assert.equal(result.body.altText, null);
  assert.equal(result.body.isBackground, false);
  assert.equal(result.body.isFeatured, false);
});

test("invalid ids and invalid payloads never write", async () => {
  await expectUnchanged("not-a-uuid", { title: "Invalid" }, tokenFor(), 400);
  await expectUnchanged(ids.artworkA, { title: 123 }, tokenFor(), 400);
  await expectUnchanged(ids.artworkA, { artistId: "not-a-uuid" }, tokenFor(), 400);
});

test("a failed transactional update also rolls back background changes", async () => {
  const before = structuredClone(database.artworks);
  database.failUpdate = true;
  const result = await patch(ids.artworkA, { isBackground: true });
  assert.equal(result.status, 400);
  assert.deepEqual(database.artworks, before);
});

test("all artist artwork writes use the artist guard; only the dedicated admin upload accepts admins", () => {
  const handlers = ArtworksController.prototype;
  assert.deepEqual(Reflect.getMetadata(GUARDS_METADATA, handlers.updateArtwork), [ArtistAuthGuard]);
  assert.equal(Reflect.getMetadata(GUARDS_METADATA, ArtworksController), undefined);
  for (const method of ["requestUploadUrl", "uploadArtwork", "createArtwork", "reorderArtworks", "deleteArtwork"]) {
    assert.deepEqual(Reflect.getMetadata(GUARDS_METADATA, handlers[method]), [ArtistAuthGuard]);
  }
  assert.deepEqual(Reflect.getMetadata(GUARDS_METADATA, AdminArtworksController), [AdminAuthGuard]);
});

async function send(method, route, body, token = tokenFor()) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      Connection: "close",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function uploadBody(artistId) {
  const form = new FormData();
  form.set("file", new Blob(["isolated image"], { type: "image/png" }), "test.png");
  form.set("title", "Uploaded work");
  if (artistId) form.set("artistId", artistId);
  return form;
}

test("all remaining artwork writes reject anonymous requests without mutation or storage access", async () => {
  const before = structuredClone(database.artworks);
  for (const [method, route, body] of [
    ["POST", "/artworks/upload-url", { fileName: "test.png", mimeType: "image/png", fileSizeBytes: 10, entityType: "artwork" }],
    ["POST", "/artworks/upload", uploadBody(ids.artistA)],
    ["POST", "/artworks", { imageUrl: "https://example.invalid/image.png" }],
    ["POST", "/artworks/reorder", { items: [{ id: ids.artworkA, orderIndex: 5 }] }],
    ["DELETE", `/artworks/${ids.artworkA}`, {}],
    ["POST", "/admin/artworks/upload", uploadBody(ids.artistA)],
  ]) {
    assert.equal((await send(method, route, body, null)).status, 401);
  }
  assert.deepEqual(database.artworks, before);
  assert.deepEqual(database.writes, []);
});

test("spoofed ownership is rejected on upload, registration, signing, reorder and delete", async () => {
  const before = structuredClone(database.artworks);
  for (const [method, route, body] of [
    ["POST", "/artworks/upload-url", { artistId: ids.artistB, fileName: "test.png", mimeType: "image/png", fileSizeBytes: 10, entityType: "artwork" }],
    ["POST", "/artworks/upload", uploadBody(ids.artistB)],
    ["POST", "/artworks", { artistId: ids.artistB, imageUrl: "https://example.invalid/image.png" }],
    ["POST", "/artworks/reorder", { artistId: ids.artistB, items: [{ id: ids.artworkB, orderIndex: 5 }] }],
    ["DELETE", `/artworks/${ids.artworkB}`, { artistId: ids.artistB }],
  ]) {
    assert.equal((await send(method, route, body)).status, 403);
  }
  assert.deepEqual(database.artworks, before);
  assert.deepEqual(database.writes, []);
});

test("foreign artwork deletion and mixed-owner reorder return 404 without writes", async () => {
  const before = structuredClone(database.artworks);
  assert.equal((await send("DELETE", `/artworks/${ids.artworkB}`, {})).status, 404);
  assert.equal((await send("POST", "/artworks/reorder", {
    items: [{ id: ids.artworkA, orderIndex: 9 }, { id: ids.artworkB, orderIndex: 10 }],
  })).status, 404);
  assert.deepEqual(database.artworks, before);
  assert.deepEqual(database.writes, []);
});

test("an artist can reorder owned artwork atomically, while duplicates are rejected", async () => {
  const result = await send("POST", "/artworks/reorder", {
    items: [{ id: ids.artworkA, orderIndex: 10 }, { id: ids.backgroundA, orderIndex: 11 }],
  });
  assert.equal(result.status, 201);
  assert.equal(database.artworks[0].orderIndex, 10);
  assert.equal(database.artworks[1].orderIndex, 11);
  assert.equal(database.artworks[2].orderIndex, 2);
  const before = structuredClone(database.artworks);
  assert.equal((await send("POST", "/artworks/reorder", {
    items: [{ id: ids.artworkA, orderIndex: 1 }, { id: ids.artworkA, orderIndex: 2 }],
  })).status, 400);
  assert.deepEqual(database.artworks, before);
});

test("owned metadata registration works and foreign storage paths are rejected", async () => {
  const result = await send("POST", "/artworks", { imageUrl: "https://example.invalid/new.png", title: "New work" });
  assert.equal(result.status, 201);
  assert.equal(result.body.artistId, ids.artistA);
  const before = structuredClone(database.artworks);
  assert.equal((await send("POST", "/artworks", {
    imageUrl: "https://example.invalid/foreign.png", storagePath: `artists/${ids.artistB}/artwork/foreign.png`,
  })).status, 400);
  assert.deepEqual(database.artworks, before);
});

test("signed upload destinations use the verified session artist", async () => {
  allowStorageCalls = true;
  const result = await send("POST", "/artworks/upload-url", {
    fileName: "test.png", mimeType: "image/png", fileSizeBytes: 10, entityType: "artwork",
  });
  assert.equal(result.status, 201);
  assert.ok(result.body.path.startsWith(`artists/${ids.artistA}/`));
  assert.deepEqual(database.writes, []);
});

test("owned multipart upload persists only after storage succeeds", async () => {
  allowStorageCalls = true;
  const result = await send("POST", "/artworks/upload", uploadBody());
  assert.equal(result.status, 201);
  assert.equal(result.body.artistId, ids.artistA);
  assert.equal(result.body.title, "Uploaded work");
  assert.ok(objects.has(result.body.storagePath));
});

test("storage upload failures cannot leave metadata or background mutations", async () => {
  allowStorageCalls = true;
  database.failUpload = true;
  const before = structuredClone(database.artworks);
  const result = await send("POST", "/artworks/upload", uploadBody());
  assert.equal(result.status, 500);
  assert.deepEqual(database.artworks, before);
  assert.deepEqual(database.writes, []);
});

test("failed metadata persistence retains the cleanup candidate without changing records", async () => {
  allowStorageCalls = true;
  database.failUpsert = true;
  const before = structuredClone(database.artworks);
  const originalKeys = [...objects.keys()];
  assert.equal((await send("POST", "/artworks/upload", uploadBody())).status, 400);
  assert.deepEqual(database.artworks, before);
  for (const key of originalKeys) assert.ok(objects.has(key));
  assert.equal(objects.size, originalKeys.length + 1, "The orphan is retained for separately approved cleanup");
});

test("deleting an owned record retains a file shared with a portfolio", async () => {
  allowStorageCalls = true;
  const shared = structuredClone(database.portfolioArtworks[0]);
  assert.equal((await send("DELETE", `/artworks/${ids.artworkA}`, {})).status, 200);
  assert.ok(!database.artworks.some((row) => row.id === ids.artworkA));
  assert.equal(database.portfolioArtworks[0].sourceArtworkId, null);
  assert.equal(database.portfolioArtworks[0].imageUrl, shared.imageUrl);
  assert.ok(objects.has(shared.storagePath));
});

test("URL-only references remain safe even when deleteFromStorage is requested", async () => {
  allowStorageCalls = true;
  const key = database.artworks[0].storagePath;
  database.portfolioArtworks[0].storagePath = null;
  assert.equal((await send("DELETE", `/artworks/${ids.artworkA}`, { deleteFromStorage: true })).status, 200);
  assert.ok(objects.has(key));
  assert.equal(database.portfolioArtworks[0].imageUrl, `https://storage.invalid/${key}`);
});

test("a parallel new URL reference cannot race with physical deletion", async () => {
  allowStorageCalls = true;
  const key = database.artworks[0].storagePath;
  let reachRetention;
  let releaseRetention;
  const reached = new Promise((resolve) => { reachRetention = resolve; });
  const release = new Promise((resolve) => { releaseRetention = resolve; });
  database.beforeRetention = async () => { reachRetention(); await release; };
  const deleting = send("DELETE", `/artworks/${ids.artworkA}`, {});
  await reached;
  database.portfolioArtworks.push({ storagePath: null, imageUrl: `https://storage.invalid/${key}` });
  releaseRetention();
  assert.equal((await deleting).status, 200);
  assert.ok(objects.has(key));
});

test("portfolio draft deletion removes only isolated metadata and retains every shared image", async () => {
  const key = database.artworks[0].storagePath;
  let draft = {
    id: randomUUID(), artistAccountId: ids.accountA, status: "DRAFT",
    profileImageStoragePath: key, collectionCoverStoragePath: key, latestPdfStoragePath: null,
    artworks: [{ storagePath: key }], versions: [],
  };
  const service = new PortfolioProjectsService({ portfolioExportUsage: { async count() { return 0; } }, async $transaction(callback) { return callback(this); }, portfolioProject: {
    async findUnique() { return draft; },
    async delete() { draft = null; },
  } }, retainedStorage);
  await service.deleteDraftForArtist(ids.accountA, draft.id);
  assert.equal(draft, null);
  assert.ok(objects.has(key));
  assert.equal(database.artworks[0].storagePath, key);
});

test("replacing portfolio media preserves the original shared file", async () => {
  allowStorageCalls = true;
  const key = database.artworks[0].storagePath;
  let draft = {
    id: randomUUID(), source: "ARTBOARD_PROFILE", artistAccountId: ids.accountA,
    artistName: "Isolated guest", profileImageUrl: `https://storage.invalid/${key}`,
    profileImageStoragePath: key, artworks: [], versions: [], payments: [], paymentStatus: "REQUIRED",
  };
  const service = new PortfolioProjectsService({ portfolioProject: {
    async findUnique() { return draft; },
    async update({ data }) { draft = { ...draft, ...data }; return draft; },
  } }, storage);
  await service.uploadPublicProfileImage(draft.id, {
    originalname: "replacement.png", mimetype: "image/png", size: 3, buffer: Buffer.from("new"),
  }, ids.accountA);
  assert.notEqual(draft.profileImageStoragePath, key);
  assert.ok(objects.has(key));
  assert.ok(objects.has(draft.profileImageStoragePath));
});

test("all removal candidates, including submission paths and PDFs, are retained concurrently", async () => {
  const keys = [...objects.keys(), "artist-submissions/test/artworks/shared.png", "portfolio-projects/test/pdf/file.pdf"];
  for (const key of keys) objects.set(key, Buffer.from("shared"));
  const results = await Promise.all(keys.flatMap((key) => [retainedStorage.deleteFile(key), retainedStorage.deleteFile(key)]));
  assert.ok(results.every((result) => result.deleted === false && result.deferred === true));
  for (const key of keys) assert.ok(objects.has(key));
});

test("only an authenticated admin can use the cross-artist upload tool", async () => {
  assert.equal((await send("POST", "/admin/artworks/upload", uploadBody(ids.artistB))).status, 401);
  allowStorageCalls = true;
  const adminToken = tokenFor("A", { sub: "existing-test-admin", email: "admin@example.invalid", kind: "admin" });
  const result = await send("POST", "/admin/artworks/upload", uploadBody(ids.artistB), adminToken);
  assert.equal(result.status, 201);
  assert.equal(result.body.artistId, ids.artistB);
});
