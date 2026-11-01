const DOCUMENT_SECTIONS = Object.freeze(['cover', 'profile', 'featured', 'collections', 'artworks', 'cv', 'contact']);
function defaultDocumentSelection(includeCv = false) {
  return { version: 1, scope: 'PORTFOLIO', sections: { cover: true, profile: true, featured: false, collections: true, artworks: true, cv: Boolean(includeCv), contact: true } };
}
function parseDocumentSelection(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || !['PORTFOLIO', 'CV'].includes(value.scope)
    || Object.keys(value).some(key => !['version', 'scope', 'sections'].includes(key))) throw Error('Neispravan izbor PDF stranica.');
  const sections = value.sections;
  if (!sections || typeof sections !== 'object' || Array.isArray(sections) || Object.keys(sections).some(key => !DOCUMENT_SECTIONS.includes(key))
    || DOCUMENT_SECTIONS.some(key => typeof sections[key] !== 'boolean')) throw Error('Izbor PDF sekcija mora sadržati dozvoljene boolean vrijednosti.');
  if (value.scope === 'PORTFOLIO' && !DOCUMENT_SECTIONS.some(key => sections[key])) throw Error('Izaberi najmanje jednu PDF sekciju.');
  return { version: 1, scope: value.scope, sections: Object.fromEntries(DOCUMENT_SECTIONS.map(key => [key, sections[key]])) };
}
function getDocumentSelection(project) {
  const value = project.documentSelection || project.designConfig?.documentSelection;
  const selection = value ? parseDocumentSelection(value) : defaultDocumentSelection(project.includeCv);
  return { ...selection, sections: { ...selection.sections, cv: project.includeCv === undefined ? selection.sections.cv : Boolean(project.includeCv) } };
}
module.exports = { DOCUMENT_SECTIONS, defaultDocumentSelection, parseDocumentSelection, getDocumentSelection };
