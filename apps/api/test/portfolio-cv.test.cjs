const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { parsePortfolioCv, readPortfolioCv, portfolioCvBlocks, buildPortfolioDocumentPlan } = require('@artboard/portfolio-document-plan');
const { defaultDocumentSelection, parseDocumentSelection } = require('@artboard/portfolio-document-plan');
require('ts-node').register({ project: path.join(__dirname, '../tsconfig.json'), transpileOnly: true });
const { generatePortfolioPdf } = require('../src/modules/portfolio-projects/portfolio-pdf.generator');
function cv() { return { version: 1, education: [], experience: [], exhibitions: [], awards: [], certificates: [], publications: [], skills: '', programs: '' }; }
function project(data) { return { id: 'isolated-cv', artistName: 'Test Artist', language: 'ME', fontStyle: 'SANS', template: 'INSTITUTIONAL_MINIMAL', pageFormat: 'A4', includeBranding: true, includeCv: true, collectionSchemaVersion: 2, artworks: [], collections: [], cvSections: data, createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z') }; }
async function pdf(project, watermark = true) {
  let count;
  const buffer = await generatePortfolioPdf(project, { watermark, onPageCount: value => { count = value; } });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  try {
    const doc = await task.promise, pages = [];
    for (let number = 1; number <= doc.numPages; number++) pages.push((await (await doc.getPage(number)).getTextContent()).items.map(item => item.str).join(' '));
    assert.equal(count, doc.numPages);
    return pages;
  } finally { await task.destroy(); }
}
test('versioned CV trims known text while retaining IDs, row order and all sections', () => {
  const data = cv(); data.education = [{ id: 'a', values: { institution: '  Academy  ' } }, { id: 'b', values: { degree: 'Master' } }]; data.skills = '  Drawing  ';
  const saved = parsePortfolioCv(data);
  assert.equal(saved.education[0].values.institution, 'Academy'); assert.equal(saved.education[1].id, 'b');
  assert.equal(saved.skills, 'Drawing'); assert.equal(data.skills, '  Drawing  ');
  assert.deepEqual(portfolioCvBlocks(saved, 'EN').map(block => block.title), ['Education', 'Skills']);
});
test('unknown fields, forged ownership, unsafe links, duplicate IDs and excessive content are rejected', () => {
  const cases = [null, [], { ...cv(), version: 2 }, { ...cv(), artistId: 'forged' },
    { ...cv(), education: [{ id: 'a', values: { ownerId: 'forged' } }] },
    { ...cv(), publications: [{ id: 'a', values: { link: 'javascript:alert(1)' } }] },
    { ...cv(), publications: [{ id: 'a', values: { link: 'https://user:pass@example.com' } }] },
    { ...cv(), skills: 'a'.repeat(2001) }, { ...cv(), education: Array.from({ length: 21 }, (_, i) => ({ id: 'r' + i, values: {} })) },
    { ...cv(), education: [{ id: 'a', values: {} }], awards: [{ id: 'a', values: {} }] },
    { ...cv(), experience: [{ id: 'a', values: { description: 'a'.repeat(1501) } }] },
  ];
  for (const value of cases) assert.throws(() => parsePortfolioCv(value));
  assert.equal(readPortfolioCv({ education: ['Legacy'] }), null);
});
test('legacy CV is readable without conversion and empty or excluded CV adds no pages', () => {
  const legacy = [{ title: 'Education', items: ['Academy'] }]; const original = structuredClone(legacy);
  assert.equal(portfolioCvBlocks(legacy)[0].items[0], 'Academy'); assert.deepEqual(legacy, original);
  assert.equal(portfolioCvBlocks({ education: ['Academy'] })[0].items[0], 'Academy');
  assert.equal(buildPortfolioDocumentPlan(project(cv())).pageCount, 3);
  assert.equal(buildPortfolioDocumentPlan({ ...project(legacy), includeCv: false }).pageCount, 3);
  assert.equal(buildPortfolioDocumentPlan(project(legacy)).pages.at(-2).kind, 'cv');
});
test('all active templates render saved CV text once before Contact and watermark every preview page', async () => {
  const data = cv(); data.education = [{ id: 'one', values: { institution: 'CV_BEGIN Academy', degree: 'Master' } }]; data.publications = [{ id: 'end', values: { title: 'CV_END Publication', link: 'https://example.invalid/publication' } }];
  data.skills = 'LineOne\nLineTwo\r\nLineThree';
  for (const template of ['INSTITUTIONAL_MINIMAL', 'ARTBOARD_EDITORIAL', 'SALES_PRO']) {
    const pages = await pdf({ ...project(data), template });
    assert.equal(pages.length, template === 'INSTITUTIONAL_MINIMAL' ? 5 : 4); assert(pages[2].includes('CV_BEGIN')); assert(pages.slice(2,-1).join(' ').includes('CV_END'));
    assert(pages.slice(2,-1).join(' ').replace(/\s+/g,' ').includes('LineOne LineTwo LineThree'));
    assert(pages[2].includes('Obrazovanje'.toUpperCase())); assert(pages.at(-1).includes('KONTAKT'));
    assert(pages.every(page => page.includes('ARTBOARD PREVIEW')));
    assert.equal(pages.join(' ').split('CV_END').length - 1, 1);
  }
});
test('long CV paginates without truncation, lost final rows or unwatermarked overflow', async () => {
  const data = cv(); data.experience = Array.from({ length: 20 }, (_, i) => ({ id: 'row-' + i, values: { position: `POSITION_${String(i).padStart(2, '0')}`, description: ('Detailed work and results. '.repeat(35)) + ` FINAL_${String(i).padStart(2, '0')}` } }));
  parsePortfolioCv(data);
  const pages = await pdf(project(data)), all = pages.join(' ');
  assert(pages.length > 5); for (let i = 0; i < 20; i++) assert(all.includes(`FINAL_${String(i).padStart(2, '0')}`), `row ${i} survives pagination`);
  assert(pages.every(page => page.includes('ARTBOARD PREVIEW')));
  const clean = await pdf({ ...project(data), language: 'EN', pageFormat: 'US_LETTER' }, false);
  assert(clean.some(page => page.includes('EXPERIENCE'))); assert(clean.every(page => !page.includes('ARTBOARD PREVIEW')));
});
test('empty or excluded CV never emits placeholder CV pages', async () => {
  for (const p of [project(cv()), { ...project({ education: ['Academy'] }), includeCv: false }]) {
    const pages = await pdf(p); assert.equal(pages.length, 3); assert(!pages.join(' ').includes('CV —'));
  }
});
module.exports = { cv };

test('document section choices preserve selected works and a CV-only PDF has no portfolio pages', async () => {
  const data = cv(); data.skills = 'Only CV content';
  const selection = defaultDocumentSelection(true); selection.scope = 'CV';
  const p = { ...project(data), designConfig: { documentSelection: selection } };
  const pages = await pdf(p);
  assert.equal(pages.length, 1); assert(pages[0].includes('Only CV content')); assert(!pages[0].includes('KONTAKT')); assert(pages[0].includes('ARTBOARD PREVIEW'));
  selection.scope = 'PORTFOLIO'; selection.sections.cover = false; selection.sections.profile = false; selection.sections.collections = false; selection.sections.artworks = false; selection.sections.contact = false;
  assert.equal(buildPortfolioDocumentPlan(p).pages.length, 1);
  assert.throws(() => parseDocumentSelection({ ...selection, sections: { ...selection.sections, cv: false } }));
  assert.throws(() => parseDocumentSelection({ ...selection, ownerId: 'forged' }));
});
test('featured works and individually excluded sections follow the same actual document plan', async () => {
  const selection = defaultDocumentSelection(false); for (const key of Object.keys(selection.sections)) selection.sections[key] = key === 'featured';
  const p = { ...project(cv()), documentSelection: selection, artworks: [{ id: 'a', isSelected: true, orderIndex: 0, title: 'Featured first', imageUrl: '' }, { id: 'b', isSelected: true, orderIndex: 1, title: 'Featured second', imageUrl: '' }] };
  const pages = await pdf(p); assert.equal(pages.length, 1); assert(pages[0].includes('IZDVOJENI RADOVI')); assert(!pages[0].includes('KONTAKT')); assert(!pages[0].includes('BIOGRAFIJA')); assert(p.artworks.every(work => work.isSelected)); // Minimal reference is an image-only grid.
});
