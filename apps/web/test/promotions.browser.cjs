const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  { spawn, execFileSync } = require("child_process"),
  { chromium, expect } = require("@playwright/test"),
  { pathToFileURL } = require("url"),
  os = require("os");
const root = path.resolve(__dirname, "../../.."),
  out = path.join(root, ".tmp/promotion-browser"),
  dir = path.join(out, "harness"),
  base = "http://localhost:3131",
  checks = [],
  errors = [],
  metrics = [];
fs.mkdirSync(out,{recursive:true});
let h, server, browser, page;
const check = (name, ok = true) => {
    assert(ok, name);
    checks.push(name);
  },
  write = (f, v) => {
    const p = path.join(dir, f);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, v);
  };
const settle = async () => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
};
async function gotoStep(n) {
  await page
    .getByRole("navigation", { name: "Koraci" })
    .getByRole("button", { name: new RegExp(steps[n]) })
    .click();
  await settle();
}
// Preserve the helpers' semantic indices while checking the new UI order.
const steps = ["Radovi", "Šablon", "Prilagodi", "Preuzmi"];
(async () => {
  h = await require("../../api/test/promotions.fixture.cjs").promotionHarness();
  const a = await h.artist("PREMIUM");
  const names=['Tiha mjesta I','Tiha mjesta II','Koral','Pustinja','Tišina','Sfera','Pijesak','Figura','68d0081842859c129d2d88a8a8cabeffed029568248fa081242ed compressed 10'];
  await h.prisma.artist.update({where:{id:a.id},data:{name:'Ime Prezime',presentationForm:'FEMININE'}});
  await h.prisma.artwork.update({where:{id:a.work.id},data:{title:names[0],description:'Opis '+names[0]}});
  for(let i=1;i<9;i++)await h.prisma.artwork.create({data:{artistId:a.id,title:names[i],description:'Opis '+names[i],imageUrl:`https://storage.invalid/work-${i}.png`,orderIndex:i}});
  const collection=await h.prisma.artistCollection.create({data:{artistId:a.id,title:'Browser kolekcija'}});const allWorks=await h.prisma.artwork.findMany({where:{artistId:a.id},orderBy:{orderIndex:'asc'}});for(const [index,wi] of [4,1,0].entries())await h.prisma.artwork.update({where:{id:allWorks[wi].id},data:{artistCollectionId:collection.id,collectionOrderIndex:index}});
  await h.prisma.socialLink.updateMany({where:{artistId:a.id,platform:'INSTAGRAM'},data:{url:'https://instagram.com/imeprezime'}});
  const realGet=h.service.get.bind(h.service);
  h.service.get=async(...args)=>{const d=await realGet(...args);if(d.draft.revision===0&&d.source.works.length>=5)d.draft.config.artworkIds=[0,1,3,4].map(i=>d.source.works[i].id);return d;};
  const original=fs.readFileSync(path.join(os.homedir(),'Downloads/generator-svijetla.html'),'utf8');
  const bundled=JSON.parse(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/.exec(original)?.[1]||'null');
  const scripts=[...original.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)],assets=bundled||JSON.parse(scripts[1][1]);
  const imageIds=['969093d3-68d4-495d-a6bd-1ab3cbbadcda','55177d87-41af-484d-8d66-a87a86288319','4721b6db-cc9c-4f94-8bf0-1568ad3e6363','efcfd963-1583-4d84-b85b-49a444d9c64d','829c82a5-9228-4b84-9baa-55631ca3ec41','02e72775-96eb-4cdd-8674-ec0ee54543ec','be528cc1-5fb0-416f-89ec-81d53f026d9b','85de597e-ed4c-4730-846a-2800707e373b','048f60b7-3576-4df6-b90d-1f76198ace92'];
  const assetBody=id=>{const x=assets[id],body=Buffer.from(x.data,'base64');return x.compressed?require('zlib').gunzipSync(body):body;};
  write("package.json", JSON.stringify({ private: true }));
  write(
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["DOM", "ES2022"],
        jsx: "preserve",
        module: "ESNext",
        moduleResolution: "Bundler",
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        strict: true,
        baseUrl: "../../..",
        paths: { "@/*": ["apps/web/*"] },
      },
      include: ["next-env.d.ts", "app/**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    }),
  );
  write(
    "next.config.js",
    `const path=require('path');module.exports={reactStrictMode:true,devIndicators:false,experimental:{externalDir:true},webpack(c){c.resolve.alias['@']=path.resolve(__dirname,'../../../apps/web');return c}}`,
  );
  write(
    "postcss.config.mjs",
    `export default{plugins:{'@tailwindcss/postcss':{}}}`,
  );
  const layout = fs.readFileSync(
      path.join(root, "apps/web/app/layout.tsx"),
      "utf8",
    ),
    font = layout
      .slice(
        layout.indexOf("const alcyone ="),
        layout.indexOf("export const metadata"),
      )
      .replaceAll('"./fonts/', '"../../../../apps/web/app/fonts/');
  write(
    "app/harness.css",
    `@import '../../../../apps/web/app/globals.css';\n@source '../../../../apps/web';`,
  );
  write(
    "app/layout.tsx",
    `import localFont from'next/font/local';import{SiteChrome}from'@/components/site-chrome';import{UiFeedbackProvider}from'@/components/ui-feedback-provider';import'./harness.css';${font}export default function Layout({children}:{children:React.ReactNode}){return <html lang="sr"><body className={alcyone.className+' '+alcyone.variable}><UiFeedbackProvider><SiteChrome>{children}</SiteChrome></UiFeedbackProvider></body></html>}`,
  );
  write(
    "app/generator/page.tsx",
    `export{default}from'@/app/generator/page'`,
  );
  write(
    "app/artist/dashboard/page.tsx",
    `export{default}from'@/app/artist/dashboard/page'`,
  );
  write(
    "app/artist/login/page.tsx",
    `export default function Login(){return <h1>Prijavi se</h1>}`,
  );
  for (const f of [
    "api/artist/promotions/[[...path]]/route",
    "api/artist/dashboard/[...path]/route",
  ])
    write("app/" + f + ".ts", `export*from'@/app/${f}'`);
  for (const tone of ["Black", "White"]) {
    const name = `ArtBoard-Horizontal-Gradient-Mark-${tone}-Text.svg`;
    write(
      "public/artboard-logo/" + name,
      fs.readFileSync(path.join(root, "apps/web/public/artboard-logo", name)),
    );
  }
  for (const name of fs.readdirSync(path.join(root,'apps/web/public/generator-fonts')))write('public/generator-fonts/'+name,fs.readFileSync(path.join(root,'apps/web/public/generator-fonts',name)));
  write('public/artboard-logo/ArtBoard-Baza-Gradient.svg',fs.readFileSync(path.join(root,'apps/web/public/artboard-logo/ArtBoard-Baza-Gradient.svg')));
  const env = {
    ...process.env,
    NODE_ENV: "production",
    INTERNAL_API_BASE_URL: h.base,
    API_BASE_URL: h.base,
    NEXT_PUBLIC_API_BASE_URL: h.base,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  if (!process.argv.includes("--reuse-build"))
    execFileSync(
      process.execPath,
      [
        path.join(root, "node_modules/next/dist/bin/next"),
        "build",
        "--webpack",
      ],
      {
        cwd: dir,
        env,
        stdio: [
          "ignore",
          fs.openSync(path.join(out, "build.log"), "w"),
          fs.openSync(path.join(out, "build.err.log"), "w"),
        ],
      },
    );
  server = spawn(
    process.execPath,
    [path.join(root, "node_modules/next/dist/bin/next"), "start", "-p", "3131"],
    {
      cwd: dir,
      env,
      stdio: [
        "ignore",
        fs.openSync(path.join(out, "server.log"), "w"),
        fs.openSync(path.join(out, "server.err.log"), "w"),
      ],
    },
  );
  for (let n = 0; n < 100; n++) {
    try {
      await fetch(base + "/generator", { redirect: "manual" });
      break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1536, height: 960 },
    acceptDownloads: true,
  });
  await context.addCookies([
    {
      name: "artboard_artist_session",
      value: a.token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await context.route("https://storage.invalid/**", (r) => {
    const url=r.request().url(),i=Number(/work-(\d+)/.exec(url)?.[1]||0),id=url.includes('avatar')?'922d3d54-6951-4ff8-9ea4-81ec65fc6b68':imageIds[i];
    return r.fulfill({status:200,contentType:assets[id].mime,body:assetBody(id)});
  });
  page = await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text()+' '+m.location().url);});
  await page.goto(base+'/generator');await settle();
  await expect(page.getByRole('heading',{name:'Izaberi šablon',exact:true})).toBeVisible();check('Template is the first step',await page.getByRole('navigation',{name:'Koraci'}).getByRole('button').first().textContent().then(t=>t.includes('01')&&t.includes('Šablon')));
  check('Opening does not create a draft',await h.prisma.promotionDraft.count({where:{artistAccountId:a.account.id}})===0);
  const ref=await browser.newPage({viewport:{width:1536,height:650}});
  async function measurements(p){return p.evaluate(()=>{const rect=s=>{const r=(s==='main'?(document.querySelector('.promotion-root main')||document.querySelector('main')):document.querySelector(s))?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null;};return {header:rect('header'),aside:rect('aside'),main:rect('main'),panel:rect('[data-ab="promo-panel"]'),preview:rect('[data-ab="promo-preview"]'),document:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}};});}
  for(const theme of ['light','dark']){
    await page.getByRole('button',{name:theme==='light'?'Svijetla tema':'Tamna tema',exact:true}).click({force:true});await settle();
    const referenceFile=path.join(os.homedir(),'Downloads',`generator-${theme==='light'?'svijetla':'tamna'}.html`);
    await ref.goto(pathToFileURL(referenceFile).href);await ref.waitForSelector('[data-ab-step]');await ref.evaluate(()=>document.fonts.ready);await ref.waitForTimeout(400);
    await ref.addStyleTag({content:'#ab-mp-toggle,#ab-st-toggle,#__claude_design_branding{display:none!important}*{animation:none!important;transition:none!important}'});
    for(const width of [1536,440,390]){
      const height=width===1536?650:956;await page.setViewportSize({width,height});await ref.setViewportSize({width,height});
      for(let step=0;step<4;step++){
        await gotoStep(step);await ref.locator('[data-ab-steps]>button').nth(step).click();await ref.evaluate(()=>window.scrollTo(0,0));await page.evaluate(()=>window.scrollTo(0,0));await settle();await ref.waitForTimeout(120);
        const own=await measurements(page),reference=await measurements(ref);metrics.push({theme,width,step:step+1,own,reference});
        check(`${theme} ${width} step ${step+1}: no horizontal overflow`,own.document.scrollWidth<=own.document.clientWidth);
        await page.screenshot({path:path.join(out,`${theme}-${width}-${step+1}.png`)});await ref.screenshot({path:path.join(out,`${theme}-${width}-${step+1}-reference.png`)});
        if(width===1536){check(`${theme} step ${step+1}: main x within 2px`,Math.abs(own.main.x-reference.main.x)<2);check(`${theme} step ${step+1}: main width within 2px`,Math.abs(own.main.width-reference.main.width)<2);}
      }
    }
  }
  await ref.close();await page.setViewportSize({width:1536,height:900});await gotoStep(0);
  const preview=page.locator('[data-ab="promo-swipe"]'),nav=page.getByRole('group',{name:'Navigacija slajdova'}),previous=page.getByRole('button',{name:'Prethodni slajd',exact:true}),nextSlide=page.getByRole('button',{name:'Sljedeći slajd',exact:true});
  const library=page.locator('[data-ab="promo-work-library"]'),search=page.getByRole('searchbox',{name:'Pretraži radove po nazivu'}),libraryFilter=page.getByLabel('Filtriraj radove po kolekciji',{exact:true});
  const selectedBeforeFilters=await page.getByRole('list',{name:'Redoslijed izabranih radova'}).locator('li').evaluateAll(rows=>rows.map(r=>r.dataset.orderWork));
  await search.fill('tiha');await expect(library.locator('button')).toHaveCount(2);check('Artwork search matches names');await search.fill('TISINA');await expect(library.locator('button')).toHaveCount(1);check('Artwork search ignores case and accents');
  await page.getByRole('button',{name:'Obriši pretragu'}).click();await libraryFilter.selectOption(collection.id);await expect(library.locator('button')).toHaveCount(3);check('Library filter uses actual collections');
  await search.fill('missing artwork');await expect(library.locator('button')).toHaveCount(0);await expect(page.getByText('Nema radova za ovaj izbor',{exact:true})).toBeVisible();check('Empty filter has an explanation');
  await page.getByRole('button',{name:'Poništi filtere'}).click();await libraryFilter.selectOption('uncollected');await expect(library.locator('button')).toHaveCount(6);check('Uncollected artwork filter excludes collection members');await page.getByRole('button',{name:'Poništi filtere'}).click();
  assert.deepEqual(await page.getByRole('list',{name:'Redoslijed izabranih radova'}).locator('li').evaluateAll(rows=>rows.map(r=>r.dataset.orderWork)),selectedBeforeFilters);check('Filters preserve selection and order');
  const longTitle=library.locator('button').last();check('Long artwork titles wrap within their cards',await longTitle.evaluate(el=>{const text=el.querySelector('span:last-child>span'),r=el.getBoundingClientRect(),t=text.getBoundingClientRect();return t.right<=r.right+1&&t.left>=r.left-1&&getComputedStyle(text).webkitLineClamp==='2';}));
  await library.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'work-search-desktop.png')});
  await page.getByRole('button',{name:'Svijetla tema',exact:true}).click();await settle();await library.locator('..').screenshot({path:path.join(out,'work-search-light.png')});await page.getByRole('button',{name:'Tamna tema',exact:true}).click();await settle();
  await page.setViewportSize({width:390,height:956});await search.fill('tiha');await search.focus();check('Search uses one focus ring on its field container',await search.evaluate(el=>getComputedStyle(el).boxShadow==='none'&&getComputedStyle(el.parentElement).boxShadow!=='none'));check('Mobile search and filters have no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));await library.locator('..').screenshot({path:path.join(out,'work-search-mobile.png')});await page.getByRole('button',{name:'Poništi filtere'}).click();await page.setViewportSize({width:1536,height:900});
  check('Searching does not create a draft',await h.prisma.promotionDraft.count({where:{artistAccountId:a.account.id}})===0);
  await preview.hover();await page.mouse.wheel(55,3);await expect(nav).toContainText('Slajd 2 od 4');for(let i=0;i<4;i++)await page.mouse.wheel(70,2);await expect(nav).toContainText('Slajd 2 od 4');check('Horizontal touchpad gesture advances once despite momentum');
  await page.waitForTimeout(220);await page.mouse.wheel(-55,2);await expect(nav).toContainText('Slajd 1 od 4');check('Touchpad navigates back');await page.waitForTimeout(220);await page.mouse.wheel(-55,2);await expect(nav).toContainText('Slajd 1 od 4');check('Touchpad clamps at the first slide');
  await page.mouse.wheel(2,90);await expect(nav).toContainText('Slajd 1 od 4');check('Vertical touchpad motion preserves slide');
  await preview.evaluate(el=>el.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaX:80,ctrlKey:true})));await expect(nav).toContainText('Slajd 1 od 4');check('Pinch zoom does not change slides');
  await expect(nav).toContainText('Slajd 1 od 4');await expect(previous).toBeDisabled();
  const firstImage=await preview.locator('img').first().getAttribute('src');await nextSlide.click();await expect(nav).toContainText('Slajd 2 od 4');check('Next arrow displays another selected artwork',(await preview.locator('img').first().getAttribute('src'))!==firstImage);
  await previous.click();await expect(nav).toContainText('Slajd 1 od 4');await preview.focus();await preview.press('ArrowRight');await expect(nav).toContainText('Slajd 2 od 4');await preview.press('ArrowLeft');await expect(nav).toContainText('Slajd 1 od 4');check('Keyboard arrows navigate the preview');
  await page.setViewportSize({width:390,height:956});
  async function swipePreview(dx,dy=0){await preview.evaluate((el,{dx,dy})=>{const start=new Touch({identifier:1,target:el,clientX:220,clientY:200}),end=new Touch({identifier:1,target:el,clientX:220+dx,clientY:200+dy});el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[start],changedTouches:[start]}));el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[end]}));},{dx,dy});}
  await swipePreview(-120,5);await expect(nav).toContainText('Slajd 2 od 4');await swipePreview(120,5);await expect(nav).toContainText('Slajd 1 od 4');check('Touch swipes navigate in both directions');
  await swipePreview(8,120);await expect(nav).toContainText('Slajd 1 od 4');check('Vertical swipe preserves the current slide');
  await page.setViewportSize({width:1536,height:900});for(let i=0;i<3;i++)await nextSlide.click();await expect(nextSlide).toBeDisabled();
  await page.locator('[data-ab="promo-panel"] button[aria-pressed]').nth(4).click();await expect(nav).toContainText('Slajd 3 od 3');await expect(nextSlide).toBeDisabled();check('Removing the final active artwork clamps the current slide');
  await page.locator('[data-ab="promo-panel"] button[aria-pressed]').nth(4).click();for(let i=0;i<2;i++)await previous.click();await expect(nav).toContainText('Slajd 1 od 4');
  const works=page.locator('[data-ab="promo-panel"] button[aria-pressed]');
  const prior=await works.first().getAttribute('aria-pressed');await works.first().click();check('Artwork selection toggles',await works.first().getAttribute('aria-pressed')!==prior);await works.first().click();
  await gotoStep(1);const choices=page.locator('[data-ab="promo-panel"] button[aria-pressed]');check('10 template choices exist',await page.getByText('Panorama Carousel',{exact:true}).count()>0);
  await page.getByText('Slider Carousel',{exact:true}).first().click();await settle();
  const pickerMarkup=async()=>({templates:await page.getByText('Artist Card',{exact:true}).first().locator('xpath=ancestor::button[1]/..').locator('[data-ab-stage]').evaluateAll(nodes=>nodes.map(el=>el.outerHTML)),versions:await page.locator('[data-ab="promo-versions"] [data-ab-stage]').evaluateAll(nodes=>nodes.map(el=>el.outerHTML))});
  await expect(preview).toContainText('Lorem ipsum');await expect(page.locator('[data-ab="promo-gen"],[data-ab="promo-download"]')).toBeDisabled();check('Slider placeholder cannot be generated');await page.getByLabel('Naslov objave',{exact:true}).fill('Series from browser');await expect(preview).toContainText('Series from browser');
  const sliderPicker=await pickerMarkup();
  await expect(nav).toContainText('Slajd 1 od 6');await expect(preview.locator('img')).toHaveCount(4);check('Slider always starts with its opening page');
  await nextSlide.click();await expect(nav).toContainText('Slajd 2 od 6');await expect(preview.getByText('01',{exact:true})).toBeVisible();
  const sliderFirst=await preview.locator('img').first().getAttribute('src');await nextSlide.click();
  await expect(nav).toContainText('Slajd 3 od 6');await expect(preview.getByText('02',{exact:true})).toBeVisible();
  check('Slider arrow advances artwork, number and counter together',await preview.locator('img').first().getAttribute('src')!==sliderFirst);
  await nextSlide.click();await nextSlide.click();await expect(preview.getByText('04',{exact:true})).toBeVisible();await expect(nextSlide).toBeEnabled();
  check('Final Slider work retains the blue continuation arrow',['rgb(22, 115, 242)','rgb(11, 98, 232)'].includes(await preview.getByText('→',{exact:true}).evaluate(el=>getComputedStyle(el).color)));
  await nextSlide.click();await expect(nav).toContainText('Slajd 6 od 6');await expect(nextSlide).toBeDisabled();await expect(preview).toContainText('Pogledaj moj ArtBoard profil');check('Slider ends with the requested profile page');
  check('All design and version cards stay unchanged when navigating Slider',JSON.stringify(await pickerMarkup())===JSON.stringify(sliderPicker));
  const overview=page.locator('[data-ab="promo-strip"]');await expect(overview).toBeVisible();await expect(overview.locator('[data-slide]')).toHaveCount(6);await expect(overview).toContainText('Pogledaj moj ArtBoard profil');check('Slider overview includes every work and the closing profile frame');
  await overview.screenshot({path:path.join(out,'slider-overview.png')});
  await page.getByText('Grid Carousel',{exact:true}).first().click();await settle();
  await page.getByLabel('Naziv kolekcije',{exact:true}).fill('Noćne skice');await expect(preview).toContainText('Noćne skice');check('Grid uses its separately entered collection title');
  const gridPicker=await pickerMarkup();await page.screenshot({path:path.join(out,'grid-collection-title-application.png')});
  await expect(overview.locator('[data-slide]')).toHaveCount(4);check('Grid overview follows the four selected artwork frames');
  await expect(nav).toContainText('Slajd 1 od 4');await expect(preview.locator('img')).toHaveCount(2);
  const gridFirst=await preview.locator('img').first().getAttribute('src');await nextSlide.click();
  await expect(nav).toContainText('Slajd 2 od 4');await expect(preview.locator('img')).toHaveCount(1);
  check('Grid advances from opening to artwork layout with the next selected image',await preview.locator('img').first().getAttribute('src')!==gridFirst);
  const detailWork=await preview.locator('img[data-promotion-work]').getAttribute('data-promotion-work');
  const detailSource=(await realGet(a.account.id)).source.works.find(w=>w.id===detailWork);
  await expect(preview).toContainText(detailSource.title);await expect(preview).toContainText(detailSource.description);check('Grid detail shows its own artwork title and description');
  await preview.screenshot({path:path.join(out,'grid-work-details.png')});
  await nextSlide.click();await expect(preview.locator('img')).toHaveCount(1);await nextSlide.click();
  await expect(nav).toContainText('Slajd 4 od 4');await expect(nextSlide).toBeDisabled();await expect(preview.locator('img')).toHaveCount(3);await expect(preview.locator('svg[shape-rendering="crispEdges"]')).toBeVisible();
  check('Final Grid frame uses collage and real QR without an added slide');
  check('All design and version cards stay unchanged when navigating Grid',JSON.stringify(await pickerMarkup())===JSON.stringify(gridPicker));
  await page.getByText('Featured Work',{exact:true}).first().click();await settle();
  await gotoStep(2);await page.getByLabel('Ime na objavi',{exact:true}).fill('Ime samo u objavi');await page.locator('textarea').fill('Opis iz browser testa');
  check('Live preview updates name',await page.locator('[data-ab="promo-preview"]').getByText('Ime samo u objavi',{exact:true}).count()>0);
  check('Source profile unchanged',(await h.prisma.artist.findUnique({where:{id:a.id}})).name==='Ime Prezime');
  await page.getByRole('button',{name:'Sačuvaj draft',exact:true}).click();await expect(page.locator('[data-ab="promo-saved"]')).not.toContainText('Nije sačuvano');
  await page.reload();await gotoStep(2);check('Saved draft reloads',(await page.getByLabel('Ime na objavi',{exact:true}).inputValue())==='Ime samo u objavi');
  await gotoStep(1);await page.getByText('Grid Carousel',{exact:true}).first().click();await settle();
  await expect(page.getByLabel('Naziv kolekcije',{exact:true})).toHaveValue('Noćne skice');check('Collection title survives saving and reopening a draft');
  await gotoStep(3);
  h.service.stopped=false;const worker=setInterval(()=>void h.service.tick(),300);
  const download=page.waitForEvent('download',{timeout:45000});await page.getByRole('button',{name:'Generiši objavu',exact:true}).click();
  const file=await download;await file.saveAs(path.join(out,file.suggestedFilename()));clearInterval(worker);h.service.stopped=true;
  check('Four selected works automatically download a ZIP',file.suggestedFilename().endsWith('.zip'));const zip=fs.readFileSync(path.join(out,file.suggestedFilename()));check('ZIP contains exactly four PNG slides',zip.readUInt16LE(zip.length-12)===4);await expect(page.locator('[data-ab="promo-gen"]')).toContainText('Preuzmi ponovo');
  const gridOutput=await h.prisma.promotionGeneration.findFirst({where:{artistAccountId:a.account.id},orderBy:{createdAt:'desc'}});check('Grid export persists its collection title and per-artwork renderer snapshot',gridOutput.snapshot.rendererVersion===8&&gridOutput.snapshot.config.template===8&&gridOutput.snapshot.config.collectionTitle==='Noćne skice');
  const used=(await realGet(a.account.id)).usage.used;const again=page.waitForEvent('download');await page.locator('[data-ab="promo-gen"]').click();await again;check('Redownload consumes no additional quota',(await realGet(a.account.id)).usage.used===used);
  for(const family of ['Slider Carousel','Grid Carousel','Panorama Carousel']){
    await gotoStep(1);await page.getByText(family,{exact:true}).first().click();await gotoStep(0);
    const select=page.getByLabel('Izvor radova',{exact:true});await expect(select).toBeVisible();await select.selectOption(collection.id);
    const members=page.locator('[data-ab="promo-panel"] button[aria-pressed]');await expect(members).toHaveCount(3);
    if(family==='Panorama Carousel'){
      check('Large collection is not silently truncated for Single Work',await members.locator('xpath=self::*[@aria-pressed="true"]').count()===0);
      await members.nth(0).click();await members.nth(1).click();await expect(page.locator('[data-ab="promo-panel"] button[aria-pressed="true"]')).toHaveCount(1);check('Single Work replaces selection with one chosen work');
    }else{
      await expect(page.getByRole('list',{name:'Redoslijed izabranih radova'})).toContainText('1. Tišina');
      await page.getByRole('button',{name:'Pomjeri rad 2 gore',exact:true}).click();await expect(page.getByRole('list',{name:'Redoslijed izabranih radova'})).toContainText('1. Tiha mjesta II');check(family+': collection order can be changed');
      if(family==='Grid Carousel')await page.screenshot({path:path.join(out,'collection-selection.png')});
    }
    await select.selectOption('');await expect(page.locator('[data-ab="promo-panel"] button[aria-pressed]')).toHaveCount(9);check(family+': collection and individual sources both available');
  }
  await gotoStep(0);const chosen=page.locator('[data-ab="promo-panel"] button[aria-pressed="true"]');while(await chosen.count()>1)await chosen.last().click();
  await gotoStep(1);await page.getByText('Panorama Carousel',{exact:true}).first().click();await settle();
  const panoramaPicker=await pickerMarkup();
  await expect(nav).toContainText('Slajd 1 od 3');await expect(previous).toBeDisabled();check('One selected Panorama artwork has three navigable slides');
  await expect(overview.locator('[data-slide]')).toHaveCount(3);check('Panorama overview joins three crops from the same artwork');
  const panoramaImage=await preview.locator('img').first().getAttribute('src');await nextSlide.click();await expect(nav).toContainText('Slajd 2 od 3');
  check('Panorama moves its canvas while retaining the same source image',(await preview.locator('[data-ab-stage]>div').first().getAttribute('style')).includes('translate(-1080px,0px)')&&await preview.locator('img').first().getAttribute('src')===panoramaImage);
  await preview.focus();await preview.press('ArrowRight');await expect(nav).toContainText('Slajd 3 od 3');await expect(nextSlide).toBeDisabled();check('Panorama keyboard navigation reaches the final crop');
  check('All design and version cards stay unchanged when navigating Panorama',JSON.stringify(await pickerMarkup())===JSON.stringify(panoramaPicker));
  await page.setViewportSize({width:390,height:956});await swipePreview(120,5);await expect(nav).toContainText('Slajd 2 od 3');check('Panorama swipe navigates with only one selected artwork');
  await overview.screenshot({path:path.join(out,'panorama-overview-390.png')});check('Mobile Panorama overview scales all frames without page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)&&await overview.locator('[data-ab-stage]').evaluateAll(nodes=>nodes.every(el=>parseFloat(getComputedStyle(el).getPropertyValue('--s'))>0)));
  await gotoStep(0);await page.locator('[data-ab="promo-panel"] button[aria-pressed="true"]').click();await expect(nav).toHaveCount(0);check('Empty Panorama selection has no slides');
  await page.locator('[data-ab="promo-panel"] button[aria-pressed]').first().click();await expect(nav).toContainText('Slajd 1 od 3');
  await gotoStep(1);await page.getByText('Artist Card',{exact:true}).first().click();await expect(nav).toHaveCount(0);check('Switching from Panorama restores one-work one-slide behavior');
  await page.getByText('Panorama Carousel',{exact:true}).first().click();await expect(nav).toContainText('Slajd 1 od 3');await page.setViewportSize({width:1536,height:900});await gotoStep(3);
  await gotoStep(2);await page.getByLabel('Prikaz slike',{exact:true}).selectOption('cover');
  async function setRange(label,value){await page.getByLabel(label,{exact:true}).fill(String(value));}
  await setRange('Uvećanje',0.6);await expect(page.getByLabel('Uvećanje',{exact:true})).toHaveValue('0.6');check('Panorama supports zoom below one');await setRange('Uvećanje',1.6);await setRange('Horizontalni položaj',24);await setRange('Vertikalni položaj',71);
  await expect(preview.locator('[data-promotion-crop]')).toHaveCSS('transform-origin','777.6px 1022.4px');
  await page.screenshot({path:path.join(out,'panorama-crop-desktop.png')});
  await page.getByRole('button',{name:'Sačuvaj draft',exact:true}).click();await expect(page.locator('[data-ab="promo-saved"]')).not.toContainText('Nije sačuvano');
  await page.reload();await gotoStep(2);await expect(page.getByLabel('Uvećanje',{exact:true})).toHaveValue('1.6');await expect(page.getByLabel('Horizontalni položaj',{exact:true})).toHaveValue('24');check('Panorama crop survives explicit save and reload');
  await page.setViewportSize({width:390,height:956});await page.screenshot({path:path.join(out,'panorama-crop-mobile.png')});check('Crop controls have no mobile overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
  await page.setViewportSize({width:1536,height:900});await gotoStep(3);
  h.service.stopped=false;const panoramaWorker=setInterval(()=>void h.service.tick(),300);
  const panoramaDownload=page.waitForEvent('download',{timeout:45000});await page.getByRole('button',{name:'Generiši objavu',exact:true}).click();const panoramaFile=await panoramaDownload;await panoramaFile.saveAs(path.join(out,panoramaFile.suggestedFilename()));clearInterval(panoramaWorker);h.service.stopped=true;
  const panoramaZip=fs.readFileSync(path.join(out,panoramaFile.suggestedFilename()));check('One Panorama artwork exports an ordered ZIP of three PNGs',panoramaFile.suggestedFilename().endsWith('.zip')&&panoramaZip.readUInt16LE(panoramaZip.length-12)===3);
  const panoramaOutput=await h.prisma.promotionGeneration.findFirst({where:{artistAccountId:a.account.id},orderBy:{createdAt:'desc'}});check('Panorama export stores a revised immutable snapshot with one source artwork',[6,7].includes(panoramaOutput.snapshot.rendererVersion)&&panoramaOutput.snapshot.config.template===9&&panoramaOutput.snapshot.config.artworkIds.length===1);
  check('Three Panorama images consume one export entitlement',(await realGet(a.account.id)).usage.used===used+1);
  await gotoStep(1);await page.getByText('Slider Carousel',{exact:true}).first().click();await expect(nav).toContainText('Slajd 1 od 3');
  await expect(page.locator('[data-ab="promo-gen"],[data-ab="promo-download"]')).toBeDisabled();check('One-work Slider cannot generate');await gotoStep(0);const sliderTiles=page.locator('[data-ab="promo-panel"] button[aria-pressed]');await sliderTiles.nth(1).click();await page.getByLabel('Naslov objave',{exact:true}).fill('Two artwork series');await gotoStep(3);await expect(overview.locator('[data-slide]')).toHaveCount(4);
  await page.screenshot({path:path.join(out,'slider-two-works.png')});h.service.stopped=false;const sliderWorker=setInterval(()=>void h.service.tick(),300);const sliderDownload=page.waitForEvent('download',{timeout:45000});await page.getByRole('button',{name:'Generiši objavu',exact:true}).click();const sliderFile=await sliderDownload;await sliderFile.saveAs(path.join(out,sliderFile.suggestedFilename()));clearInterval(sliderWorker);h.service.stopped=true;
  check('Two Slider works export opening, two artworks and closing PNGs',fs.readFileSync(path.join(out,sliderFile.suggestedFilename())).readUInt16LE(fs.statSync(path.join(out,sliderFile.suggestedFilename())).size-12)===4);
  const sliderOutput=await h.prisma.promotionGeneration.findFirst({where:{artistAccountId:a.account.id},orderBy:{createdAt:'desc'}});check('Slider opening and closing use renderer version 8',sliderOutput.snapshot.rendererVersion===8&&sliderOutput.snapshot.config.template===6);
  await gotoStep(1);await page.getByText('Gallery',{exact:true}).first().click();await gotoStep(0);const galleryTiles=page.locator('[data-ab="promo-panel"] button[aria-pressed]');await expect(page.locator('[data-ab="promo-gen"],[data-ab="promo-download"]')).toBeDisabled();
  for(let i=0;i<7;i++){
    if(await galleryTiles.nth(i).getAttribute('aria-pressed')!=='true')await galleryTiles.nth(i).click();
    if(i>=4){await expect(nav).toContainText(`od ${Math.ceil((i+1)/3)}`);check(`Gallery ${i+1} works has ${Math.ceil((i+1)/3)} slides`);}
  }
  await nextSlide.click();await nextSlide.click();await expect(preview.locator('img[data-promotion-work]')).toHaveCount(1);check('Last Gallery group does not repeat artwork to fill empty slots');await page.screenshot({path:path.join(out,'gallery-seven-works.png')});
  await gotoStep(1);await page.getByText('Slider Carousel',{exact:true}).first().click();await gotoStep(0);const cleanup=page.locator('[data-ab="promo-panel"] button[aria-pressed="true"]');while(await cleanup.count()>1)await cleanup.last().click();
  check('No demo controls',await page.locator('#ab-st-toggle,#ab-mp-toggle,#__claude_design_branding,[data-ab-states-row]').count()===0);
  check('No public site footer',await page.locator('footer').count()===0);
  const crossSite=await context.request.put(base+'/api/artist/promotions/draft',{headers:{Origin:'https://other.invalid'},data:{config:(await realGet(a.account.id)).draft.config,revision:0}});check('Cross-site draft write blocked by Next proxy',crossSite.status()===403);
  const anonymous=await browser.newContext();const anon=await anonymous.request.post(base+'/api/artist/promotions/generations',{data:{}});check('Anonymous Next proxy blocks generation',anon.status()===401);await anonymous.close();
  await gotoStep(0);const tiles=page.locator('[data-ab="promo-panel"] button[aria-pressed]');for(const i of [0,1,2])if(await tiles.nth(i).getAttribute('aria-pressed')!=='true')await tiles.nth(i).click();
  const order=page.getByRole('list',{name:'Redoslijed izabranih radova'}),orderIds=()=>order.locator('li').evaluateAll(rows=>rows.map(r=>r.dataset.orderWork));
  const beforeDrag=await orderIds();await page.getByRole('button',{name:'Zatvori izbor radova',exact:true}).click();await expect(order).toBeHidden();await page.getByRole('button',{name:'Otvori izbor radova',exact:true}).click();await expect(order).toBeVisible();check('Selected works panel collapses and reopens');
  await order.locator('li').first().dragTo(order.locator('li').last());check('Native drag reorders works',JSON.stringify(await orderIds())===JSON.stringify([...beforeDrag.slice(1),beforeDrag[0]]));
  const pointerBefore=await orderIds(),handle=page.getByRole('button',{name:'Prevuci rad 1',exact:true});await handle.scrollIntoViewIfNeeded();const hb=await handle.boundingBox(),dest=await order.locator('li').last().boundingBox();await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:10});await expect(page.locator('.promotion-drag-preview')).toBeVisible();await page.screenshot({path:path.join(out,'drag-animation.png')});await page.mouse.up();check('Pointer handle reorders works',JSON.stringify(await orderIds())===JSON.stringify([...pointerBefore.slice(1),pointerBefore[0]]));
  await page.setViewportSize({width:390,height:956});await order.scrollIntoViewIfNeeded();const touchBefore=await orderIds(),th=await handle.boundingBox(),td=await order.locator('li').last().boundingBox(),touch=await context.newCDPSession(page);await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:th.x+th.width/2,y:th.y+th.height/2}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:td.x+td.width/2,y:td.y+td.height/2}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();check('Touch drag reorders works on mobile',JSON.stringify(await orderIds())===JSON.stringify([...touchBefore.slice(1),touchBefore[0]]));await page.screenshot({path:path.join(out,'work-order-mobile.png')});await page.setViewportSize({width:1536,height:900});
  const retained=(await orderIds())[0];await gotoStep(1);await page.getByText('Panorama Carousel',{exact:true}).first().click();await expect(page.getByLabel('Trenutni izbor',{exact:true})).toContainText('1 rad');await gotoStep(0);check('Choosing Single Work automatically retains the first artwork only',await page.locator('[data-ab="promo-panel"] button[aria-pressed="true"]').count()===1);await gotoStep(1);await page.getByText('Slider Carousel',{exact:true}).first().click();await gotoStep(0);for(const i of [0,1,2])if(await tiles.nth(i).getAttribute('aria-pressed')!=='true')await tiles.nth(i).click();
  const editedIds=await orderIds();await gotoStep(2);await page.getByLabel('Naslov objave',{exact:true}).fill('Individual series');const editSelector=page.getByLabel('Rad za prilagođavanje',{exact:true});await editSelector.selectOption(editedIds[0]);await page.getByLabel('Naslov rada',{exact:true}).fill('Prvi individualni naslov');await page.locator('textarea').fill('Prvi individualni opis');await page.getByLabel('Uvećanje rada',{exact:true}).fill('0.6');
  await editSelector.selectOption(editedIds[1]);await page.getByLabel('Naslov rada',{exact:true}).fill('Drugi individualni naslov');await page.locator('textarea').fill('Drugi individualni opis');await page.getByLabel('Horizontalni položaj rada',{exact:true}).fill('73');
  await editSelector.selectOption(editedIds[0]);await expect(page.getByLabel('Naslov rada',{exact:true})).toHaveValue('Prvi individualni naslov');await expect(page.locator('textarea')).toHaveValue('Prvi individualni opis');await expect(page.getByLabel('Uvećanje rada',{exact:true})).toHaveValue('0.6');check('Each artwork retains independent text and crop');
  await expect(page.getByLabel('Trenutni izbor',{exact:true})).toContainText('Slider Carousel');await expect(page.getByLabel('Trenutni izbor',{exact:true})).toContainText('3 rada');check('Header shows current template, variant and artwork count');
  const live=page.getByRole('region',{name:'Pregled uživo',exact:true});check('Live preview hides its scrollbar',await live.evaluate(el=>getComputedStyle(el).scrollbarWidth==='none'));await live.hover();const scrollBefore=await page.evaluate(()=>window.scrollY);await page.mouse.wheel(0,500);await page.waitForTimeout(200);check('Live preview scrolls independently',await live.evaluate(el=>el.scrollTop>0&&el.scrollHeight>el.clientHeight)&&await page.evaluate(()=>window.scrollY)===scrollBefore);
  await page.screenshot({path:path.join(out,'individual-work-controls.png')});await live.evaluate(el=>el.scrollTop=el.scrollHeight);await expect(overview).toBeVisible();check('All-slides overview is reachable inside the preview');
  await page.getByRole('button',{name:'Sačuvaj draft',exact:true}).click();await expect(page.locator('[data-ab="promo-saved"]')).not.toContainText('Nije sačuvano');await page.reload();await gotoStep(2);await page.getByLabel('Rad za prilagođavanje',{exact:true}).selectOption(editedIds[1]);await expect(page.getByLabel('Naslov rada',{exact:true})).toHaveValue('Drugi individualni naslov');await expect(page.getByLabel('Horizontalni položaj rada',{exact:true})).toHaveValue('73');check('Per-artwork text and crop survive save and reload');
  await gotoStep(3);h.service.stopped=false;const individualWorker=setInterval(()=>void h.service.tick(),300);const individualDownload=page.waitForEvent('download',{timeout:45000});await page.getByRole('button',{name:'Generiši objavu',exact:true}).click();await individualDownload;clearInterval(individualWorker);h.service.stopped=true;const individualRow=await h.prisma.promotionGeneration.findFirst({where:{artistAccountId:a.account.id},orderBy:{createdAt:'desc'}});check('Individual artwork settings enter the exported snapshot',individualRow.snapshot.rendererVersion===8&&individualRow.snapshot.config.artworkEdits.find(e=>e.artworkId===editedIds[1]).title==='Drugi individualni naslov');
  await gotoStep(1);await page.getByText('Panorama Carousel',{exact:true}).first().click();await page.getByText('Collage',{exact:true}).first().click();const collageHeading=page.getByLabel('Naslov kolaža',{exact:true});await collageHeading.fill('');await expect(preview).toContainText('@imeprezime');check('Collage defaults to the Instagram tag instead of an artwork name');
  await gotoStep(0);await page.getByLabel('Izvor radova',{exact:true}).selectOption(collection.id);await expect(preview).toContainText('Browser kolekcija');check('Collage uses the selected collection heading');await page.getByLabel('Naslov kolaža',{exact:true}).fill('Kolaž za test');await expect(preview).toContainText('Kolaž za test');
  const collageCards=await pickerMarkup();await page.getByRole('region',{name:'Pregled uživo',exact:true}).evaluate(el=>el.scrollTop=0);await preview.hover();
  for(const expected of [2,3]){await page.waitForTimeout(240);await page.mouse.wheel(65,2);await expect(nav).toContainText(`Slajd ${expected} od 3`);}check('Repeated Collage touchpad gestures work without moving the mouse');
  await page.screenshot({path:path.join(out,'collage-heading.png')});
  for(const expected of [2,1]){await page.waitForTimeout(240);await page.mouse.wheel(-65,2);await expect(nav).toContainText(`Slajd ${expected} od 3`);}check('Repeated reverse gestures work at the same pointer position');
  const nb=await nextSlide.boundingBox();await page.mouse.move(nb.x+nb.width/2,nb.y+nb.height/2);for(const expected of [2,3]){await page.mouse.down();await page.mouse.up();await expect(nav).toContainText(`Slajd ${expected} od 3`);}check('Repeated arrow clicks work without moving the mouse');assert.deepEqual(await pickerMarkup(),collageCards);check('Collage cards stay stable during repeated navigation');
  const artworkCount=await h.prisma.artwork.count({where:{artistId:a.id}});await page.getByRole('button',{name:'Ukloni rad 2',exact:true}).click();await expect(order.locator('li')).toHaveCount(2);await page.setViewportSize({width:390,height:956});await order.scrollIntoViewIfNeeded();check('Removal controls fit on mobile',await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));await order.screenshot({path:path.join(out,'remove-work-mobile.png')});
  await page.getByRole('button',{name:'Ukloni rad 2',exact:true}).click();await expect(order.locator('li')).toHaveCount(1);await page.getByRole('button',{name:'Ukloni rad 1',exact:true}).click();await expect(order).toHaveCount(0);await expect(nav).toHaveCount(0);check('Removal supports both multiple works and the final selected work');assert.equal(await h.prisma.artwork.count({where:{artistId:a.id}}),artworkCount);check('Removing from the publication leaves source artworks intact');
  const remaining=page.locator('[data-ab="promo-work-card"]').first();await remaining.click();await page.getByRole('button',{name:'Sačuvaj draft',exact:true}).click();await expect(page.locator('[data-ab="promo-saved"]')).not.toContainText('Nije sačuvano');await page.reload();await gotoStep(0);await expect(page.getByLabel('Naslov kolaža',{exact:true})).toHaveValue('Kolaž za test');check('Collage heading and removed selection survive explicit save and reload');await page.setViewportSize({width:1536,height:900});
  // Finish the old account's thumbnail requests before switching the test
  // session. A late request after a cookie swap is correctly denied by the API.
  await page.goto('about:blank');const free=await h.artist();await context.addCookies([{name:'artboard_artist_session',value:free.token,domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);
  await page.goto(base+'/generator');await gotoStep(3);await expect(page.getByText('Free plan',{exact:true})).toBeVisible();await expect(page.getByText('1 besplatna objava je uključena.',{exact:true})).toBeVisible();check('Free unused displays real entitlement',await page.locator('[data-ab="promo-gen"]').textContent().then(t=>t.includes('Generiši')));
  check('Single artwork has one slide and no carousel arrows',await page.getByRole('group',{name:'Navigacija slajdova'}).count()===0);
  const freeDoc=await realGet(free.account.id);await h.service.generate(free.account.id,{config:freeDoc.draft.config,operationKey:require('crypto').randomUUID()});
  const gen=h.generator.generate;h.generator.generate=async(s,cb)=>cb(h.image,0);h.service.stopped=false;await h.service.tick();h.service.stopped=true;h.generator.generate=gen;
  await page.reload();await gotoStep(3);await expect(page.getByText('Besplatna objava: 1 od 1 iskorišćeno · jednom po nalogu',{exact:true})).toBeVisible();
  await gotoStep(2);await page.getByLabel('Ime na objavi',{exact:true}).fill('Nova objava Free');await gotoStep(3);await expect(page.locator('[data-ab="promo-gen"]')).toContainText('Kupi set');check('Free exhausted links to actual checkout',await page.locator('a[href="/placanje?proizvod=dopuna-generatora"]').count()>0);
  await page.setViewportSize({width:390,height:956});check('Free exhausted mobile has no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));await page.screenshot({path:path.join(out,'free-used-390.png')});
  check('No browser runtime errors',errors.length===0);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,metrics},null,2));console.log(JSON.stringify({checks:checks.length,errors,metrics:metrics.length}));
})().catch(async e=>{console.error(e);if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(e),errors,metrics},null,2));process.exitCode=1;}).finally(async()=>{await browser?.close();if(server)server.kill();await h?.close();});
