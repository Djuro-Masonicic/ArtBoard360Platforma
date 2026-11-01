const CV_FIELDS = Object.freeze({
  education: ['period', 'institution', 'degree', 'location'],
  experience: ['period', 'organization', 'position', 'location', 'description'],
  exhibitions: ['year', 'title', 'location', 'type'],
  awards: ['year', 'title', 'category', 'location'],
  certificates: ['title', 'field', 'issuer'],
  publications: ['title', 'issuer', 'link'],
});
const titles = {
  ME: { education: 'Obrazovanje', experience: 'Radno iskustvo', exhibitions: 'Izložbe', awards: 'Nagrade', skills: 'Vještine', programs: 'Programi', certificates: 'Sertifikati', publications: 'Publikacije' },
  EN: { education: 'Education', experience: 'Experience', exhibitions: 'Exhibitions', awards: 'Awards', skills: 'Skills', programs: 'Software', certificates: 'Certificates', publications: 'Publications' },
};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function keys(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) throw Error('CV sadrži nepoznata ili neispravna polja.');
}
function parsePortfolioCv(value) {
  keys(value, ['version', ...Object.keys(CV_FIELDS), 'skills', 'programs']);
  if (value.version !== 1) throw Error('Nepodržana verzija CV podataka.');
  const result = { version: 1 }, seen = new Set();
  let length = 0;
  function text(input, limit) {
    if (typeof input !== 'string' || input.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input)) throw Error(`CV tekst mora imati najviše ${limit} znakova.`);
    length += input.length;
    return input.trim();
  }
  for (const [section, fields] of Object.entries(CV_FIELDS)) {
    if (!Array.isArray(value[section]) || value[section].length > 20) throw Error('CV sekcija može imati najviše 20 stavki.');
    result[section] = value[section].map(row => {
      keys(row, ['id', 'values']);
      if (typeof row.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(row.id) || seen.has(row.id)) throw Error('CV stavke moraju imati jedinstvene identifikatore.');
      seen.add(row.id); keys(row.values, fields);
      const values = {};
      for (const field of fields) if (row.values[field] !== undefined) {
        const entry = text(row.values[field], field === 'description' ? 1500 : field === 'link' ? 500 : 240);
        if (field === 'link' && entry) {
          let url; try { url = new URL(entry); } catch { throw Error('Link publikacije mora biti ispravan HTTP ili HTTPS URL.'); }
          if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error('Link publikacije mora biti ispravan HTTP ili HTTPS URL.');
        }
        if (entry) values[field] = entry;
      }
      return { id: row.id, values };
    });
  }
  result.skills = text(value.skills, 2000); result.programs = text(value.programs, 2000);
  if (length > 30000) throw Error('CV može imati najviše 30000 znakova ukupno.');
  return result;
}
function readPortfolioCv(value) { try { return parsePortfolioCv(value); } catch { return null; } }
function portfolioCvBlocks(value, language = 'ME') {
  const cv = readPortfolioCv(value);
  if (!cv) {
    // Recognised legacy sections stay readable; do not rewrite the stored JSON.
    if (object(value) && !('version' in value)) return Object.entries(value).map(([title, items]) => ({
      title, items: Array.isArray(items) ? items.filter(text => typeof text === 'string' && text.trim()) : typeof items === 'string' && items.trim() ? [items] : [],
    })).filter(block => block.items.length);
    if (!Array.isArray(value)) return [];
    return value.filter(item => object(item) && typeof item.title === 'string' && Array.isArray(item.items))
      .map(item => ({ title: item.title, items: item.items.filter(text => typeof text === 'string' && text.trim()) })).filter(block => block.items.length);
  }
  const labels = titles[language] || titles.ME;
  return ['education', 'experience', 'exhibitions', 'awards', 'skills', 'programs', 'certificates', 'publications'].map(section => ({
    title: labels[section],
    items: section === 'skills' || section === 'programs' ? [cv[section]].filter(Boolean)
      : cv[section].map(row => CV_FIELDS[section].map(key => row.values[key] || '').filter(Boolean).join(' · ')).filter(Boolean),
  })).filter(block => block.items.length);
}
module.exports = { CV_FIELDS, parsePortfolioCv, readPortfolioCv, portfolioCvBlocks };
