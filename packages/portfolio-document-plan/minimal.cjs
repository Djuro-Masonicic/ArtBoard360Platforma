const covers = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
function parseMinimalDesign(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['version', 'cover', 'style'].includes(key)) || value.version !== 1 || !covers.includes(value.cover)
    || (value.style !== undefined && !['MINIMAL', 'ROUNDED', 'GRADIENT', 'EDITORIAL', 'CARDS', 'BLOCKS'].includes(value.style))) throw Error('Neispravan PDF dizajn.');
  return { version: 1, cover: value.cover, ...(value.style !== undefined ? { style: value.style } : {}) };
}
function getMinimalDesign(project) {
  try { return parseMinimalDesign(project?.designConfig?.minimal); } catch { return { version: 1, cover: 'A' }; }
}
function getMinimalDesignLabel(project) {
  const style = getMinimalDesign(project).style;
  return style === 'BLOCKS' ? 'Blok' : style === 'CARDS' ? 'Kartice' : style === 'EDITORIAL' ? 'Editorijal' : style === 'GRADIENT' ? 'Gradijent' : style === 'ROUNDED' ? 'Rounded' : 'Minimal';
}
module.exports = { MINIMAL_COVERS: covers, parseMinimalDesign, getMinimalDesign, getMinimalDesignLabel };
