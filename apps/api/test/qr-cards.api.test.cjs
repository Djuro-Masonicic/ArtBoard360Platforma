const { test, before, after } = require("node:test"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("crypto"),
  fs = require("fs"),
  path = require("path");
let h;
before(async () => {
  h = await require("./qr-cards.fixture.cjs").qrHarness();
});
after(async () => h?.close());
const exportCard = (a, c, key = randomUUID()) =>
  h.request("/exports", a, "POST", { operationKey: key, config: c });

test("Every registered template renders both colors and variants with a decodable QR", async () => {
  const {
      QrCardGenerator,
    } = require("../src/modules/qr-cards/qr-card.generator"),
    { cardTemplates } = require("@artboard/qr-card-renderer"),
    generator = h.app.get(QrCardGenerator),
    a = await h.artist("PREMIUM"),
    state = (await h.request("", a)).data;
  for (const template of cardTemplates)
    for (const cardColor of ["light", "dark"])
      for (const variant of ["standard", "branded"]) {
        const files = await generator.generate({
          config: {
            ...state.draft.config,
            templateId: template.id,
            cardColor,
            variant,
            language: variant === "branded" ? "EN" : "ME",
            backTitle: variant === "branded" ? "portfolio" : "profile",
          },
          profileUrl: state.profileUrl,
          avatar: a.profileImageUrl,
          cover: a.coverImageUrl,
        });
        const raw = await require("sharp")(files.back)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        assert.equal(
          require("jsqr")(
            new Uint8ClampedArray(raw.data),
            raw.info.width,
            raw.info.height,
          )?.data,
          state.profileUrl,
          `${template.id}/${cardColor}/${variant}`,
        );
        assert.equal(files.pdf.subarray(0, 4).toString(), "%PDF");
      }
});
test("Anonymous access cannot read/save/export/download", async () => {
  for (const [p, m, b] of [
    ["", "GET"],
    ["/draft", "PUT", {}],
    ["/exports", "POST", {}],
    [`/exports/${randomUUID()}/download/pdf`, "GET"],
  ])
    assert.equal((await h.request(p, null, m, b)).status, 401);
});
test("Profile seeds data without writing a draft and ignores login email as contact", async () => {
  const a = await h.artist(),
    r = await h.request("", a);
  assert.equal(r.status, 200);
  assert.equal(r.data.draft.revision, 0);
  assert.equal(r.data.draft.config.contacts.email, a.email);
  assert.equal(r.data.draft.config.selectedContacts.length, 3);
  assert.equal(
    await h.prisma.qrCardDraft.count({
      where: { artistAccountId: a.account.id },
    }),
    0,
  );
  assert.equal(
    r.data.profileUrl,
    "https://artboard.example/umjetnik/" + a.slug,
  );
  assert.equal(r.headers.get("cache-control"), "private, no-store");
});
test("Profile contact shortcuts open normalized without rewriting the artist or creating a draft", async () => {
  const a = await h.artist();
  await h.prisma.socialLink.updateMany({ where: { artistId: a.id, platform: "INSTAGRAM" }, data: { url: "@profile_artist" } });
  await h.prisma.socialLink.updateMany({ where: { artistId: a.id, platform: "BEHANCE" }, data: { url: "behance.net/profile_artist" } });
  const state = await h.request("", a);
  assert.equal(state.status, 200);
  assert.equal(state.data.draft.config.contacts.instagram, "https://instagram.com/profile_artist");
  assert.equal(state.data.draft.config.contacts.behance, "https://behance.net/profile_artist");
  assert.equal((await h.prisma.socialLink.findFirst({ where: { artistId: a.id, platform: "INSTAGRAM" } })).url, "@profile_artist");
  assert.equal(await h.prisma.qrCardDraft.count({ where: { artistAccountId: a.account.id } }), 0);
});

test("Save normalizes Instagram and Behance shortcuts and reloads the exact saved contacts", async () => {
  const a = await h.artist(), c = (await h.request("", a)).data.draft.config;
  c.contacts.instagram = " @draft_artist "; c.contacts.behance = "www.behance.net/draft_artist";
  const saved = await h.request("/draft", a, "PUT", { revision: 0, config: c });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.config.contacts.instagram, "https://instagram.com/draft_artist");
  assert.equal(saved.data.config.contacts.behance, "https://www.behance.net/draft_artist");
  assert.deepEqual((await h.request("", a)).data.draft.config, saved.data.config);
});

test("A Free user exports shorthand contacts and retries with canonical links without consuming another right", async () => {
  const a = await h.artist(), c = (await h.request("", a)).data.draft.config, key = randomUUID();
  c.contacts.instagram = "@export_artist"; c.contacts.behance = "behance.net/export_artist";
  const result = await exportCard(a, c, key);
  assert.equal(result.status, 201); assert.equal(result.data.status, "READY");
  assert.equal(result.data.config.contacts.instagram, "https://instagram.com/export_artist");
  assert.equal(result.data.config.contacts.behance, "https://behance.net/export_artist");
  const retry = await exportCard(a, result.data.config, key);
  assert.equal(retry.status, 201); assert.equal(retry.data.id, result.data.id);
  assert.equal(await h.prisma.qrCardExport.count({ where: { artistAccountId: a.account.id } }), 1);
  for (const format of ["pdf", "front", "back", "bundle"])
    assert.equal((await h.request(`/exports/${result.data.id}/download/${format}`, a)).status, 200);
});

test("Invalid social contacts identify the field and cannot save, reserve an export or write storage", async () => {
  const a = await h.artist(), c = (await h.request("", a)).data.draft.config, writes = h.storage.calls;
  for (const key of ["instagram", "behance"]) {
    const invalid = { ...c, contacts: { ...c.contacts, [key]: "https://evil.invalid/artist" } };
    for (const result of [await h.request("/draft", a, "PUT", { revision: 0, config: invalid }), await exportCard(a, invalid)]) {
      assert.equal(result.status, 400);
      assert.match(result.data.message, new RegExp(key === "instagram" ? "Instagram" : "Behance"));
    }
  }
  assert.equal(await h.prisma.qrCardDraft.count({ where: { artistAccountId: a.account.id } }), 0);
  assert.equal(await h.prisma.qrCardExport.count({ where: { artistAccountId: a.account.id } }), 0);
  assert.equal(h.storage.calls, writes);
  assert.equal((await h.request("", a)).data.entitlement.available, true);
});

test("Own draft persists independently of public profile; stale concurrent saves conflict", async () => {
  const a = await h.artist(),
    c = (await h.request("", a)).data.draft.config;
  c.name = "Ime za karticu";
  const results = await Promise.all(
    [1, 2].map(() => h.request("/draft", a, "PUT", { revision: 0, config: c })),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const r = (await h.request("", a)).data;
  assert.equal(r.draft.config.name, c.name);
  assert.equal(r.draft.revision, 1);
  assert.equal(
    (await h.prisma.artist.findUnique({ where: { id: a.id } })).name,
    a.name,
  );
});
test("Reject spoofed ownership, unknown keys, null and malformed config without writes", async () => {
  const a = await h.artist(),
    c = (await h.request("", a)).data.draft.config;
  for (const body of [
    { revision: 0, config: c, artistAccountId: randomUUID() },
    { revision: 0, config: { ...c, ownerId: randomUUID() } },
    { revision: 0, config: { ...c, name: null } },
    { revision: 0, config: { ...c, contacts: null } },
  ])
    assert.equal((await h.request("/draft", a, "PUT", body)).status, 400);
  assert.equal(
    await h.prisma.qrCardDraft.count({
      where: { artistAccountId: a.account.id },
    }),
    0,
  );
});
test("Max three contacts, known image ownership, URL, name and selected contact validation", async () => {
  const a = await h.artist(),
    b = await h.artist(),
    c = (await h.request("", a)).data.draft.config;
  for (const bad of [
    { ...c, selectedContacts: ["email", "phone", "instagram", "behance"] },
    { ...c, selectedContacts: ["email", "email"] },
    { ...c, contacts: { ...c.contacts, instagram: "javascript:alert(1)" } },
    { ...c, imageId: b.work.id },
    { ...c, name: " " },
    { ...c, contacts: { ...c.contacts, email: "bad" } },
  ])
    assert.equal(
      (await h.request("/draft", a, "PUT", { revision: 0, config: bad }))
        .status,
      400,
    );
  assert.equal(
    (await exportCard(a, { ...c, selectedContacts: ["phone"] })).status,
    400,
  );
});
test("Free successful export creates real two-page print PDF and PNGs; QR decodes to public URL", async () => {
  const a = await h.artist(),
    state = (await h.request("", a)).data,
    c = state.draft.config,
    r = await exportCard(a, c);
  assert.equal(r.status, 201);
  assert.equal(r.data.status, "READY");
  const files = {};
  for (const format of ["pdf", "front", "back"]) {
    const f = await h.request(`/exports/${r.data.id}/download/${format}`, a);
    assert.equal(f.status, 200);
    files[format] = f.data;
    assert.equal(f.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(files.pdf.subarray(0, 4).toString(), "%PDF");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs"),
    task = pdfjs.getDocument({
      data: new Uint8Array(files.pdf),
      useSystemFonts: false,
    }),
    pdf = await task.promise;
  assert.equal(pdf.numPages, 2);
  const page = await pdf.getPage(1);
  assert(Math.abs(page.view[2] - (91 * 72) / 25.4) < 0.001);
  assert(Math.abs(page.view[3] - (61 * 72) / 25.4) < 0.001);
  const text = files.pdf.toString("latin1");
  assert(text.includes("/TrimBox"));
  assert(text.includes("/BleedBox"));
  await task.destroy();
  const sharp = require("sharp");
  for (const side of ["front", "back"]) {
    const m = await sharp(files[side]).metadata();
    assert.equal(m.width, 1004);
    assert.equal(m.height, 650);
    assert.equal(m.density, 300);
  }
  const raw = await sharp(files.back)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decoded = require("jsqr")(
    new Uint8ClampedArray(raw.data),
    raw.info.width,
    raw.info.height,
  );
  assert.equal(decoded?.data, state.profileUrl);
  const out = path.resolve(__dirname, "../../../.tmp/qr-cards");
  for (const [f, body] of Object.entries(files))
    fs.writeFileSync(
      path.join(out, "sample." + (f === "pdf" ? "pdf" : f + ".png")),
      body,
    );
  assert.equal((await h.request("", a)).data.entitlement.state, "FREE_USED");
  assert.equal((await exportCard(a, c)).status, 403);
  assert.equal(
    await h.prisma.qrCardDraft.count({
      where: { artistAccountId: a.account.id },
    }),
    0,
  );
  const bundle = await h.request(`/exports/${r.data.id}/download/bundle`, a);
  assert.equal(bundle.status, 200);
  assert.equal(bundle.data.readUInt32LE(), 0x04034b50);
  fs.writeFileSync(path.join(out, "sample.zip"), bundle.data);
});
test("Another UUID never gives another account access to versions or artifacts", async () => {
  const a = await h.artist(),
    b = await h.artist(),
    c = (await h.request("", a)).data.draft.config,
    r = await exportCard(a, c);
  for (const suffix of ["", "/download/pdf", "/download/bundle"])
    assert.equal(
      (await h.request(`/exports/${r.data.id}${suffix}`, b)).status,
      404,
    );
  assert.equal((await h.request("", b)).data.history.total, 0);
});
test("Storage error preserves Free right; retry same operation creates one version", async () => {
  const a = await h.artist(),
    c = (await h.request("", a)).data.draft.config,
    key = randomUUID();
  h.storage.fail = true;
  try {
    const r = await exportCard(a, c, key);
    assert.equal(r.data.status, "FAILED");
  } finally {
    h.storage.fail = false;
  }
  assert.equal((await h.request("", a)).data.entitlement.available, true);
  const ok = await exportCard(a, c, key);
  assert.equal(ok.data.status, "READY");
  assert.equal(
    await h.prisma.qrCardExport.count({
      where: { artistAccountId: a.account.id },
    }),
    1,
  );
});
test("Parallel duplicate operation returns same reservation; competing operation cannot double-spend", async () => {
  const a = await h.artist(),
    c = (await h.request("", a)).data.draft.config,
    key = randomUUID();
  let release;
  h.storage.gate = new Promise((r) => (release = r));
  try {
    const first = exportCard(a, c, key);
    await new Promise((r) => setTimeout(r, 150));
    const duplicate = await exportCard(a, c, key),
      other = await exportCard(a, c);
    assert.equal(duplicate.data.status, "PROCESSING");
    assert.equal(other.status, 409);
    release();
    h.storage.gate = null;
    const done = await first;
    assert.equal(done.data.id, duplicate.data.id);
    assert.equal(done.data.status, "READY");
    const again = await exportCard(a, c, key);
    assert.equal(again.data.id, done.data.id);
    assert.equal(
      await h.prisma.qrCardExport.count({
        where: { artistAccountId: a.account.id },
      }),
      1,
    );
  } finally {
    release();
    h.storage.gate = null;
  }
});
test("An idempotency key cannot silently change its snapshot", async () => {
  const a = await h.artist(),
    c = (await h.request("", a)).data.draft.config,
    key = randomUUID();
  await exportCard(a, c, key);
  assert.equal(
    (await exportCard(a, { ...c, name: "Drugo ime" }, key)).status,
    409,
  );
});
test("Expired processing reservations release free right and can retry", async () => {
  const a = await h.artist(),
    c = (await h.request("", a)).data.draft.config;
  await h.prisma.qrCardExport.create({
    data: {
      artistAccountId: a.account.id,
      operationKey: randomUUID(),
      versionNumber: 1,
      status: "PROCESSING",
      kind: "FREE",
      snapshot: { config: c },
      contentHash: "expired",
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  assert.equal((await h.request("", a)).data.entitlement.available, true);
  const r = await exportCard(a, c);
  assert.equal(r.data.status, "READY");
});
test("Premium supports repeated generations; expired Premium retains history but cannot generate", async () => {
  const a = await h.artist("PREMIUM"),
    c = (await h.request("", a)).data.draft.config;
  for (let i = 0; i < 3; i++)
    assert.equal(
      (
        await exportCard(a, {
          ...c,
          templateId: ["classic", "no-cover", "portrait"][i],
        })
      ).data.status,
      "READY",
    );
  const row = await h.prisma.qrCardExport.findFirst({
    where: { artistAccountId: a.account.id, status: "READY" },
  });
  await h.prisma.artistSubscription.update({
    where: { artistAccountId: a.account.id },
    data: { status: "EXPIRED", currentPeriodEnd: new Date(Date.now() - 1000) },
  });
  assert.equal(
    (await h.request("", a)).data.entitlement.state,
    "FORMER_PREMIUM",
  );
  assert.equal((await exportCard(a, c)).status, 403);
  assert.equal(
    (await h.request(`/exports/${row.id}/download/pdf`, a)).status,
    200,
  );
});
test("Private download storage failure does not increment history or alter entitlement", async () => {
  const a = await h.artist(),
    c = (await h.request("", a)).data.draft.config,
    r = await exportCard(a, c);
  h.storage.failRead = true;
  try {
    assert.equal(
      (await h.request(`/exports/${r.data.id}/download/pdf`, a)).status,
      500,
    );
  } finally {
    h.storage.failRead = false;
  }
  const row = await h.prisma.qrCardExport.findUnique({
    where: { id: r.data.id },
  });
  assert.equal(row.downloadCount, 0);
  assert.equal(row.status, "READY");
  assert.equal((await h.request("", a)).data.entitlement.available, false);
});
test("Draft options and public QR work for all registered supplied renderers without XSS", async () => {
  const { renderCard, cardTemplates } = require("@artboard/qr-card-renderer"),
    a = await h.artist("PREMIUM"),
    c = (await h.request("", a)).data.draft.config;
  for (const t of cardTemplates) {
    const cfg = {
      ...c,
      templateId: t.id,
      variant: "branded",
      cardColor: "dark",
      language: "EN",
      backTitle: "portfolio",
      name: "<script>alert(1)</script>",
    };
    const r = await h.request("/draft", a, "PUT", {
      revision: (await h.request("", a)).data.draft.revision,
      config: cfg,
    });
    assert.equal(r.status, 200);
    assert(
      !renderCard(
        {
          config: cfg,
          profileUrl: "https://artboard.example/umjetnik/test",
          qrSvg: "",
        },
        "front",
      ).includes("<script>"),
    );
  }
});
test("Portret draft and branded export use an owned artwork and reject foreign artwork without writes", async () => {
  const a = await h.artist("PREMIUM"),
    other = await h.artist(),
    state = (await h.request("", a)).data,
    config = {
      ...state.draft.config,
      templateId: "portrait-artwork",
      variant: "branded",
    };
  assert.equal(
    (
      await h.request("/draft", a, "PUT", {
        revision: 0,
        config: { ...config, imageId: other.work.id },
      })
    ).status,
    400,
  );
  assert.equal((await h.request("", a)).data.draft.revision, 0);
  assert.equal(
    (await h.request("/draft", a, "PUT", { revision: 0, config })).status,
    200,
  );
  const key = randomUUID(),
    result = await exportCard(a, config, key);
  assert.equal(result.status, 201);
  assert.equal(result.data.status, "READY");
  const record = await h.prisma.qrCardExport.findUnique({
    where: { id: result.data.id },
  });
  assert.equal(record.snapshot.config.templateId, "portrait-artwork");
  assert.equal(record.snapshot.config.variant, "branded");
  assert.equal(
    record.snapshot.cover,
    state.choices.find((choice) => choice.id === config.imageId).url,
  );
  assert.equal(record.snapshot.rendererVersion, 2);
  assert.equal((await exportCard(a, config, key)).data.id, result.data.id);
  assert.equal(
    (await h.request(`/exports/${result.data.id}/download/pdf`, other)).status,
    404,
  );
});
test("Clean/Profilna ignore stale or foreign unused cover IDs without exposing their images", async () => {
  const owner = await h.artist("PREMIUM"),
    other = await h.artist(),
    base = (await h.request("", owner)).data.draft.config;
  for (const templateId of ["no-cover", "portrait"]) {
    const config = { ...base, templateId, imageId: other.work.id };
    const revision = (await h.request("", owner)).data.draft.revision;
    assert.equal(
      (await h.request("/draft", owner, "PUT", { revision, config })).status,
      200,
    );
    const result = await exportCard(owner, config);
    assert.equal(result.status, 201);
    assert.equal(result.data.status, "READY");
    const record = await h.prisma.qrCardExport.findUnique({
      where: { id: result.data.id },
    });
    assert.equal(record.snapshot.cover, null);
    assert.equal(record.snapshot.rendererVersion, 2);
    assert.equal(
      (await h.request(`/exports/${record.id}/download/pdf`, other)).status,
      404,
    );
    const removed = { ...config, imageId: randomUUID() };
    assert.equal(
      (
        await h.request("/draft", owner, "PUT", {
          revision: revision + 1,
          config: removed,
        })
      ).status,
      200,
    );
  }
});
test("Unpublished profiles may save but cannot export unavailable public QR links", async () => {
  const a = await h.artist();
  await h.prisma.artist.update({
    where: { id: a.id },
    data: { isDraft: true },
  });
  const c = (await h.request("", a)).data.draft.config;
  assert.equal(
    (await h.request("/draft", a, "PUT", { revision: 0, config: c })).status,
    200,
  );
  assert.equal((await exportCard(a, c)).status, 400);
});
test("Source image reader rejects arbitrary hosts/protocols before any fetch", async () => {
  const { R2StorageService } = require("../src/storage/r2-storage.service");
  for (const url of [
    "http://127.0.0.1/private",
    "https://example.invalid/image.png",
    "file:///etc/passwd",
    "https://cdn.prod.website-files.com:444/image.png",
    "https://user:password@cdn.prod.website-files.com/x.png",
  ])
    await assert.rejects(() =>
      h.realReadQrSourceImage.call(new R2StorageService(), url),
    );
});
test("Private local development storage persists bytes without public URLs or path traversal", async () => {
  const { env } = require("../src/config/env"),
    { QrCardStorage } = require("../src/modules/qr-cards/qr-card.storage"),
    { R2StorageService } = require("../src/storage/r2-storage.service"),
    old = { nodeEnv: env.nodeEnv, bucket: env.r2PrivatePdfBucketName };
  try {
    env.nodeEnv = "development";
    env.r2PrivatePdfBucketName = undefined;
    const store = new QrCardStorage(new R2StorageService());
    store.root = path.resolve(
      __dirname,
      "../../../.tmp/qr-cards/private-local-test",
    );
    assert.equal(store.mode, "LOCAL_DEVELOPMENT");
    const id = randomUUID(),
      key = await store.write(id, "front", h.image);
    assert(key.startsWith(`local-private:qr-cards/${id}/`));
    assert.deepEqual(await store.read(id, key), h.image);
    await assert.rejects(() => store.read(randomUUID(), key));
    await assert.rejects(() =>
      store.read(id, `local-private:qr-cards/${id}/../../secret`),
    );
    env.nodeEnv = "production";
    assert.equal(store.mode, "UNAVAILABLE");
    await assert.rejects(() => store.write(randomUUID(), "front", h.image));
    await assert.rejects(() => store.read(id, key));
  } finally {
    env.nodeEnv = old.nodeEnv;
    env.r2PrivatePdfBucketName = old.bucket;
  }
});
test("Subscription overview reflects actual QR Free usage without changing portfolio quotas", async () => {
  const a = await h.artist(),
    {
      SubscriptionOverviewService,
    } = require("../src/modules/artist-subscriptions/subscription-overview.service"),
    service = h.app.get(SubscriptionOverviewService),
    before = await service.get(a.account.id);
  assert.deepEqual(before.usage.qr, { known: true, available: true });
  const c = (await h.request("", a)).data.draft.config;
  await exportCard(a, c);
  const after = await service.get(a.account.id);
  assert.deepEqual(after.usage.qr, { known: true, available: false });
  assert.equal(after.usage.portfolio.used, before.usage.portfolio.used);
});
