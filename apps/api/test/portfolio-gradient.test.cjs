const assert = require('node:assert/strict'), path = require('node:path');
const { test } = require('node:test');
require('ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true });
const { generatePortfolioPdf } = require('../src/modules/portfolio-projects/portfolio-pdf.generator');
const { minimalFixture } = require('./portfolio-minimal.fixture.cjs');
const { parseMinimalDesign, getMinimalDesignLabel, defaultDocumentSelection } = require('@artboard/portfolio-document-plan');
async function read(project, watermark = false) {
  let count; const bytes = await generatePortfolioPdf(project, { watermark, onPageCount: n => count = n });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }), pdf = await task.promise;
  assert.equal(pdf.numPages, count); const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) { const p = await pdf.getPage(n), c = await p.getTextContent(); pages.push({ text: c.items.map(i => i.str).join(' '), items: c.items, annotations: await p.getAnnotations(), width: p.view[2], height: p.view[3] }); }
  await task.destroy(); return pages;
}
function only(p, section) {
  const documentSelection = defaultDocumentSelection(section === 'cv');
  Object.keys(documentSelection.sections).forEach(key => documentSelection.sections[key] = key === section);
  return { ...p, includeCv: section === 'cv', designConfig: { ...p.designConfig, documentSelection } };
}
async function fixture() { const p = await minimalFixture(); p.designConfig.minimal.style = 'GRADIENT'; return p; }

test('Gradient is allowlisted without changing legacy Minimal/Rounded meaning or accepting arbitrary design fields', () => {
  assert.deepEqual(parseMinimalDesign({ version: 1, cover: 'C', style: 'GRADIENT' }), { version: 1, cover: 'C', style: 'GRADIENT' });
  assert.deepEqual(parseMinimalDesign({ version: 1, cover: 'C' }), { version: 1, cover: 'C' });
  assert.equal(getMinimalDesignLabel({ designConfig: { minimal: { version: 1, cover: 'A', style: 'ROUNDED' } } }), 'Rounded');
  assert.equal(getMinimalDesignLabel({ designConfig: { minimal: { version: 1, cover: 'A', style: 'GRADIENT' } } }), 'Gradijent');
  for (const value of [{ version: 2, cover: 'A', style: 'GRADIENT' }, { version: 1, cover: 'Z', style: 'GRADIENT' }, { version: 1, cover: 'A', style: 'gradient' }, { version: 1, cover: 'A', style: 'GRADIENT', ownerId: 'forged' }, { version: 1, cover: 'A', style: 'GRADIENT', colors: ['red'] }]) assert.throws(() => parseMinimalDesign(value));
});

test('seven Gradient covers retain bold names and diacritics; framed cover C uses its own reference coordinates', async () => {
  const p = only(await fixture(), 'cover'), positions = { A: [68, 771, 61.33], B: [68, 75.6, 56], C: [null, 597.2, 61.33], D: [294.8, 75.6, 48], E: [68, 75.6, 50.67], F: [109.6, 871.77, 53.33], G: [90.7, 264.6, 45.33] };
  for (const cover of 'ABCDEFG') {
    p.designConfig.minimal.cover = cover; const pages = await read(p); assert.equal(pages.length, 1);
    const page = pages[0], first = page.items.find(i => i.str === 'TIJANA'), last = page.items.find(i => i.str === 'MARKOVIĆ'); assert(first && last, cover);
    assert.equal(first.fontName, last.fontName); const [x, y, size] = positions[cover];
    if (x != null) assert(Math.abs(first.transform[4] - x * page.width / 794) < 1);
    assert(Math.abs(first.transform[5] - (page.height - (y + size * .83) * page.height / 1123)) < 1);
    if (cover === 'F') assert(page.annotations.some(a => a.url === p.artboardProfileUrl));
    assert(!page.text.includes('ARTBOARD PREVIEW'));
  }
});

test('Gradient headings, collection sequence, two CV groups and watermark use the actual document data', async () => {
  const p = await fixture(), before = structuredClone(p), pages = await read(p, true);
  const profile = pages.find(p => p.text.includes('PROFIL UMJETNIKA')), heading = profile.items.find(i => i.str === 'PROFIL UMJETNIKA');
  assert(Math.abs(heading.transform[4] - 68 * profile.width / 794) < 1);
  assert(Math.abs(Math.hypot(heading.transform[0], heading.transform[1]) - 29.33 * profile.width / 794) < .1);
  assert(pages.every(p => p.text.includes('ARTBOARD PREVIEW'))); assert.equal(pages.filter(p => /CV – [12]/.test(p.text)).length, 2);
  assert(pages.some(p => p.text.includes('RAD 01 / 03'))); assert(pages.some(p => p.text.includes('RAD 03 / 03')));
  assert(pages.at(-1).annotations.some(a => a.url === p.artboardProfileUrl)); assert.deepEqual(p, before);
});

test('Gradient CV-only Letter with long content preserves final rows and watermark on continuation pages', async () => {
  const p = await fixture(); p.pageFormat = 'US_LETTER'; p.includeBranding = false;
  p.cvSections.experience = Array.from({ length: 10 }, (_, i) => ({ id: 'long-' + i, values: { organization: 'Organization ' + i, description: 'Details. '.repeat(100) + ' TAIL_' + i } }));
  const scoped = only(p, 'cv'); scoped.designConfig.documentSelection.scope = 'CV'; const pages = await read(scoped, true);
  assert(pages.length > 2); const text = pages.map(p => p.text).join(' '); for (let i = 0; i < 10; i++) assert(text.includes('TAIL_' + i));
  assert(!text.includes('KONTAKT')); for (const page of pages) { assert.equal(page.width, 612); assert.equal(page.height, 792); assert(page.text.includes('ARTBOARD PREVIEW')); }
});

