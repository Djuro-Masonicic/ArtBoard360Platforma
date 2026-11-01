// Compare the export renderer against the supplied Featured Work layouts.
// Image blobs are absent from the reference, so both sides use identical fixtures.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const { PNG } = require('pngjs');
const { graphicHTML, selected } = require('@artboard/promotion-renderer');
const { view, initialState, renderUi } = require('@artboard/promotion-renderer');
const { createElement, Fragment } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../../..'), out = path.join(root, '.tmp/promotion-featured-work');
const artifact = fs.readFileSync(path.join(root, 'apps/web/references/promotion-featured-work-artifact-20261031.html'), 'utf8');
const references = [...artifact.matchAll(/2([a-f]) · Featured Work[^\r\n]+\s*(<div[\s\S]*?)(?=\s*2[a-f] · Featured Work|$)/g)];
assert.equal(references.length, 6);
const svg = s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');
const art = svg('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440"><defs><linearGradient id="g"><stop stop-color="#ff9944"/><stop offset="1" stop-color="#6633cc"/></linearGradient></defs><rect width="1080" height="1440" fill="url(#g)"/><circle cx="350" cy="450" r="200" fill="#4488cc"/></svg>');
const other = svg('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440"><rect width="1080" height="1440" fill="#99ccee"/></svg>');
const source = { name: 'Tijana Marković', avatar: null, form: 'f', year: 2026, profileUrl: 'https://example.test/tijana', shortUrl: 'example.test/tijana', works: [{ id: 'first', title: 'Lorem ipsum', imageUrl: art }, { id: 'second', title: 'Drugi rad', imageUrl: other }] };
const baseConfig = { artworkIds: ['first', 'second'], template: 1, version: 0, color: 'light', language: 'ME', name: source.name, instagram: '@test', title: null, description: '', signature: 'instagram' };
const fonts = [[400, 'Regular'], [500, 'Medium'], [700, 'Bold'], [800, 'Black']].map(([weight, name]) => `@font-face{font-family:Alcyone;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(root, 'apps/web/app/fonts', `Alcyone-${name}.woff2`)).toString('base64')});font-weight:${weight}}`).join('');
// The pasted Gallery Frame HTML references a CSS class without its rule. The
// original full Generator Artifact supplies its center/cover background. Match
// that existing rule with the selected work, as the production compiler does.
const backdrop = `.ab-bg-ecf9c726{background:url("${art}") center/cover no-repeat}`;
const document = body => `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}${backdrop}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1440px;overflow:hidden;font-family:Alcyone,sans-serif;color:#111318}body>[data-ab-stage]{width:1080px!important;height:1440px!important;--s:1;border-radius:0!important;box-shadow:none!important}</style></head><body>${body}</body></html>`;
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
      const code = '2' + references[i][1], config = { ...baseConfig, version: Math.floor(i / 2), color: i % 2 ? 'dark' : 'light' };
      assert.equal(selected(config).code, code);
      assert.equal(selected(config).slides, 2);
      const reference = references[i][2].replace(/\/_blob\/([a-f0-9]+)/g, () => art);
      const expected = await capture(reference), actual = await capture(graphicHTML({ config, source, rendererVersion: 2 }, 0));
      fs.writeFileSync(path.join(out, code + '-reference.png'), expected);
      fs.writeFileSync(path.join(out, code + '-actual.png'), actual);
      const a = PNG.sync.read(actual), e = PNG.sync.read(expected);
      let differentPixels = 0;
      for (let p = 0; p < a.data.length; p += 4) if (a.data.subarray(p, p + 4).compare(e.data.subarray(p, p + 4))) differentPixels++;
      results.push({ code, width: a.width, height: a.height, differentPixels });
      assert.equal(differentPixels, 0, code + ' differs from the supplied layout');
      if (i < 2) {
        // The user revised Museum Label after accepting the original Artifact.
        // Portrait, square and landscape works must fit above a flowing caption.
        for (const [width, height] of [[600, 1200], [1200, 600], [900, 900]]) {
          const image = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#4488cc"/></svg>`);
          const updatedSource = { ...source, works: [{ ...source.works[0], imageUrl: image }, source.works[1]] };
          await capture(graphicHTML({ config: { ...config, title: 'Umjetničko djelo 8' }, source: updatedSource }, 0));
          const layout = await page.locator('[data-promotion-layout="museum-label"]').evaluate(el => {
            const art = el.querySelector('[data-promotion-artwork]'), img = art.querySelector('img'), caption = el.querySelector('[data-promotion-caption]');
            const a = art.getBoundingClientRect(), c = caption.getBoundingClientRect(), frame = img.parentElement.getBoundingClientRect();
            return { gap: c.top - a.bottom, fit: getComputedStyle(img).objectFit, artHeight: a.height, frameHeight: frame.height, frameTop: frame.top - a.top, captionBottom: c.bottom };
          });
          assert.equal(layout.fit, 'contain');
          assert.equal(layout.gap, 40);
          assert(layout.artHeight > 0 && layout.captionBottom <= 1376);
          assert.equal(layout.frameTop, 0);
          assert.equal(layout.frameHeight, layout.artHeight);
        }
        await capture(graphicHTML({ config: { ...config, title: 'Umjetničko djelo 8' }, source }, 0));
        await page.screenshot({ path: path.join(out, code + '-revised.png'), animations: 'disabled' });
        results[results.length - 1].revisedMuseumLayout = 'whole image, caption below, 3 aspect ratios';
      }
      const second = graphicHTML({ config, source }, 1);
      assert(second.includes(other) && second.includes('Drugi rad'));
      assert(!second.includes('Lorem ipsum') && !second.includes(art));
      const custom = graphicHTML({ config: { ...config, name: 'Druga umjetnica', title: 'Ručni naziv' }, source: { ...source, year: 2030 } }, 1);
      assert(custom.includes('Druga umjetnica') && custom.includes('Ručni naziv') && custom.includes('2030.'));
      assert(!custom.includes('Tijana Marković') && !custom.includes('Drugi rad') && !custom.includes('2026.'));
    }
    // Museum Label's unselected thumbnail must show the revision before the
    // user clicks Featured Work, including while another Featured version is active.
    const usage = { plan: 'FREE', used: 0, reserved: 0, limit: 1, remaining: 1, purchased: 0 };
    for (const theme of ['light', 'dark']) for (const [template, version] of [[0, 0], [1, 1], [2, 0]]) {
      const config = { ...baseConfig, template, version, color: theme };
      const v = view(theme, { ...initialState(config, source, usage), tab: 0 }, source, () => {}, { history: [] }, usage);
      await page.setContent(document(renderToStaticMarkup(renderUi(theme, v, createElement, Fragment))));
      await page.evaluate(() => document.fonts.ready);
      const card = page.getByRole('button').filter({ has: page.getByText('Featured Work', { exact: true }) });
      assert.equal(await card.count(), 1);
      const museum = template === 1
        ? page.locator('[data-ab="promo-versions"] [data-promotion-layout="museum-label"]')
        : card.locator('[data-promotion-layout="museum-label"]');
      await museum.waitFor();
      assert.equal(await museum.locator('[data-promotion-artwork] img').evaluate(el => getComputedStyle(el).objectFit), 'contain');
      assert.equal(await card.getAttribute('aria-pressed'), String(template === 1));
      if (template === 0) await card.screenshot({ path: path.join(out, `unselected-featured-${theme}.png`) });
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ results, errors }, null, 2));
    console.log(JSON.stringify({ results, thumbnailScenarios: 6, errors }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
