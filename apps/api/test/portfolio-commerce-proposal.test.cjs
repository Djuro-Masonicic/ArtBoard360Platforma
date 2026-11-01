const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {before,beforeEach,after,test}=require('node:test'),{Client,Pool}=require('pg');
const {startHarness}=require('./artist-collections.fixture.cjs');
let h,client,pool,f,project;
const hash='a'.repeat(64);
before(async()=>{
  h=await startHarness();const target=new URL(process.env.DIRECT_URL);assert.equal(target.pathname,'/'+h.database);assert.match(h.database,/^artboard_collections_api_[a-f0-9]{32}$/);
  client=new Client({connectionString:target.toString()});await client.connect();pool=new Pool({connectionString:target.toString(),max:10});
  const before=await client.query('SELECT (SELECT count(*) FROM "Artist") AS artists, (SELECT count(*) FROM "Artwork") AS artworks, (SELECT count(*) FROM "PortfolioProject") AS projects, (SELECT count(*) FROM "PortfolioVersion") AS versions');
  await client.query(fs.readFileSync(path.resolve(__dirname,'../prisma/proposals/portfolio-commerce-v1/migration.sql'),'utf8'));
  const after=await client.query('SELECT (SELECT count(*) FROM "Artist") AS artists, (SELECT count(*) FROM "Artwork") AS artworks, (SELECT count(*) FROM "PortfolioProject") AS projects, (SELECT count(*) FROM "PortfolioVersion") AS versions');assert.deepEqual(after.rows,before.rows);
});
beforeEach(async()=>{f=await h.fresh();project=await h.legacy.portfolioProject.create({data:{artistAccountId:f.a.account.id,source:'ARTBOARD_PROFILE',artistName:'Isolated Commerce'}})});
after(async()=>{await pool?.end();await client?.end();await h?.close();});
async function purchase(){return (await client.query('INSERT INTO "PortfolioPurchase" ("product","amountCents","snapshot","snapshotHash") VALUES ($1,$2,$3,$4) RETURNING id',['PORTFOLIO',890,{artistName:'Guest'},hash])).rows[0].id;}
test('SQL proposal allows one lifetime Free reservation and preserves operation idempotency',async()=>{
  const operation=randomUUID();const args=[f.a.account.id,project.id,operation,hash];
  const sql='INSERT INTO "PortfolioExportUsage" ("artistAccountId","portfolioId","operationKey","contentHash","kind","expiresAt") VALUES ($1,$2,$3,$4,\'FREE\',now()+interval \'1 hour\') RETURNING id';
  const first=(await client.query(sql,args)).rows[0].id;
  await assert.rejects(()=>client.query(sql,[f.a.account.id,project.id,randomUUID(),hash]),error=>error.code==='23505');
  await assert.rejects(()=>client.query(sql,args),error=>error.code==='23505');
  await client.query('UPDATE "PortfolioExportUsage" SET status=\'RELEASED\' WHERE id=$1',[first]);
  assert.equal((await client.query(sql,[f.a.account.id,project.id,randomUUID(),hash])).rowCount,1);
});
test('ten simultaneous quota reservations cannot exceed five exports',async()=>{
  const id=(await client.query('INSERT INTO "PortfolioQuotaPeriod" ("artistAccountId","periodStart","periodEnd") VALUES ($1,now(),now()+interval \'1 month\') RETURNING id',[f.a.account.id])).rows[0].id;
  const results=await Promise.all(Array.from({length:10},()=>pool.query('UPDATE "PortfolioQuotaPeriod" SET reserved=reserved+1 WHERE id=$1 AND reserved+committed<"limit" RETURNING id',[id])));
  assert.equal(results.reduce((sum,result)=>sum+result.rowCount,0),5);assert.equal((await client.query('SELECT reserved FROM "PortfolioQuotaPeriod" WHERE id=$1',[id])).rows[0].reserved,5);
});
test('purchase content and price are immutable and duplicate payment events are rejected',async()=>{
  const id=await purchase();await assert.rejects(()=>client.query('UPDATE "PortfolioPurchase" SET "amountCents"=1 WHERE id=$1',[id]),error=>error.code==='23514');
  const sql='INSERT INTO "PortfolioPaymentEvent" ("purchaseId",provider,"deduplicationKey","payloadHash") VALUES ($1,\'test-provider\',$2,$3)';const event=randomUUID();await client.query(sql,[id,event,hash]);await assert.rejects(()=>client.query(sql,[id,event,hash]),error=>error.code==='23505');
  await assert.rejects(()=>client.query('UPDATE "PortfolioPurchase" SET status=\'PAID\' WHERE id=$1',[id]),error=>error.code==='23514');
});
test('delivery SQL requires a paid purchase and atomically limits downloads',async()=>{
  const id=await purchase(),token=randomUUID().replaceAll('-','').repeat(2);await client.query('INSERT INTO "PortfolioDeliveryGrant" ("purchaseId","tokenHash","expiresAt") VALUES ($1,$2,now()+interval \'1 day\')',[id,token]);
  const sql='UPDATE "PortfolioDeliveryGrant" g SET downloads=downloads+1 WHERE "tokenHash"=$1 AND "revokedAt" IS NULL AND "expiresAt">now() AND downloads<"maximumDownloads" AND EXISTS (SELECT 1 FROM "PortfolioPurchase" p WHERE p.id=g."purchaseId" AND p.status=\'PAID\') RETURNING id';
  assert.equal((await client.query(sql,[token])).rowCount,0);await client.query('UPDATE "PortfolioPurchase" SET status=\'PAID\',"paidAt"=now() WHERE id=$1',[id]);
  const results=await Promise.all(Array.from({length:8},()=>pool.query(sql,[token])));assert.equal(results.reduce((sum,result)=>sum+result.rowCount,0),5);
  await client.query('UPDATE "PortfolioDeliveryGrant" SET "revokedAt"=now() WHERE "tokenHash"=$1',[token]);assert.equal((await client.query(sql,[token])).rowCount,0);
});
