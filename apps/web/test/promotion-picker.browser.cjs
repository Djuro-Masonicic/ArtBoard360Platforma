// Picker graphics must be independent of the active preview slide.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {chromium}=require('@playwright/test'),{createElement,Fragment}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {initialState,view,renderUi,selected}=require('@artboard/promotion-renderer');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'.tmp/promotion-picker'),before=process.argv.includes('--record-before');fs.mkdirSync(out,{recursive:true});
const original=fs.readFileSync(path.join(os.homedir(),'Downloads/generator-svijetla.html'),'utf8'),scripts=[...original.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)],assets=JSON.parse(scripts[1][1]);
const asset=id=>{const a=assets[id],body=Buffer.from(a.data,'base64');return 'data:'+a.mime+';base64,'+(a.compressed?require('node:zlib').gunzipSync(body):body).toString('base64');};
const ids=['969093d3-68d4-495d-a6bd-1ab3cbbadcda','55177d87-41af-484d-8d66-a87a86288319','4721b6db-cc9c-4f94-8bf0-1568ad3e6363'];
const source={name:'Tijana Marković',avatar:asset('922d3d54-6951-4ff8-9ea4-81ec65fc6b68'),form:'f',profileUrl:'https://example.test/tijana',shortUrl:'example.test/tijana',qrPath:'M4 4h1v1h-1z',qrView:'0 0 29 29',works:ids.map((id,i)=>({id:'work-'+i,title:'Rad '+(i+1),imageUrl:asset(id)}))};
const config={artworkIds:['work-0','work-1','work-2'],template:0,version:0,color:'light',language:'ME',name:source.name,instagram:'@test',title:null,collectionTitle:'Noćne skice',description:'',signature:'instagram'},usage={plan:'FREE',used:0,reserved:0,limit:1,remaining:1,purchased:0};
const fonts=[[400,'Regular'],[500,'Medium'],[600,'SemiBold'],[700,'Bold'],[800,'Black']].map(([weight,name])=>`@font-face{font-family:Alcyone;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(root,'apps/web/app/fonts',`Alcyone-${name}.woff2`)).toString('base64')});font-weight:${weight}}`).join('');
const styles=['packages/promotion-renderer/reference-light.css','packages/promotion-renderer/reference-dark.css','apps/web/components/promotion-editor.css'].map(f=>fs.readFileSync(path.join(root,f),'utf8').replace(/@font-face\s*\{[^}]*\}/g,'')).join('\n');
const hash=html=>createHash('sha256').update(html).digest('hex');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1536,height:1000}}),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  async function load(c,slide,theme){const v=view(theme,{...initialState(c,source,usage),tab:0,slide},source,()=>{},{history:[]},usage);await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${fonts}html,body{margin:0;font-family:Alcyone,sans-serif}${styles}</style></head><body><div class="promotion-root" data-theme="${theme}">${renderToStaticMarkup(renderUi(theme,v,createElement,Fragment))}</div></body></html>`);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));window.scrollTo(0,0);document.querySelectorAll('[data-ab-stage]').forEach(n=>n.style.setProperty('--s',String(n.clientWidth/(1080*(Number(n.dataset.abUnits)||1)))));});}
  const cards=()=>page.getByText('Artist Card',{exact:true}).first().locator('xpath=ancestor::button[1]/..'),versions=()=>page.locator('[data-ab="promo-versions"]');
  for(const theme of before?['light']:['light','dark'])for(const template of before?[0]:[0,6,8,9]){
   const c={...config,template,color:theme};await load(c,0,theme);const first=hash(await cards().innerHTML()),firstVersions=hash(await versions().innerHTML());
   if(template===0&&theme==='light'){await cards().screenshot({path:path.join(out,(before?'before':'after')+'-cards-slide-1.png')});await versions().screenshot({path:path.join(out,(before?'before':'after')+'-versions-slide-1.png')});}
   for(let slide=1;slide<(before?2:selected(c).slides);slide++){
    await load(c,slide,theme);const sameCards=hash(await cards().innerHTML())===first,sameVersions=hash(await versions().innerHTML())===firstVersions;
    checks.push({theme,template,slide:slide+1,sameCards,sameVersions});if(!before){assert(sameCards,`${theme}/${template}: design cards changed on slide ${slide+1}`);assert(sameVersions,`${theme}/${template}: version cards changed on slide ${slide+1}`);}
    if(template===0&&theme==='light'&&slide===1){await cards().screenshot({path:path.join(out,(before?'before':'after')+'-cards-slide-2.png')});await versions().screenshot({path:path.join(out,(before?'before':'after')+'-versions-slide-2.png')});await page.screenshot({path:path.join(out,(before?'before':'after')+'-full.png')});}
   }
  }
  if(!before){await load({...config,template:8},0,'light');await page.screenshot({path:path.join(out,'grid-collection-title.png')});}
  if(!before)for(const family of ['cards','versions'])assert.equal(hash(fs.readFileSync(path.join(out,'after-'+family+'-slide-1.png'))),hash(fs.readFileSync(path.join(out,'after-'+family+'-slide-2.png'))),'Picker screenshots must be pixel-identical across slide navigation');
  assert.deepEqual(errors,[]);const report={checks,pixelIdenticalScreenshots:!before,errors};fs.writeFileSync(path.join(out,before?'before-results.json':'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
