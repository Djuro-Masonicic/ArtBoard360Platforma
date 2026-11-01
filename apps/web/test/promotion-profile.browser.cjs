// Profile layout comparison, actual QR decoding, and unselected picker previews.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('@playwright/test'), { PNG } = require('pngjs');
const QRCode = require('qrcode'), jsQR = require('jsqr');
const { createElement, Fragment } = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const { graphicHTML, selected, view, initialState, renderUi } = require('@artboard/promotion-renderer');
const root = path.resolve(__dirname, '../../..'), out = path.join(root, '.tmp/promotion-profile');
const artifact = fs.readFileSync(path.join(root, 'apps/web/references/promotion-profile-artifact-20261031.html'), 'utf8');
const references = [...artifact.matchAll(/3([a-f]) · Profile[^\r\n]+\s*(<div[\s\S]*?)(?=\s*3[a-f] · Profile|$)/g)];
assert.equal(references.length, 6);
const svg = s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');
const artwork = (color, circle) => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440"><rect width="1080" height="1440" fill="${color}"/><circle cx="350" cy="450" r="200" fill="${circle}"/></svg>`);
const images = [artwork('#ff9944','#4488cc'), artwork('#6633cc','#cc8844'), artwork('#2288aa','#ee7777')];
const avatar = svg('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#aabbcc"/><circle cx="150" cy="110" r="60" fill="#223344"/></svg>');
const logos = require('@artboard/promotion-renderer/logos.json');
function qrFor(url) {
  const q = QRCode.create(url, { errorCorrectionLevel: 'Q' }), n = q.modules.size;
  let qrPath = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.modules.get(y, x)) qrPath += `M${x+4} ${y+4}h1v1h-1z`;
  return { qrPath, qrView: `0 0 ${n+8} ${n+8}` };
}
const profileUrl = 'https://example.test/umjetnik/tijana';
const source = { name: 'Tijana Marković', avatar, form: 'f', year: 2026, profileUrl, shortUrl: profileUrl.replace('https://',''), ...qrFor(profileUrl), works: images.map((imageUrl,i) => ({ id: 'work-'+i, title: 'Rad '+i, imageUrl })) };
const baseConfig = { artworkIds: source.works.map(w=>w.id), template: 2, version: 0, color: 'light', language: 'ME', name: source.name, instagram: '@mawatitaa', title: null, description: '', signature: 'instagram' };
const fonts = [[400,'Regular'],[500,'Medium'],[600,'SemiBold'],[700,'Bold'],[800,'Black']].map(([weight,name])=>`@font-face{font-family:Alcyone;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(root,'apps/web/app/fonts',`Alcyone-${name}.woff2`)).toString('base64')});font-weight:${weight}}`).join('');
const document = body => `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1440px;overflow:hidden;font-family:Alcyone,sans-serif;color:#111318}body>[data-ab-stage]{width:1080px!important;height:1440px!important;--s:1;border-radius:0!important;box-shadow:none!important}</style></head><body>${body}</body></html>`;
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1080,height:1440}}), errors=[], results=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    async function load(markup){await page.setContent(document(markup));await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});}
    for(let i=0;i<6;i++){
      const config={...baseConfig,version:Math.floor(i/2),color:i%2?'dark':'light'},code='3'+references[i][1];
      assert.equal(selected(config).code,code);assert.equal(selected(config).slides,3);
      const blobs={ '1bdc45cf08e486cae7ec3636c955a240':logos['6cc1ee7b-1ee9-4ff4-af76-94da81ce8d2e'], '9d94ee9219b36b4636a3067bb451deaf':logos['7d46f021-b7ad-4403-973e-79a2339d1927'], '842695d74fbd2ea6d690237eb8c07ecf':logos['50c5489b-bab1-45a6-89b3-c4217bd117a1'], f4c0b297b8e10510e5e538da0e96f241:avatar, '10b076798eea6832a1018fddcc8d9b13':images[0], '51646fe20d9e1771015b5b48ddc60c50':images[1], '47056fc8960cce22a993aedf67c86144':images[config.version===1?2:0] };
      const reference=references[i][2].replace(/\/_blob\/([a-f0-9]+)/g,(_,id)=>{assert(blobs[id],id);return blobs[id];}).replace(/viewBox="[^"]*"/g,`viewBox="${source.qrView}"`).replace(/ d="[^"]*"/g,` d="${source.qrPath}"`).replaceAll('art-board.me/umjetnik/tijana-markovic',source.shortUrl);
      await load(reference);const expected=await page.screenshot({animations:'disabled'});
      await load(graphicHTML({config,source}));const actual=await page.screenshot({animations:'disabled'});
      fs.writeFileSync(path.join(out,code+'-reference.png'),expected);fs.writeFileSync(path.join(out,code+'-actual.png'),actual);
      const a=PNG.sync.read(actual),e=PNG.sync.read(expected);let differentPixels=0;
      for(let p=0;p<a.data.length;p+=4)if(a.data.subarray(p,p+4).compare(e.data.subarray(p,p+4)))differentPixels++;
      results.push({code,width:a.width,height:a.height,differentPixels});assert.equal(differentPixels,0,code+' differs from supplied layout');
      const qrPNG=PNG.sync.read(await page.locator('svg').screenshot({animations:'disabled'}));
      assert.equal(jsQR(new Uint8ClampedArray(qrPNG.data),qrPNG.width,qrPNG.height,{inversionAttempts:'attemptBoth'})?.data,profileUrl,code+' QR must decode to this profile');
      const previewUsage={plan:'FREE',used:0,reserved:0,limit:1,remaining:1,purchased:0};
      const previewView=view(config.color,{...initialState(config,source,previewUsage),tab:0},source,()=>{},{history:[]},previewUsage);
      await load(renderToStaticMarkup(renderUi(config.color,previewView,createElement,Fragment)));
      assert.equal(await page.locator('[data-ab="promo-versions"] button[aria-pressed]').count(),3);
      const liveMarkup=await page.locator('[data-ab="promo-swipe"]>[data-ab-stage]').evaluate(el=>el.outerHTML);
      await load(liveMarkup);
      const live=PNG.sync.read(await page.screenshot({animations:'disabled'}));
      assert.equal(live.data.compare(a.data),0,code+' main preview and PNG export must match');
      const second=graphicHTML({config,source},1);assert.notEqual(second,graphicHTML({config,source},0));
      const custom=graphicHTML({config:{...config,name:'Druga umjetnica',instagram:'@druga'},source:{...source,profileUrl:'https://example.test/druga',shortUrl:'example.test/druga',...qrFor('https://example.test/druga')}},0);
      assert(custom.includes('Druga umjetnica')&&!custom.includes('Tijana Marković'));assert(!custom.includes(source.qrPath));
      if(config.version===1)assert(custom.includes('@druga')&&custom.includes('example.test/druga'));
    }
    const usage={plan:'FREE',used:0,reserved:0,limit:1,remaining:1,purchased:0};
    for(const theme of ['light','dark']){
      const config={...baseConfig,template:0,color:theme};
      const v=view(theme,{...initialState(config,source,usage),tab:0},source,()=>{},{history:[]},usage);
      await load(renderToStaticMarkup(renderUi(theme,v,createElement,Fragment)));
      const card=page.getByRole('button').filter({has:page.getByText('Profile',{exact:true})});
      assert.equal(await card.getAttribute('aria-pressed'),'false');
      assert.equal(await card.locator('svg[shape-rendering="crispEdges"]').count(),1);
      assert.equal(await card.locator('svg path').last().getAttribute('d'),source.qrPath);
      await card.screenshot({path:path.join(out,'unselected-'+theme+'.png')});
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,qrDecoded:6,livePreviewMatches:6,unselectedCardThemes:2,errors},null,2));console.log(JSON.stringify({results,qrDecoded:6,livePreviewMatches:6,unselectedCardThemes:2,errors}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
