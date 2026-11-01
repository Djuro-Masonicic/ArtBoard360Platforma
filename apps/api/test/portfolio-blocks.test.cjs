const assert = require('node:assert/strict'), path = require('node:path');
const { test } = require('node:test');
require('ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true });
const { generatePortfolioPdf } = require('../src/modules/portfolio-projects/portfolio-pdf.generator');
const { minimalFixture } = require('./portfolio-minimal.fixture.cjs');
const { parseMinimalDesign, getMinimalDesignLabel, defaultDocumentSelection } = require('@artboard/portfolio-document-plan');
async function fixture() { const p = await minimalFixture(); p.designConfig.minimal.style = 'BLOCKS'; return p; }
function only(p, section) {
  const selection = defaultDocumentSelection(section === 'cv'); Object.keys(selection.sections).forEach(key => selection.sections[key] = key === section);
  return { ...p, includeCv: section === 'cv', designConfig: { ...p.designConfig, documentSelection: selection } };
}
async function read(p, watermark = false) {
  let count; const bytes = await generatePortfolioPdf(p, { watermark, onPageCount: n => count = n });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs'), task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  try {
    const pdf = await task.promise; assert.equal(pdf.numPages, count); const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) { const page = await pdf.getPage(n), c = await page.getTextContent(); pages.push({ text: c.items.map(i => i.str).join(' '), items: c.items, annotations: await page.getAnnotations(), width: page.view[2], height: page.view[3] }); }
    return pages;
  } finally { await task.destroy(); }
}
test('Blocks is strictly allowlisted and labelled; earlier styles remain compatible', () => {
  assert.deepEqual(parseMinimalDesign({ version: 1, cover: 'D', style: 'BLOCKS' }), { version: 1, cover: 'D', style: 'BLOCKS' });
  for (const [style, label] of [[undefined, 'Minimal'], ['ROUNDED', 'Rounded'], ['GRADIENT', 'Gradijent'], ['EDITORIAL', 'Editorijal'], ['CARDS', 'Kartice'], ['BLOCKS', 'Blok']]) assert.equal(getMinimalDesignLabel({ designConfig: { minimal: { version: 1, cover: 'A', ...(style ? { style } : {}) } } }), label);
  for (const value of [{ version: 2, cover: 'A', style: 'BLOCKS' }, { version: 1, cover: 'Z', style: 'BLOCKS' }, { version: 1, cover: 'A', style: 'blocks' }, { version: 1, cover: 'A', style: 'BLOCKS', ownerId: 'forged' }, { version: 1, cover: 'A', style: 'BLOCKS', colors: ['red'] }]) assert.throws(() => parseMinimalDesign(value));
});
test('all seven Blocks covers have reference name coordinates, bold names and the vertical dated rail', async () => {
  const p = only(await fixture(), 'cover'), positions = { A: [113.4, 771, 61.33], B: [113.4, 75.6, 56], C: [null, 566.9, 61.33], D: [340.2, 75.6, 48], E: [113.4, 75.6, 50.67], F: [155, 871.77, 53.33], G: [136.1, 264.6, 45.33] };
  for (const cover of 'ABCDEFG') {
    p.designConfig.minimal.cover = cover; const pages = await read(p); assert.equal(pages.length, 1); const page = pages[0];
    const first = page.items.find(i => i.str === 'TIJANA'), last = page.items.find(i => i.str === 'MARKOVIĆ'); assert(first && last, cover); assert.equal(first.fontName, last.fontName);
    const [x, y, size] = positions[cover]; if (x != null) assert(Math.abs(first.transform[4] - x * page.width / 794) < 1, cover + ' x');
    assert(Math.abs(first.transform[5] - (page.height - (y + size * .83) * page.height / 1123)) < 1, cover + ' y');
    const vertical = page.items.filter(i => Math.abs(i.transform[0]) < .001 && Math.abs(i.transform[1]) > 1).map(i => i.str).join('').replace(/\s/g, ''); assert(vertical.includes('PORTFOLIO2026'), cover + ' rail');
    if (cover === 'F') assert(page.annotations.some(a => a.url === p.artboardProfileUrl));
  }
});
test('Blocks uses the supplied Minimal inner layouts exactly, including data, metadata positions and links', async () => {
  const p = await fixture(); p.designConfig.documentSelection.sections.cover = false;
  const before = structuredClone(p), baseline = structuredClone(p); delete baseline.designConfig.minimal.style;
  const a = await read(p), b = await read(baseline);
  const content = pages => pages.map(p => ({ text: p.text, width: p.width, height: p.height, items: p.items.map(i => ({ str: i.str, transform: i.transform })), links: p.annotations.map(a => a.url || a.unsafeUrl) }));
  assert.deepEqual(content(a), content(b)); assert.deepEqual(p, before);
  assert(a.every(p => !p.items.some(i => Math.abs(i.transform[0]) < .001 && Math.abs(i.transform[1]) > 1)));
});
test('Blocks magazine uses selected sections/counts and the shifted footer; its rail follows the document year', async () => {
  const p = await fixture(); p.designConfig.minimal.cover = 'G'; p.updatedAt = new Date('2031-06-01T00:00:00Z');
  p.artworks[0].isSelected = false; const page = (await read(p))[0];
  const text = page.text.replace(/\s/g, ''); assert(text.includes('PORTFOLIO2031')); assert(text.includes('8IZDVOJENIHRADOVA'));
  const number = page.items.find(i => i.str === '01'); assert(Math.abs(number.transform[4] - 113.4 * page.width / 794) < 1);
  const scoped = only(p, 'cover'), cover = (await read(scoped))[0].text.replace(/\s/g, ''); assert(!cover.includes('IZDVOJENIHRADOVA')); assert(!cover.includes('BIOGRAFIJAIMOTO'));
});
test('Blocks supports CV-only Letter, long content and watermarking on every continuation page', async () => {
  const p = await fixture(); p.pageFormat = 'US_LETTER'; p.includeBranding = false;
  p.cvSections.experience = Array.from({ length: 10 }, (_, i) => ({ id: 'long-' + i, values: { organization: 'Organization ' + i, description: 'Details. '.repeat(100) + ' TAIL_' + i } }));
  const scoped = only(p, 'cv'); scoped.designConfig.documentSelection.scope = 'CV'; const pages = await read(scoped, true), text = pages.map(p => p.text).join(' ');
  for (let i = 0; i < 10; i++) assert(text.includes('TAIL_' + i)); assert(!text.includes('KONTAKT'));
  for (const page of pages) { assert.equal(page.width, 612); assert.equal(page.height, 792); assert(page.text.includes('ARTBOARD PREVIEW')); }
});
test('Blocks has no invented QR target and long names still fit their reference boxes', async () => {
  const p = only(await fixture(), 'cover'); p.designConfig.minimal.cover = 'F'; p.artboardProfileUrl = 'javascript:alert(1)'; p.behanceUrl = ''; p.instagramUrl = ''; p.websiteUrl = '';
  p.artistName = 'An extraordinarily long artist name with diacritics Ć Č Š Ž Đ'; const pages = await read(p, true);
  assert.equal(pages[0].annotations.length, 0); assert(pages[0].text.includes('ARTBOARD PREVIEW'));
  for (const item of pages[0].items.filter(i => Math.abs(i.transform[1]) < .001)) assert(Number.isFinite(item.transform[4]) && item.transform[4] >= 0 && item.transform[4] < pages[0].width);
});
