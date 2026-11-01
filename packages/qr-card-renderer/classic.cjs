// Classic follows the supplied 3a/3b print layouts. It intentionally has no
// avatar or rear divider, including the Branded version.
const { renderPhysical, label } = require("./physical.cjs");
function front({ c, fg, branded, image, model }) {
  let body =
    '<rect data-classic="cover" width="910" height="365" fill="#dce0e9"/>' +
    image(model.cover, 0, 0, 910, 365);
  if (branded)
    body +=
      '<rect data-classic="front-brand-band" y="359" width="910" height="6" fill="url(#basic-front-horizontal)"/>';
  // The group ends 9 mm above the canvas bottom: caption line-height 2.04 mm,
  // 1.6 mm gap, then the 6.8 mm name line. Coordinates use mm × 10.
  body += label(
    c.language === "EN"
      ? "ARTBOARD ARTIST CARD"
      : "ARTBOARD UMJETNIČKA KARTICA",
    90,
    431.75,
    17,
    fg,
    700,
    3.06,
    "start",
    730,
    "front-caption",
    "classic",
  );
  body += label(
    c.name,
    90,
    509.8,
    68,
    fg,
    700,
    -2.04,
    "start",
    730,
    "name",
    "classic",
  );
  return body;
}
function renderClassic(model, side, options = {}) {
  return renderPhysical(model, side, options, {
    id: "classic",
    front,
    backDivider: false,
  });
}
module.exports = { renderClassic };
