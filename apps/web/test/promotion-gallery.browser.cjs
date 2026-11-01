// Historical reference checks use the pre-revision renderer explicitly.
// Gallery references use the same fixture artworks, QR and fonts on both sides.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test'),{PNG}=require('pngjs'),QRCode=require('qrcode'),jsQR=require('jsqr');
const {createElement,Fragment}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {graphicHTML,selected,view,initialState,renderUi}=require('@artboard/promotion-renderer');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'.tmp/promotion-gallery');
const artifact=fs.readFileSync(path.join(root,'apps/web/references/promotion-gallery-artifact-20261031.html'),'utf8');
const references=[...artifact.matchAll(/4([a-f]) · Gallery[^\r\n]+\s*(<div[\s\S]*?)(?=\s*4[a-f] · Gallery|$)/g)];assert.equal(references.length,6);
const images=Array.from({length:9},(_,i)=>'data:image/svg+xml;base64,'+Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440"><rect width="1080" height="1440" fill="hsl(${i*40},65%,50%)"/><circle cx="${200+i*60}" cy="450" r="150" fill="#223344"/></svg>`).toString('base64'));
const logos=require('@artboard/promotion-renderer/logos.json');
const logoBlobs={'9d94ee9219b36b4636a3067bb451deaf':logos['7d46f021-b7ad-4403-973e-79a2339d1927'],'842695d74fbd2ea6d690237eb8c07ecf':logos['50c5489b-bab1-45a6-89b3-c4217bd117a1'],'1bdc45cf08e486cae7ec3636c955a240':logos['6cc1ee7b-1ee9-4ff4-af76-94da81ce8d2e']};
const profileUrl='https://example.test/umjetnik/tijana',q=QRCode.create(profileUrl,{errorCorrectionLevel:'Q'}),n=q.modules.size;let qrPath='';
for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.modules.get(y,x))qrPath+=`M${x+4} ${y+4}h1v1h-1z`;
const source={name:'Tijana Marković',avatar:null,form:'f',year:2026,profileUrl,shortUrl:profileUrl.replace('https://',''),qrPath,qrView:`0 0 ${n+8} ${n+8}`,works:images.map((imageUrl,i)=>({id:'work-'+i,title:i===3?'Lorem ipsum':'Rad '+i,imageUrl}))};
const selection=[3,0,8,1,6,2,7,4,5],ordered=selection.map(i=>images[i]);
const baseConfig={artworkIds:selection.map(i=>'work-'+i),template:3,version:0,color:'light',language:'ME',name:source.name,instagram:'@mawatitaa',title:null,description:'',signature:'instagram'};
const usage={plan:'FREE',used:0,reserved:0,limit:1,remaining:1,purchased:0};
const fonts=[[400,'Regular'],[500,'Medium'],[600,'SemiBold'],[700,'Bold'],[800,'Black']].map(([weight,name])=>`@font-face{font-family:Alcyone;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(root,'apps/web/app/fonts',`Alcyone-${name}.woff2`)).toString('base64')});font-weight:${weight}}`).join('');
const document=body=>`<!doctype html><html><head><meta charset="utf-8"><style>${fonts}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1440px;overflow:hidden;font-family:Alcyone,sans-serif;color:#111318}body>[data-ab-stage]{width:1080px!important;height:1440px!important;--s:1;border-radius:0!important;box-shadow:none!important}</style></head><body>${body}</body></html>`;
const workImages=html=>[...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m=>m[1]).filter(src=>images.includes(src));
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1440}}),results=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  async function load(markup){await page.setContent(document(markup));await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))});}
  for(let i=0;i<6;i++){
   const config={...baseConfig,version:Math.floor(i/2),color:i%2?'dark':'light'},code='4'+references[i][1];assert.equal(selected(config).code,code);assert.equal(selected(config,7).slides,9);
   let imageIndex=0;
   const reference=references[i][2].replace(/\/_blob\/([a-f0-9]+)/g,(_,id)=>logoBlobs[id]||ordered[imageIndex++]).replace(/viewBox="[^"]*"/g,`viewBox="${source.qrView}"`).replace(/ d="[^"]*"/g,` d="${qrPath}"`).replaceAll('art-board.me/umjetnik/tijana-markovic',source.shortUrl);
   const count=[3,9,5][config.version];assert.equal(imageIndex,count);
   await load(reference);const expected=await page.screenshot({animations:'disabled'});
   await load(graphicHTML({config,source,rendererVersion:7}));const actual=await page.screenshot({animations:'disabled'});
   fs.writeFileSync(path.join(out,code+'-reference.png'),expected);fs.writeFileSync(path.join(out,code+'-actual.png'),actual);
   const a=PNG.sync.read(actual),e=PNG.sync.read(expected);let differentPixels=0;
   for(let p=0;p<a.data.length;p+=4)if(a.data.subarray(p,p+4).compare(e.data.subarray(p,p+4)))differentPixels++;
   results.push({code,width:a.width,height:a.height,differentPixels});assert.equal(differentPixels,0,code+' differs from the supplied layout');
   if(config.version===0){const qr=PNG.sync.read(await page.locator('svg').screenshot());assert.equal(jsQR(new Uint8ClampedArray(qr.data),qr.width,qr.height,{inversionAttempts:'attemptBoth'})?.data,profileUrl);}
   const v=view(config.color,{...initialState(config,source,usage),tab:0},source,()=>{},{history:[]},usage,7);
   await load(renderToStaticMarkup(renderUi(config.color,v,createElement,Fragment)));assert.equal(await page.locator('[data-ab="promo-versions"] button[aria-pressed]').count(),3);
   const liveMarkup=await page.locator('[data-ab="promo-swipe"]>[data-ab-stage]').evaluate(el=>el.outerHTML);await load(liveMarkup);
   assert.equal(PNG.sync.read(await page.screenshot({animations:'disabled'})).data.compare(a.data),0,code+' live preview and export differ');
   for(let slide=0;slide<9;slide++){const html=graphicHTML({config,source,rendererVersion:7},slide);assert.deepEqual(workImages(html),Array.from({length:count},(_,slot)=>ordered[(slide+slot)%9]),code+' slide '+slide+' ignores selection order');}
   const single={...config,artworkIds:[source.works[0].id]};assert.equal(selected(single).slides,1);assert.deepEqual(workImages(graphicHTML({config:single,source,rendererVersion:7})),Array(count).fill(images[0]));
   const custom=graphicHTML({config:{...config,name:'Druga umjetnica',instagram:'@druga',title:'Ručni naslov'},source,rendererVersion:7},1);assert(custom.includes('Druga umjetnica')&&!custom.includes('Tijana Marković'));if(config.version===1)assert(custom.includes('@druga')&&custom.includes('Ručni naslov'));
  }
  for(const theme of ['light','dark']){
   const c={...baseConfig,template:0,color:theme},v=view(theme,{...initialState(c,source,usage),tab:0},source,()=>{},{history:[]},usage,7);await load(renderToStaticMarkup(renderUi(theme,v,createElement,Fragment)));
   const card=page.getByRole('button').filter({has:page.getByText('Gallery',{exact:true})});assert.equal(await card.getAttribute('aria-pressed'),'false');assert.deepEqual(await card.locator('img').evaluateAll(imgs=>imgs.map(img=>img.src).filter(src=>src.startsWith('data:image/svg+xml;base64,')).slice(1)),ordered.slice(0,3));await card.screenshot({path:path.join(out,'unselected-'+theme+'.png')});
  }
  assert.deepEqual(errors,[]);const report={results,livePreviewMatches:6,orderedSlides:54,qrDecoded:2,unselectedCardThemes:2,errors};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
