const assert = require('node:assert/strict');
const { before, beforeEach, after, test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { startHarness } = require('./artist-collections.fixture.cjs');
let h, f;
before(async () => { h = await startHarness({ portfolio: true }); h.env.portfolioCollectionsEnabled = true; });
beforeEach(async () => {
  f = await h.fresh(); h.env.nodeEnv = 'development'; h.storage.fail = false; h.storage.failCopy = false;
  h.storage.onUpload = null;
  h.app.get(require('../src/modules/portfolio-projects/portfolio-commerce.controller').GuestProcessingGuard).buckets.clear();
});
after(async () => { if (h) { await h.close(); console.log('Editor isolated database:', h.database); } });
const request = async (action, doc, who = 'a', images = []) => {
  const body = new FormData(); body.set('document', JSON.stringify(doc));
  for (const image of images) body.append('images', new Blob([image], { type: 'image/png' }), 'test.png');
  const r = await fetch(`${h.baseUrl}/portfolio-projects/editor/${action}`, { method: 'POST', body,
    headers: who ? { Authorization: `Bearer ${f[who].token}` } : {} });
  return { status: r.status, headers: r.headers, body: r.headers.get('content-type')?.includes('application/pdf') ? Buffer.from(await r.arrayBuffer()) : await r.json() };
};
const seed = async (who = 'a') => {
  const r = await h.send('GET', 'editor/from-profile', null, who ? f[who].token : undefined, '/portfolio-projects');
  assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body;
};
function document(s) {
  const p = s.project;
  return { saveKey: p.id.split(':')[1], sourceVersion: s.sourceVersion, project: {
    artistName: p.artistName, email: p.email, biography: p.biography, template: p.template,
    profileImageUrl: p.profileImageUrl, coverImageUrl: p.coverImageUrl, includeCv: false,
    designConfig: { mode: 'PRESET', minimal: { version: 1, cover: 'E', style: 'BLOCKS' } },
  }, artworks: p.artworks.map(w => ({ id: w.id, sourceArtworkId: w.sourceArtworkId, title: w.title,
    imageUrl: w.imageUrl, isSelected: w.isSelected, orderIndex: w.orderIndex,
    portfolioCollectionId: w.portfolioCollectionId, collectionOrderIndex: w.collectionOrderIndex })),
  collections: p.collections.map(c => ({ id: c.id, sourceCollectionId: c.sourceCollectionId,
    title: c.title, description: c.description, year: c.year, coverImageUrl: c.coverImageUrl,
    isIncluded: c.isIncluded, orderIndex: c.orderIndex })), includeUncollectedArtworks: true };
}
async function counts() {
  return { projects: await h.legacy.portfolioProject.count(), works: await h.legacy.portfolioArtwork.count(),
    collections: await h.legacy.portfolioCollection.count(), versions: await h.legacy.portfolioVersion.count(),
    usage: await h.legacy.portfolioExportUsage.count(), periods: await h.legacy.portfolioQuotaPeriod.count(),
    purchases: await h.legacy.portfolioPurchase.count(), uploads: h.storage.calls.length,
    copies: h.storage.copies.length, deletes: h.storage.deletes.length };
}
test('opening from profile requires authentication and performs zero database or storage writes', async () => {
  const before = await counts();
  assert.equal((await h.send('GET', 'editor/from-profile', null, undefined, '/portfolio-projects')).status, 401);
  const a = await seed(), fresh = await seed();
  assert(a.project.id.startsWith('profile-memory:')); assert.notEqual(a.project.id, fresh.project.id);
  assert.equal(a.project.artistAccountId, f.a.account.id); assert.equal(a.project.artistName, f.a.artist.name);
  assert.equal(a.project.artworks.length, 3); assert(a.project.access.localTestExportAvailable);
  assert(!JSON.stringify(a).includes('passwordHash')); assert.deepEqual(await counts(), before);
});
test('preview and clean development export use the current document without persistence, version or quota', async () => {
  const d = document(await seed()), before = await counts(); d.project.artistName = 'Unsaved PDF Artist';
  d.artworks[0].title = 'Unsaved artwork';
  const preview = await request('preview', d), pdf = await request('test-export', d);
  assert.equal(preview.status, 200, JSON.stringify(preview.body)); assert.equal(pdf.status, 200, JSON.stringify(pdf.body));
  assert.equal(pdf.body.subarray(0, 5).toString(), '%PDF-'); assert(Number(pdf.headers.get('x-portfolio-page-count')) > 0);
  // Same renderer, only the preview contains the watermark font/content objects.
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  async function texts(bytes) {
    const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
    try { const doc = await task.promise, result = []; for (let i = 1; i <= doc.numPages; i++) result.push((await (await doc.getPage(i)).getTextContent()).items.map(x => x.str).join(' ')); return result.join(' '); }
    finally { await task.destroy(); }
  }
  const watermarked = await texts(preview.body), clean = await texts(pdf.body);
  assert.match(watermarked, /ARTBOARD\s*PREVIEW/); assert.doesNotMatch(clean, /ARTBOARD\s*PREVIEW/);
  assert.match(clean, /Unsaved PDF Artist/i); assert.match(clean, /Unsaved artwork/i);
  assert.equal(pdf.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await counts(), before);
});
test('clean test export is denied outside development and for anonymous requests', async () => {
  const d = document(await seed()), before = await counts();
  assert.equal((await request('test-export', d, null)).status, 401);
  h.env.nodeEnv = 'production'; assert.equal((await request('test-export', d)).status, 404);
  assert.equal((await seed()).project.access.localTestExportAvailable, false);
  assert.deepEqual(await counts(), before);
});
test('forged owners, foreign artwork/collection IDs and arbitrary image URLs are rejected before writes', async () => {
  const d = document(await seed()), before = await counts();
  for (const mutate of [
    x => { x.ownerId = f.b.account.id; }, x => { x.project.artistAccountId = f.b.account.id; },
    x => { x.project.userId = f.b.account.id; }, x => { x.artworks[0].sourceArtworkId = f.b.artworks[0].id; },
    x => { x.artworks[0].imageUrl = f.b.artworks[0].imageUrl; },
    x => { x.project.profileImageUrl = 'http://127.0.0.1/private'; },
    x => { x.collections = [{ id: randomUUID(), sourceCollectionId: randomUUID(), title: 'Foreign' }]; },
    x => { x.project.designConfig.minimal.ownerId = f.b.account.id; },
  ]) { const forged = structuredClone(d); mutate(forged); const r = await request('save', forged); assert.equal(r.status, 400, JSON.stringify(r.body)); }
  assert.deepEqual(await counts(), before);
});
test('first explicit save preserves edits, collections, ordering, CV and page selection with independent image objects', async () => {
  const s = await seed(), d = document(s), before = await counts(), original = await h.legacy.artwork.findMany({ where: { artistId: f.a.artist.id }, orderBy: { id: 'asc' } });
  d.project.artistName = 'Edited only inside portfolio'; d.project.motto = 'Memory becomes a draft';
  d.project.cvSections = { version: 1, education: [], experience: [], exhibitions: [], awards: [], certificates: [], publications: [], skills: 'Drawing from memory', programs: '' };
  d.project.documentSelection = { version: 1, scope: 'PORTFOLIO', sections: { cover: true, profile: false, featured: true, collections: true, artworks: true, cv: false, contact: true } };
  const c = { id: randomUUID(), title: 'Manual collection', description: 'Local changes', year: '2026', orderIndex: 0, isIncluded: false };
  d.collections.push(c); d.artworks[0].portfolioCollectionId = c.id; d.artworks[0].title = 'Manual title'; d.artworks[0].collectionOrderIndex = 4;
  d.artworks[1].isSelected = false;
  const r = await request('save', d); assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.id, d.saveKey); assert.equal(r.body.artistAccountId, f.a.account.id); assert.equal(r.body.artistName, d.project.artistName);
  assert.equal(r.body.motto, d.project.motto); assert.equal(r.body.collections.length, 1); assert.equal(r.body.collections[0].isIncluded, false);
  assert.equal(r.body.cvSections.skills, 'Drawing from memory');
  const work = r.body.artworks.find(w => w.title === 'Manual title'); assert(work); assert.equal(work.portfolioCollectionId, r.body.collections[0].id); assert.equal(work.collectionOrderIndex, 4);
  assert.notEqual(work.imageUrl, d.artworks[0].imageUrl); assert.notEqual(work.storagePath, f.a.artworks[0].storagePath);
  assert.equal(r.body.artworks.find(w => w.sourceArtworkId === d.artworks[1].sourceArtworkId).isSelected, false);
  assert.equal(r.body.designConfig.minimal.style, 'BLOCKS'); assert.equal(r.body.documentSelection.sections.profile, false);
  assert.equal(r.body.designConfig.pages.cover, 'INSTITUTIONAL_MINIMAL'); assert.equal(r.body.designConfig.footer, 'MINIMAL');
  assert.equal((await counts()).projects, before.projects + 1); assert.equal((await counts()).versions, before.versions); assert.equal((await counts()).usage, before.usage);
  assert.deepEqual(await h.legacy.artwork.findMany({ where: { artistId: f.a.artist.id }, orderBy: { id: 'asc' } }), original);
  const stored = await h.send('GET', `me/${r.body.id}`, null, f.a.token, '/portfolio-projects'); assert.equal(stored.status, 200); assert.equal(stored.body.artistName, d.project.artistName);
});
test('repeated and concurrent first saves create exactly one draft; changed reuse is rejected', async () => {
  const d = document(await seed()), before = await counts();
  const results = await Promise.all([request('save', d), request('save', d)]);
  for (const r of results) assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(await h.legacy.portfolioProject.count({ where: { id: d.saveKey } }), 1);
  const writes = h.storage.calls.length; assert.equal((await request('save', d)).status, 201); assert.equal(h.storage.calls.length, writes);
  d.project.artistName = 'Changed retry'; assert.equal((await request('save', d)).status, 409);
  assert.equal((await counts()).projects, before.projects + 1);
});
test('storage failures and source changes cannot leave a partially saved draft', async () => {
  const d = document(await seed()), before = await counts(); h.storage.failCopy = true;
  assert.equal((await request('save', d)).status, 500); h.storage.failCopy = false;
  assert.equal((await counts()).projects, before.projects); assert.equal((await counts()).works, before.works);
  await h.legacy.artwork.update({ where: { id: f.a.artworks[0].id }, data: { title: 'Changed source' } });
  assert.equal((await request('save', d)).status, 409); assert.equal((await counts()).projects, before.projects);
});
test('source changes during image copies abort the database transaction', async () => {
  const d = document(await seed()), before = await counts();
  h.storage.onUpload = () => h.legacy.artwork.update({ where: { id: f.a.artworks[0].id }, data: { title: 'Concurrent source edit' } });
  assert.equal((await request('save', d)).status, 409);
  assert.equal((await counts()).projects, before.projects); assert.equal((await counts()).works, before.works);
});
test('temporary browser images render without R2 and upload only on explicit save', async () => {
  const d = document(await seed()), before = await counts(), png = h.storage.objects.get(f.a.artworks[0].imageUrl);
  d.project.profileImageUrl = 'upload:0'; d.artworks.push({ id: randomUUID(), imageUrl: 'upload:0', title: 'Uploaded from memory', isSelected: true });
  assert.equal((await request('preview', d, 'a', [png])).status, 200); assert.deepEqual(await counts(), before);
  const r = await request('save', d, 'a', [png]); assert.equal(r.status, 201, JSON.stringify(r.body));
  assert(r.body.profileImageUrl.includes(`portfolio-projects/${d.saveKey}`)); assert(r.body.artworks.some(w => w.title === 'Uploaded from memory'));
});
test('development export of an existing saved project still checks its authenticated owner', async () => {
  const r = await request('save', document(await seed())); assert.equal(r.status, 201, JSON.stringify(r.body));
  const d = document({ project: { ...r.body, id: `profile-memory:${randomUUID()}` } });
  delete d.saveKey; delete d.sourceVersion; d.baseProjectId = r.body.id; d.project.artistName = 'Current unsaved edit';
  const before = await counts(); assert.equal((await request('test-export', d, 'b')).status, 404);
  const result = await request('test-export', d); assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.deepEqual(await counts(), before); assert.equal((await h.legacy.portfolioProject.findUnique({ where: { id: r.body.id } })).artistName, r.body.artistName);
});
