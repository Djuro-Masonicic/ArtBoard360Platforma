const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");
const sharp = require("sharp");
const { chromium } = require("@playwright/test");

// This standalone Next app lives OUTSIDE apps/web/app. No test route, memory
// entry point, flag or query-string switch is added to the production app.
const workspace = path.resolve(__dirname, "../../..");
const output = path.join(workspace, ".tmp/guest-memory-b1");
const directory = path.join(output, "harness");
fs.mkdirSync(path.join(directory, "app"), { recursive: true });
const beforeFile = path.join(output, "editor-before.tsx");
assert.ok(fs.existsSync(beforeFile), 'Visual comparison requires .tmp/guest-memory-b1/editor-before.tsx captured before the change.');
function write(file, source) { fs.writeFileSync(path.join(directory, file), source); }
write("package.json", JSON.stringify({ private: true }));
write("tsconfig.json", JSON.stringify({
  compilerOptions: { target: "ES2022", lib: ["DOM", "ES2022"], jsx: "preserve", module: "ESNext", moduleResolution: "Bundler", esModuleInterop: true, skipLibCheck: true, strict: true, baseUrl: "../../..", paths: { "@/*": ["apps/web/*"] } },
  include: ["next-env.d.ts", "app/**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"],
}));
write("next.config.js", `const path = require('node:path'); module.exports = { reactStrictMode: true, devIndicators: false, experimental: { externalDir: true }, webpack(config) { config.resolve.alias['@'] = path.resolve(__dirname, '../../../apps/web'); return config; } };`);
write("postcss.config.mjs", `export default { plugins: { '@tailwindcss/postcss': {} } };`);
fs.mkdirSync(path.join(directory, "public"), { recursive: true });
fs.cpSync(path.join(workspace, "apps/web/public/artboard-logo"), path.join(directory, "public/artboard-logo"), { recursive: true });
const rootLayout = fs.readFileSync(path.join(workspace, "apps/web/app/layout.tsx"), "utf8");
const fontDefinition = rootLayout.slice(rootLayout.indexOf("const alcyone ="), rootLayout.indexOf("export const metadata"))
  .replaceAll('"./fonts/', '"../../../../apps/web/app/fonts/');
write("app/harness.css", `@import "../../../../apps/web/app/globals.css";\n@source "../../../../apps/web";\n@source "../../editor-before.tsx";`);
write("app/layout.tsx", `import localFont from 'next/font/local'; import './harness.css'; ${fontDefinition}
export default function Layout({ children }: {children: React.ReactNode}) { return <html lang="sr"><body className={alcyone.variable}>{children}</body></html>; }`);
write("app/page.tsx", `import Harness from './session'; export default async function Page({searchParams}: {searchParams: Promise<Record<string,string>>}) { const query = await searchParams; return <Harness version={query.version ?? 'after'} mode={query.mode ?? 'memory'} />; }`);
write("app/session.tsx", `"use client";
import {useEffect,useState} from 'react';
import {PortfolioBuilderEditorShell as Before} from '../../editor-before';
import {PortfolioBuilderEditorShell as After} from '@/components/portfolio-builder-editor-shell';
import {createGuestPortfolioMemoryAdapter} from '@/lib/guest-portfolio-memory';
import type {PortfolioProject} from '@/types/api';
const sampleImage = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#345977"/></svg>');
export default function Harness({version,mode}:{version:string;mode:string}) {
 const [memory] = useState(()=>createGuestPortfolioMemoryAdapter({artistName:'Guest Test',email:'guest@example.invalid'}));
 const [shown,setShown] = useState(true);
 const [project] = useState<PortfolioProject>(()=> mode==='memory' ? memory.getSnapshot() : {
  ...memory.getSnapshot(), id:'8230ec27-962d-4bb9-8d7e-42150f2fb8ea', source:mode==='legacy'?'GUEST':'ARTBOARD_PROFILE',
  artistName:'Test Umjetnik', title:'Test Portfolio', biography:'Biografija za provjeru izgleda editora.',
  discipline:'Slikarstvo', email:'test@example.invalid', location:'Podgorica',
  collectionName:'Test kolekcija', collectionYear:'2026', collectionDescription:'Opis kolekcije.',
  profileImageUrl:sampleImage, coverImageUrl:sampleImage, collectionCoverUrl:sampleImage,
  access:{canDownloadCleanPdf:mode==='premium',requiresPayment:mode!=='premium',reason:mode==='premium'?'PREMIUM':'PAYMENT_REQUIRED'},
  artworks:Array.from({length:6},(_,i)=>({id:'artwork-'+i,portfolioId:'8230ec27-962d-4bb9-8d7e-42150f2fb8ea',imageUrl:sampleImage,title:'Rad '+(i+1),isSelected:true,availability:'UNKNOWN',orderIndex:i,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'})),
  counts:{artworks:6,selectedArtworks:6,versions:0,payments:0}
 });
 useEffect(()=>{ (window as any).__b1={initial:project,adapter:memory,unmount:()=>setShown(false)}; },[memory,project]);
 const Editor=version==='before'?Before:After;
 return shown ? <Editor project={project} {...(version==='after'&&mode==='memory'?{adapter:memory}:{})}/> : <div data-testid="unmounted">Unmounted</div>;
}`);

const checks = [], comparisons = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); };
let server, browser;
const port = Number(process.env.GUEST_MEMORY_TEST_PORT ?? 3107);
const url = (mode, version = "after") => `http://localhost:${port}/?mode=${mode}&version=${version}`;
async function settled(page) {
  await page.locator("main").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => Boolean(window.__b1));
  // Keep screenshot comparisons independent of hover transitions and animation
  // timing. This stylesheet exists only in the isolated test browser.
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
}
async function comparePixels(before,after) {
  const a=await sharp(before).raw().toBuffer({resolveWithObject:true});
  const b=await sharp(after).raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(a.info,b.info,'Screenshot dimensions must be identical');
  let different=0;
  for(let i=0;i<a.data.length;i+=a.info.channels) {
    if(Array.from({length:a.info.channels},(_,c)=>Math.abs(a.data[i+c]-b.data[i+c])).some(delta=>delta>2))different++;
  }
  // Allow at most 0.1% browser rasterization noise at DPR 1.25 (fractional
  // image/card boundaries), while comparing layout
  // geometry separately. Do not mask or crop any editor region.
  return different/(a.info.width*a.info.height);
}
async function step(page, id) {
  const desktop = page.locator(`nav[aria-label="Koraci izrade portfolija"] button[data-step="${id}"]`);
  if (await desktop.isVisible()) await desktop.click();
  else await page.getByRole("button", { name: {profile:"1. Podaci",works:"2. Radovi",design:"3. Dizajn",export:"4. Izvoz"}[id], exact:true }).click();
}
async function layout(page) {
  return page.evaluate(() => {
    const read = (part) => {
      const pattern=new RegExp('(?:^|_)'+part+'(?:_|$)');
      const el = Array.from(document.querySelectorAll('[class]')).find(el=>Array.from(el.classList).some(name=>pattern.test(name)));
      const r=el.getBoundingClientRect(), c=getComputedStyle(el);
      return {x:r.x,y:r.y,width:r.width,height:r.height,position:c.position,top:c.top};
    };
    return {header:read('topbar'),sidebar:read('sidebar'),editor:read('editorColumn'),preview:read('previewPanel'),overflow:document.documentElement.scrollWidth-innerWidth};
  });
}
(async()=>{
  process.env.NEXT_TELEMETRY_DISABLED = "1";
  execFileSync(process.execPath,[require.resolve('next/dist/bin/next'),'build','--webpack'],{cwd:directory,stdio:'inherit',windowsHide:true});
  server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--port',String(port),'--hostname','localhost'],{cwd:directory,stdio:'inherit',windowsHide:true,env:{...process.env,NODE_ENV:'production'}});
  let ready=false;
  for(let attempt=0;attempt<60;attempt++) {
    if(server.exitCode!==null)throw new Error('Isolated Next server exited before becoming ready');
    try{const response=await fetch(url('memory'));if(response.ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.ok(ready,'Isolated Next server must start');
  console.log('Isolated production test server ready');
  browser = await chromium.launch({channel:"chrome",headless:true});
  const context = await browser.newContext({viewport:{width:1536,height:900},deviceScaleFactor:1.25,reducedMotion:"reduce"});
  await context.addInitScript(()=>{
    const created=[],revoked=[],storage=[];
    const make=URL.createObjectURL.bind(URL),release=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=(file)=>{const value=make(file);created.push(value);return value;};
    URL.revokeObjectURL=(value)=>{revoked.push(value);release(value);};
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
    Storage.prototype.getItem=function(key){if(key.includes('portfolio'))storage.push(['get',key]);return get.call(this,key);};
    Storage.prototype.setItem=function(key,value){if(key.includes('portfolio'))storage.push(['set',key]);return set.call(this,key,value);};
    window.__resources={created,revoked,storage};
  });
  const page = await context.newPage(); const errors=[],requests=[]; let backendProject;
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/api/**",async route=>{
    const request=route.request();requests.push({url:request.url(),method:request.method()});
    if (!backendProject) return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Unexpected memory request'})});
    const body=request.postDataJSON();
    if(body && request.method()==='PATCH')Object.assign(backendProject,body);
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(backendProject)});
  });
  await page.goto(url("memory")); await settled(page);
  check('production Tailwind utility styles are loaded',await page.locator('input[type=file]').first().evaluate(el=>getComputedStyle(el).display==='none'));
  check("Guest header has no save-draft action",await page.getByRole('button',{name:'Sačuvaj draft',exact:true}).count()===0);
  check("unimplemented PDF preview is disabled",await page.getByRole('button',{name:'Otvori pregled',exact:true}).isDisabled());
  check("incomplete capabilities are explained",(await page.locator('main').innerText()).includes('čekaju narednu fazu'));
  await page.getByRole('button',{name:'Svijetla tema',exact:true}).click();
  const name=page.locator('input[value="Guest Test"]'); await name.fill("Privremeni Umjetnik");
  await page.waitForFunction(()=>window.__b1.adapter.getSnapshot().artistName==='Privremeni Umjetnik');
  check("Guest metadata updates without saving",true);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0t0AAAAASUVORK5CYII=','base64');
  const profileUpload=page.locator('input[type=file]').first();
  await profileUpload.setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>Boolean(window.__b1.adapter.getSnapshot().profileImageUrl));
  const oldPortrait=await page.evaluate(()=>window.__b1.adapter.getSnapshot().profileImageUrl);
  await profileUpload.setInputFiles({name:'new-portrait.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction((url)=>window.__resources.revoked.includes(url),oldPortrait);
  check('profile replacement releases the old temporary image',true);
  await page.locator('input[type=file]').nth(1).setInputFiles({name:'cover.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>Boolean(window.__b1.adapter.getSnapshot().collectionCoverUrl));
  check('profile and existing collection cover fields use local files',await page.getByAltText('Profilna slika',{exact:true}).getAttribute('src').then(src=>src.startsWith('blob:')));
  await step(page,"works");
  await page.locator('input[type=file]').first().setInputFiles([{name:'first.png',mimeType:'image/png',buffer:png},{name:'second.png',mimeType:'image/png',buffer:png}]);
  await page.waitForFunction(()=>window.__b1.adapter.getSnapshot().artworks.length===2);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('aside img[src^="blob:"]')).some(img=>img.complete&&img.naturalWidth>0));
  check("live preview renders local blob images",true);
  const first=await page.evaluate(()=>window.__b1.adapter.getSnapshot().artworks[0]);
  await page.getByRole('button',{name:'Uredi',exact:true}).first().click();
  const dialog=page.getByRole('dialog',{name:'Detalji rada'});
  await dialog.getByLabel('Naziv rada',{exact:true}).fill('Izmijenjeni rad');
  await dialog.getByLabel('Tehnika',{exact:true}).fill('Ulje');
  await dialog.getByRole('button',{name:'Sacuvaj rad',exact:true}).click();
  await page.waitForFunction(()=>window.__b1.adapter.getSnapshot().artworks[0].title==='Izmijenjeni rad');
  check('work details are editable without the backend',true);
  const cards=page.locator('article[draggable]');
  await cards.nth(1).dragTo(cards.first());
  await page.waitForFunction((id)=>window.__b1.adapter.getSnapshot().artworks[1].id===id,first.id);
  check('drag reorder applies to the memory document',true);
  await page.getByRole('button',{name:'U PDF-u',exact:true}).first().click();
  await page.waitForFunction(()=>window.__b1.adapter.getSnapshot().counts.selectedArtworks===1);
  check("work selection updates memory and counters",true);
  await page.screenshot({path:path.join(output,'memory-works.png')});
  await step(page,'design');
  check("Guest design has no save-settings action",await page.getByRole('button',{name:'Sačuvaj podešavanja',exact:true}).count()===0);
  await page.getByRole('button',{name:'Letter',exact:true}).click();
  await page.getByRole('button',{name:'English',exact:true}).click();
  await page.getByRole('button',{name:'Serif',exact:true}).click();
  await page.waitForFunction(()=>{const p=window.__b1.adapter.getSnapshot();return p.pageFormat==='US_LETTER'&&p.language==='EN'&&p.fontStyle==='SERIF';});
  check("design changes apply locally",true);
  await step(page,'export');
  check("all incomplete export actions are disabled",await page.locator('[class*="exportContent"] button:not([disabled])').count()===0);
  check("memory operations made no API calls",requests.length===0);
  check("memory theme/document never uses portfolio localStorage",await page.evaluate(()=>window.__resources.storage.length===0));
  const urls=await page.evaluate(()=>window.__resources.created.slice());
  await page.evaluate(()=>window.__b1.unmount());
  await page.getByTestId('unmounted').waitFor();
  await page.waitForFunction(()=>window.__resources.revoked.length===window.__resources.created.length);
  check("real unmount releases every object URL",urls.length===5);
  await page.reload(); await settled(page);
  check("refresh starts a fresh empty session",await page.evaluate(()=>{const p=window.__b1.adapter.getSnapshot();return p.artworks.length===0&&p.artistName==='Guest Test';}));
  check("old work cannot be restored after refresh",await page.evaluate((oldId)=>!window.__b1.adapter.getSnapshot().artworks.some(a=>a.id===oldId),first.id));
  check("refresh still made no API calls",requests.length===0);
  console.log('Memory editor checks complete');

  for (const mode of ['premium','free','legacy']) {
    for (const width of [1536,375]) {
      await page.setViewportSize({width,height:900});
      for (const theme of ['light','dark']) {
        const baseline={};
        for (const version of ['before','after']) {
          await page.goto(url(mode,version));await settled(page);
          await page.getByRole('button',{name:theme==='light'?'Svijetla tema':'Tamna tema',exact:true}).click();
          for(const active of ['profile','works','design','export']) {
            await step(page,active);await page.evaluate(()=>scrollTo(0,0));
            const screenshot=await page.locator('main').screenshot({animations:'disabled',caret:'hide'});
            const key=mode+'-'+width+'-'+theme+'-'+active;
            const geometry=await layout(page);
            if(version==='before')baseline[active]={screenshot,geometry};
            else {
              assert.deepEqual(geometry,baseline[active].geometry,'Unchanged layout '+key);
              const difference=await comparePixels(baseline[active].screenshot,screenshot);
              if(difference>0.001) {
                fs.writeFileSync(path.join(output,'mismatch-before-'+key+'.png'),baseline[active].screenshot);
                fs.writeFileSync(path.join(output,'mismatch-after-'+key+'.png'),screenshot);
              }
              check('visual comparison '+key,difference<=0.001);comparisons.push({key,difference});
              if(mode==='premium'&&theme==='light'&&active==='profile')fs.writeFileSync(path.join(output,'account-'+width+'.png'),screenshot);
            }
          }
        }
      }
    }
    console.log('Visual comparisons complete: '+mode);
  }
  await page.setViewportSize({width:1536,height:650});await page.goto(url('premium'));await settled(page);
  await page.getByRole('button',{name:'Svijetla tema',exact:true}).click();
  for(const width of [1536,1521,1440,1280,1279,1024,768,640,440,375,320]) {
    await page.setViewportSize({width,height:650}); const m=await layout(page);
    check('Phase 1: no overflow at '+width,m.overflow<=0);
    if(width>=1280)check('Phase 1: three columns at '+width,Math.abs(m.sidebar.y-m.editor.y)<1&&Math.abs(m.editor.y-m.preview.y)<1);
  }
  await page.setViewportSize({width:1536,height:650});
  const avatar=page.locator('[class*="sidebarAvatar"]').first();
  check('Phase 2: avatar remains 72px',Math.abs((await avatar.boundingBox()).width-72)<0.1);
  check('Phase 2: exactly four steps',await page.locator('nav[aria-label="Koraci izrade portfolija"] button').count()===4);
  check('Phase 2: Premium badge remains entitlement-based',await page.locator('[class*="premiumBadge"]').count()===1);
  await page.evaluate(()=>scrollTo(0,250));const sticky=await layout(page);
  check('Phase 1: sticky header',Math.abs(sticky.header.y)<1);
  check('Phase 1: sticky preview',Math.abs(sticky.preview.y-84)<1);
  check('no runtime errors',errors.length===0);
  for(const mode of ['free','premium']) {
    await page.goto(url(mode));await settled(page);backendProject=await page.evaluate(()=>window.__b1.initial);
    const previous=requests.length;
    await page.locator('input[value="Test Umjetnik"]').fill('Backend Test');
    await page.getByRole('button',{name:'Sačuvaj draft',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[class*="profileIdentity"]').textContent.includes('Backend'));
    check(mode+' default adapter still calls the existing authenticated proxy',requests.length===previous+1&&requests.at(-1).method==='PATCH');
  }
  check('no runtime errors after backend update',errors.length===0);
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({complete:true,checks,comparisons,requests,errors},null,2));
  console.log(JSON.stringify({checks:checks.length,pixelComparisons:comparisons.length,requests,errors}));
})().catch(error=>{
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({complete:false,checks,comparisons,failure:error.stack},null,2));
  console.error(error);process.exitCode=1;
}).finally(async()=>{
  if(browser)await browser.close();
  if(server&&server.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});
  process.exit(process.exitCode ?? 0);
});
