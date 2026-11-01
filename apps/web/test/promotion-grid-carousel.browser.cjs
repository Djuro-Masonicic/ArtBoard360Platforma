// Historical reference checks use the pre-revision renderer explicitly.
// Compare all three Grid layouts with the supplied Blue/Red, Light/Dark HTML.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test'),{PNG}=require('pngjs'),QRCode=require('qrcode'),jsQR=require('jsqr');
const {createElement,Fragment}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {graphicHTML,selected,initialState,view,renderUi}=require('@artboard/promotion-renderer');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'.tmp/promotion-grid-carousel');
const artifact=fs.readFileSync(path.join(root,'apps/web/references/promotion-grid-carousel-artifact-20261031.html'),'utf8');
const references=[...artifact.matchAll(/9([c-f]) · Grid Carousel[^\r\n]+\s*(<div[\s\S]*?)(?=\s*9[c-f] · Grid Carousel|$)/g)];assert.equal(references.length,4);
// The 9e heading repeats 9d HTML; the 9f heading actually contains 9e HTML.
// Match the actual carousel identity, without fabricating a missing 9f reference.
const layouts=new Map(references.map(m=>[m[2].match(/data-carousel="([^"]+)"/)[1],m[2]]));
assert.deepEqual([...layouts.keys()],['9c','9d','9e']);
const images=Array.from({length:5},(_,i)=>'data:image/svg+xml;base64,'+Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440"><rect width="1080" height="1440" fill="hsl(${i*65},65%,50%)"/><circle cx="${220+i*100}" cy="450" r="170" fill="#223344"/></svg>`).toString('base64'));
const selection=[2,0,4],ordered=selection.map(i=>images[i]);
const logos=require('@artboard/promotion-renderer/logos.json');
const blobs={'9784c36244e5944c057870da95433d25':ordered[0],'a68587b30b0b9d20d2a9f1712407f43f':ordered[1],'18203b2c88c6fc9ed564c29045d1a3ae':ordered[2],'51646fe20d9e1771015b5b48ddc60c50':ordered[0],'0af2f22e83758b112a2720ff62c76c06':ordered[1],'9d94ee9219b36b4636a3067bb451deaf':logos['7d46f021-b7ad-4403-973e-79a2339d1927'],'842695d74fbd2ea6d690237eb8c07ecf':logos['50c5489b-bab1-45a6-89b3-c4217bd117a1']};
const profileUrl='https://example.test/umjetnik/tijana',q=QRCode.create(profileUrl,{errorCorrectionLevel:'Q'}),n=q.modules.size;let qrPath='';
for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.modules.get(y,x))qrPath+=`M${x+4} ${y+4}h1v1h-1z`;
const source={name:'Tijana Marković',avatar:null,form:'f',profileUrl,shortUrl:profileUrl.replace('https://',''),qrPath,qrView:`0 0 ${n+8} ${n+8}`,works:images.map((imageUrl,i)=>({id:'work-'+i,title:'Lorem ipsum',imageUrl}))};
const config={artworkIds:selection.map(i=>'work-'+i),template:8,version:0,color:'light',language:'ME',name:source.name,instagram:'@mawatitaa',title:null,collectionTitle:'Lorem ipsum',description:'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',signature:'instagram'};
const usage={plan:'FREE',used:0,reserved:0,limit:1,remaining:1,purchased:0};
const fonts=[[400,'Regular'],[500,'Medium'],[600,'SemiBold'],[700,'Bold'],[800,'Black']].map(([weight,name])=>`@font-face{font-family:Alcyone;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(root,'apps/web/app/fonts',`Alcyone-${name}.woff2`)).toString('base64')});font-weight:${weight}}`).join('');
const document=body=>`<!doctype html><html><head><meta charset="utf-8"><style>${fonts}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1440px;overflow:hidden;font-family:Alcyone,sans-serif;color:#111318}body>[data-ab-stage]{width:1080px!important;height:1440px!important;--s:1;border-radius:0!important;box-shadow:none!important}</style></head><body>${body}</body></html>`;
const workImages=html=>[...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m=>m[1]).filter(src=>images.includes(src));
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1440}}),results=[],errors=[];let qrDecoded=0;
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  async function load(markup){await page.setContent(document(markup));await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))});}
  for(let t=0;t<4;t++){
   const c={...config,version:Math.floor(t/2),color:t%2?'dark':'light'},code='9'+'cdef'[t];assert.equal(selected(c).code,code);assert.equal(selected(c).slides,3);
   let frames=null;
   if(layouts.has(code)){
    const reference=layouts.get(code).replace(/\/_blob\/([a-f0-9]+)/g,(_,id)=>{assert(blobs[id],id);return blobs[id]}).replace(/viewBox="[^"]*"/g,`viewBox="${source.qrView}"`).replace(/ d="[^"]*"/g,` d="${qrPath}"`);
    await load(reference);frames=await page.locator('[data-slide]').evaluateAll(slides=>slides.map(el=>el.outerHTML));assert.equal(frames.length,3);
   }
   for(let slide=0;slide<3;slide++){
    let expected=null;if(frames){await load(frames[slide]);expected=await page.screenshot({animations:'disabled'});}
    const html=graphicHTML({config:c,source,rendererVersion:7},slide);await load(html);const actual=await page.screenshot({animations:'disabled'});
    fs.writeFileSync(path.join(out,`${code}-${slide+1}-actual.png`),actual);
    const a=PNG.sync.read(actual);let differentPixels=null;
    if(expected){
     fs.writeFileSync(path.join(out,`${code}-${slide+1}-reference.png`),expected);
     const e=PNG.sync.read(expected);differentPixels=0;
     for(let p=0;p<a.data.length;p+=4)if(a.data.subarray(p,p+4).compare(e.data.subarray(p,p+4)))differentPixels++;
     assert.equal(differentPixels,0,code+' slide '+(slide+1)+' differs from reference');
    }
    results.push({code,slide:slide+1,width:a.width,height:a.height,differentPixels,referenceAvailable:Boolean(expected)});
    assert.deepEqual(workImages(html),slide===2?[ordered[2],ordered[0],ordered[1]]:[ordered[slide]],'The active work leads its slide');
    if(slide===2){const qr=PNG.sync.read(await page.locator('svg').screenshot());assert.equal(jsQR(new Uint8ClampedArray(qr.data),qr.width,qr.height,{inversionAttempts:'attemptBoth'})?.data,profileUrl);qrDecoded++;}
    const v=view(c.color,{...initialState(c,source,usage),slide,tab:0},source,()=>{},{history:[]},usage,7);
    await load(renderToStaticMarkup(renderUi(c.color,v,createElement,Fragment)));assert.equal(await page.locator('[data-ab="promo-versions"] button[aria-pressed]').count(),2);
    const liveMarkup=await page.locator('[data-ab="promo-swipe"]>[data-ab-stage]').evaluate(el=>el.outerHTML);await load(liveMarkup);
    assert.equal(PNG.sync.read(await page.screenshot({animations:'disabled'})).data.compare(a.data),0,'Live preview must match export');
   }
   for(const count of [1,2,5]){
    const many={...c,artworkIds:source.works.slice(0,count).map(w=>w.id)};assert.equal(selected(many).slides,count);
    for(let i=0;i<count;i++)assert.equal(workImages(graphicHTML({config:many,source,rendererVersion:7},i))[0],images[i],'No active work may be skipped');
   }
   const custom={...c,name:'Druga umjetnica',instagram:'@druga',title:'Naziv pojedinačnog rada',collectionTitle:'Ručni naslov',description:'Opis za moj rad.'};
   const middle=graphicHTML({config:custom,source,rendererVersion:7},1),end=graphicHTML({config:custom,source,rendererVersion:7},2);
   assert(middle.includes('Ručni naslov')&&middle.includes('Opis za moj rad.')&&middle.includes('@druga'));
   assert(!middle.includes(config.description)&&!middle.includes('@mawatitaa'));
   assert(end.includes('Druga umjetnica')&&!end.includes(source.name));
   assert(!graphicHTML({config:{...c,description:''},source,rendererVersion:7},1).includes(config.description));
  }
  for(const theme of ['light','dark']){
   const c={...config,template:0,color:theme},v=view(theme,{...initialState(c,source,usage),tab:0},source,()=>{},{history:[]},usage,7);await load(renderToStaticMarkup(renderUi(theme,v,createElement,Fragment)));
   const card=page.getByRole('button').filter({has:page.getByText('Grid Carousel',{exact:true})});assert.equal(await card.getAttribute('aria-pressed'),'false');
   const thumbnailImages=await card.locator('img').evaluateAll(imgs=>imgs.map(i=>i.src));assert.deepEqual(thumbnailImages.filter(src=>images.includes(src)),[ordered[0]]);
   await card.screenshot({path:path.join(out,'unselected-'+theme+'.png')});
  }
  assert.deepEqual(errors,[]);const report={results,livePreviewMatches:12,qrDecoded,unselectedCardThemes:2,errors};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
