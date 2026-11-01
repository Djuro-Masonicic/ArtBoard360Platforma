// Panorama compares individual crops and the stitched canvas against supplied HTML.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test'),{PNG}=require('pngjs');
const {createElement,Fragment}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {graphicHTML,selected,initialState,view,renderUi}=require('@artboard/promotion-renderer');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'.tmp/promotion-panorama');
const artifact=fs.readFileSync(path.join(root,'apps/web/references/promotion-panorama-artifact-20261031.html'),'utf8');
const references=[...artifact.matchAll(/10([a-c]) · Panorama Carousel[^\r\n]+\s*(<div[\s\S]*?)(?=\s*10[a-c] · Panorama Carousel|$)/g)];assert.equal(references.length,3);
const images=Array.from({length:6},(_,i)=>'data:image/svg+xml;base64,'+Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440"><defs><linearGradient id="g"><stop stop-color="hsl(${i*60},65%,50%)"/><stop offset="1" stop-color="hsl(${i*60+30},50%,30%)"/></linearGradient></defs><rect width="1080" height="1440" fill="url(#g)"/><circle cx="${160+i*120}" cy="600" r="120" fill="#223344"/></svg>`).toString('base64'));
const selection=[3,0,5,1,4,2],ordered=selection.map(i=>images[i]);
const blobs=Object.fromEntries(['9784c36244e5944c057870da95433d25','90569f4028ea7e6734503496e42c16f2','18203b2c88c6fc9ed564c29045d1a3ae','51646fe20d9e1771015b5b48ddc60c50','0af2f22e83758b112a2720ff62c76c06','47056fc8960cce22a993aedf67c86144'].map((id,i)=>[id,ordered[i]]));
blobs.a68587b30b0b9d20d2a9f1712407f43f=ordered[0];blobs['1bdc45cf08e486cae7ec3636c955a240']=require('@artboard/promotion-renderer/logos.json')['6cc1ee7b-1ee9-4ff4-af76-94da81ce8d2e'];
const source={name:'Tijana Marković',avatar:null,form:'f',profileUrl:'https://example.test/tijana',shortUrl:'example.test/tijana',works:images.map((imageUrl,i)=>({id:'work-'+i,title:'Lorem ipsum',imageUrl}))};
const baseConfig={artworkIds:selection.map(i=>'work-'+i),template:9,version:0,color:'dark',language:'ME',name:source.name,instagram:'@mawatitaa',title:null,description:'',signature:'instagram'};
const usage={plan:'FREE',used:0,reserved:0,limit:1,remaining:1,purchased:0};
const fonts=[[400,'Regular'],[500,'Medium'],[600,'SemiBold'],[700,'Bold'],[800,'Black']].map(([weight,name])=>`@font-face{font-family:Alcyone;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(root,'apps/web/app/fonts',`Alcyone-${name}.woff2`)).toString('base64')});font-weight:${weight}}`).join('');
const document=body=>`<!doctype html><html><head><meta charset="utf-8"><style>${fonts}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1440px;overflow:hidden;font-family:Alcyone,sans-serif;color:#111318}body>[data-ab-stage]{width:1080px!important;height:1440px!important;--s:1;border-radius:0!important;box-shadow:none!important}</style></head><body>${body}</body></html>`;
const equalPixels=(actual,expected,message)=>{
 const a=PNG.sync.read(actual),e=PNG.sync.read(expected);assert.equal(a.width,e.width);assert.equal(a.height,e.height);
 let differentPixels=0,maxChannelDifference=0;
 for(let p=0;p<a.data.length;p+=4)if(a.data.subarray(p,p+4).compare(e.data.subarray(p,p+4))){differentPixels++;for(let k=0;k<4;k++)maxChannelDifference=Math.max(maxChannelDifference,Math.abs(a.data[p+k]-e.data[p+k]));}
 // Rotated artwork edges can differ by one channel level when a parent uses
 // translate() instead of the reference's negative left offset. No layout drift.
 assert(differentPixels<=64&&maxChannelDifference<=1,`${message}: ${differentPixels} pixels, maximum channel delta ${maxChannelDifference}`);
 return {differentPixels,maxChannelDifference};
};
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1440}}),results=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  async function load(markup){await page.setContent(document(markup));await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))});}
  for(let t=0;t<3;t++){
   const config={...baseConfig,artworkIds:t?baseConfig.artworkIds:[baseConfig.artworkIds[0]],version:t?1:0,color:t===1?'light':'dark'},code='10'+references[t][1];assert.equal(selected(config).code,code);assert.equal(selected(config).slides,3);
   const snapshot={config,source,rendererVersion:3};
   await load(references[t][2].replace(/\/_blob\/([a-f0-9]+)/g,(_,id)=>{assert(blobs[id],id);return blobs[id]}));
   const frames=await page.locator('[data-slide]').evaluateAll(slides=>slides.map(el=>el.outerHTML));assert.equal(frames.length,3);
   const stitched=new PNG({width:3240,height:1440}),referenceStitched=new PNG({width:3240,height:1440});
   for(let slide=0;slide<3;slide++){
    await load(frames[slide]);const expected=await page.screenshot({animations:'disabled'});
    await load(graphicHTML(snapshot,slide));const actual=await page.screenshot({animations:'disabled'});
    fs.writeFileSync(path.join(out,`${code}-${slide+1}-actual.png`),actual);fs.writeFileSync(path.join(out,`${code}-${slide+1}-reference.png`),expected);
    results.push({code,slide:slide+1,width:1080,height:1440,...equalPixels(actual,expected,code+' frame '+slide)});
    const image=PNG.sync.read(actual);PNG.bitblt(image,stitched,0,0,1080,1440,1080*slide,0);
    PNG.bitblt(PNG.sync.read(expected),referenceStitched,0,0,1080,1440,1080*slide,0);
    const v=view(config.color,{...initialState(config,source,usage),tab:0,slide},source,()=>{},{history:[]},usage,3);
    assert.equal(v.dx,`${-1080*slide}px`);assert.equal(v.slidesN,3);
    await load(renderToStaticMarkup(renderUi(config.color,v,createElement,Fragment)));assert.equal(await page.locator('[data-ab="promo-versions"] button[aria-pressed]').count(),2);
    const markup=await page.locator('[data-ab="promo-swipe"]>[data-ab-stage]').evaluate(el=>el.outerHTML);await load(markup);
    assert.equal(PNG.sync.read(await page.screenshot({animations:'disabled'})).data.compare(image.data),0,'Main preview and PNG export differ');
   }
   const full=PNG.sync.write(referenceStitched);
   fs.writeFileSync(path.join(out,code+'-stitched.png'),PNG.sync.write(stitched));fs.writeFileSync(path.join(out,code+'-canvas-reference.png'),full);
   equalPixels(PNG.sync.write(stitched),full,code+' stitched reference frames');
   const custom=graphicHTML({config:{...config,title:'Moj rad',instagram:'@druga',name:'Druga umjetnica'},source,rendererVersion:3},2);
   assert(custom.includes('Moj rad')&&custom.includes('@druga')&&!custom.includes('Lorem ipsum')&&!custom.includes('@mawatitaa'));
   if(t)assert(custom.includes('Druga')&&custom.includes('umjetnica')&&!custom.includes('Tijana'));
  }
  for(const theme of ['light','dark']){
   const config={...baseConfig,template:0,color:theme},v=view(theme,{...initialState(config,source,usage),tab:0},source,()=>{},{history:[]},usage);await load(renderToStaticMarkup(renderUi(theme,v,createElement,Fragment)));
   const card=page.getByRole('button').filter({has:page.getByText('Panorama Carousel',{exact:true})});assert.equal(await card.getAttribute('aria-pressed'),'false');assert.equal(await card.locator('img').first().getAttribute('src'),ordered[0]);await card.screenshot({path:path.join(out,'unselected-'+theme+'.png')});
  }
  let cropPreviewMatches=0;
  for(const [width,height] of [[1080,1440],[2160,1440],[4320,1440]])for(const crop of [{fit:'contain',zoom:1,x:50,y:50},{fit:'cover',zoom:1,x:50,y:50},{fit:'cover',zoom:1.6,x:24,y:71},{fit:'contain',zoom:2,x:100,y:0}]){
    const imageUrl='data:image/svg+xml;base64,'+Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="v" x2="0" y2="1"><stop stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#v)"/><rect width="60" height="100%" fill="green"/></svg>`).toString('base64');
    const currentSource={...source,works:[{id:'portrait',title:'Kadar',imageUrl}]},config={...baseConfig,artworkIds:['portrait'],panoramaCrop:crop},joined=new PNG({width:3240,height:1440});
    for(let slide=0;slide<3;slide++){
      await load(graphicHTML({config,source:currentSource},slide));const actual=PNG.sync.read(await page.screenshot({animations:'disabled'}));PNG.bitblt(actual,joined,0,0,1080,1440,1080*slide,0);
      const v=view('light',{...initialState(config,currentSource,usage),tab:0,slide},currentSource,()=>{},{history:[]},usage);
      await load(renderToStaticMarkup(renderUi('light',v,createElement,Fragment)));const live=await page.locator('[data-ab="promo-swipe"]>[data-ab-stage]').evaluate(el=>el.outerHTML);await load(live);
      assert.equal(PNG.sync.read(await page.screenshot({animations:'disabled'})).data.compare(actual.data),0,'Crop preview differs from export');cropPreviewMatches++;
    }
    if(width===1080&&crop.zoom===1){
      fs.writeFileSync(path.join(out,'portrait-'+crop.fit+'-stitched.png'),PNG.sync.write(joined));
      const top=(540*4),bottom=((1440-1)*3240+1620)*4,middleTop=1620*4;
      if(crop.fit==='contain'){assert.equal(joined.data[top],16);assert(joined.data[middleTop]>240);assert(joined.data[bottom+2]>240);}
      else {assert(joined.data[middleTop]<240);assert(joined.data[bottom+2]<240);}
    }
  }
  assert.deepEqual(errors,[]);const report={results,legacyLivePreviewMatches:9,cropPreviewMatches,stitchedCanvases:3,unselectedCardThemes:2,errors};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
