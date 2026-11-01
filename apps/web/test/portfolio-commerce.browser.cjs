const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn,execFileSync}=require('node:child_process'),{randomUUID}=require('node:crypto'),{chromium,expect}=require('@playwright/test');
const root=path.resolve(__dirname,'../../..'),dir=path.join(root,'.tmp/portfolio-commerce-browser/harness'),out=path.dirname(dir),port=3119,url=`http://localhost:${port}`;
const {startHarness}=require('../../api/test/artist-collections.fixture.cjs');
let h,server,browser;const checks=[],errors=[],requests=[];const check=(name,value)=>{assert(value,name);checks.push(name);};
const write=(file,content)=>{fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});fs.writeFileSync(path.join(dir,file),content);};
(async()=>{
 h=await startHarness({portfolio:true});h.env.portfolioCollectionsEnabled=true;
 const {R2StorageService}=require('../../api/src/storage/r2-storage.service');
 R2StorageService.prototype.getOrCreatePurchasePdf=async function(id,render){const key='purchase:'+id;if(!h.storage.objects.has(key))h.storage.objects.set(key,await render());return h.storage.objects.get(key);};
 const admin=await h.legacy.adminUser.create({data:{email:randomUUID()+'@example.invalid',passwordHash:'isolated-browser-only',name:'Browser admin'}});
 const token=require('../../api/src/modules/auth/auth-crypto').signSessionToken({sub:admin.id,email:admin.email,kind:'admin',exp:Math.floor(Date.now()/1000)+3600},h.env.adminAuthSecret);
 write('package.json',JSON.stringify({private:true}));write('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2022',lib:['DOM','ES2022'],jsx:'preserve',module:'ESNext',moduleResolution:'Bundler',esModuleInterop:true,skipLibCheck:true,strict:true,baseUrl:'../../..',paths:{'@/*':['apps/web/*']}},include:['next-env.d.ts','app/**/*.tsx','.next/types/**/*.ts'],exclude:['node_modules']}));
 write('next.config.js',`const path=require('path');module.exports={reactStrictMode:true,devIndicators:false,experimental:{externalDir:true},webpack(c){c.resolve.alias['@']=path.resolve(__dirname,'../../../apps/web');return c}}`);
 write('postcss.config.mjs',`export default {plugins:{'@tailwindcss/postcss':{}}}`);
 const layout=fs.readFileSync(path.join(root,'apps/web/app/layout.tsx'),'utf8'),fonts=layout.slice(layout.indexOf('const alcyone ='),layout.indexOf('export const metadata')).replaceAll('"./fonts/','"../../../../apps/web/app/fonts/');
 write('app/harness.css',`@import '../../../../apps/web/app/globals.css';\n@source '../../../../apps/web';`);
 write('app/layout.tsx',`import localFont from 'next/font/local';import './harness.css';${fonts}export default function Layout({children}:{children:React.ReactNode}){return <html lang="sr"><body className={alcyone.className+' '+alcyone.variable}>{children}</body></html>}`);
 write('app/page.tsx',`import {GuestPortfolioBuilderForm} from '@/components/guest-portfolio-builder-form';export default function Page(){return <GuestPortfolioBuilderForm/>}`);
 write('app/portfolio-builder/page.tsx',`import {PortfolioBuilderLanding} from '@/components/portfolio-builder-landing';export default function Page(){return <PortfolioBuilderLanding isArtistLoggedIn={true}/>}`);
 for(const [local,source] of [
  ['api/artist/portfolio-projects/from-profile/route.ts','api/artist/portfolio-projects/from-profile/route'],
  ['portfolio-builder/[id]/page.tsx','portfolio-builder/[id]/page'],
  ['portfolio-builder/from-profile/page.tsx','portfolio-builder/from-profile/page'],
  ['api/portfolio-editor/[action]/route.ts','api/portfolio-editor/[action]/route'],
  ['api/portfolio-commerce/[...operation]/route.ts','api/portfolio-commerce/[...operation]/route'],
  ['api/payment-catalog/route.ts','api/payment-catalog/route'],
  ['pretplata/placanje/page.tsx','pretplata/placanje/page'],
  ['api/admin/portfolio-purchases/[id]/preview-pdf/route.ts','api/admin/portfolio-purchases/[id]/preview-pdf/route'],
  ['portfolio-purchase/[id]/page.tsx','portfolio-purchase/[id]/page'],
  ['portfolio-builder/[id]/preview/page.tsx','portfolio-builder/[id]/preview/page'],
  ['portfolio-builder/[id]/download/page.tsx','portfolio-builder/[id]/download/page'],
  ['api/portfolio-projects/[id]/route.ts','api/portfolio-projects/[id]/route'],
  ['api/portfolio-projects/[id]/pdf/route.ts','api/portfolio-projects/[id]/pdf/route'],
  ['api/portfolio-projects/[id]/actions/[...operation]/route.ts','api/portfolio-projects/[id]/actions/[...operation]/route'],
  ['admin/portfolio-purchases/page.tsx','admin/portfolio-purchases/page'],
  ['admin/portfolio-purchases/[id]/page.tsx','admin/portfolio-purchases/[id]/page']]){
   const route=local.endsWith('route.ts');write('app/'+local,`export ${route?'*':'{default}'} from '@/app/${source}';`);
 }
 write('app/owner/[id]/page.tsx',`import {PortfolioBuilderEditorShell} from '@/components/portfolio-builder-editor-shell';import {getArtistSessionToken} from '@/lib/artist-session';import {apiFetch} from '@/services/api';export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const token=await getArtistSessionToken();const project=await apiFetch<any>('/portfolio-projects/me/'+id,{headers:{Authorization:'Bearer '+token},cache:'no-store'});return <PortfolioBuilderEditorShell project={project}/>}`);
 fs.mkdirSync(path.join(dir,'public'),{recursive:true});fs.cpSync(path.join(root,'apps/web/public/artboard-logo'),path.join(dir,'public/artboard-logo'),{recursive:true});
 const env={...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',INTERNAL_API_BASE_URL:h.baseUrl,API_BASE_URL:h.baseUrl};
 if(!process.argv.includes('--reuse-build'))execFileSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:dir,env,stdio:['ignore',fs.openSync(path.join(out,'build.log'),'w'),fs.openSync(path.join(out,'build.err.log'),'w')]});
 server=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-p',String(port)],{cwd:dir,env,stdio:['ignore',fs.openSync(path.join(out,'server.log'),'w'),fs.openSync(path.join(out,'server.err.log'),'w')]});
 for(let n=0;n<120;n++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>{if(r.url().includes('/api/'))requests.push({method:r.method(),url:r.url()});});
 const projects=await h.legacy.portfolioProject.count(),writes=h.storage.calls.length;
 await page.goto(url);await expect(page.getByRole('textbox',{name:'Ime i prezime',exact:true})).toHaveValue('');await expect(page.getByRole('button',{name:'Otvori editor',exact:true})).toHaveCount(0);
 check('Guest entry opens directly in the empty existing editor without a setup form',requests.length===0);
 const unauthenticatedCreate=await context.request.post(url+'/api/artist/portfolio-projects/from-profile');
 check('Real from-profile Next route returns JSON 401 for anonymous requests, without creating a project',unauthenticatedCreate.status()===401&&unauthenticatedCreate.headers()['content-type'].includes('application/json')&&await h.legacy.portfolioProject.count()===projects);
 await page.getByRole('textbox',{name:'Ime i prezime',exact:true}).fill('Browser Guest');await page.getByRole('textbox',{name:'E-mail',exact:true}).fill('browser@example.invalid');
 await expect(page.getByRole('textbox',{name:'Ime i prezime',exact:true})).toHaveValue('Browser Guest');
 await page.locator('nav [data-step="works"]').click();
 const owner=await h.fresh(),png=h.storage.objects.get(owner.a.artworks[0].imageUrl);
 await page.locator('input[type=file][multiple]').setInputFiles({name:'Guest Work.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('img[src^="blob:"]').first()).toBeVisible();check('Guest uploads and previews browser images without API writes',requests.length===0&&h.storage.calls.length===writes);
 await page.locator('nav [data-step="cv"]').click();await page.getByPlaceholder('Vještine koje koristiš u radu').fill('Drawing, painting');
 await page.locator('nav [data-step="design"]').click();
 for(const name of ['Minimal','Tačke','Gradijent','Editorijal','Kartice','Blok'])await expect(page.getByRole('group',{name:'Stilovi portfolija'}).getByRole('button',{name,exact:true})).toBeEnabled();
 await expect(page.getByRole('group',{name:'Stilovi portfolija'}).getByText('Uskoro',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Sačuvaj izbor',exact:true})).toHaveCount(0);
 check('All six template cards are selectable and Guest has no save action',true);
 const coverFonts={A:61.33,B:56,C:61.33,D:48,E:50.67,F:53.33,G:45.33};
 for(const [letter,font] of Object.entries(coverFonts)){
   const heading=page.getByRole('option',{name:new RegExp('^Naslovna strana '+letter+' ·')}).locator('h1');
   const style=await heading.evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),width:el.closest('[aria-hidden="true"]').getBoundingClientRect().width,bold:getComputedStyle(el.lastElementChild).fontWeight}));
   assert(Math.abs(style.size-font*style.width/794)<0.1,letter+' proportional font size');assert.equal(style.bold,'700');
 }
 check('All seven Minimal thumbnails preserve reference font size and bold surname at their actual scale',true);
 await page.getByRole('button',{name:'Tačke',exact:true}).click();
 for(const [letter,font] of Object.entries(coverFonts)){
   const heading=page.getByRole('option',{name:new RegExp('^Naslovna strana '+letter+' ·')}).locator('h1');
   const style=await heading.evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),width:el.closest('[aria-hidden="true"]').getBoundingClientRect().width,first:getComputedStyle(el.firstElementChild).fontWeight,last:getComputedStyle(el.lastElementChild).fontWeight}));
   assert(Math.abs(style.size-font*style.width/794)<0.1);assert.equal(style.first,'700');assert.equal(style.last,'700');
 }
 check('All seven Rounded thumbnails use reference typography, including a bold first name',true);
 await page.getByRole('button',{name:'Gradijent',exact:true}).click();
 for(const [letter,font] of Object.entries(coverFonts)){
   const heading=page.getByRole('option',{name:new RegExp('^Naslovna strana '+letter+' ·')}).locator('h1');
   const style=await heading.evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),width:el.closest('[aria-hidden="true"]').getBoundingClientRect().width,first:getComputedStyle(el.firstElementChild).fontWeight,last:getComputedStyle(el.lastElementChild).fontWeight}));
   assert(Math.abs(style.size-font*style.width/794)<0.1);assert.equal(style.first,'700');assert.equal(style.last,'700');
 }
 const gradientC=await page.getByRole('option',{name:'Naslovna strana C · Centrirano',exact:true}).locator('[aria-hidden="true"] > div').evaluate(el=>getComputedStyle(el).backgroundImage);assert(gradientC.includes('linear-gradient(135deg'));
 check('All seven Gradient thumbnails have the reference fonts and C has its actual gradient frame',true);
 await page.getByRole('button',{name:'Editorijal',exact:true}).click();
 for(const [letter,font] of Object.entries(coverFonts)){
   const heading=page.getByRole('option',{name:new RegExp('^Naslovna strana '+letter+' \u00b7')}).locator('h1');
   const style=await heading.evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),width:el.closest('[aria-hidden="true"]').getBoundingClientRect().width,first:getComputedStyle(el.firstElementChild).fontWeight,last:getComputedStyle(el.lastElementChild).fontWeight}));
   assert(Math.abs(style.size-font*style.width/794)<0.1);assert.equal(style.first,'400');assert.equal(style.last,'700');
 }
 const magazine=page.getByRole('option',{name:'Naslovna strana G \u00b7 Magazin',exact:true});
 assert((await magazine.locator('img').evaluateAll(images=>images.map(img=>getComputedStyle(img).filter))).some(filter=>filter.includes('grayscale(1)')));
 check('Editorial has seven real cover thumbnails with regular first name, bold surname and the G monochrome treatment',true);
 await page.getByRole('button',{name:'Kartice',exact:true}).click();
 for(const [letter,font] of Object.entries(coverFonts)){
   const option=page.getByRole('option',{name:new RegExp('^Naslovna strana '+letter+' \u00b7')}),heading=option.locator('h1');
   const style=await heading.evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),width:el.closest('[aria-hidden="true"]').getBoundingClientRect().width,first:getComputedStyle(el.firstElementChild).fontWeight,last:getComputedStyle(el.lastElementChild).fontWeight}));
   assert(Math.abs(style.size-font*style.width/794)<0.1);assert.equal(style.first,'700');assert.equal(style.last,'700');
   assert.equal(await option.locator('[aria-hidden="true"] > div').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(238, 240, 244)');
 }
 check('Cards has seven proportional, bold-name thumbnails with the reference gray background',true);
 await page.getByRole('button',{name:'Blok',exact:true}).click();
 for(const [letter,font] of Object.entries(coverFonts)){
   const option=page.getByRole('option',{name:new RegExp('^Naslovna strana '+letter+' \u00b7')}),heading=option.locator('h1');
   const style=await heading.evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),width:el.closest('[aria-hidden="true"]').getBoundingClientRect().width,first:getComputedStyle(el.firstElementChild).fontWeight,last:getComputedStyle(el.lastElementChild).fontWeight}));
   assert(Math.abs(style.size-font*style.width/794)<0.1);assert.equal(style.first,'700');assert.equal(style.last,'700');
   const rail=await option.locator('[aria-hidden="true"] > div').evaluate(root=>{const r=root.getBoundingClientRect();return [...root.children].some(el=>{const s=getComputedStyle(el),b=el.getBoundingClientRect();return s.backgroundColor==='rgb(13, 116, 255)'&&Math.abs(b.x-r.x)<.1&&Math.abs(b.height-r.height)<.2&&Math.abs(b.width-r.width*60.5/794)<.2;});});assert(rail,letter+' scaled blue rail');
   await expect(option.locator('[style*="writing-mode: vertical-rl"]')).toHaveCount(1);
 }
 check('Blocks has seven bold-name thumbnails with the correctly scaled blue rail and vertical label',true);
 await page.getByRole('option',{name:'Naslovna strana C · Centrirano',exact:true}).click();
 await page.getByRole('button',{name:'Uvećaj',exact:true}).click();await expect(page.getByRole('dialog',{name:'Pregled naslovnice'})).toBeVisible();await page.getByRole('button',{name:'Sljedeća naslovnica',exact:true}).click();await expect(page.getByRole('button',{name:'Naslovnica D',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Zatvori pregled',exact:true}).click();
 check('Guest Blocks cover selection and modal navigation work entirely in memory',requests.length===0&&await h.legacy.portfolioProject.count()===projects);
 await page.locator('nav [data-step="export"]').click();await expect(page.getByRole('button',{name:'Sačuvaj draft',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'PDF preview',exact:true}).click();await expect(page.locator('iframe[title="Guest PDF preview"]')).toBeVisible({timeout:30000});
 check('Transient PDF preview uses existing renderer without creating a project/order or R2 upload',await h.legacy.portfolioProject.count()===projects&&h.storage.calls.length===writes);
 await page.screenshot({path:path.join(out,'guest-export-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'Pripremi narudžbinu · 4,90 €',exact:true}).click();await expect(page.getByRole('link',{name:'Status narudžbine i isporuka',exact:true})).toBeVisible();
 const purchase=await h.legacy.portfolioPurchase.findFirst({where:{buyerEmail:'browser@example.invalid'},orderBy:{createdAt:'desc'}});assert(purchase);assert.equal(purchase.status,'PENDING');assert.equal(purchase.amountCents,490);assert.equal(purchase.snapshot.cvSections.skills,'Drawing, painting');assert.equal(purchase.snapshot.artworks.length,1);
 check('Explicit Guest checkout freezes content, CV and Blocks cover in purchase record, without a draft',await h.legacy.portfolioProject.count()===projects&&purchase.snapshot.designConfig.minimal.cover==='D'&&purchase.snapshot.designConfig.minimal.style==='BLOCKS');
 const checkoutContext=await context.request.get(url+`/api/portfolio-commerce/purchases/${purchase.id}/checkout-context`);
 const checkoutBody=await checkoutContext.json();check('Guest checkout context uses the scoped cookie and server price',checkoutContext.status()===200&&checkoutBody.amountCents===490&&checkoutBody.buyerEmail==='browser@example.invalid');
 await page.getByRole('link',{name:'Detalji plaćanja',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'E-mail za račun',exact:true})).toHaveValue('browser@example.invalid');
 await expect(page.getByRole('textbox',{name:'E-mail za račun',exact:true})).toHaveAttribute('readonly','');
 await expect(page.getByRole('button',{name:'Plati 4,90 € i preuzmi PDF',exact:true})).toBeDisabled();
 check('Prepared Guest order opens the real shared payment page without creating a draft or enabling an unverified charge',await h.legacy.portfolioProject.count()===projects);
 const cookie=(await context.cookies(url+`/api/portfolio-commerce/purchases/${purchase.id}`)).find(c=>c.name==='portfolio_delivery_'+purchase.id);check('Delivery capability is an HTTP-only, narrowly scoped cookie',cookie?.httpOnly&&cookie.path===`/api/portfolio-commerce/purchases/${purchase.id}`);
 await page.getByRole('link',{name:'Status narudžbine i isporuka',exact:true}).click();await expect(page.getByText('Status: PENDING',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Preuzmi PDF',exact:true})).toHaveCount(0);
 const denied=await context.request.get(url+`/api/portfolio-commerce/purchases/${purchase.id}/pdf`);check('Pending checkout cannot download final PDF',denied.status()===403);
 await h.app.get(require('../../api/src/modules/portfolio-projects/portfolio-commerce.service').PortfolioCommerceService).confirmVerifiedPayment({purchaseId:purchase.id,provider:'allsecure',eventId:randomUUID(),paymentRef:randomUUID(),amountCents:490,currency:'EUR',payloadHash:'c'.repeat(64)});
 await page.reload();await expect(page.getByRole('link',{name:'Preuzmi PDF',exact:true})).toBeVisible();const delivered=await context.request.get(url+`/api/portfolio-commerce/purchases/${purchase.id}/pdf`);check('Server-confirmed payment enables private PDF delivery using the same snapshot',delivered.status()===200&&(await delivered.body()).subarray(0,5).toString()==='%PDF-');
 const anonymous=await browser.newContext();const foreign=await anonymous.request.get(url+`/api/portfolio-commerce/purchases/${purchase.id}`);check('Copied order UUID has no access in another browser',foreign.status()===404);await anonymous.close();
 await context.addCookies([{name:'artboard_admin_session',value:token,url,httpOnly:true,sameSite:'Lax'}]);await page.goto(url+'/admin/portfolio-purchases');await expect(page.getByText('browser@example.invalid',{exact:true})).toBeVisible();await page.getByRole('link',{name:'Detalji',exact:true}).first().click();await expect(page.getByRole('heading',{name:'Sadržaj kupovine',exact:true})).toBeVisible();check('Admin can list and inspect the paid snapshot and delivery history',true);
 await page.getByRole('button',{name:'Opozovi sve linkove za isporuku',exact:true}).click();await expect(page.getByText(/Opozvan/)).toBeVisible();check('Admin revocation invalidates the Guest capability', (await context.request.get(url+`/api/portfolio-commerce/purchases/${purchase.id}`)).status()===404);
 await page.goto(url);await expect(page.getByRole('textbox',{name:'Ime i prezime',exact:true})).toHaveValue('');await expect(page.getByRole('textbox',{name:'E-mail',exact:true})).toHaveValue('');check('New page opens an empty Guest editor without saved drafts',await h.legacy.portfolioProject.count()===projects);
 await page.getByRole('textbox',{name:'Ime i prezime',exact:true}).fill('Discard after refresh');await page.reload();await expect(page.getByRole('textbox',{name:'Ime i prezime',exact:true})).toHaveValue('');check('Refresh discards Guest data and stays inside the editor',true);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'guest-entry-mobile.png'),fullPage:true});
 h.env.r2PrivatePdfBucketName='private-isolated';
 const service=h.app.get(require('../../api/src/modules/portfolio-projects/portfolio-projects.service').PortfolioProjectsService);
 await context.addCookies([{name:'artboard_artist_session',value:owner.a.token,url,httpOnly:true,sameSite:'Lax'}]);
 await page.setViewportSize({width:1440,height:1000});await page.goto(url+'/portfolio-builder');
 h.env.nodeEnv='development'; h.env.r2PrivatePdfBucketName='';
 const initialProjects=await h.legacy.portfolioProject.count(),initialWrites=h.storage.calls.length;
 await page.getByRole('button',{name:/Generi\u0161i iz profila/}).click();
 await expect(page).toHaveURL(url+'/portfolio-builder/from-profile');
 await expect(page.getByRole('textbox',{name:'Ime i prezime',exact:true})).toHaveValue(owner.a.artist.name);
 await expect(page.locator('header[class*="topbar"]').getByText('Nije sa\u010duvano',{exact:true})).toBeVisible();
 check('Generate from profile opens the real owner editor without creating a draft or copying R2 images',await h.legacy.portfolioProject.count()===initialProjects&&h.storage.calls.length===initialWrites);
 await page.getByRole('textbox',{name:'Ime i prezime',exact:true}).fill('Unsaved owner name');
 await page.locator('nav [data-step="works"]').click();
 await page.locator('input[type=file][multiple]').setInputFiles({name:'Owner memory.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('img[src^="blob:"]').first()).toBeVisible();
 check('Authenticated profile uploads stay in the browser before saving',await h.legacy.portfolioProject.count()===initialProjects&&h.storage.calls.length===initialWrites);
 await page.locator('nav [data-step="export"]').click();
 await expect(page.locator('canvas').first()).toBeVisible({timeout:30000});
 const takePdf=async()=>{const event=page.waitForEvent('download');await page.getByRole('button',{name:'Preuzmi testni PDF',exact:true}).click();const download=await event;const target=path.join(out,download.suggestedFilename());await download.saveAs(target);assert.equal(fs.readFileSync(target).subarray(0,5).toString(),'%PDF-');};
 await takePdf();
 check('Unsaved profile downloads a real clean test PDF without a private bucket, draft, quota or version',await h.legacy.portfolioProject.count()===initialProjects&&h.storage.calls.length===initialWrites&&await h.legacy.portfolioExportUsage.count({where:{artistAccountId:owner.a.account.id}})===0);
 await page.getByRole('button',{name:'Bez CV-ja',exact:true}).click();
 check('Section selection in an unsaved profile does not create a draft',await h.legacy.portfolioProject.count()===initialProjects);
 await page.screenshot({path:path.join(out,'profile-unsaved-export.png'),fullPage:true});
 h.app.get(require('../../api/src/modules/portfolio-projects/portfolio-commerce.controller').GuestProcessingGuard).buckets.clear();
 await page.reload(); await expect(page.getByRole('textbox',{name:'Ime i prezime',exact:true})).toHaveValue(owner.a.artist.name);
 check('Refresh resets an unsaved authenticated profile without creating projects',await h.legacy.portfolioProject.count()===initialProjects);
 await page.getByRole('textbox',{name:'Ime i prezime',exact:true}).fill('Explicitly saved owner');
 await page.locator('nav [data-step="design"]').click();await page.getByRole('button',{name:'Blok',exact:true}).click();
 await page.getByRole('option',{name:'Naslovna strana F \u00b7 QR kartica',exact:true}).click();
 const savedResponse=page.waitForResponse(r=>r.url().endsWith('/api/portfolio-editor/save'));
 await page.getByRole('button',{name:'Sa\u010duvaj izbor',exact:true}).click();const saved=await savedResponse;assert.equal(saved.status(),201);const owned=await saved.json();
 await expect(page).toHaveURL(url+`/portfolio-builder/${owned.id}`);
 await expect(page.locator('header[class*="topbar"]').getByText('Sa\u010duvano',{exact:true})).toBeVisible();
 check('Only the explicit Save action creates one draft with the edited data and selected design',await h.legacy.portfolioProject.count()===initialProjects+1&&owned.artistName==='Explicitly saved owner'&&owned.designConfig.minimal.style==='BLOCKS'&&owned.designConfig.minimal.cover==='F');
 await page.locator('nav [data-step="export"]').click();await takePdf();
 check('Existing saved portfolio also has a clean local test download without spending quota',await h.legacy.portfolioVersion.count({where:{portfolioId:owned.id}})===0&&await h.legacy.portfolioExportUsage.count({where:{artistAccountId:owner.a.account.id}})===0);
 h.env.r2PrivatePdfBucketName='private-isolated';
 await page.setViewportSize({width:1440,height:1000});await page.goto(url+`/owner/${owned.id}`);await page.locator('nav [data-step="design"]').click();
 await page.getByRole('option',{name:'Naslovna strana E · Vertikalno',exact:true}).click();await page.getByRole('button',{name:'Sačuvaj izbor',exact:true}).click();
 await expect.poll(async()=> (await h.legacy.portfolioProject.findUnique({where:{id:owned.id}})).designConfig?.minimal?.cover).toBe('E');
 await page.reload();await page.locator('nav [data-step="design"]').click();await expect(page.getByRole('option',{name:'Naslovna strana E · Vertikalno',exact:true})).toHaveAttribute('aria-selected','true');
 check('Authenticated owner saves and reopens the real Minimal cover choice',true);
 await page.getByRole('button',{name:'Tačke',exact:true}).click();await page.getByRole('option',{name:'Naslovna strana F · QR kartica',exact:true}).click();await page.getByRole('button',{name:'Sačuvaj izbor',exact:true}).click();
 await expect.poll(async()=> (await h.legacy.portfolioProject.findUnique({where:{id:owned.id}})).designConfig?.minimal?.style).toBe('ROUNDED');
 await page.reload();await page.locator('nav [data-step="design"]').click();await expect(page.getByRole('button',{name:'Tačke',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('option',{name:'Naslovna strana F · QR kartica',exact:true})).toHaveAttribute('aria-selected','true');
 check('Owner switches from Minimal to Rounded and reopens the saved style and F cover',true);
 await page.getByRole('button',{name:'Gradijent',exact:true}).click();await page.getByRole('option',{name:'Naslovna strana G · Magazin',exact:true}).click();
 await expect(page.locator('[aria-label="Izabrani templejt"]').getByText('Gradijent',{exact:true})).toBeVisible();await expect(page.locator('header[class*="topbar"]').getByText('Nesačuvano',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sačuvaj izbor',exact:true}).click();await expect(page.getByRole('button',{name:'Izbor sačuvan',exact:true})).toBeDisabled();
 await expect(page.locator('header[class*="topbar"]').getByText('Sačuvano',{exact:true})).toBeVisible();
 check('Selected template and unsaved/saved feedback follow the visible save-choice action',true);
 await expect.poll(async()=> (await h.legacy.portfolioProject.findUnique({where:{id:owned.id}})).designConfig?.minimal?.style).toBe('GRADIENT');
 await page.reload();await page.locator('nav [data-step="design"]').click();await expect(page.getByRole('button',{name:'Gradijent',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('option',{name:'Naslovna strana G · Magazin',exact:true})).toHaveAttribute('aria-selected','true');
 check('Owner switches from Rounded to Gradient and reopens the saved style and G cover',true);
 await page.getByRole('button',{name:'Editorijal',exact:true}).click();
 await page.getByRole('option',{name:'Naslovna strana G \u00b7 Magazin',exact:true}).click();
 await page.getByRole('button',{name:'Sa\u010duvaj izbor',exact:true}).click();
 await expect.poll(async()=> (await h.legacy.portfolioProject.findUnique({where:{id:owned.id}})).designConfig?.minimal?.style).toBe('EDITORIAL');
 await page.reload();await page.locator('nav [data-step="design"]').click();
 await expect(page.getByRole('button',{name:'Editorijal',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('option',{name:'Naslovna strana G \u00b7 Magazin',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('[aria-label="Izabrani templejt"]')).toContainText('Editorijal');
 check('Editorial saves through the owner route and reopens with its selected G cover',true);
 await page.getByRole('button',{name:'Kartice',exact:true}).click();
 await page.getByRole('option',{name:'Naslovna strana F \u00b7 QR kartica',exact:true}).click();
 await page.getByRole('button',{name:'Sa\u010duvaj izbor',exact:true}).click();
 await expect.poll(async()=> (await h.legacy.portfolioProject.findUnique({where:{id:owned.id}})).designConfig?.minimal?.style).toBe('CARDS');
 await page.reload();await page.locator('nav [data-step="design"]').click();
 await expect(page.getByRole('button',{name:'Kartice',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('option',{name:'Naslovna strana F \u00b7 QR kartica',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('[aria-label="Izabrani templejt"]')).toContainText('Kartice');
 check('Cards saves through the owner route and reopens with its selected F cover',true);
 await page.getByRole('button',{name:'Blok',exact:true}).click();
 await page.getByRole('option',{name:'Naslovna strana G \u00b7 Magazin',exact:true}).click();
 await page.getByRole('button',{name:'Sa\u010duvaj izbor',exact:true}).click();
 await expect.poll(async()=> (await h.legacy.portfolioProject.findUnique({where:{id:owned.id}})).designConfig?.minimal?.style).toBe('BLOCKS');
 await page.reload();await page.locator('nav [data-step="design"]').click();
 await expect(page.getByRole('button',{name:'Blok',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('option',{name:'Naslovna strana G \u00b7 Magazin',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('[aria-label="Izabrani templejt"]')).toContainText('Blok');
 check('Blocks saves through the owner route and reopens with its selected G cover',true);
 await page.locator('nav [data-step="export"]').click();
 await expect(page.getByText('0 od 1 iskorišćeno',{exact:true})).toBeVisible();
 await expect(page.locator('canvas').first()).toBeVisible({timeout:30000});check('Owner export preview renders actual watermarked API PDF pages in the browser',true);
 let lostReply=true;const exportKeys=[];await page.route('**/actions/generate-pdf',async route=>{exportKeys.push(route.request().headers()['idempotency-key']);const response=await route.fetch();if(lostReply&&response.status()===201){lostReply=false;await route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({message:'Isolated reply lost after commit'})});}else await route.fulfill({response});});
 await page.getByRole('button',{name:'Generiši portfolio PDF',exact:true}).click();await expect(page.getByText('Isolated reply lost after commit',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Generiši portfolio PDF',exact:true}).click();
 await expect(page.getByText('1 od 1 iskorišćeno',{exact:true})).toBeVisible({timeout:30000});await expect(page.getByRole('button',{name:'Dodatni izvoz · 4,90 € · uskoro',exact:true})).toBeDisabled();
 check('Free UI uses the real account quota and disables an extra unpayable export',await h.legacy.portfolioExportUsage.count({where:{artistAccountId:owner.a.account.id,status:'COMMITTED'}})===1);
 check('Retry after a lost response reuses the same operation key and existing version',exportKeys.length===2&&Boolean(exportKeys[0])&&exportKeys[0]===exportKeys[1]);await page.unroute('**/actions/generate-pdf');
 await page.reload();await page.locator('nav [data-step="export"]').click();await expect(page.getByText('1 od 1 iskorišćeno',{exact:true})).toBeVisible();
 const version=await h.legacy.portfolioVersion.findFirst({where:{portfolioId:owned.id}}),download=await context.request.get(url+`/api/portfolio-projects/${owned.id}/actions/versions/${version.id}/pdf`);
 check('Historical PDF retains its own Blocks snapshot and label',version.manifest.designConfig.minimal.style==='BLOCKS');await expect(page.getByRole('region',{name:'Verzije PDF-a'}).getByText(/^Blok ·/)).toBeVisible();
 check('Reload preserves Free quota and historical PDF download does not charge again',download.status()===200&&await h.legacy.portfolioExportUsage.count({where:{artistAccountId:owner.a.account.id,status:'COMMITTED'}})===1);
 await page.getByRole('button',{name:'Pripremi narudžbinu za dodatni izvoz',exact:true}).click();await expect(page.getByRole('link',{name:'Status dodatnog izvoza · ništa nije naplaćeno',exact:true})).toBeVisible();
 const extra=await h.legacy.portfolioPurchase.findFirst({where:{artistAccountId:owner.a.account.id}});check('Extra export preparation binds the authenticated owner, snapshot and server-side price',extra?.amountCents===490&&extra.status==='PENDING'&&extra.portfolioId===owned.id);
 await page.goto(url+`/portfolio-builder/${owned.id}/preview`);await page.getByRole('button',{name:'Otvori čist PDF',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/portfolio-builder/${owned.id}/download`));
 check('Opening the saved clean PDF from preview never generates or spends again',await h.legacy.portfolioExportUsage.count({where:{artistAccountId:owner.a.account.id,status:'COMMITTED'}})===1);
 await page.goto(url+`/owner/${owned.id}`);await page.locator('nav [data-step="export"]').click();
 await page.screenshot({path:path.join(out,'free-quota-desktop.png'),fullPage:true});
 await h.legacy.artistSubscription.create({data:{artistAccountId:owner.b.account.id,plan:'PLATINUM',currentPeriodStart:new Date(Date.now()-86400_000),currentPeriodEnd:new Date(Date.now()+28*86400_000)}});
 const premium=await service.createFromArtistProfile(owner.b.account.id);await context.addCookies([{name:'artboard_artist_session',value:owner.b.token,url,httpOnly:true,sameSite:'Lax'}]);await page.goto(url+`/owner/${premium.id}`);await page.locator('nav [data-step="export"]').click();await expect(page.getByText('0 od 5 iskorišćeno',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Generiši portfolio PDF',exact:true}).click();await expect(page.getByText('1 od 5 iskorišćeno',{exact:true})).toBeVisible({timeout:30000});check('Premium UI reads its real server period and commits one of five exports',await h.legacy.portfolioQuotaPeriod.count({where:{artistAccountId:owner.b.account.id,committed:1,reserved:0}})===1);
 await page.locator('nav [data-step="design"]').click();await page.getByRole('button',{name:'Po sekcijama',exact:true}).click();
 await expect(page.getByRole('button',{name:'Jedan stil',exact:true})).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'Minimal',exact:true}).click();await expect(page.getByRole('button',{name:'Jedan stil',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Sačuvaj izbor',exact:true})).toBeEnabled();
 check('Clicking a template card exits temporary section mixing and selects an actual single PDF style',true);
 check('No browser runtime exceptions',errors.length===0);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,requests,isolatedDatabase:h.database},null,2));console.log(JSON.stringify({passed:checks.length,isolatedDatabase:h.database,errors}));
})().catch(error=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:error.stack,checks,errors,requests},null,2));console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.kill();if(h)await h.close();});
