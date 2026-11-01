// Compare Artist Card, --block-poster, --new-artwork or --shop with supplied layouts.
// Both sides use the same fixture images and existing ArtBoard logo/fonts.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const { PNG } = require('pngjs');
const { graphicHTML, selected, view, initialState, renderUi } = require('@artboard/promotion-renderer');
const { createElement, Fragment } = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const blockPoster = process.argv.includes('--block-poster'), newArtwork = process.argv.includes('--new-artwork'), shop = process.argv.includes('--shop');
const family = shop ? 'Shop' : newArtwork ? 'New Artwork' : blockPoster ? 'Block Poster' : 'Artist Card';
const prefix = shop ? '8' : newArtwork ? '6' : blockPoster ? '5' : '1', slug = shop ? 'shop' : newArtwork ? 'new-artwork' : blockPoster ? 'block-poster' : 'artist-card';
const root = path.resolve(__dirname, '../../..'), out = path.join(root, '.tmp/promotion-' + slug);
const artifact = fs.readFileSync(path.join(root, 'apps/web/references/promotion-' + slug + '-artifact-20261031.html'), 'utf8');
const references = [...artifact.matchAll(new RegExp(`${prefix}([a-h]) · ${family}[^\\r\\n]+\\s*(<div[\\s\\S]*?)(?=\\s*${prefix}[a-h] · ${family}|$)`, 'g'))];
assert.equal(references.length, 6);
const svg = s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');
const art = svg('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440"><defs><linearGradient id="g"><stop stop-color="#ff9944"/><stop offset="1" stop-color="#6633cc"/></linearGradient></defs><rect width="1080" height="1440" fill="url(#g)"/><circle cx="350" cy="450" r="200" fill="#4488cc"/></svg>');
const avatar = svg('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#aabbcc"/><circle cx="150" cy="110" r="60" fill="#223344"/><ellipse cx="150" cy="300" rx="110" ry="120" fill="#334455"/></svg>');
const logo = require('@artboard/promotion-renderer/logos.json')['6cc1ee7b-1ee9-4ff4-af76-94da81ce8d2e'];
const blobs = { a68587b30b0b9d20d2a9f1712407f43f: art, '18203b2c88c6fc9ed564c29045d1a3ae': art, '9784c36244e5944c057870da95433d25': art, f4c0b297b8e10510e5e538da0e96f241: avatar, '1bdc45cf08e486cae7ec3636c955a240': logo };
Object.assign(blobs, { '17295d500e943f8ac2e9ff423845557d': art, '90569f4028ea7e6734503496e42c16f2': art, '51646fe20d9e1771015b5b48ddc60c50': art });
Object.assign(blobs, { '47056fc8960cce22a993aedf67c86144': art });
const source = { name: 'Tijana Marković', avatar, form: 'f', profileUrl: 'https://example.test/tijana', shortUrl: 'example.test/tijana', works: [{ id: 'first', title: 'Lorem ipsum', imageUrl: art }, { id: 'second', title: 'Drugi rad', imageUrl: avatar }] };
const baseConfig = { artworkIds: ['first', 'second'], template: shop ? 7 : newArtwork ? 5 : blockPoster ? 4 : 0, version: 0, color: 'light', language: 'ME', name: source.name, instagram: '@mawatitaa', title: null, description: newArtwork ? 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.' : '', signature: 'instagram' };
const usage = { plan: 'FREE', used: 0, reserved: 0, limit: 1, remaining: 1, purchased: 0 };
const fonts = [[400, 'Regular'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold'], [800, 'Black']].map(([weight, name]) => `@font-face{font-family:Alcyone;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(root, 'apps/web/app/fonts', `Alcyone-${name}.woff2`)).toString('base64')});font-weight:${weight}}`).join('');
const document = body => `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1440px;overflow:hidden;font-family:Alcyone,sans-serif;color:#111318}body>[data-ab-stage]{width:1080px!important;height:1440px!important;--s:1;border-radius:0!important;box-shadow:none!important}</style></head><body>${body}</body></html>`;
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1440 } });
    const errors = [], results = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    async function capture(markup) {
      await page.setContent(document(markup));
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
      return page.screenshot({ animations: 'disabled' });
    }
    for (let i = 0; i < references.length; i++) {
      const code = prefix + references[i][1], config = { ...baseConfig, version: newArtwork ? Math.min(i, 4) : blockPoster ? i : Math.floor(i / 2), color: newArtwork ? (i === 5 ? 'dark' : 'light') : blockPoster ? ([0, 2].includes(i) ? 'light' : 'dark') : (i % 2 ? 'dark' : 'light') };
      assert.equal(selected(config).code, code);
      assert.equal(selected(config).slides, 2);
      if (blockPoster || (newArtwork && i < 4)) assert.equal(selected({ ...config, color: config.color === 'light' ? 'dark' : 'light' }).code, code, 'Single-color versions retain their supported color');
      const reference = references[i][2].replace(/\/_blob\/([a-f0-9]+)/g, (_, id) => { assert(blobs[id], id); return blobs[id]; });
      const expected = await capture(reference), actual = await capture(graphicHTML({ config, source }, 0));
      fs.writeFileSync(path.join(out, code + '-reference.png'), expected);
      fs.writeFileSync(path.join(out, code + '-actual.png'), actual);
      const a = PNG.sync.read(actual), e = PNG.sync.read(expected);
      let differentPixels = 0;
      for (let p = 0; p < a.data.length; p += 4) if (a.data.subarray(p, p + 4).compare(e.data.subarray(p, p + 4))) differentPixels++;
      results.push({ code, width: a.width, height: a.height, differentPixels });
      assert.equal(differentPixels, 0, code + ' differs from the supplied layout');
      const v = view(config.color, { ...initialState(config, source, usage), tab: 0 }, source, () => {}, { history: [] }, usage);
      await page.setContent(document(renderToStaticMarkup(renderUi(config.color, v, createElement, Fragment))));
      assert.equal(await page.locator('[data-ab="promo-versions"] button[aria-pressed]').count(), newArtwork ? 5 : blockPoster ? 6 : 3);
      const liveMarkup = await page.locator('[data-ab="promo-swipe"]>[data-ab-stage]').evaluate(el => el.outerHTML);
      const live = PNG.sync.read(await capture(liveMarkup));
      assert.equal(live.data.compare(a.data), 0, code + ' main preview and export differ');
      const second = graphicHTML({ config, source }, 1);
      assert.notEqual(second, graphicHTML({ config, source }, 0), 'Each work must lead its own slide');
      if (blockPoster || newArtwork || shop) assert(second.includes('Drugi rad') && !second.includes('>Lorem ipsum<'));
      const custom = graphicHTML({ config: { ...config, name: 'Druga umjetnica', instagram: '@druga' }, source }, 0);
      assert(custom.includes('@druga'));
      if (!shop || config.version === 1) assert(custom.includes('Druga umjetnica'));
      assert(!custom.includes('Tijana Marković') && !custom.includes('@mawatitaa'));
      if (blockPoster || newArtwork || shop) assert(graphicHTML({ config: { ...config, title: 'Ručni naslov' }, source }, 1).includes('Ručni naslov'));
      if (shop) {
        const english = graphicHTML({ config: { ...config, language: 'EN' }, source });
        assert(english.includes(config.version === 1 ? 'Sold' : 'Available'));
        const empty = graphicHTML({ config: { ...config, instagram: '' }, source });
        assert(!empty.includes('@mawatitaa'), 'Missing contact must not insert the reference Instagram');
        assert(!/[€$]|8[.,]90|4[.,]90/.test(english), 'Shop design must not invent a sale price');
      }
      if (newArtwork && i < 4) {
        const described = graphicHTML({ config: { ...config, description: 'Opis novog rada.' }, source });
        assert(described.includes('Opis novog rada.') && !described.includes(baseConfig.description));
        const empty = graphicHTML({ config: { ...config, description: '' }, source });
        assert(!empty.includes(baseConfig.description), 'Empty descriptions must not introduce reference placeholder text');
      }
    }
    for (const theme of ['light', 'dark']) {
      const config = { ...baseConfig, template: 2, version: 0, color: theme };
      const v = view(theme, { ...initialState(config, source, usage), tab: 0 }, source, () => {}, { history: [] }, usage);
      await page.setContent(document(renderToStaticMarkup(renderUi(theme, v, createElement, Fragment))));
      await page.evaluate(() => document.fonts.ready);
      const card = page.getByRole('button').filter({ has: page.getByText(family, { exact: true }) });
      assert.equal(await card.getAttribute('aria-pressed'), 'false');
      assert.equal(await card.locator('img').first().getAttribute('src'), art);
      await card.screenshot({ path: path.join(out, 'unselected-' + theme + '.png') });
    }
    assert.deepEqual(errors, []);
    const report = { family, results, livePreviewMatches: 6, unselectedCardThemes: 2, errors };
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
