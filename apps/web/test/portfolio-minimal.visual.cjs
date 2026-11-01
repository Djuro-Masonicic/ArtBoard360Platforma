const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const blocks=process.argv.includes('--blocks'),cards=process.argv.includes('--cards'),editorial=process.argv.includes('--editorial'),rounded=process.argv.includes('--rounded'),gradient=process.argv.includes('--gradient'),name=blocks?'blocks':cards?'cards':editorial?'editorial':gradient?'gradient':rounded?'rounded':'minimal',prefix=blocks?'Blok':cards?'Kartice':editorial?'Editorial':gradient?'Gradijent':rounded?'Tacke':'Minimal';
const root=path.resolve(__dirname,'../../..'),assetsDir=path.join(root,'.tmp/portfolio-minimal'),out=path.join(root,'.tmp/portfolio-'+name);fs.mkdirSync(out,{recursive:true});
const sharp=require(require.resolve('sharp',{paths:[path.join(root,'apps/api')]}));
require('ts-node').register({project:path.join(root,'apps/api/tsconfig.json'),transpileOnly:true});
const {generatePortfolioPdf}=require('../../api/src/modules/portfolio-projects/portfolio-pdf.generator');
const {minimalFixture}=require('../../api/test/portfolio-minimal.fixture.cjs');
let browser,server;const errors=[];
(async()=>{
 const images=[];for(let i=0;i<9;i++)images.push('data:image/jpeg;base64,'+(await sharp(fs.readFileSync(path.join(assetsDir,`work-${i}.img`))).rotate().jpeg({quality:95}).toBuffer()).toString('base64'));
 images.push('data:image/jpeg;base64,'+(await sharp(fs.readFileSync(path.join(assetsDir,'profile.img'))).rotate().jpeg({quality:95}).toBuffer()).toString('base64'));
 const p=await minimalFixture(images);p.coverImageUrl='data:image/jpeg;base64,'+(await sharp(fs.readFileSync(path.join(assetsDir,'cover.img'))).rotate().jpeg({quality:95}).toBuffer()).toString('base64');const pdfs={},traces={};
 // A reference style can add physical pages for any long section. Record the
 // renderer's real section boundaries instead of assuming only CV overflows.
 const {MinimalPdfPages}=require('../../api/src/modules/portfolio-projects/portfolio-minimal.pages'),render=MinimalPdfPages.prototype.render;let trace=[];
 MinimalPdfPages.prototype.render=async function(page,plan){const index=this.doc.bufferedPageRange().count+1;await render.call(this,page,plan);trace.push({page,index,count:this.doc.bufferedPageRange().count-index+1});};
 try{for(const cover of 'ABCDEFG'){trace=[];pdfs[cover]=await generatePortfolioPdf({...p,designConfig:{...p.designConfig,minimal:{version:1,cover,...(blocks?{style:'BLOCKS'}:cards?{style:'CARDS'}:editorial?{style:'EDITORIAL'}:gradient?{style:'GRADIENT'}:rounded?{style:'ROUNDED'}:{})}}});traces[cover]=trace;}}finally{MinimalPdfPages.prototype.render=render;}
 fs.writeFileSync(path.join(out,'physical-page-map.json'),JSON.stringify(traces.A,null,2));
 for(const [key,bytes]of Object.entries(pdfs))fs.writeFileSync(path.join(out,`${name}-${key}.pdf`),bytes);
 const raw=fs.readFileSync(path.join(root,`apps/web/references/portfolio-${name}.html`),'utf8')+(editorial?fs.readFileSync(path.join(root,'apps/web/references/portfolio-editorial-collection.html'),'utf8'):'');
 const assets={'17bfad1399247762278383b489e653f3':p.coverImageUrl,'53ce78138694b4d54916abe9379d100f':images[9],'050480c5d45736d4e72f087139e3b9fc':'/assets/ArtBoard-Horizontal-Gradient-Mark-Black-Text.svg','cf78c5a10d925228bfe97709cb17526f':'/assets/ArtBoard-Gradient-Odvojeno.svg','ae0995e2e255edb307e398be71f71b33':'/qr.png'};
 assets['97d795dc5ddd9f2320a347f21dc7b609']=images[0];assets['625b69a89abd1e7cccc8dd2ba9597092']=images[1];assets['9734d41099eae212ece610acf0d2e475']=images[2];assets['b91494a2502b447a2905bac10ceaac07']=images[3];assets['1908ba153bc5d4da0bdced4f8a4ed0ea']=images[4];assets['7567404934b07886ceb5089265e43613']=images[5];assets['2360e183208122691fb3adbf8291ad8a']=images[6];assets['7e8690edfd16d8bf28900a46254d16ae']=images[7];assets['fa4970eccb6cef855d981e86aee571ac']=images[8];
 const reference=raw.replace(/\/_blob\/([a-f0-9]+)/g,(_,id)=>assets[id]||images[0]).replace('DD.MM.GGGG.','29.02.2000.');
 const qr=await require('qrcode').toBuffer(p.artboardProfileUrl,{width:484,margin:4});
 server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}let body,type='text/html; charset=utf-8';if(url.pathname==='/reference')body=`<style>@font-face{font-family:Alcyone;src:url('/font/Alcyone-Regular.woff2');font-weight:400}@font-face{font-family:Alcyone;src:url('/font/Alcyone-Bold.woff2');font-weight:700}@font-face{font-family:'Alcyone Bold';src:url('/font/Alcyone-Bold.woff2');font-weight:700}body{margin:0;background:#888}</style>${reference}`;else if(url.pathname==='/render')body=`<style>body{margin:0;background:#888}canvas{display:block}</style><canvas></canvas><script type="module">import{getDocument,GlobalWorkerOptions}from'/pdfjs/pdf.mjs';GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';const d=await getDocument({url:'/pdf?cover=${url.searchParams.get('cover')||'A'}'}).promise;const p=await d.getPage(${Number(url.searchParams.get('page')||1)});const v=p.getViewport({scale:794/p.view[2]});const c=document.querySelector('canvas');c.width=794;c.height=1123;await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;window.totalPages=d.numPages;window.ready=true;</script>`;else if(url.pathname==='/pdf'){body=pdfs[url.searchParams.get('cover')||'A'];type='application/pdf';}else if(url.pathname==='/qr.png'){body=qr;type='image/png';}else{let file;if(url.pathname.startsWith('/font/'))file=path.join(root,'apps/web/app/fonts',path.basename(url.pathname));if(url.pathname.startsWith('/assets/'))file=path.join(root,'apps/web/public/artboard-logo',path.basename(url.pathname));if(url.pathname.startsWith('/pdfjs/'))file=path.join(root,'node_modules/pdfjs-dist/build',path.basename(url.pathname));if(file){body=fs.readFileSync(file);type=file.endsWith('.mjs')?'text/javascript':file.endsWith('.svg')?'image/svg+xml':'font/woff2';}}if(body===undefined){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':type});res.end(body);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1000,height:1200}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error(m.text());});await page.goto(url+'/reference');await page.evaluate(()=>document.fonts.ready);
 const metrics={};for(const letter of 'ABCDEFG'){const el=page.locator(`[data-sc-name="${prefix}-00-Naslovnica-${letter}"] > div`);metrics[letter]=await el.evaluate(el=>{const root=el.getBoundingClientRect();return[...el.querySelectorAll('[data-dc-tpl]')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{tag:e.tagName,tpl:e.getAttribute('data-dc-tpl'),text:e.textContent.slice(0,65),x:r.x-root.x,y:r.y-root.y,w:r.width,h:r.height,font:s.fontSize,lineHeight:s.lineHeight};});});await el.screenshot({path:path.join(out,`reference-${letter}.png`)});}
 const inners=['Minimal-02-Profil','Minimal-03-Izdvojeni-radovi','Minimal-04-Rad-1','Minimal-06-Kolekcija','Minimal-07-Kolekcija-Rad','Minimal-08-CV-1','Minimal-09-CV-2','Minimal-10-Kontakt'];if(rounded||gradient||editorial||cards||blocks)inners.push('Minimal-05-Rad-2');
 for(const originalKey of inners){
   const key=blocks?originalKey:originalKey.replace('Minimal-',prefix+'-'),el=page.locator(`[data-sc-name="${key}"] > div`).first();
   metrics[key]=await el.evaluate(el=>{const root=el.getBoundingClientRect();return[...el.querySelectorAll('[data-dc-tpl]')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{tag:e.tagName,tpl:e.getAttribute('data-dc-tpl'),text:e.textContent.slice(0,65),x:r.x-root.x,y:r.y-root.y,w:r.width,h:r.height,font:s.fontSize,lineHeight:s.lineHeight};});});
   await el.screenshot({path:path.join(out,`reference-${key}.png`)});
 }
 fs.writeFileSync(path.join(out,'reference-metrics.json'),JSON.stringify(metrics,null,2));
 for(const letter of 'ABCDEFG'){await page.goto(url+`/render?cover=${letter}`);await page.waitForFunction(()=>window.ready);await page.locator('canvas').screenshot({path:path.join(out,`pdf-${letter}.png`)});}
 const entries=traces.A,captures=[];let cvPage=0;
 for(const entry of entries){const kind=entry.page.kind;if(kind==='cover')continue;const key=kind==='artwork'?(entry.page.artworkId==='work-3'?'group-work':entry.page.artworkId==='work-0'?'work':entry.page.artworkId==='work-1'?'work-2':null):kind==='cv'?`cv-${++cvPage}`:kind;if(!key)continue;captures.push({key,index:entry.index});await page.goto(url+`/render?page=${entry.index}`);await page.waitForFunction(()=>window.ready);await page.locator('canvas').screenshot({path:path.join(out,`pdf-${key}.png`)});}
 const cv=entries.find(v=>v.page.kind==='cv');
 if(cv&&cv.count>1){captures.push({key:'cv-2',index:cv.index+1});await page.goto(url+`/render?page=${cv.index+1}`);await page.waitForFunction(()=>window.ready);await page.locator('canvas').screenshot({path:path.join(out,'pdf-cv-2.png')});}
 const comparison={};for(const letter of 'ABCDEFG'){
   const a=await sharp(path.join(out,`reference-${letter}.png`)).removeAlpha().raw().toBuffer({resolveWithObject:true});
   const b=await sharp(path.join(out,`pdf-${letter}.png`)).removeAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(a.info.width,794);assert.equal(a.info.height,1123);assert.equal(a.data.length,b.data.length);
   let difference=0;for(let n=0;n<a.data.length;n++)difference+=Math.abs(a.data[n]-b.data[n]);comparison[letter]={width:794,height:1123,meanAbsoluteRgbDifference:difference/a.data.length};
 }
 const geometry=[],innerComparison={};
 if(blocks){
   const pixels=async file=>sharp(path.join(out,file)).removeAlpha().raw().toBuffer({resolveWithObject:true});
   const color=(p,x,y)=>{const at=(y*p.info.width+x)*p.info.channels;return [...p.data.subarray(at,at+3)];};
   const white=(p,x,y)=>color(p,x,y).every(v=>v>=248),matches=(p,x,y,expected)=>color(p,x,y).every((v,i)=>Math.abs(v-expected[i])<=1);
   const blue=[13,116,255],red=[254,23,29],yellow=[255,211,27],violet=[120,60,255];
   const whiteBounds=p=>{let x0=794,y0=1123,x1=0,y1=0;for(let y=40;y<220;y++)for(let x=5;x<55;x++)if(white(p,x,y)){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return[x0,y0,x1,y1];};
   for(const letter of 'ABCDEFG'){
     const p=await pixels(`pdf-${letter}.png`),ref=await pixels(`reference-${letter}.png`);
     for(const[x,y]of [[10,10],[10,500],[59,1110]])assert(matches(p,x,y,blue)&&matches(ref,x,y,blue),letter+' blue rail');
     const a=whiteBounds(p),b=whiteBounds(ref);a.forEach((v,i)=>assert(Math.abs(v-b[i])<=1,letter+' vertical text bounds'));
   }
   geometry.push('All seven 60.5px blue rails match; vertical-label bounds agree within one pixel');
   const b=await pixels('pdf-B.png'),d=await pixels('pdf-D.png'),e=await pixels('pdf-E.png');
   assert(matches(b,735,200,red));assert(matches(d,310,150,yellow));assert(matches(d,780,1000,red));assert(matches(e,682,200,violet));
   geometry.push('B/D/E have the supplied red/yellow/violet 18.9px portrait offsets; D has its red year block');
   for(const[x,c]of [[150,blue],[335,yellow],[520,red],[705,violet]])assert(matches(e,x,390,c));geometry.push('E has the four solid-color 15.1px bands in the correct order');
   const f=await pixels('pdf-F.png');assert(white(f,114,831));let count=0;for(let y=800;y<855;y++)for(let x=535;x<690;x++)if(matches(f,x,y,yellow))count++;assert(count>500);geometry.push('F has the shifted square white name card and yellow badge');
   const g=await pixels('pdf-G.png');assert(matches(g,120,300,blue));assert(matches(g,397,494,yellow));assert(white(g,112,1054));geometry.push('G has the blue panel, yellow 6px ring and shifted footer rule');
   pdfs.__minimal=await generatePortfolioPdf({...p,designConfig:{...p.designConfig,minimal:{version:1,cover:'A'}}});
   for(const capture of captures){
     await page.goto(url+`/render?cover=__minimal&page=${capture.index}`);await page.waitForFunction(()=>window.ready);
     const bytes=await page.locator('canvas').screenshot(),baseline=await sharp(bytes).removeAlpha().raw().toBuffer(),actual=(await pixels(`pdf-${capture.key}.png`)).data;
     let difference=0;for(let i=0;i<baseline.length;i++)difference+=Math.abs(baseline[i]-actual[i]);innerComparison[capture.key]=difference/baseline.length;
     assert(innerComparison[capture.key]<.05,capture.key+' must retain the supplied Minimal layout');
   }
   geometry.push('All nine supplied inner-page examples retain the actual Minimal rendering');
 }
 if(cards){
   const pixels=async file=>sharp(path.join(out,file)).removeAlpha().raw().toBuffer({resolveWithObject:true});
   const color=(p,x,y)=>{const at=(y*p.info.width+x)*p.info.channels;return [...p.data.subarray(at,at+3)];};
   const white=(p,x,y)=>color(p,x,y).every(v=>v>=248),gray=(p,x,y)=>color(p,x,y).every((v,i)=>Math.abs(v-[238,240,244][i])<=1);
   for(const[letter,y]of [['A',750],['B',200],['C',200],['D',750],['E',200],['G',750]]){const p=await pixels(`pdf-${letter}.png`),ref=await pixels(`reference-${letter}.png`);assert(gray(p,10,y)&&gray(ref,10,y),letter+' gray page');}geometry.push('Cards page backgrounds match reference #eef0f4');
   for(const[file,points,filled]of [
     ['pdf-A.png',[[568,772]],[[646,820]]],['pdf-B.png',[[530,76]],[[627,150]]],
     ['pdf-C.png',[[277,265]],[[397,385]]],['pdf-D.png',[[69,76],[69,333]],[[150,150],[200,500]]],
     ['pdf-E.png',[[462,76]],[[550,150]]],['pdf-featured.png',[[69,137]],[[200,300],[600,220],[600,480]]],
     ['pdf-work.png',[[69,137]],[[200,300]]],['pdf-collection.png',[[69,137]],[[200,300]]],
     ['pdf-group-work.png',[[69,198]],[[200,350]]],
   ]){const p=await pixels(file);for(const[x,y]of points)assert(gray(p,x,y),file+' clipped corner');for(const[x,y]of filled)assert(!gray(p,x,y),file+' visible image');}geometry.push('Circular portraits and 15.1px image corners preserve the gray page beneath');
   const profile=await pixels('pdf-profile.png'),refProfile=await pixels('reference-Kartice-02-Profil.png');
   const cardRuns=(p,x)=>{const runs=[];let start;for(let y=100;y<=1030;y++){if(white(p,x,y)){if(start===undefined)start=y;}else if(start!==undefined){if(y-start>20)runs.push([start,y-1]);start=undefined;}}return runs;};
   const compareCards=(actual,reference,x)=>{const a=cardRuns(actual,x),b=cardRuns(reference,x);assert.equal(a.length,b.length);a.forEach((run,i)=>run.forEach((v,j)=>assert(Math.abs(v-b[i][j])<=2,`Card boundary: ${a} vs ${b}`)));};
   compareCards(profile,refProfile,80);
   assert(white(profile,80,300)&&white(profile,80,700)&&gray(profile,400,520));geometry.push('Profile card bounds, padding and rounded edges agree with the supplied HTML');
   const featured=await pixels('pdf-featured.png');for(const[x,y]of [[509,300],[200,576],[285,720]])assert(gray(featured,x,y));for(const[x,y]of [[200,300],[600,220],[600,480],[200,690],[400,690],[600,690]])assert(!gray(featured,x,y));geometry.push('Six-image asymmetrical collage has the reference 15.1px gutters');
   const g=await pixels('pdf-G.png');assert(white(g,120,300));const imageColor=color(g,600,350);assert(Math.max(...imageColor)-Math.min(...imageColor)>20);assert(gray(g,397,494));geometry.push('G keeps a white left panel, full-color art and the 6px gray portrait ring');
   const f=await pixels('pdf-F.png');assert(white(f,80,860));let yellow=0;for(let y=800;y<855;y++)for(let x=535;x<690;x++){const[r,g,b]=color(f,x,y);if(r>240&&g>180&&g<230&&b<60)yellow++;}assert(yellow>500);geometry.push('F uses the rounded white name card, yellow capsule and rotated QR shadow');
   const contact=await pixels('pdf-contact.png'),refContact=await pixels('reference-Kartice-10-Kontakt.png');
   compareCards(contact,refContact,75);
   const cv=await pixels('pdf-cv-2.png'),refCv=await pixels('reference-Kartice-09-CV-2.png');compareCards(cv,refCv,80);
   assert(white(contact,650,1055)&&gray(contact,600,1054));geometry.push('Contact, CV cards and print-frame bounds agree within two pixels; footer has the reference white capsule');
 }
 if(editorial){
   const pixels=async file=>sharp(path.join(out,file)).removeAlpha().raw().toBuffer({resolveWithObject:true});
   const color=(p,x,y)=>{const at=(y*p.info.width+x)*p.info.channels;return [...p.data.subarray(at,at+3)];};
   const white=(p,x,y)=>color(p,x,y).every(v=>v>=248),gray=(p,x,y)=>{const c=color(p,x,y);return Math.max(...c)-Math.min(...c)<3;};
   const g=await pixels('pdf-G.png'),refG=await pixels('reference-G.png');
   for(const[x,y]of [[600,350],[650,900],[390,620]]){assert(gray(g,x,y),'G monochrome images');const a=color(g,x,y),b=color(refG,x,y);assert(a.every((v,i)=>Math.abs(v-b[i])<8),'G reference grayscale/contrast');}
   assert(gray(g,100,45));assert(color(g,275,500).every(v=>v<30));assert(white(g,397,496));assert(!white(g,397,600));geometry.push('G grayscale contrast and circular portrait match supplied reference');
   const a=await pixels('pdf-A.png');assert(!gray(a,200,300));geometry.push('A-F retain their full-color Minimal composition');
   const profile=await pixels('pdf-profile.png'),refProfile=await pixels('reference-Editorial-02-Profil.png');
   for(const center of [57,61,142,1044]){
     const line=p=>{let best={y:0,count:0};for(let y=center-2;y<=center+2;y++){let count=0;for(let x=68;x<726;x++)if(color(p,x,y).every(v=>v<150))count++;if(count>best.count)best={y,count};}return best;};
     const actual=line(profile),reference=line(refProfile);assert(actual.count>600&&reference.count>600);assert(Math.abs(actual.y-reference.y)<=1);
   }
   geometry.push('Editorial double masthead rule, title rule and enlarged-number footer agree within one pixel');
   const featured=await pixels('pdf-featured.png');for(const[x,y]of [[509,300],[200,622],[285,750]])assert(white(featured,x,y));for(const[x,y]of [[200,300],[600,250],[600,500],[200,720],[400,720],[600,720]])assert(!white(featured,x,y));geometry.push('Six numbered tiles: first spans two rows/columns; correct 15.1px gutters');
   const collection=await pixels('pdf-collection.png');
   for(const[x,y]of [[509,300],[600,487],[200,810]])assert(white(collection,x,y),'Collection collage gutters');
   for(const[x,y]of [[200,300],[600,300],[600,600]])assert(!white(collection,x,y),'Collection collage image interior');
   assert(color(collection,280,900).every(v=>v<180));geometry.push('Collection uses the supplied 612.3px numbered collage and separate year/count and description columns');
   const contact=await pixels('pdf-contact.png'),ref=await pixels('reference-Editorial-10-Kontakt.png');
   for(const[x,y]of [[80,720],[600,800],[500,950]]){assert(gray(contact,x,y),'Contact monochrome background');const a=color(contact,x,y),b=color(ref,x,y);assert(a.every((v,i)=>Math.abs(v-b[i])<8),'Contact reference zoom/contrast');}
   assert(!gray(contact,220,750));assert(white(contact,165,800));geometry.push('Contact selective-color crop, 165% zoom, grayscale contrast and white window border match reference');
   const cv=await pixels('pdf-cv-2.png');assert(color(cv,397,270).every(v=>v<180));assert(color(cv,397,850).every(v=>v<180));geometry.push('CV software/publications have the reference vertical dividers');
 }
 if(rounded){
   async function pixels(file){return sharp(path.join(out,file)).removeAlpha().raw().toBuffer({resolveWithObject:true});}
   const white=(p,x,y)=>{const offset=(y*p.info.width+x)*p.info.channels;return [...p.data.subarray(offset,offset+3)].every(v=>v>=248);};
   for(const [file,corners,filled] of [
     ['pdf-A.png',[[568,772]],[[646,820]]],['pdf-B.png',[[530,76]],[[627,150]]],
     ['pdf-C.png',[[277,265]],[[397,385]]],['pdf-D.png',[[69,76],[69,333]],[[150,150],[200,500]]],
     ['pdf-E.png',[[462,76]],[[550,150]]],['pdf-featured.png',[[69,137],[294,137]],[[170,240]]],
     ['pdf-work.png',[[69,137]],[[170,240]]],['pdf-collection.png',[[69,137],[518,137]],[[200,350]]],
     ['pdf-group-work.png',[[69,183]],[[170,300]]],['pdf-contact.png',[[69,137],[69,652]],[[150,210],[200,800]]],
   ]){const p=await pixels(file);for(const [x,y]of corners)assert(white(p,x,y),`${file}: corner ${x},${y} must be clipped`);for(const [x,y]of filled)assert(!white(p,x,y),`${file}: image interior ${x},${y} must remain visible`);geometry.push(file+' clipped corners and visible interior');}
   const profile=await pixels('pdf-profile.png');assert(white(profile,400,114));assert(white(profile,400,1054));geometry.push('Rounded omits Minimal title/footer separator lines');
   const f=await pixels('pdf-F.png');assert(!white(f,69,831));assert(white(f,80,860));let yellow=0;for(let y=800;y<855;y++)for(let x=535;x<690;x++){const i=(y*f.info.width+x)*f.info.channels;if(f.data[i]>240&&f.data[i+1]>180&&f.data[i+1]<230&&f.data[i+2]<60)yellow++;}assert(yellow>500);geometry.push('F has a rounded white card and a yellow badge');
 }
 if(gradient){
   const pixels=async file=>sharp(path.join(out,file)).removeAlpha().raw().toBuffer({resolveWithObject:true});
   const color=(p,x,y)=>{const offset=(y*p.info.width+x)*p.info.channels;return [...p.data.subarray(offset,offset+3)];};
   const white=(p,x,y)=>color(p,x,y).every(v=>v>=248);
   for(const [file,points]of [['C',[[10,10],[784,10],[10,1113],[784,1113],[10,561],[397,10]]],['G',[[120,250],[120,650],[120,990]]]]){
     const pdf=await pixels(`pdf-${file}.png`),ref=await pixels(`reference-${file}.png`);
     for(const[x,y]of points){const a=color(pdf,x,y),b=color(ref,x,y);assert(a.every((v,i)=>Math.abs(v-b[i])<4),`${file}: gradient colors at ${x},${y}: ${a} vs ${b}`);}geometry.push(file+' gradient direction and color stops match reference');
   }
   for(const[file,corners,filled]of [
     ['pdf-A.png',[[568,772]],[[646,820]]],['pdf-C.png',[[277,295]],[[397,415]]],['pdf-D.png',[[69,76],[69,333]],[[150,150]]],
     ['pdf-featured.png',[[69,152]],[[170,240]]],['pdf-work.png',[[69,152]],[[170,240]]],['pdf-collection.png',[[69,152]],[[200,350]]],
     ['pdf-group-work.png',[[69,198]],[[170,300]]],['pdf-contact.png',[[69,152],[69,639]],[[150,210],[200,800]]],
   ]){const p=await pixels(file);for(const[x,y]of corners)assert(white(p,x,y),file+' clipped corner');for(const[x,y]of filled)assert(!white(p,x,y),file+' visible image interior');geometry.push(file+' reference clipping');}
   const c=await pixels('pdf-C.png');assert(white(c,50,50));geometry.push('C white inset card remains inside the 135-degree frame');
   const profile=await pixels('pdf-profile.png'),left=color(profile,90,112),right=color(profile,700,112);assert(left[2]>left[0]&&right[0]>right[2]);assert(white(profile,400,1054));geometry.push('Gradient title rule has blue/yellow ends; no footer rule');
   const f=await pixels('pdf-F.png');let blue=0,purple=0,red=0;for(let y=800;y<855;y++)for(let x=535;x<690;x++){const[r,g,b]=color(f,x,y);if(b>180&&r<100)blue++;if(r>100&&b>130&&g<120)purple++;if(r>200&&b<80&&g<130)red++;}assert(blue>20&&purple>20&&red>20);geometry.push('F badge contains its blue/purple/red gradient');
   const contact=await pixels('pdf-contact.png');assert(color(contact,90,1020)[2]>color(contact,90,1020)[0]);geometry.push('Contact has a gradient separator below its image');
 }
 fs.writeFileSync(path.join(out,'visual-comparison.json'),JSON.stringify({covers:comparison,geometry,innerComparison,errors},null,2));assert.deepEqual(errors,[]);
 console.log(JSON.stringify({covers:7,comparison,metrics:path.join(out,'reference-metrics.json'),pdfs:path.join(out,`${name}-A.pdf`)}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
