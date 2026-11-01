const assert = require('node:assert/strict'), path = require('node:path');
const { test } = require('node:test');
require('ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true });
const { generatePortfolioPdf } = require('../src/modules/portfolio-projects/portfolio-pdf.generator');
const { minimalFixture } = require('./portfolio-minimal.fixture.cjs');
const { parseMinimalDesign, getMinimalDesignLabel, defaultDocumentSelection, buildPortfolioDocumentPlan } = require('@artboard/portfolio-document-plan');
async function fixture() { const p = await minimalFixture(); p.designConfig.minimal.style = 'CARDS'; return p; }
function only(p, section) {
  const selection = defaultDocumentSelection(section === 'cv'); Object.keys(selection.sections).forEach(key => selection.sections[key] = key === section);
  return { ...p, includeCv: section === 'cv', designConfig: { ...p.designConfig, documentSelection: selection } };
}
async function read(p, watermark = false) {
  let count; const bytes = await generatePortfolioPdf(p, { watermark, onPageCount: n => count = n });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs'); const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  try {
    const pdf = await task.promise; assert.equal(pdf.numPages, count); const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) { const page = await pdf.getPage(n), data = await page.getTextContent(); pages.push({ text: data.items.map(i => i.str).join(' '), items: data.items, annotations: await page.getAnnotations(), width: page.view[2], height: page.view[3] }); }
    return pages;
  } finally { await task.destroy(); }
}
test('Cards is strictly allowlisted and labelled without changing older styles', () => {
  assert.deepEqual(parseMinimalDesign({ version: 1, cover: 'F', style: 'CARDS' }), { version: 1, cover: 'F', style: 'CARDS' });
  for (const [style, label] of [[undefined, 'Minimal'], ['ROUNDED', 'Rounded'], ['GRADIENT', 'Gradijent'], ['EDITORIAL', 'Editorijal'], ['CARDS', 'Kartice']]) assert.equal(getMinimalDesignLabel({ designConfig: { minimal: { version: 1, cover: 'A', ...(style ? { style } : {}) } } }), label);
  for (const value of [{ version: 2, cover: 'A', style: 'CARDS' }, { version: 1, cover: 'Z', style: 'CARDS' }, { version: 1, cover: 'A', style: 'cards' }, { version: 1, cover: 'A', style: 'CARDS', ownerId: 'forged' }, { version: 1, cover: 'A', style: 'CARDS', background: 'red' }]) assert.throws(() => parseMinimalDesign(value));
});
test('seven Cards covers preserve actual data, bold names and reference positions, and F has the real QR target', async () => {
  const p = only(await fixture(), 'cover'), y = { A: 771, B: 75.6, C: 566.9, D: 75.6, E: 75.6, F: 871.77, G: 264.6 }, size = { A: 61.33, B: 56, C: 61.33, D: 48, E: 50.67, F: 53.33, G: 45.33 };
  for (const cover of 'ABCDEFG') {
    p.designConfig.minimal.cover = cover; const pages = await read(p); assert.equal(pages.length, 1); const page = pages[0];
    const first = page.items.find(i => i.str === 'TIJANA'), last = page.items.find(i => i.str === 'MARKOVIĆ'); assert(first && last, cover); assert.equal(first.fontName, last.fontName);
    assert(Math.abs(first.transform[5] - (page.height - (y[cover] + size[cover] * .83) * page.height / 1123)) < 1, cover);
    if (cover === 'F') assert(page.annotations.some(a => a.url === p.artboardProfileUrl));
  }
});
test('Cards content, six-image pagination, collection ordering, prices and CV come from the document plan without mutation', async () => {
  const p = await fixture(); p.includePrices = true; p.artworks.forEach((a, i) => a.title = 'TITLE_' + i); p.artworks[0].price = '123 EUR';
  const before = structuredClone(p), pages = await read(p, true), text = pages.map(p => p.text).join(' ');
  assert(pages.every(p => p.text.includes('ARTBOARD PREVIEW'))); assert.equal(pages.filter(p => p.text.replace(/\s/g, '').includes('IZDVOJENIRADOVI')).length, 2);
  assert(text.includes('RAD 01 / 03')); assert(text.includes('RAD 03 / 03')); assert(text.includes('123 EUR'));
  const expected = buildPortfolioDocumentPlan(p).pages.filter(p => p.kind === 'artwork').map(page => before.artworks.find(a => a.id === page.artworkId).title);
  for (let i = 1; i < expected.length; i++) assert(text.indexOf(expected[i - 1]) < text.indexOf(expected[i]));
  const profile = pages.find(p => p.text.replace(/\s/g, '').includes('PROFILUMJETNIKA')), heading = profile.items.find(i => i.str === 'BIOGRAFIJA'); assert(Math.abs(heading.transform[4] - 90.7 * profile.width / 794) < 1);
  assert(text.includes('29.02.2000.')); assert(pages.at(-1).annotations.some(a => a.url === p.artboardProfileUrl)); assert.deepEqual(p, before);
});
test('Cards paginates simultaneous long columns, biography and statement without losing their last lines', async () => {
  const p = only(await fixture(), 'profile');
  p.biography = 'Biography sentences. '.repeat(350) + ' BIOGRAPHY_TAIL'; p.motto = 'Motto words. '.repeat(180) + ' MOTTO_TAIL';
  p.phone = 'Contact details. '.repeat(160) + ' PHONE_TAIL'; p.artistStatement = 'Statement details. '.repeat(180) + ' STATEMENT_TAIL';
  const pages = await read(p, true), text = pages.map(p => p.text).join(' '); assert(pages.length > 3);
  for (const tail of ['BIOGRAPHY_TAIL', 'MOTTO_TAIL', 'PHONE_TAIL', 'STATEMENT_TAIL']) assert(text.includes(tail), tail);
  assert(pages.every(p => p.text.includes('ARTBOARD PREVIEW')));
});
test('Cards preserves long artwork metadata, descriptions and collection descriptions across card continuations', async () => {
  const p = await fixture(); p.artworks = p.artworks.slice(3, 4);
  p.artworks[0].title = 'Title words. '.repeat(180) + ' TITLE_TAIL'; p.artworks[0].technique = 'Technique words. '.repeat(140) + ' TECHNIQUE_TAIL';
  p.artworks[0].description = 'Artwork details. '.repeat(400) + ' ARTWORK_TAIL'; p.collections[0].description = 'Collection details. '.repeat(400) + ' COLLECTION_TAIL';
  const pages = await read(p, true), text = pages.map(p => p.text).join(' ');
  for (const tail of ['TITLE_TAIL', 'TECHNIQUE_TAIL', 'ARTWORK_TAIL', 'COLLECTION_TAIL']) assert(text.includes(tail), tail);
  assert(pages.every(p => p.text.includes('ARTBOARD PREVIEW')));
});
test('Cards separate CV export on Letter retains long and legacy CV content and watermarks every continuation page', async () => {
  const p = await fixture(); p.pageFormat = 'US_LETTER'; p.includeBranding = false;
  p.cvSections.experience = Array.from({ length: 10 }, (_, i) => ({ id: 'row-' + i, values: { period: '2020 - 2026', organization: 'Organization ' + i, description: 'Details. '.repeat(100) + ' TAIL_' + i } }));
  const scoped = only(p, 'cv'); scoped.designConfig.documentSelection.scope = 'CV'; const pages = await read(scoped, true), text = pages.map(p => p.text).join(' ');
  for (let i = 0; i < 10; i++) assert(text.includes('TAIL_' + i)); assert(!text.includes('KONTAKT'));
  for (const page of pages) { assert.equal(page.width, 612); assert.equal(page.height, 792); assert(page.text.includes('ARTBOARD PREVIEW')); }
  const legacy = await read({ ...scoped, cvSections: [{ title: 'Legacy section', items: ['Legacy final content'] }] }); assert(legacy.map(p => p.text).join(' ').includes('Legacy final content'));
});
test('Cards omits a QR without a safe link and never creates executable or credential-bearing contact links', async () => {
  for (const unsafe of ['javascript:alert(1)', 'https://user:password@example.invalid/profile']) {
    const p = only(await fixture(), 'contact'); p.artboardProfileUrl = unsafe; p.websiteUrl = ''; p.behanceUrl = ''; p.instagramUrl = '';
    const pages = await read(p); assert(pages.every(p => p.annotations.every(a => !/javascript:|password/.test(a.url || a.unsafeUrl || ''))));
  }
});
