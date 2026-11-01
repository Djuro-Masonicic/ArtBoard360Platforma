// Coordinates are millimetres × 10 on the supplied 91 × 61 mm print canvas.
// The normal view crops the 3 mm bleed, retaining the existing 85 × 55 mm UI.
const brands = require("./basic-brand.cjs");
const metrics = require("./basic-font-metrics.json");
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
const safeImage = (value) =>
  typeof value === "string" &&
  (/^https?:\/\//.test(value) ||
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))
    ? esc(value)
    : "";
function width(value, size, weight = "Bold", spacing = 0) {
  const font = metrics[weight],
    chars = Array.from(value);
  return chars.reduce(
    (sum, c, i) =>
      sum +
      (font.widths[c.codePointAt(0)] ?? 1) * size +
      spacing +
      (i ? (font.kern[chars[i - 1] + c] || 0) * size : 0),
    0,
  );
}
function renderLabel(
  value,
  x,
  baseline,
  size,
  color,
  weight = 700,
  spacing = 0,
  anchor = "start",
  max = Infinity,
  id = "",
  family = "basic",
) {
  const measured = width(
    value,
    size,
    weight >= 700 ? "Bold" : "SemiBold",
    spacing,
  );
  return `<text ${id ? `data-${family}="${id}"` : ""} x="${x}" y="${baseline}" font-size="${size}" font-weight="${weight}" fill="${color}" letter-spacing="${spacing}" text-anchor="${anchor}"${measured > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : ""}>${esc(value)}</text>`;
}
function contactValue(key, value) {
  if (key === "instagram" || key === "behance") {
    try {
      const u = new URL(value);
      return key === "instagram"
        ? u.pathname.replace(/^\/|\/$/g, "")
          ? "@" + decodeURIComponent(u.pathname.replace(/^\/|\/$/g, ""))
          : "instagram.com"
        : "behance.net" + decodeURIComponent(u.pathname.replace(/\/$/, ""));
    } catch {}
  }
  return value;
}
function wrap(value, size, max) {
  const lines = [];
  let current = "";
  for (const char of Array.from(value)) {
    if (current && width(current + char, size, "SemiBold") > max) {
      lines.push(current);
      current = "";
    }
    current += char;
  }
  if (current || !lines.length) lines.push(current);
  return lines;
}
const paths = {
  email:
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
  phone:
    '<path d="M8.4 3.6 6 3.2A2 2 0 0 0 3.8 5c-.3 7.9 6.2 14.6 14.2 15.2a2 2 0 0 0 2-2.1l-.3-2.6a1.5 1.5 0 0 0-1-1.2l-2.9-1a1.5 1.5 0 0 0-1.6.4l-1.2 1.3a12 12 0 0 1-5.6-5.6l1.3-1.2a1.5 1.5 0 0 0 .4-1.6l-1-2.9a1.5 1.5 0 0 0-1.2-1Z"/>',
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
  behance:
    '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
};
function renderContacts(
  c,
  {
    id,
    x,
    right = 820,
    bottom = 480,
    maxHeight = 136.4,
    gap = 13,
    muted,
    contact,
  },
) {
  let body = "";
  const values = c.selectedContacts.map((key) => ({
    key,
    value: contactValue(key, c.contacts[key]),
  }));
  let size = 21,
    rows,
    height;
  // Keep the reference's 2.1 mm SemiBold for normal data. Long real contacts
  // wrap and only reduce in size when needed; no value is silently dropped.
  do {
    rows = values.map((v) => ({
      ...v,
      lines: wrap(v.value, size, right - x - 48),
    }));
    height =
      rows.reduce((h, r) => h + Math.max(28, r.lines.length * size * 1.2), 0) +
      Math.max(0, rows.length - 1) * gap;
    if (height <= maxHeight || size <= 6) break;
    size -= 0.5;
  } while (true);
  let top = bottom - height;
  for (const row of rows) {
    const h = Math.max(28, row.lines.length * size * 1.2),
      iconTop = top + (h - 28) / 2;
    body += `<svg data-${id}="contact-icon" x="${x}" y="${iconTop}" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${muted}" color="${muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[row.key]}</svg>`;
    row.lines.forEach((text, i) => {
      body += renderLabel(
        text,
        x + 48,
        top +
          (h - row.lines.length * size * 1.2) / 2 +
          size * 0.95 +
          i * size * 1.2,
        size,
        contact,
        600,
        0,
        "start",
        right - x - 48,
        "contact-text",
        id,
      );
    });
    top += h + gap;
  }
  return body;
}
function renderQr(model, { id, x = 90, y = 240, size = 240, bg, fg }) {
  const qr = model.qrSvg
    .replace(/<\?xml[^>]*>/g, "")
    .replace(/<svg\b[^>]*>/, (tag) => {
      const viewBox = /viewBox="([^"]+)"/.exec(tag)?.[1] || "0 0 45 45";
      return `<svg xmlns="http://www.w3.org/2000/svg" data-${id}="qr" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBox}" shape-rendering="crispEdges">`;
    })
    .replace(/#ffffff/gi, bg)
    .replace(/#000000/gi, fg);
  return qr;
}
function renderPhysical(model, side, options, layout) {
  const id = layout.id;
  const label = (
    value,
    x,
    baseline,
    size,
    color,
    weight = 700,
    spacing = 0,
    anchor = "start",
    max = Infinity,
    key = "",
  ) =>
    renderLabel(
      value,
      x,
      baseline,
      size,
      color,
      weight,
      spacing,
      anchor,
      max,
      key,
      id,
    );
  const c = model.config,
    dark =
      c.cardColor === "dark" || (layout.id === "artboard" && side === "front"),
    branded = c.variant === "branded",
    bg = dark ? "#0b0c12" : "#f7f7fa",
    fg = dark ? "#ffffff" : "#0b0c12";
  const muted = dark ? "rgba(255,255,255,.62)" : "#6b7080",
    contact = dark ? "rgba(255,255,255,.86)" : "#2a2d3a",
    line = dark ? "rgba(255,255,255,.5)" : "rgba(11,12,18,.5)";
  const caption = c.language === "EN" ? "ARTIST CARD" : "UMJETNIČKA KARTICA";
  const bar =
      layout.backDivider === false
        ? 0
        : branded
          ? 4
          : layout.id === "artboard"
            ? 0
            : 2.5,
    barFill = branded ? "url(#basic-vertical)" : line;
  const image = (value, x, y, w, h, clip = "") =>
    safeImage(value)
      ? `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${safeImage(value)}" preserveAspectRatio="xMidYMid slice" ${clip ? `clip-path="url(#${clip})"` : ""}/>`
      : "";
  let body = `<rect width="910" height="610" fill="${bg}"/>`;
  if (side === "front") {
    body += layout.front({
      c,
      branded,
      bg,
      fg,
      muted,
      bar,
      barFill,
      image,
      caption,
      model,
    });
  } else if (layout.back) {
    body += layout.back({ c, bg, fg, muted, contact, line, image, model });
  } else {
    if (branded)
      body += `<rect data-${id}="back-brand-band" y="564" width="910" height="46" fill="url(#basic-back-horizontal)"/>`;
    body += brands[dark ? "dark" : "light"].replace(
      /<svg[^>]*>/,
      `<svg xmlns="http://www.w3.org/2000/svg" data-${id}="logo" x="90" y="90" width="202.741" height="44" viewBox="0 0 737.240 160">`,
    );
    body += label(
      caption,
      820,
      117.95,
      17,
      muted,
      700,
      3.06,
      "end",
      730 - 202.741 - 40,
      "back-caption",
    );
    // Recolor the server-generated QR for the selected card color. Its real
    // destination/error correction/four-module quiet zone remain unchanged.
    const qr = renderQr(model, { id, bg, fg });
    body +=
      qr +
      label(
        c.language === "EN" ? "SCAN" : "SKENIRAJ",
        210,
        515,
        20,
        line,
        700,
        4,
        "middle",
        240,
        "scan",
      );
    if (bar)
      body += `<rect data-${id}="divider" x="380" y="240" width="${bar}" height="240" fill="${barFill}"/>`;
    const x = 380 + (bar ? bar + 24 : 0),
      title =
        c.backTitle === "portfolio"
          ? "Portfolio"
          : c.language === "EN"
            ? "ArtBoard profile"
            : "ArtBoard profil";
    body +=
      label(
        c.language === "EN" ? "View my" : "Pogledaj moj",
        x,
        274.2,
        38,
        fg,
        700,
        -0.95,
        "start",
        820 - x,
        "back-title",
      ) + label(title, x, 316, 38, fg, 700, -0.95, "start", 820 - x);
    body += renderContacts(c, { id, x, muted, contact });
  }
  if (options.guides)
    body += `<rect data-${id}="trim-guide" x="31.323" y="31.323" width="847.354" height="547.354" fill="none" stroke="${dark ? "rgba(255,255,255,.45)" : "rgba(10,12,20,.35)"}" stroke-width="2.646" stroke-dasharray="7.94 7.94"/>`;
  const bleed = options.mode === "bleed";
  const horizontalGradient = (id, y, h) => {
    const length = 910 * Math.sin((Math.PI * 2) / 3) + h * 0.5,
      dx = length * Math.sin((Math.PI * 2) / 3),
      dy = length * 0.5;
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${(910 - dx) / 2}" y1="${y + (h - dy) / 2}" x2="${(910 + dx) / 2}" y2="${y + (h + dy) / 2}"><stop stop-color="#0d74ff"/><stop offset=".35" stop-color="#783cff"/><stop offset=".65" stop-color="#fe171d"/><stop offset="1" stop-color="#ffd31b"/></linearGradient>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${bleed ? 910 : 850}" height="${bleed ? 610 : 550}" viewBox="${bleed ? "0 0 910 610" : "30 30 850 550"}" data-${id}-side="${side}"><defs><style>text{font-family:inherit}</style><clipPath id="basic-avatar"><circle cx="155" cy="365" r="65"/></clipPath>${horizontalGradient("basic-front-horizontal", 359, 6)}${horizontalGradient("basic-back-horizontal", 564, 46)}<linearGradient id="basic-vertical" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#0d74ff"/><stop offset=".35" stop-color="#783cff"/><stop offset=".68" stop-color="#fe171d"/><stop offset="1" stop-color="#ffd31b"/></linearGradient>${layout.defs || ""}</defs>${body}</svg>`;
}
module.exports = {
  renderPhysical,
  label: renderLabel,
  renderContacts,
  renderQr,
  measureText: width,
};
