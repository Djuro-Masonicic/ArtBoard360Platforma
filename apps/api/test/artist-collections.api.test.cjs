const assert = require("node:assert/strict");
const { before, beforeEach, after, test } = require("node:test");
const { startHarness } = require("./artist-collections.fixture.cjs");
const sharp = require("sharp");
let h, f;
before(async () => { h = await startHarness(); });
beforeEach(async () => { f = await h.fresh(); h.storage.calls = []; h.storage.deletes = []; h.storage.fail = false; h.storage.onUpload = null; });
after(async () => { if (h) { await h.close(); console.log(`Retained isolated API database: ${h.database}; compatibility database: ${h.legacyDatabase}`); } });
const send = (method, op, data, who = "a") => h.send(method, op, data, who ? f[who].token : undefined);
async function state(who = "a") { const r = await send("GET", "", undefined, who); assert.equal(r.status, 200); assert(r.body.available); return r.body; }
async function create(title = "Collection A", who = "a") {
  const before = await state(who);
  const r = await send("POST", "", { expectedVersion: before.version, title }, who);
  assert.equal(r.status, 201); return r.body;
}
async function rows() {
  return { collections: await h.prisma.artistCollection.findMany({ where: { artistId: f.a.artist.id }, orderBy: { id: "asc" } }),
    artworks: await h.prisma.artwork.findMany({ where: { artistId: f.a.artist.id }, orderBy: { id: "asc" } }) };
}

test("create/edit normalizes metadata and can choose an owned work as cover", async () => {
  const s = await create("  First collection  "); const id = s.collections[0].id;
  assert.equal(s.collections[0].title, "First collection");
  const r = await send("PATCH", id, { expectedVersion: s.version, title: "Changed", description: "Description", year: "2020–2026", coverArtworkId: f.a.artworks[0].id });
  assert.equal(r.status, 200); assert.equal(r.body.collections[0].description, "Description");
  assert.equal(r.body.collections[0].coverImageUrl, f.a.artworks[0].imageUrl);
  assert.equal((await state()).collections[0].year, "2020–2026");
});

test("all mutation routes reject anonymous access without changes or storage", async () => {
  const s = await create(); const id = s.collections[0].id, saved = await rows();
  for (const [method, path, body] of [["POST", "", { title: "Anonymous" }], ["PATCH", id, { title: "Anonymous" }],
    ["PUT", "order", { ids: [id] }], ["PUT", "membership", { artworkIds: [f.a.artworks[0].id], collectionId: id }],
    ["PUT", `${id}/artworks/order`, { artworkIds: [] }], ["DELETE", id, {}], ["POST", `${id}/cover`, {}]]) {
    assert.equal((await send(method, path, { ...body, expectedVersion: s.version }, null)).status, 401);
  }
  assert.deepEqual(await rows(), saved); assert.equal(h.storage.calls.length, 0);
});

test("foreign collection UUID grants no read, edit, reorder or delete access", async () => {
  const a = await create("Private collection title"), b = await state("b"), id = a.collections[0].id;
  for (const [method, op, payload, expected] of [["PATCH", id, { title: "stolen" }, 404], ["DELETE", id, {}, 404],
    ["PUT", `${id}/artworks/order`, { artworkIds: [] }, 404], ["PUT", "order", { ids: [id] }, 400]]) {
    const r = await send(method, op, { ...payload, expectedVersion: b.version }, "b");
    assert.equal(r.status, expected); assert(!JSON.stringify(r.body).includes("Private collection title"));
  }
  assert.equal((await state("b")).collections.length, 0); assert.equal((await state()).collections[0].title, "Private collection title");
});

test("forged ownership, storage URLs and unknown fields are rejected", async () => {
  const s = await create(), id = s.collections[0].id, before = await rows();
  for (const extra of [{ artistId: f.b.artist.id }, { userId: f.b.account.id }, { ownerId: f.b.account.id }, { coverImageUrl: "https://attacker.invalid" }]) {
    assert.equal((await send("PATCH", id, { expectedVersion: s.version, title: "Invalid", ...extra })).status, 400);
  }
  assert.deepEqual(await rows(), before);
});

test("foreign artwork cannot be assigned or used as cover; whole batch is unchanged", async () => {
  const s = await create(), id = s.collections[0].id, before = await rows();
  assert.equal((await send("PUT", "membership", { expectedVersion: s.version, collectionId: id, artworkIds: [f.a.artworks[0].id, f.b.artworks[0].id] })).status, 404);
  assert.equal((await send("PATCH", id, { expectedVersion: s.version, coverArtworkId: f.b.artworks[0].id })).status, 404);
  assert.deepEqual(await rows(), before);
});

test("work moves between collections without duplication or global reordering", async () => {
  await create("First"); let s = await create("Second"); const [a, b] = s.collections;
  let r = await send("PUT", "membership", { expectedVersion: s.version, collectionId: a.id, artworkIds: [f.a.artworks[0].id] }); assert.equal(r.status, 200);
  r = await send("PUT", "membership", { expectedVersion: r.body.version, collectionId: b.id, artworkIds: [f.a.artworks[0].id] }); assert.equal(r.status, 200);
  assert.equal(r.body.artworks.find((w) => w.id === f.a.artworks[0].id).artistCollectionId, b.id);
  assert.equal(r.body.artworks.length, 3); assert.deepEqual(r.body.artworks.map((w) => w.orderIndex), [0, 10, 20]);
});

test("collection and member ordering are independent of the gallery", async () => {
  await create("First"); const s = await create("Second"); const ids = s.collections.map((c) => c.id).reverse();
  let r = await send("PUT", "order", { expectedVersion: s.version, ids }); assert.equal(r.status, 200); assert.deepEqual(r.body.collections.map((c) => c.id), ids);
  r = await send("PUT", "membership", { expectedVersion: r.body.version, collectionId: ids[0], artworkIds: f.a.artworks.map((w) => w.id) }); assert.equal(r.status, 200);
  const artworkIds = f.a.artworks.map((w) => w.id).reverse();
  r = await send("PUT", `${ids[0]}/artworks/order`, { expectedVersion: r.body.version, artworkIds }); assert.equal(r.status, 200);
  assert.deepEqual([...r.body.artworks].sort((a, b) => a.collectionOrderIndex - b.collectionOrderIndex).map((w) => w.id), artworkIds);
  assert.deepEqual(r.body.artworks.map((w) => w.orderIndex), [0, 10, 20]);
});

test("partial, duplicate and foreign reorder lists cannot silently remove works", async () => {
  const s = await create(); const id = s.collections[0].id;
  const moved = await send("PUT", "membership", { expectedVersion: s.version, collectionId: id, artworkIds: f.a.artworks.map((w) => w.id) });
  const saved = await rows();
  for (const artworkIds of [[f.a.artworks[0].id], [f.a.artworks[0].id, f.a.artworks[0].id], [f.b.artworks[0].id]]) {
    assert.equal((await send("PUT", `${id}/artworks/order`, { expectedVersion: moved.body.version, artworkIds })).status, 400);
  }
  assert.deepEqual(await rows(), saved);
});

test("removing membership preserves original artwork and image", async () => {
  const s = await create(); const id = s.collections[0].id;
  let r = await send("PUT", "membership", { expectedVersion: s.version, collectionId: id, artworkIds: [f.a.artworks[0].id] });
  r = await send("PUT", "membership", { expectedVersion: r.body.version, collectionId: null, artworkIds: [f.a.artworks[0].id] }); assert.equal(r.status, 200);
  const w = r.body.artworks.find((w) => w.id === f.a.artworks[0].id);
  assert.equal(w.artistCollectionId, null); assert.equal(w.collectionOrderIndex, null); assert.equal(w.imageUrl, f.a.artworks[0].imageUrl); assert.equal(h.storage.deletes.length, 0);
});

test("deleting a collection detaches works without deleting any artwork or image", async () => {
  const s = await create(); const id = s.collections[0].id;
  const r = await send("PUT", "membership", { expectedVersion: s.version, collectionId: id, artworkIds: f.a.artworks.map((w) => w.id) });
  const deleted = await send("DELETE", id, { expectedVersion: r.body.version }); assert.equal(deleted.status, 200);
  assert.equal(deleted.body.collections.length, 0); assert.equal(deleted.body.artworks.length, 3);
  assert(deleted.body.artworks.every((w) => w.artistCollectionId === null)); assert.equal(h.storage.deletes.length, 0); assert.equal(h.storage.calls.length, 0);
});

test("simultaneous metadata updates produce one success and one conflict", async () => {
  const s = await create(); const id = s.collections[0].id;
  const responses = await Promise.all(["First update", "Second update"].map((title) => send("PATCH", id, { expectedVersion: s.version, title })));
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await state()).collections[0].title, responses.find((r) => r.status === 200).body.collections[0].title);
});

test("simultaneous membership moves do not lose state or place a work twice", async () => {
  await create("First"); const s = await create("Second");
  const responses = await Promise.all(s.collections.map((c) => send("PUT", "membership", { expectedVersion: s.version, collectionId: c.id, artworkIds: [f.a.artworks[0].id] })));
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  const current = await state(); assert.equal(current.artworks.filter((w) => w.id === f.a.artworks[0].id).length, 1);
  assert.equal(current.artworks.find((w) => w.id === f.a.artworks[0].id).artistCollectionId,
    responses.find((r) => r.status === 200).body.artworks.find((w) => w.id === f.a.artworks[0].id).artistCollectionId);
});

test("a stale confirmation after a membership change is rejected unchanged", async () => {
  await create("First"); const s = await create("Second");
  const valid = await send("PUT", "membership", { expectedVersion: s.version, collectionId: s.collections[0].id, artworkIds: [f.a.artworks[0].id] }); assert.equal(valid.status, 200);
  const before = await rows();
  assert.equal((await send("PUT", "membership", { expectedVersion: s.version, collectionId: s.collections[1].id, artworkIds: [f.a.artworks[0].id] })).status, 409);
  assert.deepEqual(await rows(), before);
});

test("invalid metadata, UUIDs and null title never change rows", async () => {
  const s = await create(), id = s.collections[0].id, before = await rows();
  for (const data of [{ title: "   " }, { title: null }, { title: "a".repeat(161) }, { year: "a".repeat(41) }, { description: "a".repeat(4001) }]) {
    assert.equal((await send("PATCH", id, { expectedVersion: s.version, ...data })).status, 400);
  }
  assert.equal((await send("PATCH", "invalid-id", { expectedVersion: s.version, title: "No" })).status, 400);
  assert.deepEqual(await rows(), before);
});

async function cover(version) {
  const data = new FormData(); data.set("expectedVersion", version);
  const image = await sharp({ create: { width: 2, height: 3, channels: 3, background: "#6633ff" } }).png().toBuffer();
  data.set("file", new Blob([image], { type: "image/png" }), "isolated.png"); return data;
}

test("cover upload uses its own key and preserves original works", async () => {
  const s = await create(), id = s.collections[0].id, original = (await rows()).artworks;
  const r = await send("POST", `${id}/cover`, await cover(s.version)); assert.equal(r.status, 201);
  assert(r.body.collections[0].coverImageStoragePath.startsWith(`artist-collections/${id}/cover/`));
  assert.deepEqual((await rows()).artworks, original); assert.equal(h.storage.calls.length, 1); assert.equal(h.storage.deletes.length, 0);
});

test("cover storage failure leaves all previous data unchanged", async () => {
  const s = await create(), id = s.collections[0].id, before = await rows(); h.storage.fail = true;
  assert.equal((await send("POST", `${id}/cover`, await cover(s.version))).status, 500);
  assert.deepEqual(await rows(), before); assert.equal(h.storage.deletes.length, 0);
});

test("cover upload rejects foreign owner and malformed images before storage", async () => {
  const s = await create(), id = s.collections[0].id, b = await state("b");
  assert.equal((await send("POST", `${id}/cover`, await cover(b.version), "b")).status, 404);
  const data = new FormData(); data.set("expectedVersion", s.version); data.set("file", new Blob(["not-an-image"], { type: "image/png" }), "bad.png");
  assert.equal((await send("POST", `${id}/cover`, data)).status, 400); assert.equal(h.storage.calls.length, 0);
});

test("a concurrent edit during cover upload causes a conflict, with no deletion", async () => {
  const s = await create(), id = s.collections[0].id;
  h.storage.onUpload = async () => { assert.equal((await send("PATCH", id, { expectedVersion: s.version, title: "Parallel edit" })).status, 200); };
  assert.equal((await send("POST", `${id}/cover`, await cover(s.version))).status, 409);
  const current = await state(); assert.equal(current.collections[0].title, "Parallel edit"); assert.equal(current.collections[0].coverImageUrl, null); assert.equal(h.storage.deletes.length, 0);
});

test("disabled collection feature reports unavailable and rejects mutations", async () => {
  const s = await state(); h.env.artistCollectionsEnabled = false;
  try {
    const r = await send("GET", ""); assert.equal(r.status, 200); assert.equal(r.body.available, false);
    assert.equal((await send("POST", "", { expectedVersion: s.version, title: "Disabled" })).status, 503);
  } finally { h.env.artistCollectionsEnabled = true; }
});

test("concurrent legacy artwork edit and membership move preserve both kinds of data", async () => {
  const s = await create(), id = s.collections[0].id;
  const [edit, move] = await Promise.all([
    h.send("PATCH", f.a.artworks[0].id, { title: "Legacy edit survives" }, f.a.token, "/artworks"),
    send("PUT", "membership", { expectedVersion: s.version, collectionId: id, artworkIds: [f.a.artworks[0].id] }),
  ]);
  assert.equal(edit.status, 200); assert([200, 409].includes(move.status));
  const work = (await state()).artworks.find((w) => w.id === f.a.artworks[0].id);
  assert.equal(work.title, "Legacy edit survives");
  assert.equal(work.artistCollectionId, move.status === 200 ? id : null); assert.equal(work.orderIndex, 0);
});

test("legacy format remains writable after migration and unmigrated collection services remain gated", async () => {
  const savedUrl = h.env.databaseUrl; h.env.databaseUrl = h.legacyUrl.toString();
  const collectionsOld = new h.CollectionsPrismaService(); h.env.databaseUrl = savedUrl;
  const old = new h.PrismaService();
  try {
    const artist = await old.artist.create({ data: { name: "Compatibility test", slug: `compat-${Date.now()}` } });
    const artwork = await old.artwork.create({ data: { artistId: artist.id, imageUrl: "https://storage.invalid/compat.png" } });
    const p = await old.portfolioProject.create({ data: { source: "GUEST", artistName: "Compatibility", artworks: { create: { imageUrl: artwork.imageUrl } } }, include: { artworks: true } });
    assert.equal(p.collectionSchemaVersion, 1);
    assert.equal(p.artworks.length, 1); assert.equal((await old.artist.findUnique({ where: { id: artist.id }, include: { artworks: true } })).artworks.length, 1);
    const { ArtistCollectionsService } = require("../src/modules/artist-collections/artist-collections.service");
    const service = new ArtistCollectionsService(collectionsOld, h.storage);
    assert.equal((await service.get(artist.id)).available, false);
    await assert.rejects(service.create(artist.id, { expectedVersion: "0".repeat(64), title: "No migration" }), (error) => error.getStatus() === 503);
  } finally { await old.$disconnect(); await collectionsOld.$disconnect(); }
});
