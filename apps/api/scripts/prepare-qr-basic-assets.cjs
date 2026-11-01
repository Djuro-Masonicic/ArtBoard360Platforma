// Uses existing, repository-owned Alcyone and ArtBoard assets. No downloads.
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../../.."),
  out = path.join(root, "packages/qr-card-renderer");
const fontkit = require("node:module").createRequire(require.resolve("pdfkit"))(
  "fontkit",
);
const metrics = {};
for (const weight of ["Bold", "SemiBold"]) {
  const font = fontkit.create(
    fs.readFileSync(
      path.join(root, `apps/web/app/fonts/Alcyone-${weight}.woff2`),
    ),
  );
  const widths = {},
    kern = {},
    characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzČĆŽŠĐčćžšđ";
  for (const code of font.characterSet)
    widths[code] = font.glyphForCodePoint(code).advanceWidth / font.unitsPerEm;
  for (const left of characters)
    for (const right of characters) {
      const run = font.layout(left + right);
      const diff =
        run.positions.reduce((a, p) => a + p.xAdvance, 0) / font.unitsPerEm -
        widths[left.codePointAt(0)] -
        widths[right.codePointAt(0)];
      if (Math.abs(diff) > 0.000001)
        kern[left + right] = Math.round(diff * 100000) / 100000;
    }
  metrics[weight] = { widths, kern };
}
fs.writeFileSync(
  path.join(out, "basic-font-metrics.json"),
  JSON.stringify(metrics),
);
const logos = {};
for (const [tone, name] of [
  ["light", "ArtBoard-Horizontal-Gradient.svg"],
  ["dark", "ArtBoard-Horizontal-Gradient-Mark-White-Text.svg"],
]) {
  logos[tone] = fs
    .readFileSync(
      path.join(root, "apps/web/public/artboard-logo", name),
      "utf8",
    )
    .replace(/<\?xml[^>]*>/, "");
}
fs.writeFileSync(
  path.join(out, "basic-brand.cjs"),
  "// Existing ArtBoard lockups, shared by browser and export.\nmodule.exports = " +
    JSON.stringify(logos) +
    ";\n",
);
console.log("Prepared existing brand lockups and Alcyone metrics.");
