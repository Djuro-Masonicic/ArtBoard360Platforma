const { renderPhysical, label, measureText } = require("./physical.cjs");

// Natural wrapping from the supplied 39 mm text group. Long real names also
// break safely within a word; size only reduces when more than three lines fit.
function nameLines(name, size, max) {
  const lines = [];
  let current = "";
  for (const word of name.trim().split(/\s+/u)) {
    if (
      current &&
      measureText(current + " " + word, size, "Bold", -size * 0.03) <= max
    ) {
      current += " " + word;
      continue;
    }
    if (current) {
      lines.push(current);
      current = "";
    }
    for (const char of Array.from(word)) {
      if (
        current &&
        measureText(current + char, size, "Bold", -size * 0.03) > max
      ) {
        lines.push(current);
        current = "";
      }
      current += char;
    }
  }
  if (current || !lines.length) lines.push(current);
  return lines;
}
function renderPortret(model, side, options = {}) {
  const branded = model.config.variant === "branded";
  return renderPhysical(model, side, options, {
    id: "portret",
    backDivider: branded,
    front: ({ c, fg, line, image }) => {
      const bar = branded ? 4 : 2.5,
        x = 90 + bar + 24,
        max = 390 - bar - 24;
      let size = 64,
        lines = nameLines(c.name, size, max);
      while (lines.length > 3 && size > 24) {
        size -= 1;
        lines = nameLines(c.name, size, max);
      }
      const height = 20.4 + 16 + lines.length * size,
        top = 520 - height;
      let body =
        '<rect data-portret="cover" x="530" width="380" height="610" fill="#dce0e9"/>' +
        image(model.cover, 530, 0, 380, 610);
      if (branded)
        body +=
          '<rect data-portret="photo-divider" x="524" width="6" height="610" fill="url(#basic-vertical)"/>';
      body += `<rect data-portret="divider" x="90" y="${top}" width="${bar}" height="${height}" fill="${branded ? "url(#basic-vertical)" : line}"/>`;
      body += label(
        c.language === "EN" ? "ARTIST CARD" : "UMJETNIČKA KARTICA",
        x,
        top + 16.15,
        17,
        fg,
        700,
        3.06,
        "start",
        max,
        "front-caption",
        "portret",
      );
      body += '<g data-portret="name">';
      lines.forEach((value, i) => {
        body += label(
          value,
          x,
          top + 36.4 + size * 0.85 + i * size,
          size,
          fg,
          700,
          -size * 0.03,
          "start",
          max,
          "name-line",
          "portret",
        );
      });
      body += "</g>";
      return body;
    },
  });
}
module.exports = { renderPortret };
