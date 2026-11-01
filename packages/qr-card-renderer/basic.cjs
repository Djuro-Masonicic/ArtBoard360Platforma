// Basic front keeps its approved reference geometry; print/contact helpers are shared.
const { renderPhysical, label } = require("./physical.cjs");
function front({
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
}) {
  let body = "";
  body +=
    `<rect data-basic="cover" width="910" height="365" fill="#dce0e9"/>` +
    image(model.cover, 0, 0, 910, 365);
  if (branded)
    body +=
      '<rect data-basic="front-brand-band" y="359" width="910" height="6" fill="url(#basic-front-horizontal)"/>';
  body +=
    `<circle data-basic="avatar-ring" cx="155" cy="365" r="71" fill="${bg}"/><circle cx="155" cy="365" r="65" fill="#dce0e9"/>` +
    image(model.avatar, 90, 300, 130, 130, "basic-avatar");
  body += `<rect data-basic="divider" x="260" y="416" width="${bar}" height="104" fill="${barFill}"/>`;
  body += label(
    caption,
    260 + bar + 24,
    435,
    20,
    muted,
    700,
    3.6,
    "start",
    536 - bar,
    "front-caption",
  );
  body += label(
    c.name,
    260 + bar + 24,
    510.4,
    64,
    fg,
    700,
    -1.92,
    "start",
    536 - bar,
    "name",
  );
  return body;
}
function renderBasic(model, side, options = {}) {
  return renderPhysical(model, side, options, { id: "basic", front });
}
module.exports = { renderBasic };
