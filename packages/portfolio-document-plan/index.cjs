const cv = require('./cv.cjs');
const selection = require('./selection.cjs');
function buildPortfolioDocumentPlan(project) {
  const format = project.collectionSchemaVersion === 2 ? 2 : 1;
  const all = project.artworks || [];
  const collections = [...(project.collections || [])].sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id));
  const groups = [];
  if (format === 1) {
    const artworks = all.filter(w => w.isSelected).sort((a, b) => a.orderIndex - b.orderIndex);
    groups.push({ collection: null, artworks, legacyIntro: true });
  } else {
    const ids = new Set(collections.map(c => c.id));
    for (const work of all) if (work.portfolioCollectionId && !ids.has(work.portfolioCollectionId)) throw Error('Invalid portfolio collection membership');
    for (const collection of collections) {
      const artworks = all.filter(w => w.portfolioCollectionId === collection.id && w.isSelected)
        .sort((a, b) => (a.collectionOrderIndex ?? a.orderIndex) - (b.collectionOrderIndex ?? b.orderIndex) || a.id.localeCompare(b.id));
      if (collection.isIncluded && artworks.length) groups.push({ collection, artworks, legacyIntro: false });
    }
    const outside = all.filter(w => !w.portfolioCollectionId && w.isSelected).sort((a, b) => a.orderIndex - b.orderIndex);
    if (project.includeUncollectedArtworks !== false && outside.length) groups.push({ collection: null, artworks: outside, legacyIntro: false });
  }
  const selectedArtworks = groups.flatMap(g => g.artworks);
  const seen = new Set();
  for (const work of selectedArtworks) {
    const key = work.sourceArtworkId || work.id;
    if (seen.has(key)) throw Error('Duplicate portfolio artwork');
    seen.add(key);
  }
  const documentSelection = selection.getDocumentSelection(project);
  const enabled = key => documentSelection.scope === 'CV' ? key === 'cv' : documentSelection.sections[key];
  const pages = [];
  if (enabled('cover')) pages.push({ kind: 'cover' });
  if (enabled('profile')) pages.push({ kind: 'profile' });
  if (enabled('featured') && selectedArtworks.length) pages.push({ kind: 'featured' });
  for (const group of groups) {
    if (enabled('collections') && (group.collection || group.legacyIntro)) pages.push({ kind: 'collection', collectionId: group.collection?.id || null });
    if (enabled('artworks')) for (const artwork of group.artworks) pages.push({ kind: 'artwork', artworkId: artwork.id });
  }
  if (enabled('cv') && cv.portfolioCvBlocks(project.cvSections).length) pages.push({ kind: 'cv' });
  if (enabled('contact')) pages.push({ kind: 'contact' });
  return { format, groups, selectedArtworks, pages, pageCount: pages.length, documentSelection,
    collectionCount: groups.filter(g => g.collection).length, artworkCount: selectedArtworks.length };
}
module.exports = { buildPortfolioDocumentPlan, ...cv, ...selection, ...require('./minimal.cjs') };
