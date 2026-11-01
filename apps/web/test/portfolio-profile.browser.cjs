const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync, spawn} = require('node:child_process');
const {chromium} = require('@playwright/test');

// An isolated app, outside production routes. All account API responses are
// intercepted; no real projects, credentials, database or storage are used.
const root = path.resolve(__dirname, '../../..');
const output = path.join(root, '.tmp/portfolio-podaci-4-1');
const dir = path.join(output, 'harness');
const baselineOnly = process.argv.includes('--baseline');
const referenceFile = path.join(root,'apps/web/references/portfolio-podaci.html');
assert.ok(fs.existsSync(referenceFile),'The supplied Podaci reference must be available');
for (const file of ['editor-before.tsx', 'editor-before.module.css']) {
  assert.ok(fs.existsSync(path.join(output, file)), 'Capture the original source/CSS and supplied reference first: '+file);
}
fs.mkdirSync(path.join(dir, 'app'), {recursive:true});
const write = (file, text) => fs.writeFileSync(path.join(dir,file),text);
write('package.json', JSON.stringify({private:true}));
write('tsconfig.json', JSON.stringify({compilerOptions:{target:'ES2022',lib:['DOM','ES2022'],jsx:'preserve',module:'ESNext',moduleResolution:'Bundler',esModuleInterop:true,skipLibCheck:true,strict:true,baseUrl:'../../..',paths:{'@/*':['apps/web/*']}},include:['next-env.d.ts','app/**/*.tsx','.next/types/**/*.ts'],exclude:['node_modules']}));
write('next.config.js', `const path=require('node:path');module.exports={reactStrictMode:true,devIndicators:false,experimental:{externalDir:true},webpack(config){config.resolve.alias['@']=path.resolve(__dirname,'../../../apps/web');return config;}};`);
write('postcss.config.mjs', `export default {plugins:{'@tailwindcss/postcss':{}}};`);
write('app/harness.css', `@import '../../../../apps/web/app/globals.css';\n@source '../../../../apps/web';\n@source '../../editor-before.tsx';`);
const layout = fs.readFileSync(path.join(root,'apps/web/app/layout.tsx'),'utf8');
const fonts = layout.slice(layout.indexOf('const alcyone ='),layout.indexOf('export const metadata')).replaceAll('"./fonts/','"../../../../apps/web/app/fonts/');
write('app/layout.tsx', `import localFont from 'next/font/local';import './harness.css';${fonts}\nexport default function Layout({children}:{children:React.ReactNode}){return <html lang="sr"><body className={alcyone.className+' '+alcyone.variable}>{children}</body></html>;}`);
fs.mkdirSync(path.join(dir,'public'),{recursive:true});
fs.cpSync(path.join(root,'apps/web/public/artboard-logo'),path.join(dir,'public/artboard-logo'),{recursive:true});
write('app/page.tsx', `import Session from './session';export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){const q=await searchParams;return <Session version={q.version??'after'} mode={q.mode??'free'}/>;}`);
write('app/session.tsx', `"use client";
import {useEffect,useState} from 'react';
import {PortfolioBuilderEditorShell as Before} from '../../editor-before';
import {PortfolioBuilderEditorShell as After} from '@/components/portfolio-builder-editor-shell';
import {createGuestPortfolioMemoryAdapter} from '@/lib/guest-portfolio-memory';
import type {PortfolioProject} from '@/types/api';
export default function Session({version,mode}:{version:string;mode:string}){
 const [adapter]=useState(()=>createGuestPortfolioMemoryAdapter());
 const [project,setProject]=useState<PortfolioProject|null>(()=>mode==='memory'?adapter.getSnapshot():null);
 const [shown,setShown]=useState(true);
 useEffect(()=>{if(mode!=='memory')void fetch('/fixture-project?mode='+mode).then(r=>r.json()).then(setProject);},[mode]);
 useEffect(()=>{if(project)(window as any).__profileTest={adapter,project,unmount:()=>setShown(false)};},[project,adapter]);
 if(!shown)return <div data-testid="unmounted">Unmounted</div>;
 if(!project)return <p>Loading fixture</p>;
 const Editor=version==='before'?Before:After;
 return <Editor project={project} {...(mode==='memory'?{adapter}:{})}/>;
}`);

const image = 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320"><rect width="240" height="320" fill="#345977"/></svg>');
const bio = 'Ime Prezime stvara u oblasti digitalne umjetnosti, fotografije i videa. U radu istražuje odnos između tradicionalnih i savremenih medija i spaja lični izraz sa eksperimentom.';
function fixture(mode){return {id:'8230ec27-962d-4bb9-8d7e-42150f2fb8ea',artistAccountId:'3210ec27-962d-4bb9-8d7e-42150f2fb8ea',source:'ARTBOARD_PROFILE',status:'DRAFT',paymentStatus:'REQUIRED',title:'Portfolio',artistName:'Ime Prezime',email:'ime.prezime@email.com',phone:'+382 67 123 456',location:'Podgorica',websiteUrl:'https://example.invalid',instagramUrl:'https://instagram.com/imeprezime',discipline:'Fotografija, Digitalna umjetnost, Video umjetnost',biography:bio,artistStatement:'Istražujem odnos svjetla, boje i prostora.',collectionName:'Tiha mjesta',collectionYear:'2026',collectionDescription:'Opis kolekcije.',profileImageUrl:image,coverImageUrl:image,collectionCoverUrl:image,template:'INSTITUTIONAL_MINIMAL',language:'ME',pageFormat:'A4',fontStyle:'SANS',includeBranding:true,includeCv:false,includePrices:false,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',artworks:[],versions:[],payments:[],counts:{artworks:0,selectedArtworks:0,versions:0,payments:0},access:{canDownloadCleanPdf:mode==='premium',requiresPayment:mode!=='premium',reason:mode==='premium'?'PREMIUM':'PAYMENT_REQUIRED'}};}
const projects = {free:fixture('free'),premium:fixture('premium')};
const port = Number(process.env.PORTFOLIO_PROFILE_TEST_PORT??3108);
const url = (version='after',mode='free')=>`http://localhost:${port}/?version=${version}&mode=${mode}`;
for(const project of Object.values(projects))Object.assign(project,{dateOfBirth:'2000-02-29',behanceUrl:'https://behance.net/test',motto:'Svjetlo i prostor',mottoAuthor:'Autor'});
const checks=[], errors=[], mutations=[], measurements=[];
const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
let server,browser;
const widths=[1536,1440,1280,1024,768,440,375,320];
async function settle(page){
 await page.waitForFunction(()=>Boolean(window.__profileTest));
 await page.evaluate(()=>document.fonts.ready);
 await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
 await page.mouse.move(0,0);
}
async function open(page,version='after',mode='free'){
 await page.goto(url(version,mode));await settle(page);
 await page.getByRole('button',{name:'Svijetla tema',exact:true}).click();
 await page.mouse.move(0,0);
}
async function step(page,id){
 const desktop=page.locator('nav[aria-label="Koraci izrade portfolija"] button[data-step="'+id+'"]');
 if(await desktop.isVisible())await desktop.click();
 else await page.getByRole('button',{name:{profile:'1. Podaci',works:'2. Radovi',design:'3. Dizajn',export:'4. Izvoz'}[id],exact:true}).click();
 await page.mouse.move(0,0);
}
async function measure(page,reference=false){return page.evaluate((reference)=>{
 const find=(name)=>Array.from(document.querySelectorAll('[class]')).find(el=>Array.from(el.classList).some(token=>new RegExp('(?:^|_)'+name+'(?:_|$)').test(token)));
 const read=(el)=>{if(!el)return null;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x,y:r.y,width:r.width,height:r.height,fontFamily:s.fontFamily.split(',')[0],fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,padding:s.padding,gap:s.gap,borderRadius:s.borderRadius,background:s.backgroundColor,boxShadow:s.boxShadow,display:s.display,gridTemplateColumns:s.gridTemplateColumns};};
 const central=reference?document.querySelector('main'):find('profileWorkspace')??find('editorContent');
 const input=(label)=>Array.from(central.querySelectorAll('label')).find(el=>el.textContent.includes(label))?.querySelector('input');
 const oldCard=Array.from(central.querySelectorAll('section')).find(el=>el.querySelector('h2')?.textContent==='Osnovni podaci');
 const tpl=(n)=>document.querySelector('[data-dc-tpl="'+n+'"]');
 return {viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,header:read(reference?null:find('topbar')),sidebar:read(reference?null:find('sidebar')),column:read(reference?central:find('editorColumn')),surface:read(central),preview:read(reference?null:find('previewPanel')),heading:read(central.querySelector('h1')),description:read(reference?tpl(81):Array.from(central.querySelectorAll('header p')).at(-1)),card:read(reference?tpl(84):find('profileBasics')??oldCard),grid:read(reference?tpl(92):find('profileFieldGrid')??input('Ime i prezime')?.parentElement.parentElement),name:read(input('Ime i prezime')),email:read(input('E-mail')??input('Email')),bio:read(reference?tpl(110):central.querySelector('textarea')),avatar:read(reference?tpl(129):find('profileCardAvatar')),cover:read(reference?tpl(138):find('profileCoverButton')??find('collectionCoverButton')),photoButton:read(reference?tpl(134):find('changeProfileImageButton')),next:read(reference?tpl(417):find('nextStepButton')),fieldCount:central.querySelectorAll('label input').length};
 },reference);}
async function reference(page,width,column){
 await page.goto(url());await settle(page);
 await page.evaluate(({html,column})=>{
  document.body.innerHTML=html;
  Object.assign(document.body.style,{margin:'0',padding:'0',background:'#f7f7f9',color:'#111318'});
  const main=document.querySelector('main');Object.assign(main.style,{width:column.width+'px',marginLeft:column.x+'px',marginTop:column.y+'px',fontFamily:'var(--font-alcyone),system-ui,sans-serif',color:'#111318'});
 },{html:fs.readFileSync(referenceFile,'utf8'),column});
 await page.evaluate(()=>document.fonts.ready);
 const m=await measure(page,true);
 await page.locator('main').screenshot({path:path.join(output,`reference-${width}.png`),animations:'disabled'});
 return m;
}
(async()=>{
 const ts=require('typescript');
 const source=(file)=>ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const original=source(path.join(output,'editor-before.tsx')),current=source(path.join(root,'apps/web/components/portfolio-builder-editor-shell.tsx'));
 const printer=ts.createPrinter();
 // Collections intentionally adds a conditional step and grouped work order.
 // Existing V1 header/sidebar/workspace geometry is checked in the browser below.
 // Topbar adds only the CV temporary-state/disabled-save props; its unchanged
 // geometry outside CV remains covered below at every viewport.
 for(const name of ['ArtworkEditorCard','StudioPreviewPanel']){
  const read=(tree)=>printer.printNode(ts.EmitHint.Unspecified,tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),tree);
  assert.equal(read(current),read(original),name+' source must remain unchanged');check(name+' source unchanged',true);
 }
 const css=fs.readFileSync(path.join(root,'apps/web/components/portfolio-builder-editor-shell.module.css'),'utf8').replace(/\r\n/g,'\n');
 const oldCss=fs.readFileSync(path.join(output,'editor-before.module.css'),'utf8').replace(/\r\n/g,'\n');
 if(!baselineOnly){assert.equal(css.replace(/\/\* Phase 4\.1:[\s\S]*?(?=@media \(max-width: 1279px\))/,''),oldCss);check('all pre-existing CSS rules unchanged',true);}
 process.env.NEXT_TELEMETRY_DISABLED='1';
 execFileSync(process.execPath,[require.resolve('next/dist/bin/next'),'build','--webpack'],{cwd:dir,stdio:'inherit',windowsHide:true});
 server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--port',String(port),'--hostname','localhost'],{cwd:dir,stdio:'inherit',windowsHide:true,env:{...process.env,NODE_ENV:'production'}});
 let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error('Fixture server exited');try{if((await fetch(url())).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1536,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  const created=[],revoked=[];const make=URL.createObjectURL.bind(URL),release=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=f=>{const u=make(f);created.push(u);return u;};URL.revokeObjectURL=u=>{revoked.push(u);release(u);};window.__urls={created,revoked};
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 let mode='free',rejectSave=false;
 await page.route('**/fixture-project?*',r=>r.fulfill({json:projects[new URL(r.request().url()).searchParams.get('mode')]}));
 await page.route('**/api/**',async r=>{
  const isUpload=r.request().headers()['content-type']?.startsWith('multipart/form-data');
  mutations.push({url:r.request().url(),method:r.request().method(),body:isUpload?'multipart':r.request().postDataJSON()});
  if(rejectSave)return r.fulfill({status:400,json:{message:'Email mora biti ispravan.'}});
  if(isUpload)Object.assign(projects[mode],{coverImageUrl:image,coverImageStoragePath:'test-only/cover.png'});
  else Object.assign(projects[mode],r.request().postDataJSON());return r.fulfill({json:projects[mode]});
 });
 for(const width of widths){
  await page.setViewportSize({width,height:900});await open(page,'before');const before=await measure(page);
  await page.screenshot({path:path.join(output,`before-${width}.png`),fullPage:true});
  const ref=await reference(page,width,before.surface);let after;
  if(!baselineOnly){
   await open(page);after=await measure(page);
   await page.screenshot({path:path.join(output,`after-${width}.png`),fullPage:true});
   check('no horizontal overflow at '+width,after.overflow===0);
   assert.deepEqual(after.header,before.header,'Header unchanged at '+width);check('header unchanged at '+width,true);
   assert.deepEqual(after.sidebar,before.sidebar,'Sidebar unchanged at '+width);check('sidebar unchanged at '+width,true);
   assert.deepEqual(after.preview,before.preview,'Preview unchanged at '+width);check('preview unchanged at '+width,true);
   for(const [field,properties] of Object.entries({heading:['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing'],description:['fontSize','fontWeight','lineHeight'],card:['padding','gap','borderRadius','boxShadow','background'],grid:['gap','gridTemplateColumns'],name:['height','fontFamily','fontSize','fontWeight','padding','borderRadius','background','boxShadow'],bio:['height','fontSize','fontWeight','lineHeight','padding','borderRadius','background','boxShadow'],avatar:['width','height','borderRadius'],cover:['width','height','borderRadius'],photoButton:['height','fontSize','fontWeight','padding','borderRadius'],next:['height','fontSize','fontWeight','padding','borderRadius','letterSpacing','lineHeight']})){
    for(const property of properties){
     check(`${width}: ${field}.${property} matches reference`,after[field][property]===ref[field][property]);
    }
   }
   check('46px fields at '+width,after.name.height===46&&after.email.height===46);
   check('functional field grid fits at '+width,after.name.width<=after.card.width);
   for(const property of ['x','y','width'])check(`${width}: first field ${property} matches reference`,Math.abs(after.name[property]-ref.name[property])<0.02);
  }
  measurements.push({width,before,reference:ref,after});console.log('Measured '+width);
 }
 fs.writeFileSync(path.join(output,baselineOnly?'baseline-measurements.json':'measurements.json'),JSON.stringify(measurements,null,2));
 if(baselineOnly){check('baseline captured before editing',true);return;}
 await page.setViewportSize({width:1536,height:900});
 for(mode of ['free','premium']){
  await open(page,'after',mode);const original=structuredClone(projects[mode]);
  await page.getByLabel('Ime i prezime',{exact:true}).fill('Promijenjeno Ime');
  await page.getByLabel('Telefon',{exact:true}).fill('+382 67 987 654');
  await page.getByLabel('Datum rođenja',{exact:true}).fill('29.02.2000.');
  await page.getByLabel('Behance',{exact:true}).fill('behance.net/updated');
  await page.getByLabel('Moto',{exact:true}).fill('Novi moto');
  await page.getByLabel('Autor citata',{exact:true}).fill('Novi autor');
  await page.getByLabel('Umjetnički iskaz',{exact:true}).fill('Iskaz koji se čuva.');
  await page.getByRole('group',{name:'Jezik PDF-a'}).getByRole('button',{name:'English',exact:true}).click();
  await page.getByRole('button',{name:/^\+ Pogledaj sve/}).click();
  await page.getByRole('button',{name:'Slikarstvo',exact:true}).click();
  await page.locator('[class*="profileDisciplineChips"]').getByRole('button',{name:'Fotografija',exact:true}).click();
  check(mode+': disciplines can be added and removed',(await page.getByText('Tvoje discipline · 3',{exact:true}).count())===1);
  check(mode+': live preview reacts to input',(await page.locator('[class*="previewPanel"]').innerText()).includes('PROMIJENJENO'));
  await page.getByRole('button',{name:'Sačuvaj draft',exact:true}).click();await page.getByText('Draft je sacuvan.',{exact:true}).waitFor();
  check(mode+': supported fields reach existing adapter',projects[mode].phone==='+382 67 987 654'&&projects[mode].artistStatement==='Iskaz koji se čuva.'&&projects[mode].language==='EN');
  check(mode+': new fields persist',projects[mode].dateOfBirth==='2000-02-29'&&projects[mode].behanceUrl==='behance.net/updated'&&projects[mode].motto==='Novi moto'&&projects[mode].mottoAuthor==='Novi autor');
  check(mode+': discipline edits persist',projects[mode].discipline.includes('Slikarstvo')&&!projects[mode].discipline.includes('Fotografija'));
  await page.reload();await settle(page);
  check(mode+': account fields reload from API',await page.getByLabel('Telefon',{exact:true}).inputValue()==='+382 67 987 654'&&await page.getByLabel('Umjetnički iskaz',{exact:true}).inputValue()==='Iskaz koji se čuva.');
  check(mode+': birth date and motto reload',await page.getByLabel('Datum rođenja',{exact:true}).inputValue()==='29.02.2000.'&&await page.getByLabel('Moto',{exact:true}).inputValue()==='Novi moto');
  const count=mutations.length;await page.getByLabel('Datum rođenja',{exact:true}).fill('31.02.2000.');
  await page.getByRole('button',{name:'Sačuvaj draft',exact:true}).click();await page.getByText(/Unesi ispravan datum rođenja/).waitFor();
  check(mode+': invalid calendar date never reaches API',mutations.length===count);
  await page.getByLabel('Datum rođenja',{exact:true}).fill('29.02.2000.');
  const bioInput=page.getByLabel('Biografija',{exact:true});check(mode+': existing biography limit retained',await bioInput.getAttribute('maxlength')==='1200');
  rejectSave=true;const saved=structuredClone(projects[mode]);await page.getByLabel('E-mail',{exact:true}).fill('invalid');
  await page.getByRole('button',{name:'Sačuvaj draft',exact:true}).click();await page.getByText('Email mora biti ispravan.',{exact:true}).waitFor();assert.deepEqual(projects[mode],saved);check(mode+': validation error preserves saved data',true);rejectSave=false;
  projects[mode]=original;
 }
 await open(page,'after','memory');const previous=mutations.length;
 await page.getByLabel('Ime i prezime',{exact:true}).fill('Privremeni Autor');
 await page.getByLabel('Telefon',{exact:true}).fill('+382 67 000 000');
 await page.getByLabel('Datum rođenja',{exact:true}).fill('25.12.1980.');
 await page.getByLabel('Behance',{exact:true}).fill('behance.net/guest');
 await page.getByLabel('Moto',{exact:true}).fill('Privremeni moto');
 await page.getByLabel('Autor citata',{exact:true}).fill('Gost');
 await page.getByLabel('Biografija',{exact:true}).fill(bio);
 await page.getByLabel('Umjetnički iskaz',{exact:true}).fill('Privremeni iskaz.');
 await page.getByRole('group',{name:'Jezik PDF-a'}).getByRole('button',{name:'English',exact:true}).click();
 await page.waitForFunction(()=>window.__profileTest.adapter.getSnapshot().artistStatement==='Privremeni iskaz.'&&window.__profileTest.adapter.getSnapshot().language==='EN');
 check('Guest metadata stays in memory',await page.evaluate(()=>window.__profileTest.adapter.getSnapshot().phone==='+382 67 000 000'));
 const png=await require('sharp')({create:{width:240,height:320,channels:3,background:'#345977'}}).png().toBuffer();
 await page.locator('input[type=file]').first().setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>Boolean(window.__profileTest.adapter.getSnapshot().profileImageUrl));
 await page.locator('input[type=file]').nth(1).setInputFiles({name:'cover.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>Boolean(window.__profileTest.adapter.getSnapshot().coverImageUrl));
 check('Guest images render locally',await page.getByAltText('Profilna slika',{exact:true}).getAttribute('src').then(s=>s.startsWith('blob:')));
 check('collection fields removed from Podaci',await page.getByLabel('Ime kolekcije',{exact:true}).count()===0&&await page.getByLabel('Opis kolekcije',{exact:true}).count()===0);
 check('independent cover does not create artworks',await page.evaluate(()=>window.__profileTest.adapter.getSnapshot().artworks.length===0));
 check('new Guest fields stay in memory',await page.evaluate(()=>{const p=window.__profileTest.adapter.getSnapshot();return p.dateOfBirth==='1980-12-25'&&p.motto==='Privremeni moto'&&p.behanceUrl==='behance.net/guest';}));
 await step(page,'design');await page.getByText('Aktuelna PDF podešavanja',{exact:true}).click();check('profile language is shared with Design',(await page.getByRole('button',{name:'English',exact:true}).getAttribute('class')).includes('bg-[#f3f4f7]'));
 await step(page,'profile');check('step navigation preserves data',await page.getByLabel('Telefon',{exact:true}).inputValue()==='+382 67 000 000');
 check('Guest has no persistent save action',await page.getByRole('button',{name:'Sačuvaj draft',exact:true}).count()===0);
 check('Guest sends no API mutations or uploads',mutations.length===previous);
 await page.screenshot({path:path.join(output,'memory-after.png'),fullPage:true});
 await page.evaluate(()=>window.__profileTest.unmount());await page.getByTestId('unmounted').waitFor();await page.waitForFunction(()=>window.__urls.revoked.length===window.__urls.created.length);
 check('Guest unmount releases every URL',true);await page.reload();await settle(page);check('Guest refresh starts empty',await page.getByLabel('Ime i prezime',{exact:true}).inputValue()==='');
 await open(page);await page.getByRole('button',{name:'Tamna tema',exact:true}).click();await page.screenshot({path:path.join(output,'after-dark.png'),fullPage:true});check('dark theme remains usable',await page.locator('main').getAttribute('data-theme')==='dark');
 // Compare the other steps and header/sidebar against their original geometry.
 for(const id of ['works','design','export']){
  await open(page,'before');await step(page,id);const before=await measure(page);
  await open(page);await step(page,id);const after=await measure(page);
  for(const part of ['header','sidebar','column','preview']){
   // Radovi now intentionally has the supplied inline details layout; its
   // column height changes while the surrounding layout remains protected.
   if(id==='export'&&(part==='column'||part==='preview')) { assert.equal(after.preview,null,'Export embeds its preview in the editor');assert(after.column.width>=before.column.width);continue; }
   if(id==='export'&&part==='sidebar'){for(const key of Object.keys(after.sidebar||{})){const a=after.sidebar[key],b=before.sidebar[key];if(typeof a==='number')assert(Math.abs(a-b)<1);else assert.equal(a,b)}continue;}
   if((id==='works'||id==='design')&&part==='column')for(const key of ['x','y','width'])assert.equal(after[part][key],before[part][key],id+': column '+key);
   else assert.deepEqual(after[part],before[part],id+': '+part);
  }
  check(id+' layout unchanged',true);
 }
 check('no browser runtime errors',errors.length===0);
})().then(()=>{
 fs.writeFileSync(path.join(output,baselineOnly?'baseline-results.json':'results.json'),JSON.stringify({complete:true,checks,errors,mutations,measurements},null,2));console.log(JSON.stringify({checks:checks.length,widths:measurements.length,errors}));
}).catch(error=>{
 fs.writeFileSync(path.join(output,baselineOnly?'baseline-results.json':'results.json'),JSON.stringify({complete:false,checks,errors,failure:error.stack,measurements},null,2));console.error(error);process.exitCode=1;
}).finally(async()=>{
 if(browser)await browser.close();if(server&&server.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});process.exit(process.exitCode??0);
});
