const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto');
const {promotionHarness}=require('./promotions.fixture.cjs');
const {catalog,graphicHTML,selected}=require('@artboard/promotion-renderer');
let h;before(async()=>{h=await promotionHarness();});after(async()=>{await h?.close();});
const config=async a=>(await h.request('',a)).data.draft.config;
const generate=(a,c,key=randomUUID())=>h.request('/generations',a,'POST',{config:c,operationKey:key});
async function sliderConfig(a){const c=await config(a),w=await h.prisma.artwork.create({data:{artistId:a.id,title:'Second',description:'Second description',imageUrl:'https://storage.invalid/second-'+randomUUID()+'.png'}});return {...c,template:6,publicationTitle:'Test publication',artworkIds:[a.work.id,w.id]};}

async function work(){h.service.stopped=false;try{for(let i=0;i<60;i++){await h.service.tick();if(!await h.prisma.promotionGeneration.count({where:{OR:[{status:'QUEUED'},{status:'PROCESSING',leaseUntil:{lt:new Date()}}]}}))return;}throw Error('Test queue did not drain');}finally{h.service.stopped=true;}}
async function fastRenderer(){const real=h.generator.generate.bind(h.generator);h.generator.generate=async(s,onSlide)=>{for(let i=0;i<selected(s.config,s.rendererVersion).slides;i++)await onSlide(h.image,i);};return ()=>h.generator.generate=real;}

test('authenticated reads do not create drafts; anonymous writes and forged identities are rejected',async()=>{
  const a=await h.artist(),c=await config(a);
  assert.equal(await h.prisma.promotionDraft.count({where:{artistAccountId:a.account.id}}),0);
  assert.equal((await h.request('/draft',null,'PUT',{config:c,revision:0})).status,401);
  assert.equal((await h.request('/draft',a,'PUT',{config:c,revision:0,artistAccountId:randomUUID()})).status,400);
  assert.equal(await h.prisma.promotionDraft.count({where:{artistAccountId:a.account.id}}),0);
});
test('explicit draft save, reload, optimistic conflict, private ownership and profile stays unchanged',async()=>{
  const a=await h.artist(),b=await h.artist(),c=await config(a),before=await h.prisma.artist.findUnique({where:{id:a.id}});
  c.name='Ime samo u objavi';c.description='Opis objave';
  assert.equal((await h.request('/draft',a,'PUT',{config:c,revision:0})).status,200);
  assert.equal((await h.request('',a)).data.draft.config.name,c.name);
  assert.equal((await h.request('',b)).data.draft.revision,0);
  assert.equal((await h.request('/draft',a,'PUT',{config:c,revision:0})).status,409);
  const own=await config(b);own.artworkIds=[a.work.id];
  assert.equal((await h.request('/draft',b,'PUT',{config:own,revision:0})).status,404);
  assert.deepEqual(await h.prisma.artist.findUnique({where:{id:a.id}}),before);
});

test('Grid saves its own collection title and rejects invalid or missing names before writes or quota reservations',async()=>{
  const a=await h.artist(),c={...await config(a),template:8};
  for(const collectionTitle of [undefined,'','   ','a'.repeat(181),'Naziv\nsa kontrolom',12]){
    const r=await generate(a,{...c,...(collectionTitle===undefined?{}:{collectionTitle})});assert.equal(r.status,400);
  }
  assert.equal(await h.prisma.promotionGeneration.count({where:{artistAccountId:a.account.id}}),0);assert.equal((await h.service.get(a.account.id)).usage.reserved,0);
  const named={...c,title:'Nezavisan naziv rada',collectionTitle:'Noćne skice'};
  assert.equal((await h.request('/draft',a,'PUT',{config:named,revision:0})).status,200);
  const saved=(await h.request('',a)).data.draft.config;assert.equal(saved.collectionTitle,'Noćne skice');assert.equal(saved.title,'Nezavisan naziv rada');
  const restore=await fastRenderer();try{const r=await generate(a,saved);assert.equal(r.status,201);await work();const row=await h.prisma.promotionGeneration.findUnique({where:{id:r.data.id}});assert.equal(row.snapshot.rendererVersion,8);assert.equal(row.snapshot.config.collectionTitle,'Noćne skice');}finally{restore();}
});
test('max 9 artworks, duplicate IDs, unknown versions and long description are rejected without writes',async()=>{
  const a=await h.artist(),c=await config(a);
  for(const patch of [{artworkIds:Array.from({length:10},()=>randomUUID())},{artworkIds:[a.work.id,a.work.id]},{version:5},{description:'a'.repeat(121)}])assert.equal((await generate(a,{...c,...patch})).status,400);
  assert.equal(await h.prisma.promotionGeneration.count({where:{artistAccountId:a.account.id}}),0);
});

test('owned collections supply ordered subsets; foreign collections and mismatched works cannot save or export',async()=>{
  const a=await h.artist(),b=await h.artist(),c=await config(a);
  const collection=await h.prisma.artistCollection.create({data:{artistId:a.id,title:'Moja kolekcija'}});
  const foreign=await h.prisma.artistCollection.create({data:{artistId:b.id,title:'Privatna kolekcija'}});
  await h.prisma.artwork.update({where:{id:a.work.id},data:{artistCollectionId:collection.id,collectionOrderIndex:2}});
  const w=await h.prisma.artwork.create({data:{artistId:a.id,title:'Prvi u kolekciji',imageUrl:'https://storage.invalid/order.png',artistCollectionId:collection.id,collectionOrderIndex:0,orderIndex:7}});
  const d=await h.service.get(a.account.id);assert.deepEqual(d.source.collections,[{id:collection.id,title:'Moja kolekcija',artworkIds:[w.id,a.work.id]}]);assert.equal(d.source.works[0].id,a.work.id);
  const chosen={...c,template:6,publicationTitle:'My collection',sourceCollectionId:collection.id,artworkIds:[w.id,a.work.id]};
  assert.equal((await h.request('/draft',a,'PUT',{config:chosen,revision:0})).status,200);
  const revision=(await h.service.get(a.account.id)).draft.revision;
  for(const patch of [{sourceCollectionId:foreign.id},{sourceCollectionId:randomUUID()},{artworkIds:[b.work.id]}]){
    assert.equal((await generate(a,{...chosen,...patch})).status,404);
    assert.equal((await h.request('/draft',a,'PUT',{config:{...chosen,...patch},revision})).status,404);
  }
  const outside=await h.prisma.artwork.create({data:{artistId:a.id,title:'Van kolekcije',imageUrl:'https://storage.invalid/outside.png'}});
  assert.equal((await generate(a,{...chosen,artworkIds:[outside.id]})).status,404);
  assert.equal(await h.prisma.promotionGeneration.count({where:{artistAccountId:a.account.id}}),0);
  assert.equal((await h.service.get(a.account.id)).draft.revision,revision);
  const restore=await fastRenderer();try{const r=await generate(a,chosen);assert.equal(r.status,201);await work();const row=await h.prisma.promotionGeneration.findUnique({where:{id:r.data.id}});assert.deepEqual(row.snapshot.config.artworkIds,[w.id,a.work.id]);assert.equal(row.snapshot.source.collections,undefined);}finally{restore();}
});

test('Panorama limits and crop validation run before writes and reservations; drafts preserve selections for review',async()=>{
  const a=await h.artist(),c={...await config(a),template:9};
  const w=await h.prisma.artwork.create({data:{artistId:a.id,title:'Drugi',imageUrl:'https://storage.invalid/second.png'}});
  assert.equal((await generate(a,{...c,artworkIds:[a.work.id,w.id]})).status,400);
  assert.equal((await h.request('/draft',a,'PUT',{config:{...c,artworkIds:[a.work.id,w.id]},revision:0})).status,200);
  for(const crop of [{fit:'bad',zoom:1,x:50,y:50},{fit:'contain',zoom:0,x:50,y:50},{fit:'cover',zoom:4,x:50,y:50},{fit:'cover',zoom:1,x:-1,y:50},{fit:'contain',zoom:1,x:50,y:101},{fit:'contain',zoom:1,x:'20',y:50}])assert.equal((await generate(a,{...c,panoramaCrop:crop})).status,400);
  const more=[a.work.id,w.id];for(let i=0;i<5;i++)more.push((await h.prisma.artwork.create({data:{artistId:a.id,title:'Kolaž '+i,imageUrl:`https://storage.invalid/collage-${i}.png`}})).id);
  assert.equal((await generate(a,{...c,version:1,artworkIds:more})).status,400);
  assert.equal(await h.prisma.promotionGeneration.count({where:{artistAccountId:a.account.id}}),0);assert.equal((await h.service.get(a.account.id)).usage.reserved,0);
  const crop={fit:'cover',zoom:1.5,x:23,y:67};assert.equal((await h.request('/draft',a,'PUT',{config:{...c,panoramaCrop:crop},revision:1})).status,200);assert.deepEqual((await h.service.get(a.account.id)).draft.config.panoramaCrop,crop);
});

test('per-artwork edits are validated, private, saved and exported as an immutable snapshot',async()=>{
  const a=await h.artist(),b=await h.artist(),c=await sliderConfig(a),crop={fit:'contain',zoom:1.4,x:25,y:80};
  for(const artworkEdits of [[{artworkId:b.work.id,title:'Tuđe'}],[{artworkId:a.work.id,title:'x'.repeat(181)}],[{artworkId:a.work.id,description:'loš\nred'}],[{artworkId:a.work.id,crop:{...crop,zoom:4}}],[{artworkId:a.work.id,title:'A'},{artworkId:a.work.id,title:'B'}]]){
    assert.equal((await generate(a,{...c,artworkEdits})).status,400);assert.equal((await h.request('/draft',a,'PUT',{config:{...c,artworkEdits},revision:0})).status,400);
  }
  assert.equal(await h.prisma.promotionGeneration.count({where:{artistAccountId:a.account.id}}),0);assert.equal((await h.service.get(a.account.id)).usage.reserved,0);
  const original=await h.prisma.artwork.findUnique({where:{id:a.work.id}}),artworkEdits=[{artworkId:a.work.id,title:'Naslov objave',description:'Opis samo u objavi',crop}];
  assert.equal((await h.request('/draft',a,'PUT',{config:{...c,artworkEdits},revision:0})).status,200);assert.deepEqual((await config(a)).artworkEdits,artworkEdits);
  const restore=await fastRenderer();try{const result=await generate(a,{...c,artworkEdits});assert.equal(result.status,201);await work();const row=await h.prisma.promotionGeneration.findUnique({where:{id:result.data.id}});assert.equal(row.snapshot.rendererVersion,8);assert.deepEqual(row.snapshot.config.artworkEdits,artworkEdits);assert.deepEqual(await h.prisma.artwork.findUnique({where:{id:a.work.id}}),original);}finally{restore();}
});

test('zooming out is validated, saved and exported for artworks and Panorama without changing originals',async()=>{
  const restore=await fastRenderer();try{
    for(const panorama of [false,true]){
      const a=await h.artist('PREMIUM'),base=await config(a),original=await h.prisma.artwork.findUnique({where:{id:a.work.id}});
      for(const zoom of [0,0.24,-1,3.01]){
        const c={...base,template:panorama?9:0,...(panorama?{panoramaCrop:{fit:'contain',zoom,x:50,y:50}}:{artworkEdits:[{artworkId:a.work.id,crop:{fit:'contain',zoom,x:50,y:50}}]})};
        assert.equal((await generate(a,c)).status,400);assert.equal((await h.request('/draft',a,'PUT',{config:c,revision:0})).status,400);
      }
      assert.equal(await h.prisma.promotionGeneration.count({where:{artistAccountId:a.account.id}}),0);assert.equal((await h.service.get(a.account.id)).usage.reserved,0);
      const crop={fit:'contain',zoom:panorama?0.25:0.6,x:30,y:70},c={...base,template:panorama?9:0,...(panorama?{panoramaCrop:crop}:{artworkEdits:[{artworkId:a.work.id,crop}]})};
      assert.equal((await h.request('/draft',a,'PUT',{config:c,revision:0})).status,200);
      const saved=await config(a);assert.deepEqual(panorama?saved.panoramaCrop:saved.artworkEdits[0].crop,crop);
      const output=await generate(a,c);assert.equal(output.status,201);await work();
      const row=await h.prisma.promotionGeneration.findUnique({where:{id:output.data.id}});assert.equal(row.status,'READY');assert.deepEqual(panorama?row.snapshot.config.panoramaCrop:row.snapshot.config.artworkEdits[0].crop,crop);
      assert.deepEqual(await h.prisma.artwork.findUnique({where:{id:a.work.id}}),original);
    }
  }finally{restore();}
});

test('Slider requires two works and a real publication heading before any write or quota reservation',async()=>{
  const a=await h.artist(),c=await sliderConfig(a);
  for(const publicationTitle of [undefined,'','   ','Lorem ipsum','LOREM IPSUM!','a'.repeat(181),'Naslov\nred']){
    assert.equal((await generate(a,{...c,publicationTitle})).status,400);
  }
  assert.equal((await generate(a,{...c,artworkIds:c.artworkIds.slice(0,1)})).status,400);
  assert.equal(await h.prisma.promotionGeneration.count({where:{artistAccountId:a.account.id}}),0);assert.equal((await h.service.get(a.account.id)).usage.reserved,0);
  assert.equal((await h.request('/draft',a,'PUT',{config:{...c,publicationTitle:''},revision:0})).status,200);
  const named={...c,publicationTitle:'Serija radova'};const restore=await fastRenderer();try{const result=await generate(a,named);assert.equal(result.status,201);await work();const row=await h.prisma.promotionGeneration.findUnique({where:{id:result.data.id}});assert.equal(row.snapshot.config.publicationTitle,named.publicationTitle);assert.equal(row.snapshot.rendererVersion,8);assert.equal(selected(row.snapshot.config).slides,4);}finally{restore();}
});

test('Gallery requires three works and exports five/six/seven works as two/two/three private frames',async()=>{
  const a=await h.artist('PREMIUM'),c={...await config(a),template:3};
  for(let i=1;i<7;i++)c.artworkIds.push((await h.prisma.artwork.create({data:{artistId:a.id,title:'Gallery '+i,imageUrl:`https://storage.invalid/gallery-${i}.png`}})).id);
  for(const n of [0,1,2])assert.equal((await generate(a,{...c,artworkIds:c.artworkIds.slice(0,n)})).status,400);
  assert.equal((await h.service.get(a.account.id)).usage.reserved,0);
  const restore=await fastRenderer();try{for(const n of [5,6,7]){const result=await generate(a,{...c,artworkIds:c.artworkIds.slice(0,n)});assert.equal(result.status,201);await work();const row=await h.prisma.promotionGeneration.findUnique({where:{id:result.data.id},include:{files:true}});assert.equal(row.snapshot.rendererVersion,8);assert.equal(row.files.length,Math.ceil(n/3));assert.equal(result.data.design.slides,Math.ceil(n/3));}assert.equal((await h.service.get(a.account.id)).usage.used,3);}finally{restore();}
});

test('Collage snapshots retain collection and manual headings independently of artwork titles',async()=>{
  const a=await h.artist('PREMIUM'),collection=await h.prisma.artistCollection.create({data:{artistId:a.id,title:'Moja kolekcija'}});
  await h.prisma.artwork.update({where:{id:a.work.id},data:{artistCollectionId:collection.id,collectionOrderIndex:0}});
  const base={...await config(a),template:9,version:1,sourceCollectionId:collection.id,collectionTitle:collection.title};
  const restore=await fastRenderer();try{let revision=0;for(const publicationTitle of ['', 'Rucni naslov']){
    const c={...base,publicationTitle};assert.equal((await h.request('/draft',a,'PUT',{config:c,revision:revision++})).status,200);
    const result=await generate(a,c);assert.equal(result.status,201);await work();const row=await h.prisma.promotionGeneration.findUnique({where:{id:result.data.id}});assert.equal(row.snapshot.rendererVersion,9);
    const html=graphicHTML(row.snapshot,2);assert(html.includes(publicationTitle||collection.title));assert(!html.includes('Izolovani rad'));assert.equal(row.snapshot.source.collections,undefined);
  }}finally{restore();}
});
test('Free concurrent requests reserve only once; same operation and identical config reuse output',async()=>{
  const restore=await fastRenderer();try{
    const a=await h.artist(),c=await config(a),key=randomUUID();
    const first=await generate(a,c,key);
    const results=[first,...await Promise.all([generate(a,c,key),generate(a,c,key),generate(a,c)])];
    assert(results.every(r=>r.status===201));assert.equal(new Set(results.map(r=>r.data.id)).size,1);
    const id=results[0].data.id;
    assert.equal((await h.request('',a)).data.usage.reserved,1);
    assert.equal((await generate(a,{...c,title:'Nova konfiguracija'})).status,403);
    assert.equal((await generate(a,{...c,title:'Drugi sadržaj'},key)).status,409);
    await work();assert.equal((await h.request(`/generations/${id}`,a)).data.status,'READY');
    assert.equal((await h.request('',a)).data.usage.used,1);
    assert.equal((await generate(a,c)).data.id,id);
    assert.equal((await h.request(`/generations/${id}`,await h.artist())).status,404);
    assert.equal((await h.request(`/generations/${id}/download/bundle`,null)).status,401);
    const one=await h.request(`/generations/${id}/download/bundle`,a),two=await h.request(`/generations/${id}/download/bundle`,a);
    assert.equal(one.status,200);assert.deepEqual(one.data,two.data);assert.equal((await h.request('',a)).data.usage.used,1);
  }finally{restore();}
});
test('storage and render failure release reservations; no partially complete file manifest',async()=>{
  const restore=await fastRenderer();try{
    const a=await h.artist(),c=await sliderConfig(a);
    const job=await generate(a,c);h.storage.fail=true;await work();h.storage.fail=false;
    assert.equal((await h.request(`/generations/${job.data.id}`,a)).data.status,'FAILED');
    assert.equal((await h.request('',a)).data.usage.remaining,1);
    assert.equal(await h.prisma.promotionGeneratedFile.count({where:{generationId:job.data.id}}),0);
    assert.equal((await h.request(`/generations/${job.data.id}/download/bundle`,a)).status,404);
    const retry=await generate(a,c);await work();assert.equal((await h.request(`/generations/${retry.data.id}`,a)).data.status,'READY');
  }finally{h.storage.fail=false;restore();}
});
test('Premium 10 per real monthly window; purchased credits used only afterwards and never expire',async()=>{
  const restore=await fastRenderer();try{
    const a=await h.artist('PREMIUM'),c=await config(a),purchase=await h.prisma.portfolioPurchase.create({data:{artistAccountId:a.account.id,product:'GENERATOR_PACK',status:'PAID',amountCents:490,currency:'EUR',paidAt:new Date(),snapshot:{credits:10},snapshotHash:'a'.repeat(64)}});
    // Isolated fixture credit: settlement validation is tested separately below.
    await h.prisma.promotionCreditLedger.create({data:{artistAccountId:a.account.id,purchaseId:purchase.id,credits:10,createdAt:new Date('2020-01-01')}});
    for(let i=0;i<11;i++){const r=await h.service.generate(a.account.id,{config:{...c,title:'Objava '+i},operationKey:randomUUID()});await work();assert.equal((await h.prisma.promotionGeneration.findUnique({where:{id:r.id}})).kind,i<10?'PREMIUM':'PAID');}
    const d=await h.service.get(a.account.id);assert.equal(d.usage.used,10);assert.equal(d.usage.purchased,9);
    await h.prisma.artistSubscription.update({where:{artistAccountId:a.account.id},data:{status:'EXPIRED',currentPeriodEnd:new Date(Date.now()-1000)}});
    const former=await h.service.get(a.account.id);assert.equal(former.usage.purchased,9);assert.equal(former.history.total,11);
    assert.equal((await h.request(`/generations/${former.history.items[0].id}/download/bundle`,a)).status,200);
  }finally{restore();}
});
test('purchase intents idempotent; unverified/failed payment cannot credit; duplicate verified hook grants exactly 10',async()=>{
  const {PromotionPurchaseService}=require('../src/modules/promotions/promotion-purchase.service'),p=h.app.get(PromotionPurchaseService),a=await h.artist(),key=randomUUID();
  const first=await p.intent(a.account.id,key),second=await p.intent(a.account.id,key);assert.equal(first.id,second.id);assert.equal(first.amountCents,490);assert.equal(first.checkoutAvailable,false);
  await assert.rejects(h.prisma.$transaction(tx=>p.creditVerifiedPurchase(tx,first.id)));
  await h.prisma.portfolioPurchase.update({where:{id:first.id},data:{status:'FAILED'}});
  await assert.rejects(h.prisma.$transaction(tx=>p.creditVerifiedPurchase(tx,first.id)));
  await h.prisma.portfolioPurchase.update({where:{id:first.id},data:{status:'PAID',paidAt:new Date(),provider:'isolated-provider',providerPaymentRef:randomUUID()}});
  await h.prisma.portfolioPaymentEvent.create({data:{purchaseId:first.id,provider:'isolated-provider',deduplicationKey:randomUUID(),payloadHash:'b'.repeat(64),status:'VERIFIED',verifiedAt:new Date()}});
  await h.prisma.$transaction(async tx=>{await p.creditVerifiedPurchase(tx,first.id);await p.creditVerifiedPurchase(tx,first.id);});
  assert.equal(await h.prisma.promotionCreditLedger.count({where:{purchaseId:first.id}}),1);
  assert.equal((await h.service.get(a.account.id)).usage.purchased,10);
});
test('worker interruption recovery, fencing and terminal snapshot immutability',async()=>{
  const restore=await fastRenderer();try{
    const a=await h.artist(),c=await config(a),r=await generate(a,c);
    await h.prisma.promotionGeneration.update({where:{id:r.data.id},data:{status:'PROCESSING',leaseToken:randomUUID(),leaseUntil:new Date(Date.now()-1000),attempts:1}});
    await work();assert.equal((await h.service.version(a.account.id,r.data.id)).status,'READY');
    await assert.rejects(h.prisma.promotionGeneration.update({where:{id:r.data.id},data:{snapshot:{name:'Changed'}}}));
    await assert.rejects(h.prisma.promotionGeneration.update({where:{id:r.data.id},data:{status:'FAILED'}}));
  }finally{restore();}
});
test('all catalog graphics compile; dynamic text is escaped and all slides have own order',async()=>{
  const a=await h.artist(),d=await h.service.get(a.account.id);let count=0;
  for(let template=0;template<catalog.templates.length;template++)for(let version=0;version<catalog.templates[template].vers.length;version++)for(const color of ['light','dark']){
    const c={...d.draft.config,template,version,color,name:'<script>bad()</script>',title:'<img onerror=x>',description:'<b>tekst</b>'},s={config:c,source:d.source};
    for(let slide=0;slide<selected(c).slides;slide++){const html=graphicHTML(s,slide);assert(!html.includes('<script>'));assert(!html.includes('<img onerror'));assert(html.includes('data-ab-stage'));count++;}
  }assert.equal(count,74);
});
test('real Chrome output is native 1080×1440 PNG and carousel bundle contains ordered distinct slides',async()=>{
  const a=await h.artist('PREMIUM'),c=await config(a);c.template=6;c.publicationTitle='Test publication';
  for(let i=1;i<3;i++){const w=await h.prisma.artwork.create({data:{artistId:a.id,title:`Rad ${i+1}`,imageUrl:`https://storage.invalid/slajd-${i}.png`,orderIndex:i}});c.artworkIds.push(w.id);}
  const r=await generate(a,c);await work();const row=await h.prisma.promotionGeneration.findUnique({where:{id:r.data.id},include:{files:{orderBy:{slide:'asc'}}}});
  assert.equal(row.status,'READY');assert.equal(row.files.length,5);assert.equal(row.snapshot.rendererVersion,8);
  const sharp=require('sharp'),hashes=[];for(const f of row.files){const body=h.storage.objects.get(f.storagePath),meta=await sharp(body).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,1440);assert.equal(meta.format,'png');hashes.push(createHash('sha256').update(body).digest('hex'));}
  assert.equal(new Set(hashes).size,5);
  const zip=await h.request(`/generations/${row.id}/download/bundle`,a);assert.equal(zip.data.readUInt32LE(0),0x04034b50);assert.equal(zip.data.readUInt16LE(zip.data.length-12),5);assert(zip.data.indexOf(Buffer.from('-03.png'))<zip.data.indexOf(Buffer.from('-04.png')));
});

test('Panorama generates three private PNGs and one ordered ZIP for a single quota charge',async()=>{
  for(const [version,color] of [[0,'dark'],[1,'light'],[1,'dark']]){
    const a=await h.artist(),c={...await config(a),template:9,version,color};
    if(version===1){const w=await h.prisma.artwork.create({data:{artistId:a.id,title:'Drugi rad',imageUrl:'https://storage.invalid/panorama-second.png',orderIndex:1}});c.artworkIds.push(w.id);}
    const r=await generate(a,c);assert.equal(r.status,201);assert.equal(r.data.design.slides,3);
    await work();const row=await h.prisma.promotionGeneration.findUnique({where:{id:r.data.id},include:{files:{orderBy:{slide:'asc'}}}});
    assert.equal(row.status,'READY');assert.equal(row.snapshot.rendererVersion,version===1?9:6);assert.deepEqual(row.snapshot.config.artworkIds,c.artworkIds);assert.equal(row.files.length,3);
    const sharp=require('sharp'),hashes=[];
    for(const [i,f] of row.files.entries()){
      assert.equal(f.slide,i);const body=h.storage.objects.get(f.storagePath),meta=await sharp(body).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,1440);assert.equal(meta.format,'png');hashes.push(createHash('sha256').update(body).digest('hex'));
    }
    // The isolated source image is a flat color. Its first two filled crops
    // may be identical; the signed closing crop is distinct.
    assert(new Set(hashes).size>=(version===0?2:3));
    const zip=await h.request(`/generations/${row.id}/download/bundle`,a);assert.equal(zip.status,200);assert.equal(zip.data.readUInt16LE(zip.data.length-12),3);
    assert(zip.data.indexOf(Buffer.from('-01.png'))<zip.data.indexOf(Buffer.from('-02.png')));assert(zip.data.indexOf(Buffer.from('-02.png'))<zip.data.indexOf(Buffer.from('-03.png')));
    assert.equal((await h.service.get(a.account.id)).usage.used,1);
    assert.equal((await generate(a,c)).data.id,row.id);assert.equal((await h.request(`/generations/${row.id}/download/bundle`,a)).status,200);assert.equal((await h.service.get(a.account.id)).usage.used,1);
  }
});
test('two different simultaneous Free configurations cannot reserve the same entitlement',async()=>{
  const restore=await fastRenderer();try{const a=await h.artist(),c=await config(a),r=await Promise.all([generate(a,{...c,title:'A'}),generate(a,{...c,title:'B'})]);assert.deepEqual(r.map(x=>x.status).sort(),[201,403]);await work();assert.equal((await h.service.get(a.account.id)).usage.used,1);}finally{restore();}
});
test('partial carousel storage failure commits no files and no charge',async()=>{
  const restore=await fastRenderer();try{
    const a=await h.artist(),c=await sliderConfig(a);const r=await generate(a,c);
    h.generator.generate=async(s,onSlide)=>{await onSlide(h.image,0);await onSlide(h.image,1);throw Error('Last slide failed');};
    await work();assert.equal((await h.service.version(a.account.id,r.data.id)).status,'FAILED');assert.equal((await h.service.get(a.account.id)).usage.remaining,1);assert.equal(await h.prisma.promotionGeneratedFile.count({where:{generationId:r.data.id}}),0);
  }finally{restore();}
});
test('Premium quota renews at the subscription monthly anchor without carrying unused allowance',async()=>{
  const restore=await fastRenderer();try{
    const a=await h.artist('PREMIUM'),now=new Date(),start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,15)),end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+2,15));
    const sub=await h.prisma.artistSubscription.update({where:{artistAccountId:a.account.id},data:{currentPeriodStart:start,currentPeriodEnd:end}});
    const c=await config(a);await generate(a,c);await work();assert.equal((await h.service.get(a.account.id)).usage.used,1);
    const {promotionUsage}=require('../src/modules/promotions/promotion.access');
    const future=await promotionUsage(h.prisma,a.account.id,sub,new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,16)));
    assert.equal(future.used,0);assert.equal(future.remaining,10);assert.equal(new Date(future.periodStart).getUTCDate(),15);
  }finally{restore();}
});
test('replaced source image creates a new immutable snapshot, old download remains unchanged',async()=>{
  const restore=await fastRenderer();try{
    const a=await h.artist('PREMIUM'),c=await config(a),one=await generate(a,c);await work();
    const before=await h.request(`/generations/${one.data.id}/download/bundle`,a);
    await h.prisma.artwork.update({where:{id:a.work.id},data:{imageUrl:'https://storage.invalid/replaced.png'}});
    const two=await generate(a,c);assert.notEqual(two.data.id,one.data.id);assert.notEqual(two.data.contentKey,one.data.contentKey);await work();
    assert.deepEqual((await h.request(`/generations/${one.data.id}/download/bundle`,a)).data,before.data);
  }finally{restore();}
});
test('concurrent workers fence an expired lease: only the current worker can publish files and charge',async()=>{
  const real=h.generator.generate;let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
  try{
    const a=await h.artist(),c=await config(a),r=await generate(a,c);
    h.generator.generate=async(s,onSlide)=>{entered();await gate;await onSlide(h.image,0);};
    h.service.stopped=false;const oldWorker=h.service.tick();await started;
    await h.prisma.promotionGeneration.update({where:{id:r.data.id},data:{leaseUntil:new Date(Date.now()-1000)}});
    const {PromotionsService}=require('../src/modules/promotions/promotions.service'),{PromotionStorage}=require('../src/modules/promotions/promotion.storage');
    const second=new PromotionsService(h.prisma,h.app.get(PromotionStorage),{available:true,generate:async(s,onSlide)=>onSlide(h.image,0)});
    await second.tick();release();await oldWorker;h.service.stopped=true;
    assert.equal((await h.service.version(a.account.id,r.data.id)).status,'READY');assert.equal(await h.prisma.promotionGeneratedFile.count({where:{generationId:r.data.id}}),1);assert.equal((await h.service.get(a.account.id)).usage.used,1);
  }finally{release?.();h.generator.generate=real;h.service.stopped=true;}
});
test('existing verified commerce settlement atomically grants Generator pack; duplicate and failed callbacks cannot add more',async()=>{
  const {PortfolioCommerceService}=require('../src/modules/portfolio-projects/portfolio-commerce.service'),{PromotionPurchaseService}=require('../src/modules/promotions/promotion-purchase.service');
  const a=await h.artist(),p=await h.app.get(PromotionPurchaseService).intent(a.account.id,randomUUID()),commerce=h.app.get(PortfolioCommerceService),proof={purchaseId:p.id,provider:'allsecure',eventId:randomUUID(),paymentRef:randomUUID(),amountCents:490,currency:'EUR',payloadHash:'c'.repeat(64)};
  await assert.rejects(commerce.confirmVerifiedPayment({...proof,amountCents:1}));assert.equal((await h.service.get(a.account.id)).usage.purchased,0);
  await commerce.confirmVerifiedPayment(proof);await commerce.confirmVerifiedPayment(proof);await commerce.recordVerifiedPaymentFailure({...proof,eventId:randomUUID()});
  assert.equal((await h.service.get(a.account.id)).usage.purchased,10);assert.equal(await h.prisma.promotionCreditLedger.count({where:{purchaseId:p.id}}),1);
  await assert.rejects(commerce.adminPreview(p.id),/PDF/);
});
