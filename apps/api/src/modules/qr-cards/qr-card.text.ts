import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
// PDFKit's existing fontkit dependency converts the same local Alcyone cuts to
// outlines. No font download, machine font substitution or raster text fallback.
const fontkit = createRequire(require.resolve("pdfkit"))("fontkit") as {
  create: (data: Buffer) => any;
};
const fonts = new Map<string, any>();
export function cardTextOutlines(svg: string) {
  const dir = resolve(
    dirname(require.resolve("@artboard/qr-card-renderer")),
    "../../apps/api/assets/portfolio-fonts",
  );
  const decode = (s: string) =>
    s.replace(
      /&(?:amp|lt|gt|quot|apos);/g,
      (v) =>
        ({
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&apos;": "'",
        })[v]!,
    );
  return svg.replace(
    /<text\b([^>]*)>([^<]*)<\/text>/g,
    (_, attrs: string, content: string) => {
      const attr = (key: string) =>
        new RegExp(`(?:^|\\s)${key}="([^"]*)"`).exec(attrs)?.[1];
      const numericWeight = Number(attr("font-weight") || 400);
      const weight =
        numericWeight >= 700
          ? "Bold"
          : numericWeight >= 600
            ? "SemiBold"
            : "Regular";
      let font = fonts.get(weight);
      if (!font) {
        font = fontkit.create(
          readFileSync(
            weight === "SemiBold"
              ? resolve(dir, "../../../web/app/fonts/Alcyone-SemiBold.woff2")
              : resolve(dir, `Alcyone-${weight}.ttf`),
          ),
        );
        fonts.set(weight, font);
      }
      const text = decode(content),
        run = font.layout(text),
        size = Number(attr("font-size") || 26),
        scale = size / font.unitsPerEm,
        spacing = Number(attr("letter-spacing") || 0),
        width =
          run.positions.reduce((a: number, p: any) => a + p.xAdvance, 0) *
            scale +
          run.glyphs.length * spacing,
        desired = Number(attr("textLength") || width),
        sx = width ? desired / width : 1;
      let cursor = 0;
      const paths = run.glyphs
        .map((g: any, i: number) => {
          const p = run.positions[i],
            x = cursor + p.xOffset;
          cursor += p.xAdvance + spacing / scale;
          return `<path transform="translate(${x} ${-p.yOffset})" d="${g.path.toSVG()}"/>`;
        })
        .join("");
      const anchor = attr("text-anchor"),
        x =
          Number(attr("x") || 0) -
          (anchor === "middle" ? desired / 2 : anchor === "end" ? desired : 0),
        y = Number(attr("y") || 0);
      return `<g fill="${attr("fill") || "#111318"}" transform="translate(${x} ${y}) scale(${scale * sx} ${-scale})">${paths}</g>`;
    },
  );
}
