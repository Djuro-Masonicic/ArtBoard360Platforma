const assert=require('node:assert/strict'),path=require('node:path');
const {test}=require('node:test');
require('ts-node').register({project:path.resolve(__dirname,'../tsconfig.json'),transpileOnly:true});
const {generatePortfolioPdf}=require('../src/modules/portfolio-projects/portfolio-pdf.generator');
const {minimalFixture}=require('./portfolio-minimal.fixture.cjs');
const {getMinimalDesign,parseMinimalDesign,defaultDocumentSelection,buildPortfolioDocumentPlan}=require('@artboard/portfolio-document-plan');
async function read(project,watermark=false){let count;const bytes=await generatePortfolioPdf(project,{watermark,onPageCount:c=>count=c});const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true}),pdf=await task.promise;assert.equal(count,pdf.numPages);const pages=[];for(let n=1;n<=pdf.numPages;n++){const p=await pdf.getPage(n),content=await p.getTextContent();pages.push({text:content.items.map(v=>v.str).join(' '),items:content.items,annotations:await p.getAnnotations(),width:p.view[2],height:p.view[3]});}await task.destroy();return{bytes,pages};}
function only(p,section){const selection=defaultDocumentSelection(section==='cv');for(const key of Object.keys(selection.sections))selection.sections[key]=key===section;return{...p,includeCv:section==='cv',designConfig:{...p.designConfig,documentSelection:selection}};}
test('Minimal cover contract rejects unknown fields/versions and defaults legacy projects to A',()=>{for(const cover of 'ABCDEFG')assert.equal(parseMinimalDesign({version:1,cover}).cover,cover);for(const v of [null,[],{version:2,cover:'A'},{version:1,cover:'Z'},{version:1,cover:'A',ownerId:'spoof'}])assert.throws(()=>parseMinimalDesign(v));assert.deepEqual(getMinimalDesign({designConfig:null}),{version:1,cover:'A'});});
test('all seven covers embed Alcyone/diacritics and place the name at reference coordinates',async()=>{
 const p=only(await minimalFixture(),'cover'),positions={A:[68,771,61.33],B:[68,75.6,56],C:[null,566.9,61.33],D:[294.8,75.6,48],E:[68,75.6,50.67],F:[109.6,871.77,53.33],G:[90.7,264.6,45.33]};
 for(const cover of 'ABCDEFG'){const r=await read({...p,designConfig:{...p.designConfig,minimal:{version:1,cover}}});assert.equal(r.pages.length,1);const page=r.pages[0],name=page.items.find(v=>v.str==='TIJANA');assert(name,cover);assert(page.text.includes('MARKOVIĆ'),cover);const[x,y,size]=positions[cover];if(x!==null)assert(Math.abs(name.transform[4]-x*page.width/794)<1,cover+' x');const expected=page.height-(y+size*.83)*page.height/1123;assert(Math.abs(name.transform[5]-expected)<1,cover+' baseline: '+name.transform[5]+' vs '+expected);assert(page.text.includes('2026'));assert(!page.text.includes('ARTBOARD PREVIEW'));}
});
test('real F/contact QR is linked to the supplied target; missing or unsafe links never produce a QR',async()=>{
 const p=await minimalFixture(),cover=only(p,'cover');cover.designConfig.minimal={version:1,cover:'F'};const rendered=await read(cover);assert(rendered.pages[0].annotations.some(a=>a.url===p.artboardProfileUrl));
 const absent={...cover,artboardProfileUrl:null,websiteUrl:'javascript:alert(1)',behanceUrl:null,instagramUrl:null};const missing=await read(absent);assert.equal(missing.pages[0].annotations.length,0);assert(!missing.pages[0].text.includes('ARTBOARD PROFIL'));
 const contact=await read(only(p,'contact'));assert(contact.pages[0].annotations.some(a=>a.url===p.artboardProfileUrl));assert(contact.pages[0].text.includes(p.email));
});
test('grouped document preserves selection/order, uses actual collection work positions and two structured CV pages',async()=>{
 const p=await minimalFixture();p.artworks.forEach((w,i)=>w.title='WORK_MARKER_'+i);const original=structuredClone(p);const r=await read(p,true),text=r.pages.map(p=>p.text).join(' ');
 for(let n=0;n<9;n++)assert(text.includes('WORK_MARKER_'+n));assert(text.includes('RAD 01 / 03'));assert(text.includes('RAD 03 / 03'));assert.equal(r.pages.filter(p=>p.text.includes('CV –')).length,2);assert(r.pages.at(-1).text.includes('KONTAKT'));assert(r.pages.every(p=>p.text.includes('ARTBOARD PREVIEW')));assert.deepEqual(p,original);
 assert.equal(r.pages.length,buildPortfolioDocumentPlan(p).pageCount+1);
});
test('long profile, work description and CV keep final markers above the footer on overflow pages',async()=>{
 const p=await minimalFixture();p.biography=('Long biography sentence. '.repeat(400))+' PROFILE_FINAL';p.artworks[0].description=('Artwork context. '.repeat(600))+' WORK_FINAL';p.cvSections.experience=Array.from({length:12},(_,i)=>({id:'long-'+i,values:{organization:'ORGANIZATION_'+i,description:'Full details. '.repeat(60)+' FINAL_'+i}}));
 const {pages}=await read(p,true),all=pages.map(p=>p.text).join(' ');assert(all.includes('PROFILE_FINAL'));assert(all.includes('WORK_FINAL'));for(let n=0;n<12;n++)assert(all.includes('FINAL_'+n));assert(pages.every(p=>p.text.includes('ARTBOARD PREVIEW')));
 for(const page of pages)for(const item of page.items)if(/PROFILE_FINAL|WORK_FINAL|FINAL_\d+/.test(item.str))assert(item.transform[5]>65,'tail must stay above footer');
});
test('CV-only Letter, blank CV rows and branding flags remain functional',async()=>{
 const p=await minimalFixture();p.cvSections={version:1,education:[{id:'empty',values:{}}],experience:[],exhibitions:[],awards:[],certificates:[],publications:[],skills:'Skills without blank education page',programs:''};const scoped=only({...p,pageFormat:'US_LETTER',includeBranding:false},'cv');scoped.designConfig.documentSelection.scope='CV';const r=await read(scoped);assert.equal(r.pages.length,1);assert.equal(r.pages[0].width,612);assert.equal(r.pages[0].height,792);assert(r.pages[0].text.includes('Skills without blank education page'));assert(!r.pages[0].text.includes('OBRAZOVANJE'));assert(!r.pages[0].text.includes('KONTAKT'));
});

test('long motto and contact links continue above the footer without losing link targets',async()=>{
 const p=await minimalFixture();p.motto='Motto text. '.repeat(180)+' MOTTO_FINAL';p.artistStatement='Statement. '.repeat(200)+' STATEMENT_FINAL';p.websiteUrl='https://example.com/'+('long-link-'.repeat(80))+'LINK_FINAL';
 const {pages}=await read(p,true),text=pages.map(page=>page.text).join(' ');assert(text.includes('MOTTO_FINAL'));assert(text.includes('STATEMENT_FINAL'));assert(text.includes('LINK_FINAL'));assert(pages.some(page=>page.annotations.some(a=>a.url===p.websiteUrl)));
 for(const page of pages)for(const item of page.items)if(/MOTTO_FINAL|STATEMENT_FINAL|LINK_FINAL/.test(item.str))assert(item.transform[5]>65);
});
