// A new empty test database receives only the schema, never working user rows.
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process'),{randomUUID}=require('crypto'),{Client}=require('pg');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'.tmp/promotion');
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const env=require('dotenv').parse(fs.readFileSync(path.join(root,'.env'))),u=new URL(env.DIRECT_URL||env.DATABASE_URL);
  if(!['localhost','127.0.0.1'].includes(u.hostname)||u.port!=='5433'||u.pathname!=='/artboard_platforma')throw Error('Expected local development database');
  const schema=execFileSync('docker',['exec','artboardplatforma-postgres-1','pg_dump','-U','postgres','-d','artboard_platforma','--schema-only','--no-owner','--no-privileges'],{encoding:'utf8',maxBuffer:20000000});
  const database='artboard_promotion_test_'+randomUUID().replaceAll('-',''),admin=new URL(u);admin.pathname='/postgres';
  const a=new Client({connectionString:admin.href});await a.connect();await a.query(`CREATE DATABASE "${database}"`);await a.end();u.pathname='/'+database;
  const db=new Client({connectionString:u.href});await db.connect();
  try{
    await db.query(schema.replace(/^\\(?:un)?restrict .*$/gm,''));
    await db.query('SET search_path=public');
    await db.query(fs.readFileSync(path.join(root,'apps/api/prisma/migrations/20261031150000_promotion_generator/migration.sql'),'utf8'));
    fs.writeFileSync(path.join(out,'isolated.json'),JSON.stringify({database}));console.log(JSON.stringify({database,migrationApplied:true,workingDatabaseChanged:false}));
  }finally{await db.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
