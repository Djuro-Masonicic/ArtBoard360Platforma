const assert = require('node:assert/strict');
const { before, beforeEach, after, test } = require('node:test');
const { randomUUID, randomBytes } = require('node:crypto');
const { startHarness } = require('./artist-collections.fixture.cjs');
let h, f, commerce, guest;
before(async () => {
  h = await startHarness({ portfolio: true }); h.env.portfolioCollectionsEnabled = true;
  commerce = h.app.get(require('../src/modules/portfolio-projects/portfolio-commerce.service').PortfolioCommerceService);
  guest = h.app.get(require('../src/modules/portfolio-projects/portfolio-guest.service').PortfolioGuestService);
});
beforeEach(async () => { f = await h.fresh(); });
after(async () => { if (h) { await h.close(); console.log('Payment context isolated DB:', h.database); } });
const get = (path, who) => h.send('GET', path, null, who ? f[who].token : undefined, '/portfolio-commerce');
async function project() { const r = await h.send('POST', 'from-profile', null, f.a.token, '/portfolio-projects'); assert.equal(r.status, 201); return r.body; }
async function purchase() {
  const snapshot = await guest.snapshot(JSON.stringify({ project: { artistName: 'Checkout owner', email: 'checkout@example.invalid' }, artworks: [] }), []);
  const id = randomUUID(), token = randomBytes(32).toString('hex');
  return { id, token, snapshot, record: await commerce.createGuestPurchase(snapshot, id, token) };
}
async function orderContext(id, token) {
  const r = await fetch(`${h.baseUrl}/portfolio-commerce/purchases/${id}/checkout-context`, { headers: token ? { 'X-Portfolio-Delivery': token } : {} });
  return { status: r.status, body: await r.json() };
}
async function counts() { return { projects: await h.legacy.portfolioProject.count(), purchases: await h.legacy.portfolioPurchase.count(), usage: await h.legacy.portfolioExportUsage.count(), periods: await h.legacy.portfolioQuotaPeriod.count(), subscriptions: await h.legacy.artistSubscription.count(), events: await h.legacy.portfolioPaymentEvent.count(), storage: h.storage.calls.length }; }
test('public catalog is server pricing, includes all 22 amounts and never grants payment rights', async () => {
  const before = await counts(), r = await get('checkout-catalog'); assert.equal(r.status, 200);
  assert.equal(r.body.guestExportCents, 490); assert.equal(r.body.extraExportCents, 490);
  assert.deepEqual(r.body.premiumAmountsCents, [890, ...Array.from({ length: 21 }, (_, i) => (i + 10) * 100)]);
  assert.equal(r.body.checkoutAvailable, false); assert.equal(r.body.generatorAvailable, false);
  assert(!JSON.stringify(r.body).includes(f.a.account.email)); assert.deepEqual(await counts(), before);
});
test('owner state requires session and rejects forged plan/owner fields', async () => {
  const before = await counts();
  assert.equal((await get('checkout-context?product=premium')).status, 401);
  assert.equal((await get(`checkout-context?product=premium&ownerId=${f.b.account.id}`, 'a')).status, 400);
  assert.equal((await get('checkout-context?product=generator&plan=PREMIUM', 'a')).status, 400);
  assert.equal((await get('checkout-public?product=unknown')).status, 400);
  assert.deepEqual(await counts(), before);
});
test('premium amount selection reads authenticated account and does not activate/create a subscription', async () => {
  const before = await counts(), r = await get('checkout-context?product=premium', 'a'); assert.equal(r.status, 200);
  assert.equal(r.body.variant, 'PREMIUM'); assert.equal(r.body.account.email, f.a.account.email);
  assert.equal(r.body.amountCents, 890); assert.equal(r.body.paymentMethod, null); assert.equal(r.body.checkoutAvailable, false);
  assert.deepEqual(await counts(), before);
});
test('portfolio owner and real document details are verified; available quota cannot become exhausted by URL', async () => {
  const p = await project(), before = await counts();
  const a = await get(`checkout-context?product=portfolio&portfolioId=${p.id}`, 'a'); assert.equal(a.status, 200);
  assert.equal(a.body.status, 'QUOTA_AVAILABLE'); assert.equal(a.body.quota.used, 0); assert.equal(a.body.quota.remaining, 1);
  assert.equal(a.body.portfolio.id, p.id); assert.equal(a.body.portfolio.title, p.title); assert.equal(a.body.portfolio.pageCount, p.counts.pages);
  assert.equal((await get(`checkout-context?product=portfolio&portfolioId=${p.id}`, 'b')).status, 404);
  const anonymous = await get(`checkout-public?product=portfolio&portfolioId=${p.id}`); assert.equal(anonymous.body.portfolio, null); assert.equal(anonymous.body.status, 'MISSING_CONTEXT');
  assert.deepEqual(await counts(), before);
});
test('exhausted Free and Premium states derive from actual isolated server ledgers', async () => {
  const p = await project();
  h.env.r2PrivatePdfBucketName = 'payment-isolated-private';
  const generated = await fetch(`${h.baseUrl}/portfolio-projects/public/${p.id}/generate-pdf`, { method: 'POST', headers: { Authorization: `Bearer ${f.a.token}`, 'Idempotency-Key': randomUUID() } });
  assert.equal(generated.status, 201, await generated.text());
  let r = await get(`checkout-context?product=portfolio&portfolioId=${p.id}`, 'a'); assert.equal(r.body.variant, 'PORTFOLIO_FREE'); assert.equal(r.body.quota.used, 1); assert.equal(r.body.status, 'UNAVAILABLE');
  const start = new Date(Date.now() - 86400_000), end = new Date(Date.now() + 27 * 86400_000);
  await h.legacy.artistSubscription.create({ data: { artistAccountId: f.a.account.id, plan: 'PLATINUM', currentPeriodStart: start, currentPeriodEnd: end } });
  const window = require('../src/modules/portfolio-projects/portfolio-commerce.service').quotaWindow(await h.legacy.artistSubscription.findUnique({ where: { artistAccountId: f.a.account.id } }));
  await h.legacy.portfolioQuotaPeriod.create({ data: { artistAccountId: f.a.account.id, periodStart: window.start, periodEnd: window.end, committed: 5 } });
  const before = await counts(); r = await get(`checkout-context?product=portfolio&portfolioId=${p.id}`, 'a');
  assert.equal(r.body.variant, 'PORTFOLIO_PREMIUM'); assert.equal(r.body.quota.used, 5); assert.equal(r.body.quota.periodEnd, window.end.toISOString());
  assert.equal(r.body.paymentMethod, null, 'Premium alone does not prove a reusable card'); assert.deepEqual(await counts(), before);
});
test('Generator exposes its missing integration without inventing usage or a purchased balance', async () => {
  const before = await counts(), r = await get('checkout-context?product=generator', 'a'); assert.equal(r.status, 200);
  assert.equal(r.body.catalog.generatorAvailable, false); assert.equal(r.body.variant, 'GENERATOR_FREE'); assert.equal(r.body.checkoutAvailable, false);
  assert.equal(r.body.generatorUsage, undefined); assert.deepEqual(await counts(), before);
});
test('Guest checkout context requires the delivery capability, never just the order UUID', async () => {
  const p = await purchase(), before = await counts(); assert.equal(p.record.amountCents, 490);
  assert.equal((await orderContext(p.id)).status, 404); assert.equal((await orderContext(p.id, randomBytes(32).toString('hex'))).status, 404);
  const r = await orderContext(p.id, p.token); assert.equal(r.status, 200); assert.equal(r.body.variant, 'PORTFOLIO_GUEST'); assert.equal(r.body.buyerEmail, 'checkout@example.invalid');
  assert.equal(r.body.purchase.status, 'PENDING'); assert.equal(r.body.amountCents, 490); assert.equal(r.body.checkoutAvailable, false);
  assert.equal(r.body.snapshot, undefined); assert.equal(r.body.token, undefined); assert.deepEqual(await counts(), before);
});
test('historical Guest orders retain their previous price on context reads and creation retries', async () => {
  const { portfolioPrices } = require('../src/modules/portfolio-projects/portfolio-prices');
  let p; portfolioPrices.guestExportCents = 890;
  try { p = await purchase(); } finally { portfolioPrices.guestExportCents = 490; }
  const before = await counts(); assert.equal((await orderContext(p.id, p.token)).body.amountCents, 890);
  const retry = await commerce.createGuestPurchase(p.snapshot, p.id, p.token); assert.equal(retry.amountCents, 890);
  await assert.rejects(() => commerce.confirmVerifiedPayment({ purchaseId: p.id, provider: 'allsecure', eventId: randomUUID(), paymentRef: randomUUID(), amountCents: 490, currency: 'EUR', payloadHash: 'c'.repeat(64) }), /Iznos/);
  assert.deepEqual(await counts(), before);
});
test('failed and verified paid contexts expose only the server-confirmed status; repeats do not duplicate', async () => {
  const p = await purchase(), proof = { purchaseId: p.id, provider: 'allsecure', eventId: randomUUID(), paymentRef: randomUUID(), amountCents: 490, currency: 'EUR', payloadHash: 'c'.repeat(64) };
  await commerce.confirmVerifiedPayment(proof); await commerce.confirmVerifiedPayment(proof);
  assert.equal((await orderContext(p.id, p.token)).body.status, 'PAID'); assert.equal(await h.legacy.portfolioPaymentEvent.count({ where: { purchaseId: p.id } }), 1);
  const failed = await purchase(); await commerce.recordVerifiedPaymentFailure({ ...proof, purchaseId: failed.id, eventId: randomUUID(), paymentRef: randomUUID() });
  assert.equal((await orderContext(failed.id, failed.token)).body.status, 'FAILED');
});
test('revoked Guest delivery cannot access the checkout snapshot', async () => {
  const p = await purchase(); await commerce.revoke(p.id); assert.equal((await orderContext(p.id, p.token)).status, 404);
});
