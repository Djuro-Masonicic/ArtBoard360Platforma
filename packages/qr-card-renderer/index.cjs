// One registry for editor previews and server exports. Legacy IDs are stable.
const { renderBasic } = require("./basic.cjs");
const { renderArtboard } = require("./artboard.cjs");
const { renderClassic } = require("./classic.cjs");
const { renderClean } = require("./clean.cjs");
const { renderPortret } = require("./portret.cjs");
const renderers = {
  basic: renderBasic,
  artboard: renderArtboard,
  classic: renderClassic,
  "no-cover": renderClean,
  portrait: renderClean,
  "portrait-artwork": renderPortret,
};
const hasNativeBleed = (id) => Object.hasOwn(renderers, id);
const usesCover = (id) =>
  ["basic", "artboard", "classic", "portrait-artwork"].includes(id);
const usesAvatar = (id) => ["basic", "artboard", "portrait"].includes(id);
const supportsBranded = (id) =>
  ["basic", "artboard", "classic", "portrait-artwork"].includes(id);
const cardTemplates = Object.freeze(
  [
    ["basic", "Basic"],
    ["artboard", "ArtBoard"],
    ["classic", "Classic"],
    ["no-cover", "Clean"],
    ["portrait", "Profilna"],
    ["portrait-artwork", "Portret"],
  ].map(([id, label]) => Object.freeze({ id, label, provisional: false })),
);
function renderCard(model, side, options = {}) {
  if (!Object.hasOwn(renderers, model.config.templateId))
    throw new Error("Unknown QR card template.");
  return renderers[model.config.templateId](model, side, options);
}
module.exports = {
  cardTemplates,
  renderCard,
  hasNativeBleed,
  usesCover,
  usesAvatar,
  supportsBranded,
};
