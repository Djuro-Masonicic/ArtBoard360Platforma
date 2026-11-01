const assert = require('node:assert/strict');
const { before, beforeEach, after, test } = require('node:test');
const { randomUUID, randomBytes } = require('node:crypto');
const { startHarness } = require('./artist-collections.fixture.cjs');
let h, f, commerce, guest, adminToken;
before(async () => {
  h = await startHarness({ portfolio: true }); h.env.portfolioCollectionsEnabled = true;
  commerce = h.app.get(require('../src/modules/portfolio-projects/portfolio-commerce.service').PortfolioCommerceService);
  guest = h.app.get(require('../src/modules/portfolio-projects/portfolio-guest.service').PortfolioGuestService);
  const { R2StorageService } = require('../src/storage/r2-storage.service');
  R2StorageService.prototype.getOrCreatePurchasePdf = async function(id, render, namespace=id) { if (h.storage.fail) throw Error('Isolated private storage failure'); const key = `r2-private:portfolio-projects/${namespace}/pdf/purchase-${id}.pdf`; if (!h.storage.objects.has(key)) h.storage.objects.set(key, await render()); return h.storage.objects.get(key); };
  const admin = await h.legacy.adminUser.create({ data: { email: `${randomUUID()}@example.invalid`, passwordHash: 'isolated-not-a-real-password', name: 'Commerce test admin' } });
  adminToken = require('../src/modules/auth/auth-crypto').signSessionToken({ sub: admin.id, email: admin.email, kind: 'admin', exp: Math.floor(Date.now()/1000)+3600 }, h.env.adminAuthSecret);
});
beforeEach(async () => { f = await h.fresh(); h.storage.fail = false; h.storage.onUpload = null; h.app.get(require('../src/modules/portfolio-projects/portfolio-commerce.controller').GuestProcessingGuard).buckets.clear(); });
after(async () => { if (h) { await h.close(); console.log('Commerce isolated DB:', h.database); } });
const send = (method, op, body, who = 'a') => h.send(method, op, body, who ? f[who].token : undefined, '/portfolio-projects');
const project = async () => { const r = await send('POST','from-profile'); assert.equal(r.status,201,JSON.stringify(r.body)); return r.body; };
const gen = async (p, key = randomUUID(), who = 'a') => { const r = await fetch(`${h.baseUrl}/portfolio-projects/public/${p.id}/generate-pdf`, { method:'POST', headers: { 'Authorization':`Bearer ${f[who].token}`, 'Idempotency-Key':key } }); return { status:r.status, body:await r.json() }; };
const document = () => ({ project: { artistName:'Isolated Guest',email:'guest@example.invalid',biography:'Biography',includeCv:false }, artworks:[] });
const form = (doc = document(), key = randomUUID(), secret = randomBytes(32).toString('hex')) => { const body = new FormData(); body.set('document',JSON.stringify(doc)); body.set('operationKey',key); body.set('deliverySecret',secret); return body; };
const guestRequest = async (action, body) => { const r = await fetch(`${h.baseUrl}/portfolio-commerce/guest/${action}`, { method:'POST',body }); return { status:r.status, body:r.headers.get('content-type')?.includes('application/pdf') ? Buffer.from(await r.arrayBuffer()) : await r.json() }; };
async function purchase() { const key=randomUUID(),secret=randomBytes(32).toString('hex'),snap=await guest.snapshot(JSON.stringify(document()),[]); const p=await commerce.createGuestPurchase(snap,key,secret); return {p,key,secret,snap}; }
const proof = p => ({ purchaseId:p.id, provider:'allsecure', eventId:randomUUID(), paymentRef:randomUUID(), amountCents:490, currency:'EUR', payloadHash:'b'.repeat(64) });

for (const style of ['GRADIENT', 'EDITORIAL', 'CARDS', 'BLOCKS']) test(`Guest ${style} snapshot and preview retain the validated style without a draft or storage write`, async () => {
  const input = document(); input.project.designConfig = { mode: 'PRESET', minimal: { version: 1, cover: 'C', style } };
  const projects = await h.legacy.portfolioProject.count(), purchases = await h.legacy.portfolioPurchase.count(), writes = h.storage.calls.length;
  const snapshot = await guest.snapshot(JSON.stringify(input), []); assert.deepEqual(snapshot.designConfig.minimal, input.project.designConfig.minimal);
  const preview = await guestRequest('preview', form(input)); assert.equal(preview.status, 201); assert.equal(preview.body.subarray(0,5).toString(), '%PDF-');
  assert.equal(await h.legacy.portfolioProject.count(), projects); assert.equal(await h.legacy.portfolioPurchase.count(), purchases); assert.equal(h.storage.calls.length, writes);
  input.project.designConfig.minimal.ownerId = 'forged'; assert.equal((await guestRequest('preview', form(input))).status, 400);
  assert.equal(await h.legacy.portfolioProject.count(), projects); assert.equal(h.storage.calls.length, writes);
});

test('Free export is once per account across projects; retries and historical downloads do not spend again', async () => {
  const p=await project(), other=await project(), key=randomUUID();
  assert.equal(p.access.quota.remaining,1);
  const first=await gen(p,key); assert.equal(first.status,201,JSON.stringify(first.body)); assert.equal(first.body.access.quota.used,1); assert.equal(first.body.access.canGeneratePdf,false); assert.equal(first.body.access.canDownloadCleanPdf,true);
  const retry=await gen(p,key); assert.equal(retry.status,201); assert.equal(retry.body.counts.versions,1);
  assert.equal((await gen(other)).status,403);
  const version=first.body.versions[0]; assert.equal(version.documentScope,'PORTFOLIO'); assert(version.pageCount>0); assert.equal(version.contentHash.length,64); assert.equal(version.manifest.artistName,p.artistName);
  const r=await fetch(`${h.baseUrl}/portfolio-projects/me/${p.id}/versions/${version.id}/pdf`,{headers:{Authorization:`Bearer ${f.a.token}`}}); assert.equal(r.status,200); assert((await r.text()).startsWith('%PDF-'));
  assert.equal(await h.legacy.portfolioExportUsage.count({where:{artistAccountId:f.a.account.id,status:'COMMITTED'}}),1);
});
test('parallel Free requests can commit exactly one version', async () => {
  const p=await project(), results=await Promise.all(Array.from({length:5},()=>gen(p)));
  assert.equal(results.filter(r=>r.status===201).length,1); assert.equal(results.filter(r=>r.status===403).length,4);
  assert.equal(await h.legacy.portfolioVersion.count({where:{portfolioId:p.id}}),1);
});
test('server subscription period allows five Premium reservations, with no client-provided period', async () => {
  const start=new Date(); start.setUTCDate(start.getUTCDate()-1); const end=new Date(start); end.setUTCMonth(end.getUTCMonth()+1);
  await h.legacy.artistSubscription.create({data:{artistAccountId:f.a.account.id,plan:'PLATINUM',currentPeriodStart:start,currentPeriodEnd:end}});
  const p=await project(); const results=await Promise.allSettled(Array.from({length:10},()=>commerce.reserve(f.a.account.id,p.id,randomUUID(),'c'.repeat(64))));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,5); assert.equal(results.filter(r=>r.status==='rejected').length,5);
  const period=await h.legacy.portfolioQuotaPeriod.findFirst({where:{artistAccountId:f.a.account.id}}); assert.equal(period.reserved,5); assert.equal(period.committed,0);
  for(const r of results) if(r.status==='fulfilled') await commerce.release(r.value.id);
  assert.equal((await commerce.entitlement(f.a.account.id)).remaining,5);
});
test('monthly anchor clamps end of month without drifting in annual subscriptions', () => {
  const {quotaWindow}=require('../src/modules/portfolio-projects/portfolio-commerce.service');
  const sub={plan:'PLATINUM',status:'ACTIVE',currentPeriodStart:new Date('2026-01-31T10:00:00Z'),currentPeriodEnd:new Date('2027-01-31T10:00:00Z')};
  assert.equal(quotaWindow(sub,new Date('2026-02-28T11:00:00Z')).start.toISOString(),'2026-02-28T10:00:00.000Z');
  assert.equal(quotaWindow(sub,new Date('2026-03-31T11:00:00Z')).start.toISOString(),'2026-03-31T10:00:00.000Z');
  assert.equal(quotaWindow(sub,new Date('2027-02-01')),null);
});
test('five successful Premium renders commit exactly five slots and preserve all five versions', async () => {
  const start=new Date(Date.now()-86400_000), end=new Date(Date.now()+28*86400_000);
  await h.legacy.artistSubscription.create({data:{artistAccountId:f.a.account.id,plan:'PLATINUM',currentPeriodStart:start,currentPeriodEnd:end}});
  const p=await project();
  for(let n=1;n<=5;n++){const r=await gen(p);assert.equal(r.status,201,JSON.stringify(r.body));assert.equal(r.body.access.quota.used,n);}
  assert.equal((await gen(p)).status,403);const period=await h.legacy.portfolioQuotaPeriod.findFirst({where:{artistAccountId:f.a.account.id}});assert.equal(period.committed,5);assert.equal(period.reserved,0);assert.equal(await h.legacy.portfolioVersion.count({where:{portfolioId:p.id}}),5);
});
test('parallel Premium rendering reserves and commits five versions without lock-order deadlocks', async () => {
  await h.legacy.artistSubscription.create({data:{artistAccountId:f.a.account.id,plan:'PLATINUM',currentPeriodStart:new Date(Date.now()-86400_000),currentPeriodEnd:new Date(Date.now()+28*86400_000)}});
  const p=await project(), results=await Promise.all(Array.from({length:10},()=>gen(p)));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,201,201,201,201,403,403,403,403,403]);
  const period=await h.legacy.portfolioQuotaPeriod.findFirst({where:{artistAccountId:f.a.account.id}});assert.equal(period.committed,5);assert.equal(period.reserved,0);assert.equal(await h.legacy.portfolioVersion.count({where:{portfolioId:p.id}}),5);
});
test('storage failure releases quota and cannot create a version or latest PDF pointer', async () => {
  const p=await project(); h.storage.fail=true; assert.equal((await gen(p)).status,500); h.storage.fail=false;
  const state=await send('GET',`me/${p.id}`); assert.equal(state.body.latestPdfUrl,null); assert.equal(state.body.counts.versions,0); assert.equal(state.body.access.quota.remaining,1);
  assert.equal((await gen(p)).status,201);
});
test('content edits during upload reject the obsolete PDF and release reservation', async () => {
  const p=await project(); h.storage.onUpload=async input=> { if(input.entityType==='portfolio-pdf') assert.equal((await send('PATCH',`public/${p.id}`,{expectedRevision:p.revision,title:'Concurrent edit'})).status,200); };
  assert.equal((await gen(p)).status,409); assert.equal((await commerce.entitlement(f.a.account.id)).remaining,1); assert.equal(await h.legacy.portfolioVersion.count({where:{portfolioId:p.id}}),0);
});
test('expired reservations are recovered, and a dead worker cannot finalize later', async () => {
  const p=await project(), usage=await commerce.reserve(f.a.account.id,p.id,randomUUID(),'d'.repeat(64));
  await h.legacy.portfolioExportUsage.update({where:{id:usage.id},data:{createdAt:new Date(Date.now()-10000),expiresAt:new Date(Date.now()-1000)}}); await commerce.recover();
  assert.equal((await commerce.entitlement(f.a.account.id)).remaining,1);
  await assert.rejects(h.legacy.$transaction(tx=>commerce.finish(tx,usage.id,randomUUID())),/istekla/);
});
test('missing auth, foreign project and spoofed owner cannot alter quota or data', async () => {
  const p=await project(); assert.equal((await send('POST',`public/${p.id}/generate-pdf`,undefined,null)).status,401); assert.equal((await gen(p,randomUUID(),'b')).status,404);
  assert.equal((await send('POST',`public/${p.id}/generate-pdf`,{artistAccountId:f.b.account.id})).status,400);
  assert.equal(await h.legacy.portfolioExportUsage.count({where:{portfolioId:p.id}}),0);
});
test('Guest preview renders with watermark and creates no draft, order, version or R2 object', async () => {
  const before=await h.legacy.portfolioProject.count(), purchases=await h.legacy.portfolioPurchase.count(), writes=h.storage.calls.length;
  const r=await guestRequest('preview',form()); assert.equal(r.status,201); assert(r.body.subarray(0,5).equals(Buffer.from('%PDF-')));
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs'); const task=getDocument({data:new Uint8Array(r.body),useSystemFonts:true}),pdf=await task.promise; const text=(await(await pdf.getPage(1)).getTextContent()).items.map(v=>v.str).join(' '); assert(text.includes('ARTBOARD PREVIEW')); await task.destroy();
  assert.equal(await h.legacy.portfolioProject.count(),before); assert.equal(await h.legacy.portfolioPurchase.count(),purchases); assert.equal(h.storage.calls.length,writes);
  assert.equal((await send('POST','guest',{artistName:'No draft',email:'test@example.invalid'},null)).status,403);
});
test('Guest accepts uploaded image bytes, strips metadata, rejects remote URLs and owner spoofing', async () => {
  const image=await require('sharp')({create:{width:20,height:20,channels:3,background:'red'}}).png().toBuffer();
  const d=document(); d.artworks=[{imageUrl:'upload:0',title:'Real pixels',isSelected:true}]; const body=form(d); body.append('images',new Blob([image],{type:'image/png'}),'image.png');
  const r=await guestRequest('purchase',body); assert.equal(r.status,201,JSON.stringify(r.body)); const row=await h.legacy.portfolioPurchase.findUnique({where:{id:r.body.id}}); assert(row.snapshot.artworks[0].imageUrl.startsWith('data:image/jpeg;base64,')); assert.equal(row.amountCents,490); assert.equal(row.artistAccountId,null);
  d.artworks[0].imageUrl='http://127.0.0.1/private'; assert.equal((await guestRequest('preview',form(d))).status,400);
  const spoof=document(); spoof.project.artistAccountId=f.a.account.id; assert.equal((await guestRequest('purchase',form(spoof))).status,400);
});
test('purchase is immutable and idempotent; UUID alone cannot read or download it', async () => {
  const {p,key,secret,snap}=await purchase(); assert.equal((await commerce.createGuestPurchase(snap,key,secret)).id,p.id);
  assert.equal(await h.legacy.portfolioPurchase.count({where:{id:p.id}}),1); await assert.rejects(commerce.createGuestPurchase(snap,key,'e'.repeat(64)));
  await assert.rejects(commerce.status(p.id,'e'.repeat(64))); await assert.rejects(commerce.download(p.id,secret),/potvrđeno/);
  await assert.rejects(h.legacy.portfolioPurchase.update({where:{id:p.id},data:{amountCents:1}}));
  assert.equal((await commerce.status(p.id,secret)).status,'PENDING');
});
test('verified payment service is idempotent, binds amount/currency and has no public success endpoint', async () => {
  const {p,key,secret,snap}=await purchase(), event=proof(p);
  await assert.rejects(commerce.confirmVerifiedPayment({...event,amountCents:1})); assert.equal((await commerce.status(p.id,secret)).status,'PENDING');
  await Promise.all([commerce.confirmVerifiedPayment(event),commerce.confirmVerifiedPayment(event)]);
  assert.equal(await h.legacy.portfolioPaymentEvent.count({where:{purchaseId:p.id}}),1); assert.equal((await commerce.status(p.id,secret)).status,'PAID');
  assert.equal((await commerce.createGuestPurchase(snap,key,secret)).id,p.id);
  const r=await fetch(`${h.baseUrl}/portfolio-commerce/purchases/${p.id}/confirm`,{method:'POST'}); assert.equal(r.status,404);
});
test('private paid delivery enforces parallel download limit and storage failure consumes nothing', async () => {
  const {p,secret}=await purchase(); await commerce.confirmVerifiedPayment(proof(p));
  h.storage.fail=true; await assert.rejects(commerce.download(p.id,secret)); h.storage.fail=false;
  assert.equal((await h.legacy.portfolioDeliveryGrant.findFirst({where:{purchaseId:p.id}})).downloads,0);
  const results=await Promise.allSettled(Array.from({length:8},()=>commerce.download(p.id,secret)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,5); assert.equal(results.filter(r=>r.status==='rejected').length,3);
  assert.equal((await h.legacy.portfolioDeliveryGrant.findFirst({where:{purchaseId:p.id}})).downloads,5);
});
test('verified failed payment never unlocks a final PDF and repeated failure is idempotent', async () => {
  const {p,secret}=await purchase(), event=proof(p);
  await commerce.recordVerifiedPaymentFailure(event);await commerce.recordVerifiedPaymentFailure(event);
  assert.equal((await commerce.status(p.id,secret)).status,'FAILED');await assert.rejects(commerce.download(p.id,secret),/potvrđeno/);assert.equal(await h.legacy.portfolioPaymentEvent.count({where:{purchaseId:p.id}}),1);
});
test('additional account export freezes server content at 490 cents and delivers exactly one paid historical version', async () => {
  const p=await project(), key=randomUUID(),secret=randomBytes(32).toString('hex');
  await assert.rejects(commerce.createOwnerPurchase(f.a.account.id,p.id,key,secret),/raspoloživo/);
  await assert.rejects(commerce.createOwnerPurchase(f.b.account.id,p.id,key,secret),/pronađen/);
  assert.equal((await gen(p)).status,201);
  const purchase=await commerce.createOwnerPurchase(f.a.account.id,p.id,key,secret);assert.equal(purchase.amountCents,490);
  assert.equal((await commerce.createOwnerPurchase(f.a.account.id,p.id,key,secret)).id,purchase.id);
  const revision=(await send('GET',`me/${p.id}`)).body.revision;
  assert.equal((await send('PATCH',`public/${p.id}`,{expectedRevision:revision,title:'New draft after checkout'})).status,200);
  await commerce.confirmVerifiedPayment({...proof(purchase),amountCents:490});
  await Promise.all([commerce.download(purchase.id,secret),commerce.download(purchase.id,secret)]);
  const versions=await h.legacy.portfolioVersion.findMany({where:{portfolioId:p.id},orderBy:{versionNumber:'asc'}});assert.equal(versions.length,2);assert.equal(versions[1].purchaseId,purchase.id);assert.equal(versions[1].manifest.title,p.title);
  assert.equal(await h.legacy.portfolioExportUsage.count({where:{purchaseId:purchase.id,kind:'PAID',status:'COMMITTED'}}),1);
  assert.equal((await commerce.entitlement(f.a.account.id)).used,1);
  assert.equal((await send('GET',`me/${p.id}`)).body.latestPdfUrl,null);
  const saved=await fetch(`${h.baseUrl}/portfolio-projects/me/${p.id}/versions/${versions[1].id}/pdf`,{headers:{Authorization:`Bearer ${f.a.token}`}});assert.equal(saved.status,200);
});
test('admin list/detail/preview require an admin; revocation removes delivery access', async () => {
  const {p,secret}=await purchase();
  for(const token of [null,f.a.token]) { const r=await fetch(`${h.baseUrl}/admin/portfolio-purchases/${p.id}`,{headers:token?{Authorization:`Bearer ${token}`}:{}}); assert.equal(r.status,401); }
  const detail=await fetch(`${h.baseUrl}/admin/portfolio-purchases/${p.id}`,{headers:{Authorization:`Bearer ${adminToken}`}}); assert.equal(detail.status,200); const data=await detail.json(); assert.equal(data.snapshot.artistName,'Isolated Guest'); assert(!JSON.stringify(data.deliveryGrants).includes('tokenHash'));
  const preview=await fetch(`${h.baseUrl}/admin/portfolio-purchases/${p.id}/preview-pdf`,{headers:{Authorization:`Bearer ${adminToken}`}}); assert.equal(preview.status,200);
  const revoke=await fetch(`${h.baseUrl}/admin/portfolio-purchases/${p.id}/delivery`,{method:'DELETE',headers:{Authorization:`Bearer ${adminToken}`}}); assert.equal(revoke.status,200); await assert.rejects(commerce.status(p.id,secret));
});
