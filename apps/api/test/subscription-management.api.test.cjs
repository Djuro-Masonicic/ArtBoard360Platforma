const assert = require('node:assert/strict');
const { before, beforeEach, after, test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { startHarness } = require('./artist-collections.fixture.cjs');
let h, f;
before(async () => { h = await startHarness({ portfolio: true, subscriptions: true }); });
beforeEach(async () => { f = await h.fresh(); });
after(async () => { if(h) { await h.close(); console.log('Subscription isolated DB:', h.database); } });
const send = (method, action, body, who='a') => h.send(method, action, body, who ? f[who].token : undefined, '/artist-subscriptions');
const read = () => h.legacy.artistSubscription.findUnique({where:{artistAccountId:f.a.account.id}});
async function premium(overrides={}) { return h.legacy.artistSubscription.create({data:{artistAccountId:f.a.account.id,plan:'PLATINUM',status:'ACTIVE',currentPeriodStart:new Date(Date.now()-86400_000),currentPeriodEnd:new Date(Date.now()+27*86400_000),...overrides}}); }
test('overview and every mutation require artist authentication', async () => {
  for (const action of ['overview','cancel','reactivate']) assert.equal((await send(action==='overview'?'GET':'POST',action,action==='overview'?null:{},null)).status,401);
  assert.equal(await read(),null);
});
test('new account shows real Free allowance without creating a subscription on a read', async () => {
  const r=await send('GET','overview');assert.equal(r.status,200);assert.equal(r.body.state,'FREE');assert.equal(r.body.account.createdAt,f.a.account.createdAt.toISOString());
  assert.equal(r.body.usage.portfolio.remaining,1);assert.equal(r.body.usage.instagram.used,null);assert.equal(r.body.usage.qr.known,true);assert.equal(r.body.usage.qr.available,true);assert.equal(r.body.billing.monthlyAmountCents,null);assert.equal(await read(),null);
});
for(const [status,flag,state] of [['ACTIVE',false,'ACTIVE'],['ACTIVE',true,'CANCELED_PENDING_EXPIRY'],['CANCELED',false,'CANCELED_PENDING_EXPIRY'],['PAST_DUE',false,'PAYMENT_FAILED']]) {
  test(`${status}, cancellation=${flag}: overview and actual quota agree until access deadline`,async()=>{
    const s=await premium({status,cancelAtPeriodEnd:flag});const r=await send('GET','overview');assert.equal(r.body.state,state);assert.equal(r.body.effectivePlan,'PREMIUM');assert.equal(r.body.usage.portfolio.limit,5);assert.equal(r.body.billing.accessUntil,s.currentPeriodEnd.toISOString());
    const c=await h.send('GET','checkout-context?product=premium',null,f.a.token,'/portfolio-commerce');assert.equal(c.body.status,'ALREADY_PREMIUM');
  });
}
test('expiry is read-only and retains provider references and previous dates',async()=>{
  const s=await premium({cancelAtPeriodEnd:true,canceledAt:new Date(Date.now()-86400_000),currentPeriodStart:new Date(Date.now()-50*86400_000),currentPeriodEnd:new Date(Date.now()-86400_000),provider:'allsecure',providerSubscriptionId:randomUUID()});
  const r=await send('GET','overview');assert.equal(r.body.state,'EXPIRED');assert.equal(r.body.effectivePlan,'FREE');assert.equal(r.body.billing.lastPremiumEnd,s.currentPeriodEnd.toISOString());
  assert.equal((await send('GET','me')).status,200);assert.deepEqual(await read(),s);
});
test('owner cannot submit another owner, subscription, dates or plan as a mutation target',async()=>{
  const s=await premium();await h.legacy.artistSubscription.create({data:{artistAccountId:f.b.account.id,plan:'PLATINUM',currentPeriodEnd:new Date(Date.now()+86400_000)}});
  for(const body of [{artistAccountId:f.b.account.id},{subscriptionId:s.id},{plan:'PLATINUM'},{currentPeriodEnd:'2099-01-01'}]) assert.equal((await send('POST','cancel',body)).status,400);
  assert.deepEqual(await read(),s);const other=await send('GET','overview',null,'b');assert.equal(other.body.account.email,f.b.account.email);assert.notEqual(other.body.billing.subscriptionId,s.id);
});
test('repeated parallel local cancellations are idempotent and preserve access and quota window',async()=>{
  const s=await premium();const r=await Promise.all(Array.from({length:6},()=>send('POST','cancel',{})));
  assert(r.every(x=>x.status===201&&x.body.state==='CANCELED_PENDING_EXPIRY'));const changed=await read();assert(changed.cancelAtPeriodEnd);assert.deepEqual(changed.currentPeriodEnd,s.currentPeriodEnd);assert.deepEqual(changed.currentPeriodStart,s.currentPeriodStart);
  const again=await send('POST','cancel',{});assert.equal(again.status,201);assert.deepEqual(await read(),changed);assert.equal(again.body.usage.portfolio.limit,5);
});
test('reactivation preserves the subscription ID and cycle; repeated requests make no duplicate or charge',async()=>{
  const s=await premium({cancelAtPeriodEnd:true,canceledAt:new Date()});const before=await h.legacy.artistSubscription.count();
  const replies=await Promise.all(Array.from({length:5},()=>send('POST','reactivate',{})));assert(replies.every(r=>r.status===201&&r.body.state==='ACTIVE'));
  const current=await read();assert.equal(current.id,s.id);assert.equal(current.cancelAtPeriodEnd,false);assert.deepEqual(current.currentPeriodStart,s.currentPeriodStart);assert.deepEqual(current.currentPeriodEnd,s.currentPeriodEnd);assert.equal(await h.legacy.artistSubscription.count(),before);
  assert.equal(await h.legacy.portfolioPaymentEvent.count({where:{purchase:{artistAccountId:f.a.account.id}}}),0);
});
test('reactivating legacy CANCELED state restores ACTIVE without extending the paid period',async()=>{
  const s=await premium({status:'CANCELED'});assert.equal((await send('POST','reactivate',{})).body.state,'ACTIVE');assert.deepEqual((await read()).currentPeriodEnd,s.currentPeriodEnd);
});
test('unconnected provider cannot be canceled, reactivated or bypassed through legacy DELETE',async()=>{
  let s=await premium({provider:'allsecure',providerSubscriptionId:randomUUID()});
  assert.equal((await send('POST','cancel',{})).status,503);assert.equal((await send('DELETE','platinum-request')).status,503);assert.deepEqual(await read(),s);
  s=await h.legacy.artistSubscription.update({where:{id:s.id},data:{cancelAtPeriodEnd:true}});assert.equal((await send('POST','reactivate',{})).status,503);assert.deepEqual(await read(),s);
});
test('expired and Free accounts cannot reactivate or cancel into Premium',async()=>{
  for(const op of ['cancel','reactivate'])assert.equal((await send('POST',op,{})).status,400);assert.equal(await read(),null);
  const s=await premium({currentPeriodStart:new Date(Date.now()-30*86400_000),currentPeriodEnd:new Date(Date.now()-1000)});
  for(const op of ['cancel','reactivate'])assert.equal((await send('POST',op,{})).status,400);assert.deepEqual(await read(),s);
});
test('a missing provider label never permits a local cancellation of a remote subscription',async()=>{
  const s=await premium({providerSubscriptionId:randomUUID()});assert.equal((await send('GET','overview')).body.capabilities.canCancel,false);assert.equal((await send('POST','cancel',{})).status,503);assert.deepEqual(await read(),s);
});
test('overview reads actual monthly committed and reserved PDF usage',async()=>{
  const s=await premium();const {subscriptionQuotaWindow}=require('../src/modules/artist-subscriptions/subscription-access');const w=subscriptionQuotaWindow(s);
  await h.legacy.portfolioQuotaPeriod.create({data:{artistAccountId:f.a.account.id,periodStart:w.start,periodEnd:w.end,committed:2,reserved:1}});
  const r=await send('GET','overview');assert.equal(r.body.usage.portfolio.used,2);assert.equal(r.body.usage.portfolio.reserved,1);assert.equal(r.body.usage.portfolio.remaining,2);
});
test('expiry never resets a used lifetime Free export or removes saved versions',async()=>{
  const p=await h.send('POST','from-profile',null,f.a.token,'/portfolio-projects');assert.equal(p.status,201);h.env.r2PrivatePdfBucketName='subscription-isolated-private';
  const response=await fetch(h.baseUrl+'/portfolio-projects/public/'+p.body.id+'/generate-pdf',{method:'POST',headers:{Authorization:'Bearer '+f.a.token,'Idempotency-Key':randomUUID()}});assert.equal(response.status,201,await response.text());
  const versions=await h.legacy.portfolioVersion.count({where:{portfolioId:p.body.id}});await premium({currentPeriodStart:new Date(Date.now()-30*86400_000),currentPeriodEnd:new Date(Date.now()-1000)});
  const r=await send('GET','overview');assert.equal(r.body.state,'EXPIRED');assert.equal(r.body.usage.portfolio.used,1);assert.equal(r.body.usage.portfolio.remaining,0);assert.equal(await h.legacy.portfolioVersion.count({where:{portfolioId:p.body.id}}),versions);assert.equal(h.storage.deletes.length,0);
});
test('deadline is exclusive and monthly anchors remain stable at end of month',()=>{
  const {hasPremiumAccess,subscriptionQuotaWindow}=require('../src/modules/artist-subscriptions/subscription-access');const s={plan:'PLATINUM',status:'PAST_DUE',currentPeriodStart:new Date('2026-01-31T10:00:00Z'),currentPeriodEnd:new Date('2027-01-31T10:00:00Z')};
  assert.equal(hasPremiumAccess(s,s.currentPeriodEnd),false);assert.equal(subscriptionQuotaWindow(s,new Date('2026-02-28T11:00:00Z')).start.toISOString(),'2026-02-28T10:00:00.000Z');assert.equal(subscriptionQuotaWindow(s,new Date('2026-03-31T11:00:00Z')).start.toISOString(),'2026-03-31T10:00:00.000Z');
});
