// Read-only working database inspection; never applies SQL.
const fs=require('fs'),path=require('path'),{Client}=require('pg');
const root=path.resolve(__dirname,'../../..');
(async()=>{const e=require('dotenv').parse(fs.readFileSync(path.join(root,'.env'))),db=new Client({connectionString:e.DIRECT_URL||e.DATABASE_URL});await db.connect();try{
  await db.query('BEGIN READ ONLY');
  const migrations=(await db.query('SELECT migration_name,finished_at,rolled_back_at FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 5')).rows;
  const ready=(await db.query(`SELECT to_regclass('public."PromotionGeneration"') IS NOT NULL AS ready`)).rows[0].ready;
  const counts=(await db.query('SELECT (SELECT count(*) FROM "Artist")::int AS artists,(SELECT count(*) FROM "Artwork")::int AS artworks,(SELECT count(*) FROM "PortfolioProject")::int AS portfolios')).rows[0];
  const constraint=(await db.query(`SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='PortfolioPurchase_product_check'`)).rows[0];
  await db.query('COMMIT');console.log(JSON.stringify({migrations,generatorReady:ready,counts,purchaseConstraint:constraint},null,2));
}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
