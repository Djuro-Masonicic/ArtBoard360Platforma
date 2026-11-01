// The supplied ArtBoard variants share one dark photographic front. The color
// selection changes the back only (2a/2b standard, 2c/2d branded).
const { renderPhysical, label } = require("./physical.cjs");
function front({ c, branded, image, avatar, cover }) {
  // CSS flex centering on the 91×61 mm canvas, including both nested gaps.
  const top = branded ? 135.8 : 149.8,
    center = top + 92;
  let body = '<rect width="910" height="610" fill="#0b0c12"/>';
  body +=
    '<g data-artboard="cover" opacity=".5">' +
    image(cover, 0, 0, 910, 610) +
    "</g>";
  body += `<g data-artboard="avatar"><rect x="363" y="${top}" width="184" height="184" fill="none"/><circle data-artboard="avatar-ring" cx="455" cy="${center}" r="90.5" fill="none" stroke="${branded ? "url(#artboard-ring)" : "rgba(255,255,255,.9)"}" stroke-width="3"/>`;
  body +=
    `<circle cx="455" cy="${center}" r="80" fill="#dce0e9"/>` +
    image(
      avatar,
      375,
      top + 12,
      160,
      160,
      `artboard-avatar-${branded ? "branded" : "standard"}`,
    ) +
    "</g>";
  body += label(
    c.language === "EN"
      ? "ARTBOARD ARTIST CARD"
      : "ARTBOARD UMJETNIČKA KARTICA",
    455,
    top + 226.15,
    17,
    "rgba(255,255,255,.75)",
    700,
    3.06,
    "middle",
    730,
    "front-caption",
    "artboard",
  );
  body += label(
    c.name,
    455,
    top + 300.5,
    66,
    "#ffffff",
    700,
    -1.98,
    "middle",
    730,
    "name",
    "artboard",
  );
  if (branded)
    body += `<rect data-artboard="name-underline" x="395" y="470.2" width="120" height="4" fill="url(#artboard-underline)"/><rect data-artboard="front-brand-band" y="604" width="910" height="6" fill="url(#artboard-bottom)"/>`;
  return body;
}
function renderArtboard(model, side, options = {}) {
  const branded = model.config.variant === "branded",
    center = (branded ? 135.8 : 149.8) + 92,
    length = 910 * Math.sin((Math.PI * 2) / 3) + 3,
    dx = length * Math.sin((Math.PI * 2) / 3),
    dy = length / 2,
    stops =
      '<stop stop-color="#0d74ff"/><stop offset=".35" stop-color="#783cff"/><stop offset=".65" stop-color="#fe171d"/><stop offset="1" stop-color="#ffd31b"/>';
  return renderPhysical(model, side, options, {
    id: "artboard",
    front: (context) =>
      front({ ...context, avatar: model.avatar, cover: model.cover }),
    defs: `<clipPath id="artboard-avatar-${branded ? "branded" : "standard"}"><circle cx="455" cy="${center}" r="80"/></clipPath><linearGradient id="artboard-ring" x1="0" y1="1" x2="1" y2="0">${stops}</linearGradient><linearGradient id="artboard-underline">${stops}</linearGradient><linearGradient id="artboard-bottom" gradientUnits="userSpaceOnUse" x1="${(910 - dx) / 2}" y1="${607 - dy / 2}" x2="${(910 + dx) / 2}" y2="${607 + dy / 2}">${stops}</linearGradient>`,
  });
}
module.exports = { renderArtboard };
