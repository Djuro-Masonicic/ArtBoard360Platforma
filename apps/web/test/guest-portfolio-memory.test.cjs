const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { test } = require("node:test");
const ts = require("typescript");

function load(file, dependencies = {}) {
  const filename = path.join(__dirname, "..", file);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, module: { exports }, crypto, URL, File, structuredClone, queueMicrotask,
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (name === "@artboard/portfolio-document-plan") return require(name);
      throw new Error(`Unexpected runtime dependency: ${name}`);
    },
    fetch() { throw new Error("Memory mode must not access the network"); },
    get localStorage() { throw new Error("Memory mode must not use localStorage"); },
    get indexedDB() { throw new Error("Memory mode must not use IndexedDB"); },
  }, { filename });
  return exports;
}
const { createGuestPortfolioMemoryAdapter } = load("lib/guest-portfolio-memory.ts");

test("profile adapter keeps collection edits, outside ordering and uploaded images in memory until explicit save", async () => {
  let collections, registered = false;
  const { createProfileMemoryAdapter } = load("lib/portfolio-profile-memory.ts", {
    "./guest-portfolio-memory": { createGuestPortfolioMemoryAdapter },
    "./portfolio-guest-transport": { forTransport() { throw Error('No transport while editing'); } },
    "@/services/portfolio-collections": { registerLocalCollections(id, local) { collections = local; registered = true; return () => { registered = false; }; } },
  });
  const base = createGuestPortfolioMemoryAdapter().getSnapshot();
  base.id = `profile-memory:${crypto.randomUUID()}`; base.source = 'ARTBOARD_PROFILE'; base.artistAccountId = crypto.randomUUID();
  base.collections = []; base.artworks = [0, 1].map(i => ({ id: crypto.randomUUID(), portfolioId: base.id, title: `Source ${i}`, imageUrl: `https://storage.invalid/${i}.png`, orderIndex: i, isSelected: true }));
  const adapter = createProfileMemoryAdapter({ project: base, sourceVersion: 'isolated', catalog: { version: 'isolated', artworks: [], collections: [] } });
  const release = adapter.retain();
  assert(registered); assert.equal(adapter.kind, 'profile-memory');
  await adapter.updateArtwork(base.id, base.artworks[0].id, { title: 'Manual title' });
  let p = await collections.command({ action: 'reorderWorks', collectionId: null, artworkIds: base.artworks.map(w => w.id).reverse() });
  assert.equal(p.artworks[1].orderIndex, 0); assert.equal(p.artworks[0].orderIndex, 1);
  p = await collections.command({ action: 'create', title: 'Memory collection' }); const id = p.collections[0].id;
  p = await collections.command({ action: 'move', artworkIds: [p.artworks[0].id], collectionId: id });
  p = await collections.command({ action: 'toggle', collectionId: id, included: false });
  assert.equal(p.artworks[0].isSelected, true); assert.equal(p.artworks[0].title, 'Manual title');
  p = await collections.command({ action: 'delete', collectionId: id }); assert.equal(p.artworks[0].portfolioCollectionId, null);
  p = await adapter.uploadArtworks(p, [new File(['test'], 'memory.png', { type: 'image/png' })]);
  const uploaded = p.artworks.at(-1); assert.match(uploaded.imageUrl, /^blob:/); assert.equal(adapter.getFiles().size, 1);
  assert.equal(p.artistAccountId, base.artistAccountId); assert.equal(base.collections.length, 0); assert.equal(base.artworks[0].title, 'Source 0');
  release(); await new Promise(resolve => queueMicrotask(resolve)); assert.equal(registered, false);
  assert.throws(() => adapter.getSnapshot(), /zatvorena/);
});
const image = (name = "work.png", type = "image/png") => new File(["test image"], name, { type });
function session(initial = {}) {
  const created = [], revoked = [];
  const adapter = createGuestPortfolioMemoryAdapter(initial, {
    createObjectURL(file) { const url = `blob:test/${created.length}`; created.push({ file, url }); return url; },
    revokeObjectURL(url) { revoked.push(url); },
  });
  return { adapter, created, revoked };
}
test("creates only a transient view model, with no API/runtime persistence dependencies", () => {
  const { adapter } = session({ artistName: "Guest", email: "guest@example.invalid" });
  const project = adapter.getSnapshot();
  assert.match(project.id, /^guest-memory:/);
  assert.equal(project.artistName, "Guest");
  assert.equal(project.artistAccountId, null);
  assert.equal(project.latestPdfUrl, null);
  assert.equal(project.artworks.length, 0);
  assert.equal(project.access.canDownloadCleanPdf, false);
  assert.equal(project.payments.length, 0);
  adapter.dispose();
});

test("CV and inclusion stay isolated in Guest memory and disappear in a new session", async () => {
  const { adapter } = session(), id = adapter.getSnapshot().id;
  const cv = { version: 1, education: [{ id: 'education', values: { institution: 'Academy' } }], experience: [], exhibitions: [], awards: [], certificates: [], publications: [], skills: 'Drawing', programs: '' };
  const updated = await adapter.updateProject(id, { cvSections: cv, includeCv: true });
  assert.deepEqual(updated.cvSections, cv); assert.equal(updated.includeCv, true);
  updated.cvSections.education[0].values.institution = 'Mutated copy';
  assert.equal(adapter.getSnapshot().cvSections.education[0].values.institution, 'Academy');
  const next = session(); assert.equal(next.adapter.getSnapshot().cvSections ?? null, null);
  adapter.dispose(); next.adapter.dispose();
});
test("metadata and design changes remain in memory and cannot change ownership/payment", async () => {
  const { adapter } = session(); const id = adapter.getSnapshot().id;
  await adapter.updateProject(id, { artistName: "New name", biography: "Biography", template: "SALES_PRO", language: "EN", pageFormat: "US_LETTER", fontStyle: "SERIF", artistAccountId: "forged", paymentStatus: "PAID" });
  const project = adapter.getSnapshot();
  assert.equal(project.artistName, "New name"); assert.equal(project.biography, "Biography");
  assert.equal(project.template, "SALES_PRO"); assert.equal(project.language, "EN");
  assert.equal(project.pageFormat, "US_LETTER"); assert.equal(project.fontStyle, "SERIF");
  assert.equal(project.artistAccountId, null); assert.equal(project.paymentStatus, "REQUIRED");
  await assert.rejects(() => adapter.updateProject(id, { designConfig: { mode: "CUSTOM" } }), /Premium/);
  adapter.dispose();
});
test("local uploads retain File objects, expose blob previews and update real counts", async () => {
  const { adapter, created } = session(); const files = [image("first-work.png"), image("second_work.png")];
  const project = await adapter.uploadArtworks(adapter.getSnapshot(), files);
  assert.deepEqual(project.artworks.map((item) => item.title), ["first work", "second work"]);
  assert.equal(project.counts.artworks, 2); assert.equal(project.counts.selectedArtworks, 2);
  assert.ok(project.artworks.every((item) => item.imageUrl.startsWith("blob:") && item.storagePath === null));
  assert.equal(adapter.getFiles().get(project.artworks[0].imageUrl), files[0]);
  assert.equal(created.length, 2); adapter.dispose();
});
test("work details, selection, cover and ordering use the same local document", async () => {
  const { adapter } = session(); let project = await adapter.uploadArtworks(adapter.getSnapshot(), [image("one.png"), image("two.png")]);
  const [first, second] = project.artworks;
  await adapter.updateArtwork(project.id, first.id, { title: "  Edited  ", year: "2026", isSelected: false });
  await adapter.updateProject(project.id, { coverImageUrl: second.imageUrl });
  project = await adapter.reorderArtworks(project, [{ id: first.id, orderIndex: 1 }, { id: second.id, orderIndex: 0 }]);
  assert.equal(project.artworks[0].id, second.id);
  assert.equal(project.artworks[1].title, "Edited"); assert.equal(project.artworks[1].year, "2026");
  assert.equal(project.coverImageUrl, second.imageUrl); assert.equal(project.counts.selectedArtworks, 1);
  adapter.dispose();
});
test("invalid batch inputs are rejected before allocating any URL", async () => {
  const { adapter, created } = session(); const original = adapter.getSnapshot();
  await assert.rejects(() => adapter.uploadArtworks(original, [image(), image("bad.svg", "image/svg+xml")]), /JPEG/);
  await assert.rejects(() => adapter.uploadArtworks(original, [new File([], "empty.png", { type: "image/png" })]), /10 MB/);
  await assert.rejects(() => adapter.uploadArtworks(original, [new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", { type: "image/png" })]), /10 MB/);
  await assert.rejects(() => adapter.uploadArtworks(original, Array.from({ length: 31 }, () => image())), /30/);
  assert.equal(created.length, 0); assert.deepEqual(adapter.getSnapshot(), original); adapter.dispose();
});
test("failed URL allocation rolls back the whole batch and releases partial resources", async () => {
  const revoked = []; let attempts = 0;
  const adapter = createGuestPortfolioMemoryAdapter({}, {
    createObjectURL() { if (++attempts === 2) throw new Error("Allocation failed"); return "blob:partial"; },
    revokeObjectURL(url) { revoked.push(url); },
  });
  await assert.rejects(() => adapter.uploadArtworks(adapter.getSnapshot(), [image(), image()]), /Allocation failed/);
  assert.equal(adapter.getSnapshot().artworks.length, 0); assert.equal(adapter.getFiles().size, 0);
  assert.deepEqual(revoked, ["blob:partial"]); adapter.dispose();
});
test("replacement releases unreferenced URLs while preserving images reused as covers", async () => {
  const { adapter, revoked } = session(); const id = adapter.getSnapshot().id;
  let project = await adapter.uploadProfileImage(id, image("old.png"));
  const old = project.profileImageUrl;
  await adapter.updateProject(id, { coverImageUrl: old });
  project = await adapter.uploadProfileImage(id, image("new.png"));
  assert.deepEqual(revoked, []); assert.equal(adapter.getFiles().size, 2);
  await adapter.updateProject(id, { coverImageUrl: project.profileImageUrl });
  assert.deepEqual(revoked, [old]); assert.equal(adapter.getFiles().size, 1);
  const cover = await adapter.uploadCollectionCover(id, image("cover.png"));
  await adapter.uploadCollectionCover(id, image("new-cover.png"));
  assert.ok(revoked.includes(cover.collectionCoverUrl)); adapter.dispose();
});
test("missing items and cross-session images never alter the document", async () => {
  const { adapter } = session(); const project = await adapter.uploadArtworks(adapter.getSnapshot(), [image()]);
  await assert.rejects(() => adapter.updateProject("wrong-session", { title: "Attack" }), /pronađen/);
  await assert.rejects(() => adapter.updateProject(project.id, { profileImageUrl: "https://external.invalid/private" }), /sesiji/);
  await assert.rejects(() => adapter.updateArtwork(project.id, "missing", { title: "Attack" }), /pronađen/);
  await assert.rejects(() => adapter.reorderArtworks(project, [{ id: project.artworks[0].id, orderIndex: -1 }]), /Redosljed/);
  assert.deepEqual(adapter.getSnapshot(), project); adapter.dispose();
});
test("snapshots and file registries cannot mutate the adapter's internal state", async () => {
  const { adapter } = session(); const project = await adapter.uploadArtworks(adapter.getSnapshot(), [image()]);
  project.artworks[0].title = "Outside mutation"; project.access.reason = "PREMIUM";
  adapter.getFiles().clear();
  assert.equal(adapter.getFiles().size, 1); assert.notEqual(adapter.getSnapshot().artworks[0].title, "Outside mutation");
  assert.equal(adapter.getSnapshot().access.reason, "PAYMENT_REQUIRED"); adapter.dispose();
});
test("StrictMode effect replay preserves the session, then real unmount releases every URL once", async () => {
  const { adapter, revoked } = session();
  const releaseProbe = adapter.retain(); releaseProbe();
  const releaseMounted = adapter.retain();
  await Promise.resolve();
  const project = await adapter.uploadArtworks(adapter.getSnapshot(), [image(), image()]);
  releaseMounted(); releaseMounted(); await Promise.resolve(); adapter.dispose();
  assert.deepEqual(revoked.sort(), project.artworks.map((item) => item.imageUrl).sort());
  assert.throws(() => adapter.getSnapshot(), /zatvorena/);
});
test("a new mount/refresh starts an independent empty session", async () => {
  const first = session(); const original = await first.adapter.uploadArtworks(first.adapter.getSnapshot(), [image()]);
  await first.adapter.updateProject(original.id, { artistName: "Unfinished work" }); first.adapter.dispose();
  const second = session();
  assert.notEqual(second.adapter.getSnapshot().id, original.id);
  assert.equal(second.adapter.getSnapshot().artistName, ""); assert.equal(second.adapter.getSnapshot().artworks.length, 0);
  second.adapter.dispose();
});
test("default backend adapter preserves endpoint operations for Free, Premium and legacy Guest", async () => {
  const calls = []; const response = (id) => ({ id });
  const services = Object.fromEntries(["updatePortfolioArtwork", "updatePortfolioProject", "uploadPortfolioArtwork", "uploadPortfolioCollectionCover", "uploadPortfolioProfileImage", "uploadPortfolioCoverImage"]
    .map((method) => [method, async (...args) => { calls.push({ method, args }); return response(args[0]); }]));
  const { backendPortfolioEditorAdapter: adapter } = load("lib/portfolio-editor-adapter.ts", { "@/services/portfolio-projects": services });
  assert.equal(adapter.kind, "backend");
  for (const source of ["Free", "Premium", "GUEST"]) {
    const project = { id: source, source };
    await adapter.updateProject(project.id, { title: source });
    await adapter.updateArtwork(project.id, "work", { isSelected: false });
    await adapter.uploadArtworks(project, [image(), image()]);
    await adapter.uploadProfileImage(project.id, image()); await adapter.uploadCollectionCover(project.id, image());
    await adapter.uploadCoverImage(project.id, image());
    await adapter.reorderArtworks(project, [{ id: "one", orderIndex: 0 }, { id: "two", orderIndex: 1 }]);
  }
  assert.equal(calls.length, 27);
  assert.equal(calls.filter((item) => item.method === "uploadPortfolioArtwork").length, 6);
  assert.ok(calls.slice(-9).every((item) => item.args[0] === "GUEST"));
});

test("new profile fields and independent cover stay in memory, leaving works and collections unchanged",async()=>{
  const {adapter,revoked}=session();let p=await adapter.uploadArtworks(adapter.getSnapshot(),[image()]);
  await adapter.updateProject(p.id,{dateOfBirth:"2000-02-29",behanceUrl:"behance.net/artist",motto:"Light",mottoAuthor:"Author",collectionName:"Keep"});
  p=await adapter.uploadCoverImage(p.id,image("cover.png"));const old=p.coverImageUrl;
  p=await adapter.uploadCoverImage(p.id,image("replacement.png"));
  assert.ok(revoked.includes(old));assert.equal(p.artworks.length,1);assert.equal(p.collectionName,"Keep");
  assert.equal(p.collectionCoverUrl,undefined);assert.equal(p.dateOfBirth,"2000-02-29");assert.equal(p.motto,"Light");
  adapter.dispose();assert.throws(()=>adapter.getSnapshot(),/zatvorena/);
});

test("birth dates round-trip without timezone shifts and reject impossible or future dates",()=>{
  const {parseBirthDateInput,formatBirthDate}=load("lib/portfolio-profile-fields.ts");
  for(const value of ["2000-02-29","29.02.2000.","29.02.2000"])
    assert.equal(parseBirthDateInput(value),"2000-02-29");
  assert.equal(formatBirthDate("2000-02-29T00:00:00.000Z"),"29.02.2000.");
  assert.equal(parseBirthDateInput(""),"");
  for(const value of ["31.02.2000.","2001-02-29","2999-01-01","not a date","0000-01-01"])
    assert.equal(parseBirthDateInput(value),null,value);
});
