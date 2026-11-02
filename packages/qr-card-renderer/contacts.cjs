// Shared by the editor and API. Only known social hosts can become card links.
function normalizeCardSocialContact(platform, value) {
  const host = platform === "instagram" ? "instagram.com" : platform === "behance" ? "behance.net" : null;
  if (!host || typeof value !== "string") return null;
  const input = value.trim();
  if (!input) return "";
  if (/[\s\p{Cc}\\]/u.test(input)) return null;
  let address;
  if (/^@?[a-z\d_.-]+$/i.test(input) && !input.toLowerCase().startsWith("www.") && input.toLowerCase() !== host) {
    address = `https://${host}/${input.replace(/^@/, "")}`;
  } else if (/^https?:\/\//i.test(input)) {
    address = input;
  } else if (new RegExp(`^(?:www\\.)?${host.replaceAll(".", "\\.")}/`, "i").test(input)) {
    address = `https://${input}`;
  } else return null;
  try {
    const url = new URL(address);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port ||
      ![host, `www.${host}`].includes(url.hostname) || url.pathname === '/') return null;
    url.protocol = 'https:';
    return url.href.length <= 200 ? url.href : null;
  } catch { return null; }
}
module.exports = { normalizeCardSocialContact };
