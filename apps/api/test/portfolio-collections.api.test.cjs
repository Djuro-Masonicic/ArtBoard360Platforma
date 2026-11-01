const assert = require("node:assert/strict");
const { before, beforeEach, after, test } = require("node:test");
const { startHarness } = require("./artist-collections.fixture.cjs");
const { buildPortfolioDocumentPlan } = require("@artboard/portfolio-document-plan");
let h, f;
before(async () => { h = await startHarness({ portfolio: true }); h.env.portfolioCollectionsEnabled = true; });
beforeEach(async () => {
  f = await h.fresh(); h.storage.fail = false; h.storage.failCopy = false; h.storage.onUpload = null; h.storage.copies = []; h.storage.calls = []; h.storage.deletes = [];
});
after(async () => { if (h) { await h.close(); console.log(`Portfolio collections isolated DB: ${h.database}`); } });
const source = (method, operation, body, who = "a") => h.send(method, operation, body, f[who].token);
const send = (method, operation, body, who = "a") => h.send(method, operation, body, who ? f[who].token : undefined, "/portfolio-projects");
async function sourceCollections() {
  let state = (await source("GET", "")).body;
  state = (await source("POST", "", { expectedVersion: state.version, title: "Source collection A", description: "A source description" })).body;
  state = (await source("POST", "", { expectedVersion: state.version, title: "Source collection B" })).body;
  state = (await source("PUT", "membership", { expectedVersion: state.version, collectionId: state.collections[0].id, artworkIds: f.a.artworks.slice(0, 2).map(w => w.id) })).body;
  return (await source("PUT", "membership", { expectedVersion: state.version, collectionId: state.collections[1].id, artworkIds: [f.a.artworks[2].id] })).body;
}
async function create() { const r = await send("POST", "from-profile"); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body; }
function savedCv(label = "Academy") { return { version: 1, education: [{ id: 'education', values: { institution: label } }], experience: [], exhibitions: [], awards: [], certificates: [], publications: [], skills: 'Drawing', programs: '' }; }

test('production defaults enable both collection flows without deployment flags and retain ownership checks', async () => {
  const { readCollectionsEnabled } = require('../src/config/env');
  for (const [value, expected] of [[undefined, true], ['true', true], ['false', false], ['invalid', false]]) assert.equal(readCollectionsEnabled(value), expected);
  const previous = { nodeEnv: h.env.nodeEnv, artist: h.env.artistCollectionsEnabled, portfolio: h.env.portfolioCollectionsEnabled };
  try {
    h.env.nodeEnv = 'production';
    h.env.artistCollectionsEnabled = readCollectionsEnabled(undefined);
    h.env.portfolioCollectionsEnabled = readCollectionsEnabled(undefined);
    await sourceCollections();
    const p = await create();
    assert.equal(p.collectionsAvailable, true);
    assert.equal(p.collections.length, 2);
    const catalog = await send('GET', `me/${p.id}/collections/catalog`);
    assert.equal(catalog.status, 200);
    assert.equal(catalog.body.collections.length, 2);
    assert.equal((await send('GET', `me/${p.id}/collections/catalog`, null, 'b')).status, 404);
    assert.equal((await send('GET', `me/${p.id}/collections/catalog`, null, null)).status, 401);
  } finally {
    h.env.nodeEnv = previous.nodeEnv; h.env.artistCollectionsEnabled = previous.artist; h.env.portfolioCollectionsEnabled = previous.portfolio;
  }
});

test('explicitly disabled portfolio collections still reject reads and writes without changing the draft', async () => {
  await sourceCollections(); const p = await create(), before = await get(p.id);
  h.env.portfolioCollectionsEnabled = false;
  try {
    assert.equal((await send('GET', `me/${p.id}/collections/catalog`)).status, 503);
    const denied = await send('POST', `me/${p.id}/collections/commands`, { expectedRevision: p.revision, action: 'toggle', collectionId: p.collections[0].id, included: false });
    assert.equal(denied.status, 503);
    // Compare raw data: the response capability flag intentionally reflects the switch.
    const saved = await h.legacy.portfolioProject.findUnique({ where: { id: p.id }, include: { collections: true } });
    assert.equal(saved.revision, before.revision);
    assert(saved.collections.every(c => c.isIncluded));
  } finally { h.env.portfolioCollectionsEnabled = true; }
  assert.deepEqual(await get(p.id), before);
});

for (const style of [undefined, 'ROUNDED', 'GRADIENT', 'EDITORIAL', 'CARDS', 'BLOCKS']) test(`${style || 'Minimal'} covers save/reopen, transient preview does not overwrite and invalid/foreign choices have no effects`, async () => {
  let p=await create();const config={mode:'PRESET',pages:Object.fromEntries(['cover','profile','collection','artwork','contact'].map(key=>[key,'INSTITUTIONAL_MINIMAL'])),footer:'MINIMAL',minimal:{version:1,cover:'E',...(style?{style}:{})}};
  const r=await send('PATCH',`public/${p.id}`,{expectedRevision:p.revision,designConfig:config});assert.equal(r.status,200,JSON.stringify(r.body));p=r.body;assert.deepEqual((await get(p.id)).designConfig.minimal,config.minimal);
  const before=await get(p.id);const preview=await fetch(`${h.baseUrl}/portfolio-projects/me/${p.id}/collections/preview-pdf`,{method:'POST',headers:{Authorization:`Bearer ${f.a.token}`,'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:p.revision,designConfig:{...config,minimal:{version:1,cover:'C'}}})});assert.equal(preview.status,201);assert.equal(preview.headers.get('content-type'),'application/pdf');assert.deepEqual(await get(p.id),before);
  for(const minimal of [{version:1,cover:'Z'},{version:2,cover:'A'},{version:1,cover:'A',style:'INVALID'},{version:1,cover:'A',ownerId:f.b.account.id}])assert.equal((await send('PATCH',`public/${p.id}`,{expectedRevision:p.revision,designConfig:{...config,minimal}})).status,400);
  assert.equal((await send('PATCH',`public/${p.id}`,{expectedRevision:p.revision,designConfig:config},'b')).status,404);assert.deepEqual(await get(p.id),before);
});
test("CV persistence uses the existing JSON field, preserves artworks and rejects stale concurrent updates", async () => {
  let p = await create(); const originals = await h.legacy.artwork.findMany({ where: { artistId: f.a.artist.id }, orderBy: { id: 'asc' } });
  const body = { expectedRevision: p.revision, cvSections: savedCv(), includeCv: true };
  const results = await Promise.all([send('PATCH', `public/${p.id}`, body), send('PATCH', `public/${p.id}`, { ...body, cvSections: savedCv('Other Academy') })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const saved = results.find(r => r.status === 200).body; p = await get(p.id);
  assert.deepEqual(p.cvSections, saved.cvSections); assert.equal(p.includeCv, true); assert.equal(p.revision, body.expectedRevision + 1);
  assert.deepEqual(await h.legacy.artwork.findMany({ where: { artistId: f.a.artist.id }, orderBy: { id: 'asc' } }), originals);
  assert.equal((await send('PATCH', `public/${p.id}`, { expectedRevision: p.revision, cvSections: savedCv('Attack') }, 'b')).status, 404);
  assert.deepEqual((await get(p.id)).cvSections, p.cvSections); assert.equal(h.storage.deletes.length, 0);
});
test("invalid CV updates and transient previews do not change the isolated database", async () => {
  const p = await create();
  const invalid = { ...savedCv(), ownerId: f.b.account.id };
  assert.equal((await send('PATCH', `public/${p.id}`, { expectedRevision: p.revision, cvSections: invalid })).status, 400);
  assert.deepEqual(await get(p.id), p);
  const response = await fetch(`${h.baseUrl}/portfolio-projects/me/${p.id}/collections/preview-pdf`, { method: 'POST', headers: { Authorization: `Bearer ${f.a.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: p.revision, cvSections: savedCv('Preview Academy'), includeCv: true }) });
  assert.equal(response.status, 201); assert.equal(response.headers.get('content-type'), 'application/pdf');
  const bytes = new Uint8Array(await response.arrayBuffer()); const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs'); const task = getDocument({ data: bytes, useSystemFonts: true });
  try { const document = await task.promise; let text = ''; for (let i = 1; i <= document.numPages; i++) text += (await (await document.getPage(i)).getTextContent()).items.map(item => item.str).join(' '); assert(text.toUpperCase().includes('PREVIEW ACADEMY')); assert(text.includes('ARTBOARD PREVIEW')); } finally { await task.destroy(); }
  assert.deepEqual(await get(p.id), p);
});
async function get(id) { const r = await send("GET", `public/${id}`); assert.equal(r.status, 200); return r.body; }
test('PDF selection persists without changing individual artwork choices and CV-only preview contains only CV', async () => {
  let p = await create(); const choices = p.artworks.map(w => [w.id, w.isSelected, w.orderIndex]);
  const { defaultDocumentSelection } = require('@artboard/portfolio-document-plan'); const selection = defaultDocumentSelection(true); selection.scope = 'CV';
  const result = await send('PATCH', `public/${p.id}`, { expectedRevision: p.revision, cvSections: savedCv('Standalone CV Academy'), includeCv: true, documentSelection: selection });
  assert.equal(result.status, 200, JSON.stringify(result.body)); p = await get(p.id); assert.equal(p.documentSelection.scope, 'CV'); assert.deepEqual(p.artworks.map(w => [w.id, w.isSelected, w.orderIndex]), choices);
  const response = await fetch(`${h.baseUrl}/portfolio-projects/public/${p.id}/preview-pdf`, { headers: { Authorization: `Bearer ${f.a.token}` } });
  assert.equal(response.status, 200); const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs'); const task = getDocument({ data: new Uint8Array(await response.arrayBuffer()), useSystemFonts: true });
  try { const pdf = await task.promise; assert.equal(pdf.numPages, 2); let text=''; for(let n=1;n<=pdf.numPages;n++)text+=(await(await pdf.getPage(n)).getTextContent()).items.map(item=>item.str).join(' '); assert(text.toUpperCase().includes('STANDALONE CV ACADEMY')); assert(text.includes('ARTBOARD PREVIEW')); assert(!text.includes('KONTAKT')); } finally { await task.destroy(); }
  const invalid = { ...selection, ownerId: f.b.account.id }; assert.equal((await send('PATCH', `public/${p.id}`, { expectedRevision: p.revision, documentSelection: invalid })).status, 400); assert.deepEqual(await get(p.id), p);
});
test('revoking a share invalidates its token and a new share has a different token', async () => {
  const p = await create(); const first = await send('POST', `me/${p.id}/share`); assert.equal(first.status, 201);
  assert.equal((await send('DELETE', `me/${p.id}/share`, undefined, 'b')).status, 404);
  assert.equal((await send('DELETE', `me/${p.id}/share`)).status, 200);
  const old = await fetch(`${h.baseUrl}/portfolio-projects/shared/${first.body.token}/preview-pdf`); assert.equal(old.status, 404);
  const next = await send('POST', `me/${p.id}/share`); assert.equal(next.status, 201); assert.notEqual(next.body.token, first.body.token);
});
test('a legacy account project invalidates the latest PDF when switching to a different document scope',async()=>{
  const p=await h.legacy.portfolioProject.create({data:{artistAccountId:f.a.account.id,source:'ARTBOARD_PROFILE',artistName:'Legacy Scope',collectionSchemaVersion:1,cvSections:savedCv(),includeCv:true,latestPdfUrl:'https://storage.invalid/old.pdf',latestPdfStoragePath:'old.pdf'}});
  const {defaultDocumentSelection}=require('@artboard/portfolio-document-plan');const selection=defaultDocumentSelection(true);selection.scope='CV';
  const result=await send('PATCH',`public/${p.id}`,{documentSelection:selection});assert.equal(result.status,200);assert.equal(result.body.documentSelection.scope,'CV');assert.equal(result.body.latestPdfUrl,null);assert.equal(result.body.latestPdfStoragePath,null);
});
test('full version history is paginated, owner-only, and old paid versions remain downloadable without a new charge', async () => {
  const p = await create();
  for (let n = 1; n <= 7; n++) { const path = `portfolio-projects/${p.id}/pdf/history-${n}.pdf`; const url = `r2-private:${path}`; h.storage.objects.set(url, Buffer.from('%PDF-isolated-history')); await h.legacy.portfolioVersion.create({ data: { portfolioId: p.id, versionNumber: n, pdfUrl: url, storagePath: path, template: p.template, language: p.language, includeBranding: true } }); }
  const reopened = await get(p.id); assert.equal(reopened.versions.length, 3); assert.equal(reopened.counts.versions, 7); assert(reopened.versions.every(v => v.pdfUrl.startsWith('/api/portfolio-projects/')));
  const first = await send('GET', `me/${p.id}/versions?page=1&pageSize=3`), next = await send('GET', `me/${p.id}/versions?page=2&pageSize=3`);
  assert.equal(first.status, 200); assert.equal(first.body.meta.total, 7); assert.deepEqual(first.body.items.map(v => v.versionNumber), [7,6,5]); assert.deepEqual(next.body.items.map(v => v.versionNumber), [4,3,2]);
  assert.equal((await send('GET', `me/${p.id}/versions`, undefined, 'b')).status, 404); assert.equal((await send('GET', `me/${p.id}/versions?page=0`)).status, 400);
  const version = first.body.items[0]; const before = h.storage.calls.length;
  const response = await fetch(`${h.baseUrl}/portfolio-projects/me/${p.id}/versions/${version.id}/pdf`, { headers: { Authorization: `Bearer ${f.a.token}` } }); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store'); assert((await response.text()).startsWith('%PDF-'));
  const foreign = await fetch(`${h.baseUrl}/portfolio-projects/me/${p.id}/versions/${version.id}/pdf`, { headers: { Authorization: `Bearer ${f.b.token}` } }); assert.equal(foreign.status, 404); assert.equal(h.storage.calls.length, before);
});
const command = (p, body, who = "a") => send("POST", `me/${p.id}/collections/commands`, { expectedRevision: p.revision, ...body }, who);
async function apply(p, body) { const r = await command(p, body); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body; }
const catalog = async p => (await send("GET", `me/${p.id}/collections/catalog`)).body;

test("new project snapshots source collections with independently copied image objects", async () => {
  const original = await sourceCollections(); const p = await create();
  assert.equal(p.collectionSchemaVersion, 2); assert.equal(p.collections.length, 2); assert.equal(p.artworks.length, 3);
  for (const work of p.artworks) { assert(work.storagePath.startsWith(`portfolio-projects/${p.id}/`)); assert.notEqual(work.storagePath, f.a.artworks.find(w => w.id === work.sourceArtworkId).storagePath); assert(h.storage.objects.has(work.imageUrl)); }
  assert(p.coverImageStoragePath.startsWith(`portfolio-projects/${p.id}/`));
  assert.deepEqual((await source("GET", "")).body, original); assert.equal(h.storage.deletes.length, 0);
});

test("two portfolios never share physical copies with each other", async () => {
  const a = await create(), b = await create();
  assert(a.artworks.every(w => !b.artworks.some(other => other.storagePath === w.storagePath)));
});

test("failed image copy cannot leave a partially created project", async () => {
  const before = await h.legacy.portfolioProject.count({ where: { artistAccountId: f.a.account.id } }); h.storage.failCopy = true;
  assert.equal((await send("POST", "from-profile")).status, 500);
  assert.equal(await h.legacy.portfolioProject.count({ where: { artistAccountId: f.a.account.id } }), before); assert.equal(h.storage.deletes.length, 0);
});

test("collection exclusion preserves individual choices and changes the effective document", async () => {
  await sourceCollections(); let p = await create(); const original = p.artworks.map(w => [w.id, w.isSelected, w.orderIndex, w.collectionOrderIndex]);
  p = await apply(p, { action: "toggle", collectionId: p.collections[0].id, included: false });
  assert.equal(buildPortfolioDocumentPlan(p).artworkCount, 1); assert.equal(buildPortfolioDocumentPlan(p).pageCount, 5);
  assert.deepEqual(p.artworks.map(w => [w.id, w.isSelected, w.orderIndex, w.collectionOrderIndex]), original);
  p = await apply(p, { action: "toggle", collectionId: p.collections[0].id, included: true }); assert.equal(p.counts.selectedArtworks, 3);
});

test("outside-group inclusion is independent and empty collections create no intro", async () => {
  let p = await create(); p = await apply(p, { action: "create", title: "Empty" });
  assert.equal(buildPortfolioDocumentPlan(p).pageCount, 6);
  p = await apply(p, { action: "toggleOutside", included: false }); assert.equal(p.counts.selectedArtworks, 0); assert.equal(buildPortfolioDocumentPlan(p).pageCount, 3);
  assert(p.artworks.every(w => w.isSelected));
});

test("manual collection creation/editing, work moves and ordering are portfolio-only", async () => {
  const src = (await source("GET", "")).body; let p = await create();
  p = await apply(p, { action: "create", title: "Local A", year: "2026", description: "Local description" });
  p = await apply(p, { action: "create", title: "Local B" }); const first = p.collections[0].id, second = p.collections[1].id;
  p = await apply(p, { action: "move", collectionId: first, artworkIds: p.artworks.map(w => w.id) });
  p = await apply(p, { action: "reorderWorks", collectionId: first, artworkIds: [...p.artworks].reverse().map(w => w.id) });
  p = await apply(p, { action: "reorder", collectionIds: [second, first] });
  const plan = buildPortfolioDocumentPlan(p); assert.equal(plan.groups.length, 1); assert.equal(plan.groups[0].collection.id, first);
  assert.equal(plan.selectedArtworks[0].sourceArtworkId, f.a.artworks[2].id);
  assert.deepEqual((await source("GET", "")).body, src);
});

test("removing a portfolio collection preserves snapshots, selection and original objects", async () => {
  await sourceCollections(); let p = await create(); const images = p.artworks.map(w => w.imageUrl), originalCount = await h.legacy.artwork.count({ where: { artistId: f.a.artist.id } });
  const id = p.collections[0].id; p = await apply(p, { action: "delete", collectionId: id });
  assert.equal(p.artworks.length, 3); assert.equal(p.artworks.filter(w => w.portfolioCollectionId === null).length, 2);
  assert(images.every(url => h.storage.objects.has(url))); assert.equal(await h.legacy.artwork.count({ where: { artistId: f.a.artist.id } }), originalCount); assert.equal(h.storage.deletes.length, 0);
});

test("anonymous, foreign project UUIDs and forged owners never mutate a snapshot", async () => {
  const p = await create(), before = await get(p.id);
  assert.equal((await command(p, { action: "create", title: "Bad" }, null)).status, 401);
  assert.equal((await command(p, { action: "create", title: "Bad" }, "b")).status, 404);
  assert.equal((await command(p, { action: "create", title: "Bad", artistAccountId: f.b.account.id })).status, 400);
  assert.equal((await send("GET", `me/${p.id}/collections/catalog`, undefined, "b")).status, 404);
  assert.deepEqual(await get(p.id), before);
});

test("foreign source IDs and foreign portfolio artwork IDs are rejected", async () => {
  let p = await create(); p = await apply(p, { action: "create", title: "Owned" }); const c = await catalog(p), before = await get(p.id);
  assert.equal((await command(p, { action: "addWorks", collectionId: p.collections[0].id, artworkIds: [f.b.artworks[0].id], sourceVersion: c.version })).status, 404);
  const q = (await send("POST", "from-profile", undefined, "b")).body;
  assert.equal((await command(p, { action: "move", collectionId: p.collections[0].id, artworkIds: [q.artworks[0].id] })).status, 404);
  assert.deepEqual(await get(p.id), before);
});

test("two simultaneous snapshot edits produce one commit and one conflict", async () => {
  const p = await create(); const results = await Promise.all(["First", "Second"].map(title => command(p, { action: "create", title })));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]); assert.equal((await get(p.id)).collections.length, 1);
});

test("existing legacy PATCH routes cannot bypass snapshot revision checks", async () => {
  let p = await create();
  assert.equal((await send("PATCH", `public/${p.id}`, { artistName: "No revision" })).status, 409);
  assert.equal((await send("PATCH", `public/${p.id}/artworks/${p.artworks[0].id}`, { title: "No revision" })).status, 409);
  const r = await send("PATCH", `public/${p.id}/artworks/${p.artworks[0].id}`, { expectedRevision: p.revision, title: "Manual title", year: "1999", technique: "Manual", dimensions: "50x70", price: "EUR 500" });
  assert.equal(r.status, 200); p = r.body; assert.equal(p.artworks[0].year, "1999");
  assert.equal((await command({ ...p, revision: p.revision - 1 }, { action: "create", title: "Stale" })).status, 409);
});

test("adding an existing source work requires a move confirmation and retains manual metadata", async () => {
  let p = await create(); const edited = await send("PATCH", `public/${p.id}/artworks/${p.artworks[0].id}`, { expectedRevision: p.revision, title: "Manual title", year: "1999" }); assert.equal(edited.status, 200); p = edited.body;
  p = await apply(p, { action: "create", title: "Destination" }); const c = await catalog(p), key = p.artworks[0].storagePath;
  const payload = { action: "addWorks", collectionId: p.collections[0].id, artworkIds: [f.a.artworks[0].id], sourceVersion: c.version };
  assert.equal((await command(p, payload)).status, 409);
  p = await apply(p, { ...payload, confirmedMoves: [p.artworks[0].id] });
  assert.equal(p.artworks.length, 3); assert.equal(p.artworks[0].title, "Manual title"); assert.equal(p.artworks[0].year, "1999"); assert.equal(p.artworks[0].storagePath, key);
});

test("repeated source collection import does not overwrite manual collection metadata", async () => {
  await sourceCollections(); let p = await create(); const c = await catalog(p), id = p.collections[0].id;
  p = await apply(p, { action: "update", collectionId: id, title: "Manual collection" });
  p = await apply(p, { action: "import", collectionIds: [p.collections[0].sourceCollectionId], sourceVersion: c.version });
  assert.equal(p.collections[0].title, "Manual collection"); assert.equal(p.artworks.length, 3); assert.equal(p.collections.length, 2);
});

test("source deletion or replacement leaves independently copied portfolio images available", async () => {
  await sourceCollections(); const p = await create(), url = p.artworks[0].imageUrl;
  await h.legacy.artwork.delete({ where: { id: f.a.artworks[0].id } });
  const next = await get(p.id); assert.equal(next.artworks[0].sourceArtworkId, null); assert.equal(next.artworks[0].imageUrl, url); assert(h.storage.objects.has(url));
  const changes = (await send("GET", `me/${p.id}/collections/source-changes`)).body; assert(changes.changes.some(change => change.field === "deleted"));
});

test("source review detects a manual conflict and never writes on GET", async () => {
  let p = await create(); const manual = await send("PATCH", `public/${p.id}/artworks/${p.artworks[0].id}`, { expectedRevision: p.revision, title: "Manual title", year: "1999" }); p = manual.body;
  await h.legacy.artwork.update({ where: { id: f.a.artworks[0].id }, data: { title: "New original title" } });
  const before = await get(p.id), review = (await send("GET", `me/${p.id}/collections/source-changes`)).body;
  const change = review.changes.find(c => c.scope === "artwork" && c.field === "title"); assert(change.conflict); assert.deepEqual(await get(p.id), before);
  p = await apply(p, { action: "applySource", sourceVersion: review.sourceVersion, changes: [change.key] });
  assert.equal(p.artworks[0].title, "New original title"); assert.equal(p.artworks[0].year, "1999");
});

test("keeping the snapshot acknowledges source changes without replacing manual values", async () => {
  const p = await create(); await h.legacy.artist.update({ where: { id: f.a.artist.id }, data: { bio: "Changed biography" } });
  const review = (await send("GET", `me/${p.id}/collections/source-changes`)).body; assert(review.changes.length);
  const next = await apply(p, { action: "ackSource", sourceVersion: review.sourceVersion }); assert.equal(next.biography, p.biography);
  assert.equal((await send("GET", `me/${p.id}/collections/source-changes`)).body.changes.length, 0);
});

test("publishing a local collection requires explicit current source conflict confirmation", async () => {
  await sourceCollections(); let p = await create(); p = await apply(p, { action: "create", title: "Publish destination" });
  const c = p.collections.at(-1); p = await apply(p, { action: "move", collectionId: c.id, artworkIds: [p.artworks[0].id] });
  const plan = (await send("GET", `me/${p.id}/collections/${c.id}/publish-plan`)).body; assert.equal(plan.moves.length, 1);
  assert.equal((await command(p, { action: "publish", collectionId: c.id, sourceVersion: plan.sourceVersion })).status, 409);
  p = await apply(p, { action: "publish", collectionId: c.id, sourceVersion: plan.sourceVersion, confirmedMoves: plan.moves.map(w => w.artworkId) });
  const published = p.collections.find(item => item.id === c.id); assert(published.sourceCollectionId);
  assert.equal((await h.legacy.artwork.findUnique({ where: { id: f.a.artworks[0].id } })).artistCollectionId, published.sourceCollectionId);
  const total = await h.legacy.artistCollection.count({ where: { artistId: f.a.artist.id } });
  assert.equal((await command(p, { action: "publish", collectionId: c.id, sourceVersion: plan.sourceVersion })).status, 400);
  assert.equal(await h.legacy.artistCollection.count({ where: { artistId: f.a.artist.id } }), total);
});

test("source change between publish plan and confirmation creates no partial source collection", async () => {
  await sourceCollections(); let p = await create(); p = await apply(p, { action: "create", title: "Pending publication" }); const c = p.collections.at(-1);
  p = await apply(p, { action: "move", collectionId: c.id, artworkIds: [p.artworks[0].id] });
  const plan = (await send("GET", `me/${p.id}/collections/${c.id}/publish-plan`)).body;
  await h.legacy.artwork.update({ where: { id: f.a.artworks[0].id }, data: { artistCollectionId: null, collectionOrderIndex: null } });
  const before = await h.legacy.artistCollection.count({ where: { artistId: f.a.artist.id } });
  assert.equal((await command(p, { action: "publish", collectionId: c.id, sourceVersion: plan.sourceVersion, confirmedMoves: plan.moves.map(w => w.artworkId) })).status, 409);
  assert.equal(await h.legacy.artistCollection.count({ where: { artistId: f.a.artist.id } }), before);
});

test("old drafts remain format 1 until explicit conversion, preserving their exact manual values", async () => {
  const legacy = await h.legacy.portfolioProject.create({ data: { artistAccountId: f.a.account.id, sourceArtistId: f.a.artist.id, source: "ARTBOARD_PROFILE", artistName: "Manual legacy artist", collectionName: "Legacy collection", collectionYear: "1990", biography: "Legacy biography",
    coverImageUrl: f.a.artworks[1].imageUrl, artworks: { create: f.a.artworks.slice(0, 2).map((w, index) => ({ sourceArtworkId: w.id, imageUrl: w.imageUrl, storagePath: w.storagePath, title: `Legacy ${index}`, year: "1991", orderIndex: 10 - index, isSelected: index === 0 })) } } });
  const p = await get(legacy.id); assert.equal(p.collectionSchemaVersion, 1); assert.equal(p.collections.length, 0);
  const next = await apply(p, { action: "convert", expectedUpdatedAt: p.updatedAt });
  assert.equal(next.collectionSchemaVersion, 2); assert.equal(next.artistName, "Manual legacy artist"); assert.equal(next.biography, "Legacy biography");
  assert.equal(next.collections[0].title, "Legacy collection"); assert.equal(next.collections[0].sourceCollectionId, null);
  assert.deepEqual(next.artworks.map(w => [w.title, w.year, w.orderIndex, w.isSelected]), p.artworks.map(w => [w.title, w.year, w.orderIndex, w.isSelected]));
  assert(next.artworks.every(w => w.storagePath.startsWith(`portfolio-projects/${p.id}/`)));
  assert.equal((await send("GET", `me/${p.id}/collections/source-changes`)).body.historyUnknown, true);
});

test("all existing PDF templates use the effective grouped page map and watermark preview", async () => {
  await sourceCollections(); let p = await create();
  for (const template of ["INSTITUTIONAL_MINIMAL", "ARTBOARD_EDITORIAL", "SALES_PRO"]) {
    const response = await fetch(`${h.baseUrl}/portfolio-projects/me/${p.id}/collections/preview-pdf`, { method: "POST", headers: { Authorization: `Bearer ${f.a.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: p.revision, template }) });
    assert.equal(response.status, 201); assert.equal(response.headers.get("content-type"), "application/pdf");
    const buffer = Buffer.from(await response.arrayBuffer()); const actual = (buffer.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
    assert.equal(actual, buildPortfolioDocumentPlan(p).pageCount); assert.equal(Number(response.headers.get("X-Portfolio-Page-Count")), actual);
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }); const pdf = await task.promise;
    for (const [index, entry] of buildPortfolioDocumentPlan(p).pages.entries()) {
      const text = (await (await pdf.getPage(index + 1)).getTextContent()).items.map(item => item.str).join(' ').toUpperCase();
      const expected = entry.kind === 'collection' ? p.collections.find(c => c.id === entry.collectionId)?.title : entry.kind === 'artwork' ? p.artworks.find(w => w.id === entry.artworkId)?.title : null;
      if (expected) assert(text.includes(expected.toUpperCase()), `${template}: page ${index + 1} contains ${expected}`);
      assert(text.includes('ARTBOARD PREVIEW'));
    }
    await task.destroy();
  }
  assert.equal((await send("POST", `public/${p.id}/generate-pdf`)).status, 201); // First lifetime Free export.
});

test("changing a snapshot invalidates current clean PDF pointers but preserves version history", async () => {
  let p = await create(); await h.legacy.portfolioProject.update({ where: { id: p.id }, data: { paymentStatus: "PAID" } }); p = await get(p.id);
  const generated = await send("POST", `public/${p.id}/generate-pdf`); assert.equal(generated.status, 201); p = generated.body; assert(p.latestPdfUrl);
  p = await apply(p, { action: "create", title: "Changed document" }); assert.equal(p.latestPdfUrl, null); assert.equal(p.versions.length, 1);
});

test("ordinary concurrent metadata edits use the same revision guard as collection commands", async () => {
  const p = await create();
  const results = await Promise.all(["First edit", "Second edit"].map(title => send("PATCH", `public/${p.id}`, { expectedRevision: p.revision, title })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const saved = await get(p.id); assert.equal(saved.revision, p.revision + 1);
  assert.equal(saved.title, results.find(r => r.status === 200).body.title);
});

test('publishing preserves portfolio-local work order without changing global gallery order', async () => {
  let p = await create(); p = await apply(p, { action: 'create', title: 'Ordered publication' }); const c = p.collections[0];
  p = await apply(p, { action: 'move', collectionId: c.id, artworkIds: p.artworks.map(w => w.id) });
  const expected = [...p.artworks].reverse();
  p = await apply(p, { action: 'reorderWorks', collectionId: c.id, artworkIds: expected.map(w => w.id) });
  const plan = (await send('GET', `me/${p.id}/collections/${c.id}/publish-plan`)).body;
  p = await apply(p, { action: 'publish', collectionId: c.id, sourceVersion: plan.sourceVersion });
  const native = (await source('GET', '')).body;
  assert.deepEqual([...native.artworks].sort((a,b)=>a.collectionOrderIndex-b.collectionOrderIndex).map(w=>w.id), expected.map(w=>w.sourceArtworkId));
  assert.deepEqual(native.artworks.map(w=>w.orderIndex), [0,10,20]);
});

test('a failed source-image refresh preserves the entire snapshot and its baseline', async () => {
  const p = await create(), w = f.a.artworks[0], imageUrl = `https://storage.invalid/new-${w.id}.png`;
  h.storage.objects.set(imageUrl, h.storage.objects.get(w.imageUrl));
  await h.legacy.artwork.update({ where: { id: w.id }, data: { imageUrl } });
  const review = (await send('GET', `me/${p.id}/collections/source-changes`)).body;
  const change = review.changes.find(c=>c.field==='imageUrl'); assert(change);
  h.storage.failCopy = true;
  assert.equal((await command(p,{ action:'applySource',sourceVersion:review.sourceVersion,changes:[change.key] })).status,500);
  assert.deepEqual(await get(p.id),p); assert.equal(h.storage.deletes.length,0);
});

test('a concurrent content edit prevents publishing an obsolete clean PDF version', async () => {
  let p = await create(); await h.legacy.artistSubscription.create({ data: { artistAccountId:f.a.account.id,plan:'PLATINUM' } });
  p = await get(p.id); assert(p.access.canDownloadCleanPdf);
  h.storage.onUpload = async input => { if(input.entityType==='portfolio-pdf'){ h.storage.onUpload=null; const r=await command(p,{action:'create',title:'Concurrent edit'});assert.equal(r.status,201); } };
  assert.equal((await send('POST',`public/${p.id}/generate-pdf`)).status,409);
  const next = await get(p.id); assert.equal(next.versions.length,0); assert.equal(next.latestPdfUrl,null);
  const success = await send('POST',`public/${p.id}/generate-pdf`); assert.equal(success.status,201);assert.equal(success.body.versions.length,1);
});

test("public source detail exposes actual collections and membership without private profile fields", async () => {
  const native = await sourceCollections();
  const result = await fetch(`${h.baseUrl}/artists/${f.a.artist.slug}`); assert.equal(result.status, 200);
  const detail = await result.json(); assert.equal(detail.collections.length, 2);
  assert.equal(detail.artworks.filter(w => w.artistCollectionId === native.collections[0].id).length, 2);
  assert(!('dateOfBirth' in detail)); assert(!('sourceProfileBaseline' in detail));
});

test("every physical preview page is watermarked, including text overflow pages", async () => {
  await sourceCollections(); let p = await create();
  p = await apply(p, { action: 'update', collectionId: p.collections[0].id, description: 'Long collection description. '.repeat(140).slice(0,4000) });
  const response = await fetch(`${h.baseUrl}/portfolio-projects/me/${p.id}/collections/preview-pdf`, { method: 'POST', headers: { Authorization: `Bearer ${f.a.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: p.revision, biography: 'Long profile biography. '.repeat(200) }) });
  assert.equal(response.status, 201);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(await response.arrayBuffer()), useSystemFonts: true });
  const pdf = await task.promise;
  assert.equal(pdf.numPages, Number(response.headers.get('X-Portfolio-Page-Count')));
  for (let index = 1; index <= pdf.numPages; index++) {
    const text = (await (await pdf.getPage(index)).getTextContent()).items.map(item => item.str).join(' ');
    assert.equal((text.match(/ARTBOARD PREVIEW/g) || []).length, 1, `Exactly one watermark on physical page ${index}`);
  }
  await task.destroy();
});
