// Read the supplied HTML; retain its eight canvases as test references only.
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../../..");
const input = process.argv[2];
if (!input)
  throw Error("Pass the supplied Basic HTML/text file as the first argument.");
const source = fs.readFileSync(input, "utf8");
const cards = source
  .split('<div id="dc-root">')
  .slice(1)
  .map(
    (part) =>
      '<div id="dc-root">' + part.slice(0, part.lastIndexOf("</div>") + 6),
  );
if (
  cards.length !== 8 ||
  cards.some((c) => !/data-card="1[ab]-(light|dark)-(front|back)"/.test(c))
)
  throw Error("Expected the eight supplied Basic canvases.");
const out = path.join(
  root,
  "apps/web/references/qr-basic-artifact-20261030.html",
);
fs.writeFileSync(
  out,
  '<!doctype html><meta charset="utf-8"><title>Supplied Basic reference — test only</title>\n' +
    cards.join("\n"),
);
console.log("Prepared eight source canvases.");
