const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '../../..'), out = path.join(root, '.tmp/payment-browser'), dir = path.join(out, 'harness'), base = 'http://localhost:3124';
const checks = [], errors = [], requests = [], measurements = [];
const check = (name, ok = true) => { assert(ok, name); checks.push(name); };
const near = (a, b, label) => assert(Math.abs(a - b) < .2, `${label}: ${a} / ${b}`);
const write = (file, content) => { const p = path.join(dir, file); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); };
let server, browser;
const catalog = { currency: 'EUR', guestExportCents: 490, extraExportCents: 490, premiumAmountsCents: [890, ...Array.from({length:21},(_,i)=>(i+10)*100)], generatorPackCents:490, generatorPackSize:10, generatorAvailable:true, checkoutAvailable:false };
// Visual-only fixtures live exclusively in the isolated test app, never production routing.
const common = { catalog, amountCents:490, checkoutAvailable:false, status:'UNAVAILABLE', account:{name:'Isolated Test Artist',email:'isolated@example.invalid'}, quota:{plan:'FREE',used:1,limit:1,remaining:0,reserved:0,periodEnd:'2026-12-15T00:00:00Z'}, portfolio:{id:'0e574f22-08c2-49a7-8202-a09f589e7e97',title:'Isolated Portfolio',style:'Minimal',format:'A4',language:'Crnogorski',pageCount:14}, purchase:null, paymentMethod:null };
const contexts = {
  premium:{...common,product:'premium',variant:'PREMIUM',amountCents:890},
  free:{...common,product:'portfolio',variant:'PORTFOLIO_FREE'},
  guest:{...common,product:'portfolio',variant:'PORTFOLIO_GUEST',account:null,quota:null},
  extra:{...common,product:'portfolio',variant:'PORTFOLIO_PREMIUM',quota:{...common.quota,plan:'PREMIUM',used:5,limit:5},paymentMethod:{brand:'Visa',last4:'4242'}},
  generator:{...common,product:'generator',variant:'GENERATOR_FREE',portfolio:null},
  generatorPremium:{...common,product:'generator',variant:'GENERATOR_PREMIUM',portfolio:null,quota:{...common.quota,plan:'PREMIUM',used:5,limit:5},paymentMethod:{brand:'Visa',last4:'4242'}},
  noMethod:{...common,product:'portfolio',variant:'PORTFOLIO_PREMIUM',quota:{...common.quota,plan:'PREMIUM',used:5,limit:5}},
  unavailable:{...common,product:'generator',variant:'GENERATOR_FREE',portfolio:null,catalog:{...catalog,generatorAvailable:false}},
  allowance:{...common,product:'portfolio',variant:'PORTFOLIO_FREE',status:'QUOTA_AVAILABLE',quota:{...common.quota,remaining:1,used:0}},
  activePremium:{...common,product:'premium',variant:'PREMIUM',status:'ALREADY_PREMIUM',amountCents:890,quota:{...common.quota,plan:'PREMIUM'}},
};
(async () => {
  write('package.json', JSON.stringify({ private:true }));
  write('tsconfig.json', JSON.stringify({ compilerOptions:{ target:'ES2022',lib:['DOM','ES2022'],jsx:'preserve',module:'ESNext',moduleResolution:'Bundler',esModuleInterop:true,resolveJsonModule:true,skipLibCheck:true,strict:true,baseUrl:'../../..',paths:{'@/*':['apps/web/*']} },include:['next-env.d.ts','app/**/*.tsx','.next/types/**/*.ts'],exclude:['node_modules'] }));
  write('next.config.js', `const path=require('path');module.exports={reactStrictMode:true,devIndicators:false,experimental:{externalDir:true},webpack(c){c.resolve.alias['@']=path.resolve(__dirname,'../../../apps/web');return c}}`);
  write('postcss.config.mjs', `export default {plugins:{'@tailwindcss/postcss':{}}}`);
  const layout = fs.readFileSync(path.join(root,'apps/web/app/layout.tsx'),'utf8');
  const fonts = layout.slice(layout.indexOf('const alcyone ='),layout.indexOf('export const metadata')).replaceAll('"./fonts/','"../../../../apps/web/app/fonts/');
  write('app/harness.css', `@import '../../../../apps/web/app/globals.css';\n@source '../../../../apps/web';`);
  write('app/layout.tsx', `import localFont from 'next/font/local';import './harness.css';${fonts}export default function Layout({children}:{children:React.ReactNode}){return <html lang="sr"><body className={alcyone.className+' '+alcyone.variable}><main className="px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">{children}</main></body></html>}`);
  write('app/fixtures.json', JSON.stringify(contexts));
  write('app/[variant]/page.tsx', `import fixtures from '../fixtures.json';import {notFound} from 'next/navigation';import {PaymentWorkspace} from '@/components/payment-workspace';export default async function Page({params}:{params:Promise<{variant:string}>}){const {variant}=await params;const context=(fixtures as any)[variant];if(!context)notFound();return <PaymentWorkspace context={context}/>}`);
  const env = {...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'};
  if (!process.argv.includes('--reuse-build')) execFileSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:dir,env,stdio:['ignore',fs.openSync(path.join(out,'build.log'),'w'),fs.openSync(path.join(out,'build.err.log'),'w')]});
  server=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-p','3124'],{cwd:dir,env,stdio:['ignore',fs.openSync(path.join(out,'server.log'),'w'),fs.openSync(path.join(out,'server.err.log'),'w')]});
  for(let i=0;i<120;i++){try{if((await fetch(base+'/premium')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1536,height:650}});
  page.on('pageerror',e=>errors.push(e.message)); page.on('request',r=>{if(r.method()==='POST') requests.push(r.url());});
  const variants=['premium','free','guest','extra','generator','generatorPremium'];
  const titles=['Izaberi svoj iznos.','Preuzmi svoj portfolio.','Preuzmi svoj portfolio.','Dodatni export.','Dopuna za Generator.','Dopuna za Generator.'];
  for (let i=0;i<variants.length;i++) {
    for (const width of [1536,440]) {
      await page.setViewportSize({width,height:width===1536?650:894}); await page.goto(base+'/'+variants[i]);await page.evaluate(()=>document.fonts.ready);
      await expect(page.getByRole('heading',{level:1})).toHaveText(titles[i]);
      const card=page.getByRole('form',{name:'Detalji plaćanja'}); await expect(card.getByRole('button')).toBeDisabled();
      const m=await card.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,overflow:document.documentElement.scrollWidth>innerWidth}});
      measurements.push({variant:variants[i],viewport:width,...m}); assert(!m.overflow);
      if(width===1536){near(m.width,570,'Desktop card width');const pair=card.locator('input[placeholder="MM / GG"]');if(await pair.count()) near((await pair.boundingBox()).width,241,'Paired desktop field width');}
      else near(m.width,400,'Fluid mobile card width');
      if(variants[i]==='guest'){await expect(card.getByRole('textbox',{name:'E-mail za račun'})).toBeVisible();await expect(card.getByRole('checkbox')).not.toBeChecked();assert.equal(await card.evaluate(el=>el.checkValidity()),false);await card.getByRole('textbox',{name:'E-mail za račun'}).fill('bad');await card.getByRole('checkbox').check();assert.equal(await card.evaluate(el=>el.checkValidity()),false);await card.getByRole('textbox',{name:'E-mail za račun'}).fill('receipt@example.invalid');assert.equal(await card.evaluate(el=>el.checkValidity()),true);}
      else await expect(card.getByRole('checkbox')).toHaveCount(0);
      if(['extra','generatorPremium'].includes(variants[i]))await expect(card.locator('input')).toHaveCount(0);
      else {const a=await card.locator('input[placeholder="MM / GG"]').boundingBox(),b=await card.locator('input[placeholder="123"]').boundingBox();near(a.y,b.y,'Expiry and CVC stay on one row');near(a.height,46,'Input height');}
      await page.screenshot({path:path.join(out,`${variants[i]}-${width}.png`),fullPage:true});
      check(`${variants[i]} ${width}px: correct variant, responsive form, disabled real payment`);
    }
  }
  await page.goto(base+'/premium');const slider=page.getByRole('slider',{name:'Mjesečni iznos'});
  await slider.focus();for(const amount of [8.9,...Array.from({length:21},(_,i)=>i+10)]){await expect(slider).toHaveAttribute('aria-valuenow',String(amount));if(amount!==30)await slider.press('ArrowRight');}
  await slider.press('Home');await expect(slider).toHaveAttribute('aria-valuenow','8.9');await slider.press('End');await expect(slider).toHaveAttribute('aria-valuenow','30');check('Keyboard reaches every allowed amount, including 11–14, with Home and End');
  await slider.press('Home');const box=await slider.boundingBox();await page.mouse.click(box.x+13+(box.width-26)*.48,box.y+box.height/2);await expect(slider).toHaveAttribute('aria-valuenow','17');
  await expect(page.locator('[data-price="large"]')).toHaveText('17€');await expect(page.locator('[data-price="total"]')).toHaveText('17 €');await expect(page.getByRole('form').getByText('17 € / mj.',{exact:true})).toBeVisible();check('Track click uses the reference scale and synchronizes all three prices');
  const positions={8.9:0,10:20,15:40,20:60,25:80,30:100};
  for(const [amount,p] of Object.entries(positions)){await slider.press('Home');while(Number(await slider.getAttribute('aria-valuenow'))<Number(amount))await slider.press('ArrowRight');const thumb=await slider.locator('span').last().boundingBox();near(thumb.x+13-box.x,13+(box.width-26)*p/100,'Corrected thumb center');}
  check('All six tick positions use the required non-linear scale and 26px thumb correction');
  await page.setViewportSize({width:440,height:894});await slider.scrollIntoViewIfNeeded();const touch=await slider.boundingBox();
  // Real pointer drag exercises capture and prevents losing the amount on focus changes.
  await page.mouse.move(touch.x+13,touch.y+22);await page.mouse.down();await page.mouse.move(touch.x+touch.width-13,touch.y+22,{steps:20});await page.mouse.up();await expect(slider).toHaveAttribute('aria-valuenow','30');await page.getByRole('heading',{level:1}).click();await expect(slider).toHaveAttribute('aria-valuenow','30');check('Drag reaches the endpoint and unrelated interactions preserve the chosen amount');
  const touchPage=await browser.newPage({viewport:{width:440,height:894},hasTouch:true});touchPage.on('pageerror',e=>errors.push(e.message));await touchPage.goto(base+'/premium');const touchSlider=touchPage.getByRole('slider');await touchSlider.scrollIntoViewIfNeeded();const tb=await touchSlider.boundingBox();await touchPage.touchscreen.tap(tb.x+13+(tb.width-26)*.48,tb.y+22);await expect(touchSlider).toHaveAttribute('aria-valuenow','17');await touchPage.close();check('Touch selects the correct amount using the same reference scale');
  for(const width of [390,360,320]){await page.setViewportSize({width,height:844});await page.goto(base+'/guest');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);check(`${width}px Guest form has no horizontal overflow`);}
  await page.goto(base+'/noMethod');await expect(page.locator('input[placeholder="1234 5678 9012 3456"]')).toBeDisabled();check('Premium without a reusable provider method shows unavailable fields, never a fake saved card');
  await page.goto(base+'/unavailable');await expect(page.getByText('Podaci još nijesu dostupni',{exact:true})).toBeVisible();check('Missing Generator integration never claims a fabricated exhausted balance');
  await page.goto(base+'/allowance');await expect(page.getByRole('link',{name:'Vrati se i iskoristi raspoloživ izvoz'})).toBeVisible();await expect(page.getByText('Besplatan export · iskorišćen',{exact:true})).toHaveCount(0);check('Available owner allowance is shown truthfully without an unnecessary purchase');
  await page.goto(base+'/activePremium');await expect(page.getByRole('status')).toContainText('Premium je već aktivan');check('An already-active Premium plan cannot be activated or repriced by the visual slider');
  check('No charge requests or browser runtime exceptions',requests.length===0&&errors.length===0);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,measurements,errors,requests},null,2));console.log(JSON.stringify({passed:checks.length,errors}));
})().catch(e=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:e.stack,checks,errors,measurements},null,2));console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.kill();});
