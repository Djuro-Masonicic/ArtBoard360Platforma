const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { before, beforeEach, after, test } = require("node:test");

Object.assign(process.env, {
  NODE_ENV: "test", DATABASE_URL: "postgresql://unused@127.0.0.1:1/unused",
  DIRECT_URL: "postgresql://unused@127.0.0.1:1/unused", PORT: "0", API_PORT: "0",
  R2_ACCOUNT_ID: "unused", R2_ACCESS_KEY_ID: "unused", R2_SECRET_ACCESS_KEY: "unused",
  R2_BUCKET_NAME: "unused", R2_PUBLIC_URL: "https://storage.invalid",
  ADMIN_AUTH_SECRET: "isolated-portfolio-test-secret", ADMIN_AUTH_TOKEN_TTL_HOURS: "12",
  RESEND_API_KEY: "", MAX_UPLOAD_FILE_SIZE_BYTES: "10485760", MAX_SIGNED_UPLOAD_EXPIRY_SECONDS: "900",
});
require("ts-node").register({ project: path.join(__dirname, "../tsconfig.json"), transpileOnly: true });
require("reflect-metadata");
const { Global, Module, ValidationPipe } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");
const { PrismaService } = require("../src/prisma/prisma.service");
const { R2StorageService } = require("../src/storage/r2-storage.service");
const { PortfolioProjectsModule } = require("../src/modules/portfolio-projects/portfolio-projects.module");
const { GlobalHttpExceptionFilter } = require("../src/common/filters/http-exception.filter");
const { signSessionToken } = require("../src/modules/auth/auth-crypto");
const renderer = require("../src/modules/portfolio-projects/portfolio-pdf.generator");

// The real module, auth service/guards, controller, DTOs and project service run.
// Persistence, rendering and storage transport are isolated; .env is never read.
const ids = Object.fromEntries(["accountA", "accountB", "artistA", "artistB", "projectA", "projectB", "guest", "orphan", "artworkA", "artworkB", "missing"]
  .map((name) => [name, randomUUID()]));
let rows, accounts, writes, uploads, renders;
function project(id, owner, source = "ARTBOARD_PROFILE", premium = false) {
  return {
    id, artistAccountId: owner, source, status: "DRAFT", artistName: `Isolated ${id}`,
    title: "Portfolio", publicShareToken: null, paymentStatus: premium ? "NOT_REQUIRED" : "REQUIRED",
    template: "INSTITUTIONAL_MINIMAL", language: "ME", pageFormat: "A4", fontStyle: "SANS", includeBranding: true,
    artworks: [{ id: id === ids.projectA ? ids.artworkA : ids.artworkB, portfolioId: id, isSelected: true, orderIndex: 0, imageUrl: "https://storage.invalid/image.png" }],
    versions: [], payments: [],
    artistAccount: owner ? { id: owner, email: "private@example.invalid", subscription: { plan: premium ? "PLATINUM" : "BASIC", status: "ACTIVE" } } : null,
  };
}
function reset() {
  rows = [project(ids.projectA, ids.accountA), project(ids.projectB, ids.accountB, "ARTBOARD_PROFILE", true),
    project(ids.guest, null, "GUEST"), project(ids.orphan, null)];
  accounts = ["A", "B"].map((suffix) => ({
    id: ids[`account${suffix}`], email: `${suffix}@example.invalid`.toLowerCase(), name: `Account ${suffix}`, isActive: true,
    mustChangePassword: false, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: null,
    artist: { id: ids[`artist${suffix}`], name: `Artist ${suffix}`, slug: suffix, artworks: [], disciplines: [], socialLinks: [] },
    subscription: { plan: suffix === "B" ? "PLATINUM" : "BASIC", status: "ACTIVE" },
  }));
  writes = []; uploads = []; renders = [];
}
function matches(row, where) {
  return Object.entries(where).every(([key, value]) => key === "AND"
    ? value.every((item) => matches(row, item))
    : row[key] === value);
}
const projectRepository = {
  async findUnique({ where, select }) {
    const row = rows.find((item) => matches(item, where));
    if (!row) return null;
    return select ? Object.fromEntries(Object.keys(select).map((key) => [key, row[key]])) : structuredClone(row);
  },
  async findMany({ where }) { return structuredClone(rows.filter((row) => matches(row, where))); },
  async count({ where }) { return rows.filter((row) => matches(row, where)).length; },
  async create({ data }) {
    writes.push("create");
    const row = { ...project(randomUUID(), data.artistAccountId ?? null, data.source), ...data, artworks: [], versions: [], payments: [] };
    if (data.artistAccountId) {
      const account = accounts.find((item) => item.id === data.artistAccountId);
      row.artistAccount = { id: account.id, email: account.email, subscription: account.subscription };
    }
    rows.push(row);
    return structuredClone(row);
  },
  async update({ where, data }) {
    const row = rows.find((item) => matches(item, where)); assert.ok(row);
    writes.push("update");
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (key === "artworks") {
        if (value.update) Object.assign(row.artworks.find((item) => item.id === value.update.where.id), value.update.data);
        if (value.create) row.artworks.push({ id: randomUUID(), portfolioId: row.id, ...value.create });
      } else row[key] = value;
    }
    return structuredClone(row);
  },
  async updateMany({ where, data }) {
    let count = 0;
    for (const row of rows.filter((item) => matches(item, where))) { Object.assign(row, data); count++; writes.push("updateMany"); }
    return { count };
  },
  async delete({ where }) {
    const index = rows.findIndex((item) => matches(item, where)); assert.notEqual(index, -1);
    writes.push("delete"); return rows.splice(index, 1)[0];
  },
};
const prisma = {
  artistSubscription: { async findUnique({ where }) { return accounts.find(a => a.id === where.artistAccountId)?.subscription ?? null; } },
  portfolioExportUsage: { async count() { return 0; }, async findMany() { return []; } },
  portfolioProject: projectRepository,
  artistAccount: { async findUnique({ where }) { return structuredClone(accounts.find((item) => item.id === where.id) ?? null); } },
  adminUser: { async findUnique() { return { id: "admin", email: "admin@example.invalid", name: "Admin", createdAt: new Date(), updatedAt: new Date(), lastLoginAt: null }; } },
  portfolioArtwork: {
    async findFirst({ where }) { return structuredClone(rows.flatMap((row) => row.artworks).find((item) => matches(item, where)) ?? null); },
    async count({ where }) { return rows.flatMap((row) => row.artworks).filter((item) => matches(item, where)).length; },
  },
  portfolioVersion: {
    async findFirst() { return null; },
    async create({ data }) { writes.push("version"); rows.find((row) => row.id === data.portfolioId).versions.push(data); return data; },
  },
  portfolioPayment: { async create({ data }) { writes.push("payment"); rows.find((row) => row.id === data.portfolioId).payments.push(data); return data; } },
  async $transaction(input) {
    if (Array.isArray(input)) return Promise.all(input);
    const saved = structuredClone(rows);
    try { return await input(prisma); } catch (error) { rows = saved; throw error; }
  },
};
R2StorageService.prototype.uploadFile = async function (input) {
  this.validateUpload(input.fileSizeBytes, input.mimeType, input.entityType);
  uploads.push(input.entityType);
  return { path: `portfolio-projects/${input.recordId}/test.png`, publicUrl: "https://storage.invalid/test.png", bucket: "unused" };
};
renderer.generatePortfolioPdf = async (document, options = {}) => {
  renders.push({ id: document.id, watermark: Boolean(options.watermark) });
  return Buffer.from("%PDF-isolated");
};
renderer.generateSelectedTemplateTestPdf = async (document) => {
  renders.push({ id: document.id, cover: true }); return Buffer.from("%PDF-isolated-cover");
};
class Infrastructure {}
Global()(Infrastructure);
Module({ providers: [{ provide: PrismaService, useValue: prisma }], exports: [PrismaService] })(Infrastructure);
class TestApp {}
Module({ imports: [Infrastructure, PortfolioProjectsModule] })(TestApp);
let app, baseUrl;
before(async () => {
  reset(); app = await NestFactory.create(TestApp, { logger: false, abortOnError: false });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  await app.listen(0, "127.0.0.1"); baseUrl = await app.getUrl();
});
beforeEach(reset);
after(async () => { if (app) await app.close(); });
function token(suffix = "A", overrides = {}) {
  return signSessionToken({ sub: ids[`account${suffix}`], email: `${suffix}@example.invalid`.toLowerCase(), kind: "artist",
    exp: Math.floor(Date.now() / 1000) + 600, ...overrides }, process.env.ADMIN_AUTH_SECRET);
}
function image() {
  const form = new FormData(); form.set("file", new Blob(["isolated"], { type: "image/png" }), "test.png"); return form;
}
function cvPayload() { return { version: 1, education: [{ id: 'education-1', values: { institution: 'Isolated Academy' } }], experience: [], exhibitions: [], awards: [], certificates: [], publications: [], skills: 'Drawing', programs: '' }; }

test("production cannot unlock a PDF using the browser-triggered demo payment endpoint", async () => {
  const { env } = require('../src/config/env'); const original = structuredClone(rows), previous = env.nodeEnv;
  try { env.nodeEnv = 'production'; assert.equal((await send('POST', `/public/${ids.projectA}/demo-payment`)).status, 403); }
  finally { env.nodeEnv = previous; }
  assert.deepEqual(rows, original); assert.deepEqual(writes, []); assert.deepEqual(uploads, []);
});

test("Free and Premium owners save and reopen a validated CV without changing originals", async () => {
  for (const suffix of ['A', 'B']) {
    const id = ids[`project${suffix}`], before = structuredClone(rows.find(row => row.id === id).artworks);
    const result = await send('PATCH', `/public/${id}`, { cvSections: cvPayload(), includeCv: true }, token(suffix));
    assert.equal(result.status, 200, JSON.stringify(result.body)); assert.deepEqual(result.body.cvSections, cvPayload());
    const reopened = await send('GET', `/public/${id}`, undefined, token(suffix));
    assert.deepEqual(reopened.body.cvSections, cvPayload()); assert.equal(reopened.body.includeCv, true);
    assert.deepEqual(rows.find(row => row.id === id).artworks, before);
  }
  assert.deepEqual(uploads, []);
});
test("CV writes require the verified owner and rejected requests have no effects", async () => {
  const original = structuredClone(rows);
  assert.equal((await send('PATCH', `/public/${ids.projectA}`, { cvSections: cvPayload() }, null)).status, 401);
  assert.equal((await send('PATCH', `/public/${ids.projectA}`, { cvSections: cvPayload() }, token('B'))).status, 404);
  assert.equal((await send('PATCH', `/public/${ids.guest}`, { cvSections: cvPayload() }, null)).status, 404);
  const invalid = { ...cvPayload(), artistAccountId: ids.accountB };
  assert.equal((await send('PATCH', `/public/${ids.projectA}`, { cvSections: invalid })).status, 400);
  invalid.publications = [{ id: 'publication', values: { link: 'javascript:alert(1)' } }]; delete invalid.artistAccountId;
  assert.equal((await send('PATCH', `/public/${ids.projectA}`, { cvSections: invalid })).status, 400);
  assert.deepEqual(rows, original); assert.deepEqual(writes, []); assert.deepEqual(uploads, []);
});
test("unrelated edits preserve legacy CV and CV inclusion can be disabled independently", async () => {
  rows[0].cvSections = [{ title: 'Education', items: ['Legacy academy'] }]; rows[0].includeCv = true;
  const original = structuredClone(rows[0].cvSections);
  const result = await send('PATCH', `/public/${ids.projectA}`, { artistName: 'Updated name', includeCv: false });
  assert.equal(result.status, 200); assert.deepEqual(result.body.cvSections, original); assert.equal(result.body.includeCv, false);
});
async function send(method, route, body, auth = token()) {
  const response = await fetch(`${baseUrl}/portfolio-projects${route}`, {
    method, headers: { Connection: "close", ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  });
  const type = response.headers.get("content-type") ?? "";
  return { status: response.status, body: type.includes("application/json") ? await response.json() : await response.text() };
}
function operations(id) {
  return [
    ["GET", `/public/${id}`], ["PATCH", `/public/${id}`, { title: "Changed" }],
    ["PATCH", `/public/${id}/artworks/${ids.artworkA}`, { isSelected: false }],
    ["POST", `/public/${id}/artworks/upload`, image()], ["POST", `/public/${id}/profile-image`, image()],
    ["POST", `/public/${id}/collection-cover`, image()], ["POST", `/public/${id}/demo-payment`],
    ["POST", `/public/${id}/cover-image`, image()],
    ["POST", `/public/${id}/generate-pdf`], ["GET", `/public/${id}/preview-pdf`], ["GET", `/public/${id}/cover-test-pdf`],
  ];
}

test("every legacy alias rejects anonymous access to an account-owned project before side effects", async () => {
  const before = structuredClone(rows);
  for (const [method, route, body] of operations(ids.projectA)) assert.equal((await send(method, route, body, null)).status, 401, route);
  assert.deepEqual(rows, before); assert.deepEqual(writes, []); assert.deepEqual(uploads, []); assert.deepEqual(renders, []);
});
test("artist B cannot access any private operation of artist A using a known UUID", async () => {
  const before = structuredClone(rows);
  for (const [method, route, body] of operations(ids.projectA)) assert.equal((await send(method, route, body, token("B"))).status, 404, route);
  assert.deepEqual(rows, before); assert.deepEqual(writes, []); assert.deepEqual(uploads, []); assert.deepEqual(renders, []);
});
test("expired, forged and admin tokens cannot authorize the artist draft aliases", async () => {
  for (const auth of ["invalid", token("A", { exp: 1 }), token("A", { kind: "admin" })]) {
    assert.equal((await send("PATCH", `/public/${ids.projectA}`, { title: "Attack" }, auth)).status, 401);
  }
  assert.deepEqual(writes, []);
});
test("ownership fields cannot be injected into a valid owner request", async () => {
  for (const field of ["artistId", "userId", "ownerId", "artistAccountId", "source", "publicShareToken"]) {
    assert.equal((await send("PATCH", `/public/${ids.projectA}`, { [field]: ids.accountB })).status, 400);
  }
  assert.deepEqual(writes, []);
});
test("Free and Premium owners can save, reopen and list only their own project", async () => {
  for (const suffix of ["A", "B"]) {
    const id = ids[`project${suffix}`];
    assert.equal((await send("PATCH", `/public/${id}`, { title: `Saved ${suffix}` }, token(suffix))).status, 200);
    const reopened = await send("GET", `/public/${id}`, undefined, token(suffix));
    assert.equal(reopened.body.title, `Saved ${suffix}`);
    const listed = await send("GET", "/me", undefined, token(suffix));
    assert.deepEqual(listed.body.items.map((item) => item.id), [id]);
  }
});
test("profile creation ignores client owner ids and binds the verified account", async () => {
  const result = await send("POST", "/from-profile", { ownerId: ids.accountB });
  assert.equal(result.status, 201); assert.equal(result.body.artistAccountId, ids.accountA);
});
test("unknown UUIDs and orphaned non-guest projects do not become anonymous guest projects", async () => {
  for (const id of [ids.missing, ids.orphan]) {
    assert.equal((await send("GET", `/public/${id}`, undefined, null)).status, 404);
    assert.equal((await send("PATCH", `/public/${id}`, { title: "Attack" }, token())).status, 404);
  }
  assert.deepEqual(writes, []);
});
test("an owner can update a project artwork but cannot inject another project's artwork id", async () => {
  assert.equal((await send("PATCH", `/public/${ids.projectA}/artworks/${ids.artworkB}`, { title: "Attack" })).status, 404);
  assert.deepEqual(writes, []);
  assert.equal((await send("PATCH", `/public/${ids.projectA}/artworks/${ids.artworkA}`, { isSelected: false })).status, 200);
  assert.equal(rows[0].artworks[0].isSelected, false);
});
test("owner uploads preserve artwork/profile/cover functionality", async () => {
  for (const operation of ["artworks/upload", "profile-image", "collection-cover"]) {
    assert.equal((await send("POST", `/public/${ids.projectA}/${operation}`, image())).status, 201);
  }
  assert.equal(uploads.length, 3);
});
test("preview is watermarked and Free eligibility alone does not create an export", async () => {
  assert.equal((await send("GET", `/public/${ids.projectA}/preview-pdf`)).status, 200);
  assert.deepEqual(renders, [{ id: ids.projectA, watermark: true }]);
  const state = await send("GET", `/public/${ids.projectA}`); assert.equal(state.body.access.canGeneratePdf, true); assert.equal(state.body.access.quota.remaining, 1);
  assert.deepEqual(writes, []); assert.deepEqual(uploads, []);
});
test("browser demo payment cannot create a purchase or unlock an export in any environment", async () => {
  assert.equal((await send("POST", `/public/${ids.projectA}/demo-payment`)).status, 403);
  assert.equal((await send("POST", `/public/${ids.projectB}/demo-payment`, undefined, token("B"))).status, 403);
  assert.equal(rows[0].payments.length, 0); assert.equal(rows[0].versions.length, 0); assert.deepEqual(writes, []);
});
test("private read/delete endpoints reject anonymous and foreign requests without mutation", async () => {
  for (const method of ["GET", "DELETE"]) {
    assert.equal((await send(method, `/me/${ids.projectA}`, undefined, null)).status, 401);
    assert.equal((await send(method, `/me/${ids.projectA}`, undefined, token("B"))).status, 404);
  }
  assert.deepEqual(writes, []);
});
test("owners can delete only their own draft metadata", async () => {
  assert.equal((await send("DELETE", `/me/${ids.projectA}`)).status, 200);
  assert.ok(!rows.some((row) => row.id === ids.projectA));
  assert.ok(rows.some((row) => row.id === ids.projectB));
});
test("administrator review remains separately guarded", async () => {
  for (const auth of [null, token()]) {
    const response = await fetch(`${baseUrl}/admin/portfolio-projects/${ids.projectA}/preview-pdf`, {
      headers: { Connection: "close", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    });
    assert.equal(response.status, 401);
  }
  assert.deepEqual(renders, []);
  const auth = token("A", { sub: "admin", email: "admin@example.invalid", kind: "admin" });
  const response = await fetch(`${baseUrl}/admin/portfolio-projects/${ids.projectA}/preview-pdf`, {
    headers: { Connection: "close", Authorization: `Bearer ${auth}` },
  });
  assert.equal(response.status, 200);
  assert.equal(renders.at(-1).watermark, true);
});
test("only the owner can explicitly publish a separate read-only share token", async () => {
  assert.equal((await send("POST", `/me/${ids.projectA}/share`, undefined, null)).status, 401);
  assert.equal((await send("POST", `/me/${ids.projectA}/share`, undefined, token("B"))).status, 404);
  assert.deepEqual(writes, []);
  const published = await send("POST", `/me/${ids.projectA}/share`);
  assert.equal(published.status, 201); assert.match(published.body.token, /^[a-f0-9]{64}$/);
  const repeated = await send("POST", `/me/${ids.projectA}/share`);
  assert.equal(repeated.body.token, published.body.token);
  const viewed = await send("GET", `/shared/${published.body.token}/preview-pdf`, undefined, null);
  assert.equal(viewed.status, 200); assert.equal(viewed.body, "%PDF-isolated");
  assert.equal(renders.at(-1).watermark, true);
  assert.equal((await send("PATCH", `/public/${ids.projectA}`, { title: "Attack" }, published.body.token)).status, 401);
});
test("a UUID or unknown publication token cannot read a shared preview", async () => {
  for (const value of [ids.projectA, "f".repeat(64)]) {
    assert.equal((await send("GET", `/shared/${value}/preview-pdf`, undefined, null)).status, 404);
  }
  assert.deepEqual(renders, []);
});
test("Guest cannot create a persistent draft or access legacy Guest records", async () => {
  const created = await send("POST", "/guest", { artistName: "Legacy guest", email: "guest@example.invalid" }, null);
  assert.equal(created.status, 403);
  const id = ids.guest;
  assert.equal((await send("PATCH", `/public/${id}`, { title: "Temporary legacy check" }, null)).status, 404);
  assert.equal((await send("GET", `/public/${id}`, undefined, null)).status, 404);
  assert.equal((await send("GET", `/public/${id}/preview-pdf`, undefined, null)).status, 404);
  assert.equal((await send("POST", `/public/${id}/profile-image`, image(), null)).status, 404);
  assert.equal((await send("GET", "/me", undefined, null)).status, 401);
});

test("profile fields validate, normalize, reload and clear without changing collections", async () => {
  const before = structuredClone(rows[0].artworks);
  const result = await send("PATCH", `/public/${ids.projectA}`, {
    dateOfBirth: "2000-02-29", behanceUrl: "behance.net/test-artist", motto: "  Art and light  ", mottoAuthor: " Author ",
  });
  assert.equal(result.status, 200); assert.equal(result.body.dateOfBirth, "2000-02-29");
  assert.equal(result.body.behanceUrl, "https://behance.net/test-artist");
  assert.equal(result.body.motto, "Art and light"); assert.equal(result.body.mottoAuthor, "Author");
  assert.deepEqual(rows[0].artworks, before);
  assert.equal((await send("GET", `/public/${ids.projectA}`)).body.dateOfBirth, "2000-02-29");
  const cleared = await send("PATCH", `/public/${ids.projectA}`, { dateOfBirth: "", behanceUrl: "", motto: "", mottoAuthor: "" });
  for (const field of ["dateOfBirth", "behanceUrl", "motto", "mottoAuthor"]) assert.equal(cleared.body[field], null);
});

test("invalid profile fields and forged owner values have no effects", async () => {
  const before = structuredClone(rows);
  for (const payload of [{dateOfBirth:"2001-02-29"},{dateOfBirth:"2999-01-01"},{dateOfBirth:null},
    {dateOfBirth:"29.02.2000."},{behanceUrl:"https://example.com/artist"},{behanceUrl:"javascript:alert(1)"},
    {motto:"x".repeat(1001)},{mottoAuthor:"x".repeat(161)},{artistAccountId:ids.accountB,motto:"attack"}]) {
    assert.equal((await send("PATCH", `/public/${ids.projectA}`, payload)).status, 400, JSON.stringify(payload).slice(0,100));
  }
  assert.equal((await send("PATCH", `/public/${ids.projectA}`, {dateOfBirth:"2000-01-01"}, token("B"))).status, 404);
  assert.deepEqual(rows,before); assert.deepEqual(writes,[]); assert.deepEqual(uploads,[]);
});

test("independent cover upload changes no artworks or collection cover and requires an image", async () => {
  rows[0].collectionCoverUrl="https://storage.invalid/collection.png";
  const before = structuredClone(rows[0].artworks);
  const result = await send("POST", `/public/${ids.projectA}/cover-image`, image());
  assert.equal(result.status,201); assert.equal(uploads.at(-1),"portfolio-cover");
  assert.equal(result.body.coverImageUrl,"https://storage.invalid/test.png");
  assert.ok(result.body.coverImageStoragePath);assert.equal(result.body.collectionCoverUrl,"https://storage.invalid/collection.png");
  assert.deepEqual(rows[0].artworks,before);
  const saved=structuredClone(rows);const oldWrites=writes.length;
  const pdf=new FormData();pdf.set("file",new Blob(["%PDF-test"],{type:"application/pdf"}),"test.pdf");
  assert.equal((await send("POST", `/public/${ids.projectA}/cover-image`,pdf)).status,400);
  assert.equal((await send("POST", `/public/${ids.projectA}/cover-image`)).status,400);
  assert.deepEqual(rows,saved);assert.equal(writes.length,oldWrites);
});

test("from-profile copies the private birth date and existing Behance social link",async()=>{
  accounts[0].artist.dateOfBirth=new Date("2000-02-29T00:00:00.000Z");
  accounts[0].artist.socialLinks=[{platform:"BEHANCE",url:"https://behance.net/from-profile"}];
  const result=await send("POST","/from-profile");
  assert.equal(result.status,201);assert.equal(result.body.dateOfBirth,"2000-02-29");
  assert.equal(result.body.behanceUrl,"https://behance.net/from-profile");
  const {ArtistsService}=require("../src/modules/artists/artists.service");
  assert.equal(Object.hasOwn(ArtistsService.prototype.serializeArtist(accounts[0].artist),"dateOfBirth"),false);
});

test("cover storage failure preserves all previously saved data",async()=>{
  const original=R2StorageService.prototype.uploadFile;
  const saved=structuredClone(rows);
  R2StorageService.prototype.uploadFile=async()=>{throw new Error("Isolated storage failure");};
  try {
    assert.equal((await send("POST",`/public/${ids.projectA}/cover-image`,image())).status,500);
    assert.deepEqual(rows,saved);assert.deepEqual(writes,[]);
  } finally {R2StorageService.prototype.uploadFile=original;}
});
