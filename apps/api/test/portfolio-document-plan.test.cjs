const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildPortfolioDocumentPlan: plan } = require('@artboard/portfolio-document-plan');

test('PDF map follows collection order and local work order, then the global outside order', () => {
  const project = { collectionSchemaVersion: 2, collections: [
    { id: 'first', orderIndex: 20, isIncluded: true }, { id: 'second', orderIndex: 0, isIncluded: true },
    { id: 'off', orderIndex: 1, isIncluded: false }, { id: 'empty', orderIndex: 2, isIncluded: true },
  ], artworks: [
    { id: 'one', portfolioCollectionId: 'first', orderIndex: 0, collectionOrderIndex: 1, isSelected: true },
    { id: 'two', portfolioCollectionId: 'first', orderIndex: 1, collectionOrderIndex: 0, isSelected: true },
    { id: 'three', portfolioCollectionId: 'second', orderIndex: 2, collectionOrderIndex: 0, isSelected: true },
    { id: 'four', portfolioCollectionId: 'off', orderIndex: 3, isSelected: true },
    { id: 'five', orderIndex: 5, isSelected: true }, { id: 'six', orderIndex: 4, isSelected: true },
    { id: 'seven', portfolioCollectionId: 'first', orderIndex: 6, isSelected: false },
  ] };
  assert.deepEqual(plan(project).pages, [
    { kind: 'cover' }, { kind: 'profile' }, { kind: 'collection', collectionId: 'second' },
    { kind: 'artwork', artworkId: 'three' }, { kind: 'collection', collectionId: 'first' },
    { kind: 'artwork', artworkId: 'two' }, { kind: 'artwork', artworkId: 'one' },
    { kind: 'artwork', artworkId: 'six' }, { kind: 'artwork', artworkId: 'five' }, { kind: 'contact' },
  ]);
  const withoutOutside = plan({ ...project, includeUncollectedArtworks: false });
  assert.equal(withoutOutside.pageCount, 8); assert.equal(withoutOutside.artworkCount, 3);
  assert(project.artworks.filter(w => !w.portfolioCollectionId).every(w => w.isSelected));
});
test('an empty modern portfolio has no invented collection intro while legacy layout keeps its existing intro', () => {
  assert.deepEqual(plan({ collectionSchemaVersion: 2 }).pages.map(p => p.kind), ['cover','profile','contact']);
  assert.deepEqual(plan({}).pages.map(p => p.kind), ['cover','profile','collection','contact']);
});
test('invalid membership and duplicate selected source snapshots cannot enter the PDF map', () => {
  assert.throws(() => plan({ collectionSchemaVersion: 2, artworks: [{ id: 'a', portfolioCollectionId: 'foreign' }] }), /membership/);
  assert.throws(() => plan({ collectionSchemaVersion: 2, artworks: [{ id: 'a', sourceArtworkId: 'same', isSelected: true }, { id: 'b', sourceArtworkId: 'same', isSelected: true }] }), /Duplicate/);
});
