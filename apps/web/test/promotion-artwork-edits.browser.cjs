const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test'),{PNG}=require('pngjs'),{createElement,Fragment}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {catalog,initialState,view,renderUi,graphicHTML}=require('@artboard/promotion-renderer');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'.tmp/promotion-artwork-edits');fs.mkdirSync(out,{recursive:true});
const images=Array.from({length:3},(_,i)=>'data:image/svg+xml;base64,'+Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440"><rect width="1080" height="1440" fill="hsl(${i*110},70%,50%)"/><circle cx="250" cy="500" r="180" fill="black"/><path d="M0 1400L1080 100" stroke="white" stroke-width="50"/></svg>`).toString('base64'));
const source={name:'Test Artist',avatar:images[0],form:'n',year:2026,profileUrl:'https://example.test/artist',shortUrl:'example.test/artist',qrPath:'M4 4h1v1h-1z',qrView:'0 0 29 29',works:images.map((imageUrl,i)=>({id:'work-'+i,title:'Source '+i,imageUrl}))};
const usage={plan:'FREE',used:0,remaining:1,reserved:0,limit:1,purchased:0};
const fonts=[[400,'Regular'],[500,'Medium'],[600,'SemiBold'],[700,'Bold'],[800,'Black']].map(([weight,name])=>`@font-face{font-family:Alcyone;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(root,'apps/web/app/fonts',`Alcyone-${name}.woff2`)).toString('base64')});font-weight:${weight}}`).join('');
const doc=body=>`<!doctype html><html><head><style>${fonts}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1440px;overflow:hidden;font-family:Alcyone,sans-serif}body>[data-ab-stage]{width:1080px!important;height:1440px!important;--s:1;border-radius:0!important;box-shadow:none!important}</style></head><body>${body}</body></html>`;
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1080,height:1440}}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 async function load(html){await page.setContent(doc(html));await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});}
 for(let template=0;template<10;template++)for(let version=0;version<catalog.templates[template].vers.length;version++)for(const color of ['light','dark']){
  const ids=template===9&&version===0?['work-0']:['work-0','work-1','work-2'],c={artworkIds:ids,template,version,color,language:'ME',name:source.name,instagram:'@test',title:null,collectionTitle:'Test collection',description:'',signature:'instagram',artworkEdits:ids.map((id,i)=>({artworkId:id,title:'Edited '+i,description:'Description '+i,crop:{fit:i%2?'cover':'contain',zoom:i===0?0.6:1.4,x:20+i*20,y:70}}))};
  if(template===9&&version===0)c.panoramaCrop={fit:'contain',zoom:0.6,x:30,y:70};
  const slide=template===6?1:template===9?0:1;
  await load(graphicHTML({config:c,source},slide));const native=PNG.sync.read(await page.screenshot());
  const boxes=await page.locator('[data-promotion-image]').count();if(!(template===9&&version===0))assert(boxes>0,`Missing cropped artwork: ${template}/${version}/${color}`);
  const v=view(color,{...initialState(c,source,usage),tab:0,slide},source,()=>{},{history:[]},usage);await load(renderToStaticMarkup(renderUi(color,v,createElement,Fragment)));
  const live=await page.locator('[data-ab="promo-swipe"]>[data-ab-stage]').evaluate(el=>el.outerHTML);await load(live);const preview=PNG.sync.read(await page.screenshot());assert.equal(preview.data.compare(native.data),0,`Preview/export mismatch: ${template}/${version}/${color}`);
  checks.push({template,version,color,croppedBoxes:boxes});if(template===6)fs.writeFileSync(path.join(out,'slider-'+color+'.png'),PNG.sync.write(native));
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({previewExportMatches:checks.length,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
