// Historical reference checks use the pre-revision renderer explicitly.
// Match every work frame, including its blue arrow, and the closing profile page.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test'),{PNG}=require('pngjs');
const {createElement,Fragment}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {graphicHTML,selected,initialState,view,renderUi}=require('@artboard/promotion-renderer');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'.tmp/promotion-slider');
const artifact=fs.readFileSync(path.join(root,'apps/web/references/promotion-slider-artifact-20261031.html'),'utf8');
const references=[...artifact.matchAll(/7([ab]) · Slider Carousel[^\r\n]+\s*(<div[\s\S]*?)(?=\s*7[ab] · Slider Carousel|$)/g)];assert.equal(references.length,2);
const images=Array.from({length:4},(_,i)=>'data:image/svg+xml;base64,'+Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440"><rect width="1080" height="1440" fill="hsl(${i*80},65%,50%)"/><circle cx="${220+i*100}" cy="450" r="170" fill="#223344"/></svg>`).toString('base64'));
const selection=[2,0,3,1],titles=['Indigo papir I','Indigo papir II','Koral','Pustinja'];
const source={name:'Tijana Marković',avatar:null,form:'f',profileUrl:'https://example.test/tijana',shortUrl:'example.test/tijana',works:images.map((imageUrl,i)=>({id:'work-'+i,title:titles[selection.indexOf(i)],imageUrl}))};
const config={artworkIds:selection.map(i=>'work-'+i),template:6,version:0,color:'light',language:'ME',name:source.name,instagram:'@mawatitaa',title:null,description:'',signature:'instagram'};
const usage={plan:'FREE',used:0,reserved:0,limit:1,remaining:1,purchased:0};
const blobs=Object.fromEntries(['9784c36244e5944c057870da95433d25','90569f4028ea7e6734503496e42c16f2','17295d500e943f8ac2e9ff423845557d','18203b2c88c6fc9ed564c29045d1a3ae'].map((id,i)=>[id,images[selection[i]]]));
blobs['1bdc45cf08e486cae7ec3636c955a240']=require('@artboard/promotion-renderer/logos.json')['6cc1ee7b-1ee9-4ff4-af76-94da81ce8d2e'];
const fonts=[[400,'Regular'],[500,'Medium'],[600,'SemiBold'],[700,'Bold'],[800,'Black']].map(([weight,name])=>`@font-face{font-family:Alcyone;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(root,'apps/web/app/fonts',`Alcyone-${name}.woff2`)).toString('base64')});font-weight:${weight}}`).join('');
const document=body=>`<!doctype html><html><head><meta charset="utf-8"><style>${fonts}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1440px;overflow:hidden;font-family:Alcyone,sans-serif;color:#111318}body>[data-ab-stage]{width:1080px!important;height:1440px!important;--s:1;border-radius:0!important;box-shadow:none!important}</style></head><body>${body}</body></html>`;
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1440}}),results=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  async function load(markup){await page.setContent(document(markup));await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))});}
  for(let t=0;t<2;t++){
   const theme=t?'dark':'light',c={...config,color:theme},code='7'+references[t][1];assert.equal(selected(c).code,code);assert.equal(selected(c).slides,6);assert.equal(selected(c,1).slides,6);
   await load(references[t][2].replace('Lorem ipsum',titles[0]).replace(/\/_blob\/([a-f0-9]+)/g,(_,id)=>{assert(blobs[id],id);return blobs[id]}));
   const works=await page.locator('[data-slide]').evaluateAll(slides=>slides.map(el=>el.outerHTML));assert.equal(works.length,6);
   for(let slide=0;slide<6;slide++){
    await load(works[slide]);const expected=await page.screenshot({animations:'disabled'});
    await load(graphicHTML({config:c,source,rendererVersion:6},slide));const actual=await page.screenshot({animations:'disabled'});
    fs.writeFileSync(path.join(out,`${code}-${slide+1}-actual.png`),actual);fs.writeFileSync(path.join(out,`${code}-${slide+1}-reference.png`),expected);
    const a=PNG.sync.read(actual),e=PNG.sync.read(expected);let differentPixels=0;
    for(let p=0;p<a.data.length;p+=4)if(a.data.subarray(p,p+4).compare(e.data.subarray(p,p+4)))differentPixels++;
    results.push({code,slide:slide+1,width:a.width,height:a.height,differentPixels});assert.equal(differentPixels,0,code+' slide '+(slide+1)+' differs from reference');
    assert.equal(await page.locator('img').count(),slide===0?4:1);
    if(slide>0&&slide<5){assert.equal(await page.locator('img').getAttribute('src'),images[selection[slide-1]]);assert.equal(await page.getByText('→',{exact:true}).evaluate(el=>getComputedStyle(el).color),t?'rgb(11, 98, 232)':'rgb(22, 115, 242)');}
    else if(slide===5){assert(await page.getByText(/Pogledaj moj/).count()>0);assert.equal(await page.getByText('→',{exact:true}).count(),0);}
    const v=view(theme,{...initialState(c,source,usage),slide,tab:0},source,()=>{},{history:[]},usage,6);
    assert.equal(v.slidesN,6);if(slide>0&&slide<5){assert.equal(v.sw.num,String(slide).padStart(2,'0'));assert.equal(v.sw.title,titles[slide-1]);assert.equal(v.sw.more,true);}else assert.deepEqual(v.pv,{['c'+code+(slide===0?'_0':'_3')]:true});
    await load(renderToStaticMarkup(renderUi(theme,v,createElement,Fragment)));
    const liveMarkup=await page.locator('[data-ab="promo-swipe"]>[data-ab-stage]').evaluate(el=>el.outerHTML);await load(liveMarkup);
    assert.equal(PNG.sync.read(await page.screenshot({animations:'disabled'})).data.compare(a.data),0,'Live preview must match export');
   }
   const other={...c,template:0};const v=view(theme,{...initialState(other,source,usage),tab:0},source,()=>{},{history:[]},usage,6);await load(renderToStaticMarkup(renderUi(theme,v,createElement,Fragment)));
   const card=page.getByRole('button').filter({has:page.getByText('Slider Carousel',{exact:true})});assert.equal(await card.getAttribute('aria-pressed'),'false');assert.deepEqual(await card.locator('img').evaluateAll(imgs=>imgs.map(i=>i.src)),selection.map(i=>images[i]));
   await card.screenshot({path:path.join(out,'unselected-'+theme+'.png')});
  }
  assert.deepEqual(errors,[]);const report={results,livePreviewMatches:12,unselectedCardThemes:2,works:4,slides:6,errors};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
