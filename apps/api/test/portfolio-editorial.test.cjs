const assert = require('node:assert/strict'), path = require('node:path');
const { test } = require('node:test');
require('ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true });
const { generatePortfolioPdf } = require('../src/modules/portfolio-projects/portfolio-pdf.generator');
const { minimalFixture } = require('./portfolio-minimal.fixture.cjs');
const { parseMinimalDesign, getMinimalDesignLabel, defaultDocumentSelection } = require('@artboard/portfolio-document-plan');
async function fixture() { const p = await minimalFixture(); p.designConfig.minimal.style = 'EDITORIAL'; return p; }
function only(p, section) {
  const selection = defaultDocumentSelection(section === 'cv');
  Object.keys(selection.sections).forEach(key => selection.sections[key] = key === section);
  return { ...p, includeCv: section === 'cv', designConfig: { ...p.designConfig, documentSelection: selection } };
}
async function read(p, watermark = false) {
  let count; const bytes = await generatePortfolioPdf(p, { watermark, onPageCount: n => count = n });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  try {
    const pdf = await task.promise; assert.equal(pdf.numPages, count); const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) { const p = await pdf.getPage(n), c = await p.getTextContent(); pages.push({ text: c.items.map(i => i.str).join(' '), items: c.items, annotations: await p.getAnnotations(), width: p.view[2], height: p.view[3] }); }
    return pages;
  } finally { await task.destroy(); }
}
test('Editorial uses the strict existing JSON configuration; old styles retain their meaning', () => {
  assert.deepEqual(parseMinimalDesign({ version: 1, cover: 'G', style: 'EDITORIAL' }), { version: 1, cover: 'G', style: 'EDITORIAL' });
  for (const [style, label] of [[undefined, 'Minimal'], ['ROUNDED', 'Rounded'], ['GRADIENT', 'Gradijent'], ['EDITORIAL', 'Editorijal']]) assert.equal(getMinimalDesignLabel({ designConfig: { minimal: { version: 1, cover: 'A', ...(style ? { style } : {}) } } }), label);
  for (const v of [{ version: 2, cover: 'A', style: 'EDITORIAL' }, { version: 1, cover: 'Z', style: 'EDITORIAL' }, { version: 1, cover: 'A', style: 'editorial' }, { version: 1, cover: 'A', style: 'EDITORIAL', ownerId: 'forged' }]) assert.throws(() => parseMinimalDesign(v));
});
test('all seven Editorial covers use real names, regular first name and bold surname with working QR delivery links', async () => {
  const p = only(await fixture(), 'cover');
  for (const cover of 'ABCDEFG') {
    p.designConfig.minimal.cover = cover; const pages = await read(p); assert.equal(pages.length, 1);
    const first = pages[0].items.find(i => i.str === 'TIJANA'), last = pages[0].items.find(i => i.str === 'MARKOVIĆ'); assert(first && last, cover); assert.notEqual(first.fontName, last.fontName);
    if (cover === 'F') assert(pages[0].annotations.some(a => a.url === p.artboardProfileUrl));
    assert(!pages[0].text.includes('ARTBOARD PREVIEW'));
  }
});
test('Editorial masthead, six-tile collage pagination, side metadata, two CV groups and contact use saved data without mutation', async () => {
  const p = await fixture(), before = structuredClone(p), pages = await read(p, true);
  assert.equal(pages.length, 17); assert(pages.every(p => p.text.includes('ARTBOARD PREVIEW')));
  const profile = pages.find(p => p.text.includes('PROFIL UMJETNIKA')), heading = profile.items.find(i => i.str === 'PROFIL UMJETNIKA');
  assert(Math.abs(Math.hypot(heading.transform[0], heading.transform[1]) - 40 * profile.width / 794) < .1);
  assert(profile.text.replace(/\s/g, '').includes('ARTBOARDPORTFOLIO')); assert(profile.text.replace(/\s/g, '').includes('MOTO')); assert(profile.text.includes('29.02.2000.'));
  const featured = pages.filter(p => p.text.includes('IZDVOJENI RADOVI')); assert.equal(featured.length, 2); assert(featured[1].text.includes('09'));
  const art = pages.find(p => p.text.replace(/\s/g, '').includes('KOLEKCIJA·RAD')); assert(art.text.includes('/03'));
  const metadata = art.items.find(i => i.str === 'NAZIV RADA'); assert(Math.abs(metadata.transform[4] - 537 * art.width / 794) < 1);
  assert.equal(pages.filter(p => /CV – [12]/.test(p.text)).length, 2);
  const contact = pages.at(-1); assert(contact.text.replace(/\s/g, '').includes('DETALJ')); assert(contact.annotations.some(a => a.url === p.artboardProfileUrl));
  assert.deepEqual(p, before);
});
test('long Editorial biography, statement and artwork metadata/descriptions continue without dropping their final content', async () => {
  const p = await fixture(); p.biography = ('A long paragraph with varied words. '.repeat(600)) + ' BIOGRAPHY_TAIL';
  p.artistStatement = 'Statement. '.repeat(800) + ' STATEMENT_TAIL';
  p.artworks = [p.artworks[0]]; p.artworks[0].title = 'Title. '.repeat(140) + ' TITLE_TAIL'; p.artworks[0].description = 'Detailed description. '.repeat(600) + ' DESCRIPTION_TAIL';
  p.collections = []; p.designConfig.documentSelection.sections.featured = false;
  const pages = await read(p, true), text = pages.map(p => p.text).join(' '); assert(pages.length > 8);
  for (const tail of ['BIOGRAPHY_TAIL', 'STATEMENT_TAIL', 'TITLE_TAIL', 'DESCRIPTION_TAIL']) assert(text.includes(tail), tail);
  assert(pages.every(p => p.text.includes('ARTBOARD PREVIEW')));
  for (const page of pages) for (const item of page.items) assert(Number.isFinite(item.transform[4]) && Number.isFinite(item.transform[5]));
});
test('Editorial separate CV export supports Letter and long continuation rows with the preview watermark', async () => {
  const p = await fixture(); p.pageFormat = 'US_LETTER'; p.includeBranding = false;
  p.cvSections.experience = Array.from({ length: 10 }, (_, i) => ({ id: 'long-' + i, values: { organization: 'Organization ' + i, description: 'Details. '.repeat(100) + ' TAIL_' + i } }));
  const scoped = only(p, 'cv'); scoped.designConfig.documentSelection.scope = 'CV'; const pages = await read(scoped, true), text = pages.map(p => p.text).join(' ');
  for (let i = 0; i < 10; i++) assert(text.includes('TAIL_' + i)); assert(!text.includes('KONTAKT'));
  for (const page of pages) { assert.equal(page.width, 612); assert.equal(page.height, 792); assert(page.text.includes('ARTBOARD PREVIEW')); assert(!page.text.includes('ARTBOARD PORTFOLIO')); }
});
test('Editorial never invents a QR target or unsafe PDF link', async () => {
  const p = only(await fixture(), 'contact'); p.artboardProfileUrl = 'javascript:alert(1)'; p.behanceUrl = ''; p.instagramUrl = ''; p.websiteUrl = '';
  const pages = await read(p); assert(pages.every(page => page.annotations.every(a => !/^javascript:/i.test(a.url || a.unsafeUrl || ''))));
});
test('Editorial collection introduction uses its own year/count panel and preserves long collection descriptions', async () => {
  const p = only(await fixture(), 'collections'); p.collections[0].year = '2026';
  let pages = await read(p); assert.equal(pages.length, 1); assert(pages[0].text.includes('3 rada'));
  const year = pages[0].items.find(i => i.str === '2026' && Math.hypot(i.transform[0], i.transform[1]) > 30); assert(year);
  assert(Math.abs(Math.hypot(year.transform[0], year.transform[1]) - 53.33 * pages[0].width / 794) < .1);
  const name = pages[0].items.find(i => i.str === 'NAZIV KOLEKCIJE'); assert(Math.abs(name.transform[4] - 303.5 * pages[0].width / 794) < 1);
  p.collections[0].description = 'Collection details. '.repeat(500) + ' COLLECTION_TAIL';
  pages = await read(p, true); assert(pages.length > 1); assert(pages.map(p => p.text).join(' ').includes('COLLECTION_TAIL'));
  assert(pages.every(p => p.text.includes('ARTBOARD PREVIEW')));
});
