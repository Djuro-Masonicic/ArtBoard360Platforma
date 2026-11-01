const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const{chromium,expect}=require('@playwright/test');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'.tmp/artboard-footer'),base='http://localhost:3000';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const checks=[],measurements=[],errors=[];try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  const routes=['/uslovi-koriscenja','/paketi','/umjetnici','/oglasi','/oglasi/objavi','/portfolio-builder','/prijava','/artist/login','/artist/forgot-password','/login','/pretplata/placanje?proizvod=premium','/artboard/kontakt','/artboard'];
  for(const route of routes)for(const width of[1536,440,320]){await page.setViewportSize({width,height:900});await page.goto(base+route);await page.evaluate(()=>document.fonts.ready);const footer=page.locator('[data-artboard-footer]');await expect(footer).toHaveCount(1);
    for(const title of['Platforma','Nalog','Pravne informacije','Društvene mreže'])await expect(footer.getByRole('navigation',{name:title,exact:true})).toHaveCount(1);
    await expect(footer.getByRole('link',{name:'info@artstudio360.me',exact:true})).toHaveAttribute('href','mailto:info@artstudio360.me');await expect(footer.getByRole('link',{name:'Politika kolačića',exact:true})).toHaveAttribute('href','/uslovi-koriscenja#kolacici');
    const m=await footer.evaluate(e=>{const r=e.getBoundingClientRect();return{width:r.width,height:r.height,background:getComputedStyle(e).backgroundColor,overflow:e.scrollWidth>e.clientWidth+1,duplicateContact:document.querySelectorAll('#kontakt').length>1}});
    assert.equal(m.background,'rgb(238, 240, 244)');assert(!m.overflow);assert(!m.duplicateContact);measurements.push({route,viewport:width,...m});checks.push(route+' '+width+': shared light footer, real links, no clipping');
    if(route==='/uslovi-koriscenja')await footer.screenshot({path:path.join(out,'legal-footer-'+width+'.png')});
  }
  const beforePath=path.join(out,'before.json');if(fs.existsSync(beforePath)){const before=JSON.parse(fs.readFileSync(beforePath,'utf8'));await page.setViewportSize({width:1536,height:900});for(const route of['/','/kontakt','/usluge']){await page.goto(base+route);await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('footer').last().evaluate(e=>e.outerHTML),before[route].html);checks.push(route+': Art Studio footer unchanged');}
    const packages=measurements.find(m=>m.route==='/paketi'&&m.viewport===1536);assert(Math.abs(packages.width-before['/paketi'].width)<.1);assert(Math.abs(packages.height-before['/paketi'].height)<.1);checks.push('Approved Paketi footer retains its original dimensions');
    await page.goto(base+'/uslovi-koriscenja');assert.equal(await page.locator('header').evaluate(e=>e.outerHTML),before.legalHeader);checks.push('Legal header unchanged');}
  assert.equal(errors.length,0);checks.push('No browser runtime errors');fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,measurements,errors},null,2));console.log(JSON.stringify({passed:checks.length,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
