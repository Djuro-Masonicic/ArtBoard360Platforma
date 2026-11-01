// The supplied 4a Clean and 4b Profilna canvases share a centered, logo-free
// back. Their legacy template IDs remain no-cover/portrait for saved drafts.
const {
  renderPhysical,
  label,
  renderContacts,
  renderQr,
} = require("./physical.cjs");
const brands = require("./basic-brand.cjs");
function renderClean(model, side, options = {}) {
  const profile = model.config.templateId === "portrait",
    id = profile ? "profile" : "clean";
  return renderPhysical(model, side, options, {
    id,
    defs: '<clipPath id="clean-profile-avatar"><circle cx="160" cy="450" r="70"/></clipPath>',
    front: ({ c, fg, bg, muted, image }) => {
      let body = brands[c.cardColor === "dark" ? "dark" : "light"].replace(
        /<svg[^>]*>/,
        `<svg xmlns="http://www.w3.org/2000/svg" data-${id}="logo" x="90" y="90" width="230.3875" height="50" viewBox="0 0 737.240 160">`,
      );
      if (profile) {
        body +=
          `<circle data-profile="avatar-ring" cx="160" cy="450" r="76" fill="${bg}"/><circle cx="160" cy="450" r="70" fill="#dce0e9"/>` +
          image(model.avatar, 90, 380, 140, 140, "clean-profile-avatar");
      }
      const x = profile ? 265 : 90;
      body += label(
        c.language === "EN" ? "ARTIST CARD" : "UMJETNIČKA KARTICA",
        x,
        profile ? 416 : 423,
        20,
        muted,
        700,
        3.6,
        "start",
        820 - x,
        "front-caption",
        id,
      );
      body += label(
        c.name,
        x,
        profile ? 493.1 : 508.6,
        profile ? 66 : 76,
        fg,
        700,
        profile ? -1.98 : -2.28,
        "start",
        820 - x,
        "name",
        id,
      );
      return body;
    },
    back: ({ c, bg, fg, muted, contact, line }) => {
      // Flex-wrap align-content:center within top/right/bottom/left insets
      // 9/8/6/10 mm: the 25 mm QR + 1.8 mm gap + 2.4 mm label is 29.2 mm high.
      let body = renderQr(model, { id, x: 100, y: 174, size: 250, bg, fg });
      body += label(
        c.language === "EN" ? "SCAN" : "SKENIRAJ",
        225,
        461,
        20,
        line,
        700,
        4,
        "middle",
        250,
        "scan",
        id,
      );
      const title =
        c.backTitle === "portfolio"
          ? "Portfolio"
          : c.language === "EN"
            ? "ArtBoard profile"
            : "ArtBoard profil";
      body += label(
        c.language === "EN" ? "View my" : "Pogledaj moj",
        400,
        217.8,
        42,
        fg,
        700,
        -1.05,
        "start",
        430,
        "back-title",
        id,
      );
      body += label(
        title,
        400,
        264,
        42,
        fg,
        700,
        -1.05,
        "start",
        430,
        "back-title-line2",
        id,
      );
      body += renderContacts(c, {
        id,
        x: 400,
        right: 830,
        bottom: 418,
        maxHeight: 145.6,
        gap: 15,
        muted,
        contact,
      });
      return body;
    },
  });
}
module.exports = { renderClean };
