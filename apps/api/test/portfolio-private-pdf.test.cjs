const assert = require('node:assert/strict'), path = require('node:path');
const { Readable } = require('node:stream'), { test } = require('node:test');
Object.assign(process.env, { DATABASE_URL:'postgresql://unused@127.0.0.1:1/unused', R2_ACCOUNT_ID:'unused', R2_ACCESS_KEY_ID:'unused', R2_SECRET_ACCESS_KEY:'unused', R2_BUCKET_NAME:'public-test', R2_PUBLIC_URL:'https://storage.invalid', R2_PRIVATE_PDF_BUCKET_NAME:'private-test' });
require('ts-node').register({project:path.resolve(__dirname,'../tsconfig.json'),transpileOnly:true}); require('reflect-metadata');
const {R2StorageService}=require('../src/storage/r2-storage.service'), {env}=require('../src/config/env');
const body=Buffer.from('%PDF-isolated-storage'), id='owner-project', storagePath=`portfolio-projects/${id}/pdf/test.pdf`;
function fixture(bytes=body){const storage=new R2StorageService(),commands=[];storage.createClient=()=>({send:async command=>{commands.push(command);return command.constructor.name==='GetObjectCommand'?{Body:Readable.from([bytes]),ContentLength:bytes.length}:{};}});return {storage,commands};}
test('new private PDFs use a separate bucket and never receive a public media URL',async()=>{const h=fixture();const result=await h.storage.uploadFile({recordId:id,entityType:'portfolio-pdf',fileName:'test.pdf',mimeType:'application/pdf',fileSizeBytes:body.length,body,visibility:'private'});assert.equal(h.commands[0].input.Bucket,'private-test');assert.equal(result.publicUrl,`r2-private:${result.path}`);assert(!result.publicUrl.startsWith('https://'));});
test('missing or public private-bucket config fails before any storage call',async()=>{const previous=env.r2PrivatePdfBucketName;try{for(const value of [undefined,'public-test']){env.r2PrivatePdfBucketName=value;const h=fixture();await assert.rejects(()=>h.storage.uploadFile({recordId:id,entityType:'portfolio-pdf',fileName:'test.pdf',mimeType:'application/pdf',fileSizeBytes:body.length,body,visibility:'private'}));assert.equal(h.commands.length,0);}}finally{env.r2PrivatePdfBucketName=previous;}});
test('private download reads only the owning PDF namespace using SDK credentials',async()=>{const h=fixture();assert.deepEqual(await h.storage.readPortfolioPdf({portfolioId:id,storagePath,privateObject:true}),body);assert.equal(h.commands[0].input.Bucket,'private-test');const other=fixture();await assert.rejects(()=>other.storage.readPortfolioPdf({portfolioId:'other-project',storagePath,privateObject:true}));assert.equal(other.commands.length,0);});
test('legacy public PDF bytes can be delivered after authorization, without copying or deletion',async()=>{const h=fixture();assert.deepEqual(await h.storage.readPortfolioPdf({portfolioId:id,storagePath,privateObject:false}),body);assert.equal(h.commands[0].input.Bucket,'public-test');assert.equal(h.commands.length,1);});
test('invalid PDF objects fail without returning arbitrary content',async()=>{const h=fixture(Buffer.from('<script>invalid</script>'));await assert.rejects(()=>h.storage.readPortfolioPdf({portfolioId:id,storagePath,privateObject:true}));});

test('purchase PDF uses deterministic private storage and renders only when absent',async()=>{
 const storage=new R2StorageService(),objects=new Map(),commands=[];let renders=0;const purchase='a1d3f997-a8a5-4488-9f8a-b32bf0b3ae71';
 storage.createClient=()=>({send:async command=>{commands.push(command);const key=command.input.Key;if(command.constructor.name==='PutObjectCommand'){objects.set(key,command.input.Body);return{};}if(!objects.has(key)){const e=Error('Missing');e.name='NoSuchKey';throw e;}return{Body:Readable.from([objects.get(key)])};}});
 const render=async()=>{renders++;return body;};
 assert.deepEqual(await storage.getOrCreatePurchasePdf(purchase,render),body);assert.deepEqual(await storage.getOrCreatePurchasePdf(purchase,render),body);assert.equal(renders,1);assert(commands.every(c=>c.input.Bucket==='private-test'));assert.equal(objects.size,1);
});
test('purchase PDF storage failures never fall back to the public bucket or hide authentication errors',async()=>{
 const storage=new R2StorageService();let renders=0;storage.createClient=()=>({send:async()=>{const e=Error('Denied');e.$metadata={httpStatusCode:403};throw e;}});
 await assert.rejects(storage.getOrCreatePurchasePdf('a1d3f997-a8a5-4488-9f8a-b32bf0b3ae71',async()=>{renders++;return body;}));assert.equal(renders,0);
});
