const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '../../..');
const out = path.join(root, '.tmp/paketi');
const base = process.env.ARTBOARD_WEB_URL || 'http://localhost:3000';
const reference = fs.readFileSync(path.join(root, 'apps/web/references/paketi-artifact-20261029.html'), 'utf8');
const checks = [], measurements = [], errors = [];
const check = (name, value = true) => { assert(value, name); checks.push(name); };
const near = (a, b, name, tolerance = .1) => assert(Math.abs(a - b) <= tolerance, `${name}: ${a} / ${b}`);

async function metrics(page, isReference = false) {
  return page.evaluate(ref => {
    const root = document.querySelector(ref ? '[data-screen-label="Paketi"]' : '[aria-labelledby="paketi-title"]');
    const find = (id, selector) => root.querySelector(ref ? `[data-dc-tpl="${id}"]` : selector);
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const style = el => { const s = getComputedStyle(el); return { fontSize: parseFloat(s.fontSize), lineHeight: parseFloat(s.lineHeight), padding: s.padding, background: s.backgroundColor, radius: s.borderRadius }; };
    return { root: box(root), title: { ...box(find(50, 'h1')), ...style(find(50, 'h1')) },
      inner: box(find(49, ':scope > div')), intro: { ...box(find(53, 'h1 + p')), ...style(find(53, 'h1 + p')) },
      free: { ...box(find(55, 'article:first-child')), ...style(find(55, 'article:first-child')) },
      premium: { ...box(find(92, 'article:last-child')), ...style(find(92, 'article:last-child')) },
      freeAction: box(find(91, 'article:first-child a')), premiumAction: box(find(133, 'article:last-child a')),
      rules: box(find(134, '[aria-label="Pravila korišćenja alata"]')),
      overflow: document.documentElement.scrollWidth > innerWidth };
  }, isReference);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1536, height: 650 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.stack || e.message));
    const response = await page.goto(base + '/paketi', { waitUntil: 'networkidle' });
    check('Paketi returns HTTP 200', response.status() === 200);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Počni besplatno. Izaberi višekada ti bude potrebno.');
    const actual = page.locator('[aria-labelledby="paketi-title"]');
    check('Existing Alcyone font is used', /alcyone/i.test(await actual.evaluate(el => getComputedStyle(el).fontFamily)));
    check('Two plans and all original benefits', await actual.locator('article').count() === 2 && await actual.locator('article li').count() === 14);
    await expect(actual.getByText('Uskoro', { exact: true })).toHaveCount(2);
    const expectedLinks = [ ['Prijavi se besplatno', '/prijava'], ['Izaberi svoj iznos', '/artist/subscribe'], ['Istraži Portfolio Builder', '/portfolio-builder'], ['Upravljaj pretplatom', '/pretplata'] ];
    for (const [name, href] of expectedLinks) await expect(actual.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    check('All four CTAs target existing application routes');
    check('Guest marketing price remains 4.90 as explicitly requested', (await actual.locator('#paketi-portfolio + p').innerText()).includes('4,90'));
    const refPage = await context.newPage();
    await refPage.goto(base + '/paketi', { waitUntil: 'networkidle' }); await refPage.evaluate(() => document.fonts.ready);
    await refPage.evaluate(html => {
      const old = document.querySelector('[aria-labelledby="paketi-title"]');
      const holder = document.createElement('div'); holder.innerHTML = html;
      const ref = holder.firstElementChild; ref.style.margin = '0'; ref.style.background = '#f7f7f9'; ref.style.color = '#111318';
      ref.style.fontFamily = getComputedStyle(old).fontFamily; old.replaceWith(ref);
    }, reference);
    for (const [width, height] of [[1536, 650], [440, 894], [390, 844], [360, 800], [320, 740]]) {
      await page.setViewportSize({ width, height }); await refPage.setViewportSize({ width, height });
      await page.mouse.move(0, 0); await page.evaluate(() => scrollTo(0, 0)); await refPage.evaluate(() => scrollTo(0, 0));
      const a = await metrics(page), r = await metrics(refPage, true); measurements.push({ width, actual: a, reference: r });
      const headerBottom = await page.locator('.site-header-root').evaluate(el => el.getBoundingClientRect().bottom);
      assert(a.title.y >= headerBottom + 55.9, `${width}: heading must clear the fixed shared header`);
      near(a.inner.width, r.inner.width, `${width} container`);
      near(a.title.fontSize, r.title.fontSize, `${width} heading size`);
      near(a.title.lineHeight, r.title.lineHeight, `${width} heading line height`);
      near(a.intro.fontSize, r.intro.fontSize, `${width} subtitle`);
      near(a.free.width, r.free.width, `${width} free card width`);
      near(a.premium.width, r.premium.width, `${width} premium card width`);
      for (const key of ['title', 'intro', 'free', 'premium', 'rules']) {
        near(a[key].height, r[key].height, `${width} ${key} height`);
        near(a[key].y, r[key].y, `${width} ${key} placement`);
      }
      near(a.premiumAction.width, r.premiumAction.width, `${width} premium CTA width`);
      near(a.freeAction.height, 38, `${width} CTA height`);
      if (width === 1536) { near(a.inner.width, 1080, 'Desktop container'); near(a.free.width, 526, 'Desktop card'); near(a.premium.x - a.free.x - a.free.width, 28, 'Desktop gap'); near(a.free.height, a.premium.height, 'Aligned cards'); }
      else { assert(a.premium.y >= a.free.y + a.free.height + 17.9); near(a.title.fontSize, 34, `${width} mobile title`); }
      check(`${width}px: reference typography and grid, no horizontal overflow`, !a.overflow);
      const footerOverflow = await page.locator('.site-chrome > footer').evaluate(el => {
        const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1;
      });
      assert.equal(footerOverflow, false, `${width}: footer overflow`);
      const clipping = await actual.locator('p,h1,h2,h3,li,a').evaluateAll(elements => elements.filter(el => {
        const style = getComputedStyle(el), range = document.createRange(); range.selectNodeContents(el);
        const text = range.getBoundingClientRect();
        return text.left < -1 || text.right > innerWidth + 1 ||
          ((style.overflowX === 'hidden' || style.overflowX === 'clip') && el.scrollWidth > el.clientWidth + 1) ||
          ((style.overflowY === 'hidden' || style.overflowY === 'clip') && el.scrollHeight > el.clientHeight + 1);
      }).map(el => el.textContent));
      assert.deepEqual(clipping, [], `${width} clipped text`);
      await page.screenshot({ path: path.join(out, `after-${width}.png`), fullPage: true });
      await refPage.screenshot({ path: path.join(out, `reference-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1536, height: 1600 });
    await page.evaluate(() => scrollTo(0, 0));
    const free = actual.locator('article:first-child'), premium = actual.locator('article:last-child');
    const before = await free.boundingBox(), neighbour = await premium.boundingBox();
    await free.hover(); await page.waitForTimeout(400);
    near((await free.boundingBox()).y, before.y - 6, 'Hover lift'); near((await premium.boundingBox()).y, neighbour.y, 'No neighbour movement');
    check('Card hover lifts six pixels without changing surrounding layout');
    await premium.getByRole('link').hover();
    const flow = await premium.evaluate(el => { const s = getComputedStyle(el); return { animation: s.animationName, duration: s.animationDuration, background: s.backgroundImage }; });
    check('Premium frame and CTA use the animated reference gradient', flow.duration === '10s' && flow.background.includes('linear-gradient') && /packages-flow/.test(flow.animation));
    check('Premium CTA hover animates for ten seconds', await premium.getByRole('link').evaluate(el => getComputedStyle(el).animationDuration === '10s'));
    await page.evaluate(() => scrollTo(0, 0)); await page.mouse.move(0, 0);
    const focus = actual.getByRole('link', { name: 'Prijavi se besplatno', exact: true }); await focus.focus();
    check('Keyboard focus is visible', await focus.evaluate(el => getComputedStyle(el).outlineStyle !== 'none'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    check('Reduced motion disables decorative animations', await actual.locator('article:last-child').evaluate(el => getComputedStyle(el).animationName === 'none'));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const [name, href] of expectedLinks) {
      const r = await context.request.get(base + href);
      check(`${name}: destination resolves without payment or writes`, r.status() === 200);
    }
    const footer = page.locator('.site-chrome > footer');
    check('Packages uses the reference light footer', await footer.evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(238, 240, 244)'));
    check('Five footer columns include the original social links', await footer.locator('nav').count() === 4 && await footer.getByRole('link', {name:'Instagram',exact:true}).count() === 1 && await footer.getByRole('link', {name:'LinkedIn',exact:true}).count() === 1 && await footer.getByRole('link', {name:'Behance',exact:true}).count() === 1);
    check('Dark logo and bottom contact match the reference', (await footer.locator('img').getAttribute('src')).includes('Black-Text') && await footer.getByRole('link',{name:'info@artstudio360.me',exact:true}).count() === 1);
    const beforeFile = path.join(out, 'before.json');
    check('Exactly one existing shared header and footer', await page.locator('.site-header-root').count() === 1 && await page.locator('.site-chrome > footer').count() === 1);
    await page.goto(base + '/artboard', { waitUntil: 'networkidle' });
    if (fs.existsSync(beforeFile)) check('Other pages retain the original dark footer', JSON.parse(fs.readFileSync(beforeFile, 'utf8')).footer === await page.locator('.site-chrome > footer').evaluate(el => el.outerHTML));
    check('Home pricing section keeps its existing component and styles', await page.locator('.artboard-pricing').count() === 1 && await page.locator('[aria-labelledby="paketi-title"]').count() === 0);
    check('No browser runtime exceptions', errors.length === 0);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ checks, measurements, errors }, null, 2));
    console.log(JSON.stringify({ passed: checks.length, measurements: measurements.map(m => ({ width: m.width, card: m.actual.free, referenceHeight: m.reference.free.height })), errors }));
  } finally { await browser.close(); }
})().catch(error => { fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({ error: error.stack, checks, measurements, errors }, null, 2)); console.error(error); process.exitCode = 1; });
