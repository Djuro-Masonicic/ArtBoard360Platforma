const {test,before,beforeEach,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,randomBytes}=require('node:crypto');
const {promotionHarness}=require('./promotions.fixture.cjs');
let h,env,commerce,guest;
before(async()=>{
  h=await promotionHarness();env=require('../src/config/env').env;
  commerce=h.app.get(require('../src/modules/portfolio-projects/portfolio-commerce.service').PortfolioCommerceService);
  guest=h.app.get(require('../src/modules/portfolio-projects/portfolio-guest.service').PortfolioGuestService);
  require('../src/storage/r2-storage.service').R2StorageService.prototype.getOrCreatePurchasePdf=async function(id,render){if(h.storage.fail)throw Error('Isolated storage failure');const key='mock-test-pdf:'+id;if(!h.storage.objects.has(key))h.storage.objects.set(key,await render());return h.storage.objects.get(key);};
});
beforeEach(()=>{env.nodeEnv='production';env.mockPaymentsEnabled=true;h.app.get(require('../src/modules/portfolio-projects/portfolio-commerce.controller').GuestProcessingGuard).buckets.clear();});
after(async()=>{env.mockPaymentsEnabled=false;env.nodeEnv='test';await h?.close();});
async function send(path,actor,body,secret){const r=await fetch(h.base+'/portfolio-commerce/'+path,{method:body?'POST':'GET',headers:{...(actor?{Authorization:'Bearer '+actor.token}:{}),...(body?{'Content-Type':'application/json'}:{}),...(secret?{'X-Portfolio-Delivery':secret}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.headers.get('content-type')?.includes('application/pdf')?Buffer.from(await r.arrayBuffer()):await r.json()};}
async function order(){const id=randomUUID(),secret=randomBytes(32).toString('hex'),snapshot=await guest.snapshot(JSON.stringify({project:{artistName:'Mock Guest',email:'mock@example.invalid'},artworks:[]}),[]);await commerce.createGuestPurchase(snapshot,id,secret);return {id,secret};}

test('temporary mock checkout defaults on in production; server disable blocks confirmations without mutations',async()=>{
  const a=await h.artist(),data={outcome:'success',operationKey:randomUUID()},before=await h.prisma.portfolioPurchase.count();
  const {readMockPaymentsEnabled}=require('../src/config/env');
  for(const [value,expected] of [[undefined,true],['true',true],['false',false],['invalid',false]])assert.equal(readMockPaymentsEnabled(value),expected);
  env.mockPaymentsEnabled=readMockPaymentsEnabled(undefined);
  assert.equal((await send('checkout-context?product=premium',a)).data.checkoutAvailable,true);
  assert.equal((await send('checkout-context?product=generator',a)).data.catalog.mockPaymentsEnabled,true);
  for(const nodeEnv of ['production','development','test']){
    env.nodeEnv=nodeEnv;env.mockPaymentsEnabled=false;
    assert.equal((await send('mock/generator',a,data)).status,404);
    assert.equal((await send('mock/premium',a,{...data,amountCents:890})).status,404);
    assert.equal((await send('checkout-context?product=generator',a)).data.catalog.mockPaymentsEnabled,false);
    assert.equal((await send('checkout-public?product=premium')).data.catalog.mockPaymentsEnabled,false);
  }
  await assert.rejects(commerce.confirmVerifiedPayment({purchaseId:randomUUID(),provider:'mock',eventId:'disabled',paymentRef:'disabled',amountCents:490,currency:'EUR',payloadHash:'a'.repeat(64)}),/Neispravna potvrda/);
  assert.equal(await h.prisma.portfolioPurchase.count(),before);assert.equal(await h.prisma.artistSubscription.count({where:{artistAccountId:a.account.id}}),0);
});
test('authenticated identity and strict DTOs reject anonymous or forged purchases',async()=>{
  const a=await h.artist(),body={outcome:'success',operationKey:randomUUID()};
  assert.equal((await send('mock/generator',null,body)).status,401);
  for(const extra of [{artistAccountId:a.account.id},{amountCents:1},{outcome:'paid'},{credits:100}])assert.equal((await send('mock/generator',a,{...body,...extra})).status,400);
  assert.equal((await send('mock/premium',a,{...body,amountCents:1})).status,400);
  assert.equal(await h.prisma.portfolioPurchase.count({where:{artistAccountId:a.account.id}}),0);
});
test('Generator failure/cancel grant nothing; retry and repeated success grant exactly ten credits',async()=>{
  const a=await h.artist(),operationKey=randomUUID();
  for(const outcome of ['failure','cancel']){const r=await send('mock/generator',a,{operationKey,outcome});assert.equal(r.status,201);assert.equal(r.data.status,'FAILED');}
  assert.equal(await h.prisma.promotionCreditLedger.count({where:{artistAccountId:a.account.id}}),0);
  const r=await send('mock/generator',a,{operationKey,outcome:'success'});assert.equal(r.status,201);assert.equal(r.data.status,'PAID');assert.equal(r.data.context.catalog.mockPaymentsEnabled,true);
  const repeats=await Promise.all(Array.from({length:2},()=>send('mock/generator',a,{operationKey,outcome:'success'})));assert(repeats.every(r=>r.status===201&&r.data.status==='PAID'),JSON.stringify(repeats));
  assert.equal(await h.prisma.portfolioPurchase.count({where:{artistAccountId:a.account.id}}),1);const credits=await h.prisma.promotionCreditLedger.findMany({where:{artistAccountId:a.account.id}});assert.equal(credits.length,1);assert.equal(credits[0].credits,10);
  const p=await h.prisma.portfolioPurchase.findUnique({where:{id:r.data.id},include:{paymentEvents:true}});assert.equal(p.provider,'mock');assert(p.paymentEvents.every(e=>e.provider==='mock'));assert.equal(p.amountCents,490);
  assert.equal((await send('mock/generator',a,{operationKey,outcome:'failure'})).data.status,'PAID');
});
test('Guest delivery capability is required, failures keep PDF locked, successful mock payment unlocks private PDF',async()=>{
  const {id,secret}=await order(),projects=await h.prisma.portfolioProject.count();
  assert.equal((await send(`purchases/${id}/mock-payment`,null,{outcome:'success'})).status,404);
  assert.equal((await send(`purchases/${id}/mock-payment`,null,{outcome:'success'},'f'.repeat(64))).status,404);
  assert.equal((await send(`purchases/${id}/pdf`,null,null,secret)).status,403);
  assert.equal((await send(`purchases/${id}/mock-payment`,null,{outcome:'failure'},secret)).data.status,'FAILED');assert.equal((await send(`purchases/${id}/pdf`,null,null,secret)).status,403);
  const paid=await send(`purchases/${id}/mock-payment`,null,{outcome:'success'},secret);assert.equal(paid.data.context.status,'PAID');assert.equal(paid.data.context.purchase.id,id);
  const pdf=await send(`purchases/${id}/pdf`,null,null,secret);assert.equal(pdf.status,200);assert.equal(pdf.data.subarray(0,5).toString(),'%PDF-');assert.equal(await h.prisma.portfolioProject.count(),projects);
});
test('revoked Guest links and actual processor records cannot be simulated',async()=>{
  const {id,secret}=await order();await commerce.revoke(id);assert.equal((await send(`purchases/${id}/mock-payment`,null,{outcome:'success'},secret)).status,404);assert.equal((await h.prisma.portfolioPurchase.findUnique({where:{id}})).status,'PENDING');
  const b=await order();await h.prisma.portfolioPurchase.update({where:{id:b.id},data:{provider:'allsecure'}});assert.equal((await send(`purchases/${b.id}/mock-payment`,null,{outcome:'success'},b.secret)).status,409);
});
test('Premium failure does not activate; concurrent success is idempotent and grants all existing Premium quotas',async()=>{
  const a=await h.artist(),operationKey=randomUUID();const body={operationKey,amountCents:1500};
  assert.equal((await send('mock/premium',a,{...body,outcome:'failure'})).data.status,'FAILED');assert.equal(await h.prisma.artistSubscription.count({where:{artistAccountId:a.account.id}}),0);
  const results=await Promise.all([send('mock/premium',a,{...body,outcome:'success'}),send('mock/premium',a,{...body,outcome:'success'})]);assert(results.every(r=>r.status===201&&r.data.status==='PAID'));
  const s=await h.prisma.artistSubscription.findUnique({where:{artistAccountId:a.account.id}});assert.equal(s.provider,'mock');assert.equal(s.plan,'PLATINUM');assert.equal(s.providerSubscriptionId,'mock-'+operationKey);
  await send('mock/premium',a,{...body,outcome:'success'});assert.deepEqual(await h.prisma.artistSubscription.findUnique({where:{artistAccountId:a.account.id}}),s);
  assert.equal((await commerce.entitlement(a.account.id)).limit,5);assert.equal((await send('checkout-context?product=generator',a)).data.quota.limit,10);assert.equal(require('../src/modules/artist-subscriptions/subscription-access').canManageLocalSubscription(s),true);
});

test('owned additional PDF preserves ownership, versions and consumed Free quota across mock payment and storage retry',async()=>{
  const a=await h.artist(),b=await h.artist();
  const project=await h.prisma.portfolioProject.create({data:{artistAccountId:a.account.id,source:'ARTBOARD_PROFILE',artistName:'Mock Owner',email:a.email}});
  const operationKey=randomUUID(),secret=randomBytes(32).toString('hex'),body={operationKey,deliverySecret:secret};
  assert.equal((await send(`projects/${project.id}/purchase`,b,body)).status,404);
  assert.equal((await send(`projects/${project.id}/purchase`,null,body)).status,401);
  assert.equal((await send(`projects/${project.id}/purchase`,a,body)).status,409);
  const free=await fetch(h.base+`/portfolio-projects/public/${project.id}/generate-pdf`,{method:'POST',headers:{Authorization:'Bearer '+a.token,'Idempotency-Key':randomUUID()}});assert.equal(free.status,201,await free.text());
  const prepared=await send(`projects/${project.id}/purchase`,a,body);assert.equal(prepared.status,201,JSON.stringify(prepared));
  assert.equal((await send(`purchases/${operationKey}/mock-payment`,b,{outcome:'success'})).status,404);
  assert.equal((await send(`purchases/${operationKey}/mock-payment`,a,{outcome:'success'},secret)).data.status,'PAID');
  h.storage.fail=true;
  try{assert.equal((await send(`purchases/${operationKey}/pdf`,a,null,secret)).status,500);}finally{h.storage.fail=false;}
  assert.equal(await h.prisma.portfolioVersion.count({where:{portfolioId:project.id}}),1);
  assert.equal((await h.prisma.portfolioDeliveryGrant.findFirst({where:{purchaseId:operationKey}})).downloads,0);
  for(let i=0;i<2;i++)assert.equal((await send(`purchases/${operationKey}/pdf`,a,null,secret)).status,200);
  assert.equal(await h.prisma.portfolioVersion.count({where:{purchaseId:operationKey}}),1);
  assert.equal(await h.prisma.portfolioExportUsage.count({where:{purchaseId:operationKey}}),1);
  assert.equal((await commerce.entitlement(a.account.id)).remaining,0);
  const snapshot=await commerce.detail(operationKey);assert.equal(snapshot.provider,'mock');assert.equal(snapshot.snapshot.artistName,'Mock Owner');
  assert.equal((await commerce.list()).items.find(p=>p.id===operationKey).provider,'mock');
  for(const token of [null,b.token])assert.equal((await fetch(h.base+`/admin/portfolio-purchases/${operationKey}`,{headers:token?{Authorization:'Bearer '+token}:{}})).status,401);
  const admin=await h.prisma.adminUser.create({data:{email:randomUUID()+'@example.invalid',name:'Mock test admin',passwordHash:'isolated-test-only'}});
  const token=require('../src/modules/auth/auth-crypto').signSessionToken({sub:admin.id,email:admin.email,kind:'admin',exp:Math.floor(Date.now()/1000)+3600},env.adminAuthSecret);
  const visible=await fetch(h.base+`/admin/portfolio-purchases/${operationKey}`,{headers:{Authorization:'Bearer '+token}});assert.equal(visible.status,200);assert.equal((await visible.json()).provider,'mock');
});

test('standalone CV mock purchase retains the CV scope and serves its final PDF',async()=>{
  const selection=require('@artboard/portfolio-document-plan').defaultDocumentSelection(true);selection.scope='CV';
  const cvSections={version:1,education:[],experience:[],exhibitions:[],awards:[],certificates:[],publications:[],skills:'Painting',programs:''};
  const snapshot=await guest.snapshot(JSON.stringify({project:{artistName:'Mock CV',email:'cv@example.invalid',includeCv:true,documentSelection:selection,cvSections},artworks:[]}),[]);
  const id=randomUUID(),secret=randomBytes(32).toString('hex');await commerce.createGuestPurchase(snapshot,id,secret);
  assert.equal((await h.prisma.portfolioPurchase.findUnique({where:{id}})).product,'CV');
  assert.equal((await send(`purchases/${id}/mock-payment`,null,{outcome:'success'},secret)).data.status,'PAID');
  const pdf=await send(`purchases/${id}/pdf`,null,null,secret);assert.equal(pdf.status,200);assert.equal(pdf.data.subarray(0,5).toString(),'%PDF-');
});
