const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { chromium } = require("@playwright/test"),
  QRCode = require("qrcode");
const { renderCard } = require("@artboard/qr-card-renderer"),
  root = path.resolve(__dirname, "../../.."),
  out = path.join(root, `.tmp/qr-${process.argv[2] || "basic"}`),
  sharp = require("node:module").createRequire(
    path.join(root, "apps/api/package.json"),
  )("sharp");
const template = process.argv[2] || "basic";
assert(["basic", "artboard", "classic", "clean", "portret"].includes(template));
let browser;
const checks = [],
  metrics = [];
const check = (name, condition = true) => {
  assert(condition, name);
  checks.push(name);
};
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const data = (body) => "data:image/png;base64," + body.toString("base64");
  const cover = data(
    await sharp(
      Buffer.from(
        '<svg width="1200" height="700" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop stop-color="#ffa01c"/><stop offset=".5" stop-color="#dc4d78"/><stop offset="1" stop-color="#6141db"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><path d="M-80 650Q800 -170 1290 300M-50 800Q900 0 1250 410" fill="none" stroke="#eee8ff" opacity=".5" stroke-width="70"/></svg>',
      ),
    )
      .png()
      .toBuffer(),
  );
  const avatar = data(
    await sharp(
      Buffer.from(
        '<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#257ddd"/><circle cx="150" cy="135" r="80" fill="#f1c39f"/><path d="M20 300Q150 120 280 300" fill="#211e48"/></svg>',
      ),
    )
      .png()
      .toBuffer(),
  );
  const fonts = ["Regular", "SemiBold", "Bold"]
    .map(
      (weight, i) =>
        `@font-face{font-family:Alcyone;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(root, `apps/web/app/fonts/Alcyone-${weight}.woff2`)).toString("base64")});font-weight:${[400, 600, "700 900"][i]};font-style:normal}`,
    )
    .join("");
  const lightLogo =
      "data:image/svg+xml;base64," +
      fs
        .readFileSync(
          path.join(
            root,
            "apps/web/public/artboard-logo/ArtBoard-Horizontal-Gradient.svg",
          ),
        )
        .toString("base64"),
    darkLogo =
      "data:image/svg+xml;base64," +
      fs
        .readFileSync(
          path.join(
            root,
            "apps/web/public/artboard-logo/ArtBoard-Horizontal-Gradient-Mark-White-Text.svg",
          ),
        )
        .toString("base64");
  const profileUrl = "https://artboard.example/umjetnik/ivona-medenica",
    qrSvg = await QRCode.toString(profileUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 4,
    });
  const config = {
    name: "Ivona Medenica",
    contacts: {
      email: "medenica.ivona@yahoo.com",
      phone: "+382 6X XXX XXX",
      instagram: "https://instagram.com/ivonamedenica",
      behance: "",
    },
    selectedContacts: ["email", "phone", "instagram"],
    imageId: "cover",
    templateId:
      template === "clean"
        ? "no-cover"
        : template === "portret"
          ? "portrait-artwork"
          : template,
    variant: "standard",
    cardColor: "light",
    language: "ME",
    backTitle: "profile",
  };
  let source = fs.readFileSync(
    path.join(
      root,
      `apps/web/references/qr-${template}-artifact-${["clean", "portret"].includes(template) ? "20261031" : "20261030"}.html`,
    ),
    "utf8",
  );
  for (const [id, url] of [
    ["f376579fe8001819cf23d50278f14066", cover],
    ["f140bab180aef32dc73a9a443055250e", cover],
    ["886e932ca386cc07ced78bcc5501e3ce", avatar],
    ["143ff17c5f9ae0ed1627f0fb073990b4", lightLogo],
    ["8c35515343916b5671fc6ee9ebe3f40c", darkLogo],
  ])
    source = source.replaceAll("/_blob/" + id, url);
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
      viewport: { width: 1000, height: 700 },
      deviceScaleFactor: 2,
    }),
    page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const style = `<style>${fonts}*{box-sizing:border-box}body{margin:0;background:#ddd;font-family:Alcyone,sans-serif}#comparison{display:grid;grid-template-columns:368px 368px;padding:24px}.sample{font-family:Alcyone,sans-serif;width:91mm;flex:0 0 91mm}#actual>svg{display:block;width:91mm;height:auto}#reference [data-card]{width:91mm!important;height:61mm!important}</style>`;
  await page.setContent(style + '<div id="source">' + source + "</div>");
  await page.evaluate(() => document.fonts.ready);
  const cases = await page.locator("[data-card]").evaluateAll((elements) =>
    elements.map((e) => ({
      id: e.getAttribute("data-card"),
      html: e.outerHTML,
    })),
  );
  assert.equal(cases.length, 8);
  for (const item of cases) {
    const [variant, cardColor, side] = item.id.split("-"),
      model = {
        config: {
          ...config,
          variant: ["1a", "2a", "2b", "3a", "5a"].includes(variant)
            ? "standard"
            : "branded",
          cardColor,
          ...(template === "clean"
            ? {
                templateId: variant === "4b" ? "portrait" : "no-cover",
                variant: "standard",
              }
            : {}),
        },
        profileUrl,
        avatar,
        cover,
        qrSvg,
      };
    const actual = renderCard(model, side, { mode: "bleed", guides: true });
    await page.setContent(
      style +
        `<div id="comparison"><div id="reference" class="sample">${item.html}</div><div id="actual" class="sample">${actual}</div></div>`,
    );
    await page.evaluate(() => document.fonts.ready);
    // Compare the actual destination QR on both renderers; the source's demo QR
    // is not used by production code or mistaken for the authenticated QR.
    if (side === "back")
      await page.evaluate(
        ({ qrSvg, cardColor }) => {
          const source = document.querySelector(
              '#reference [shape-rendering="crispEdges"]',
            ),
            parsed = new DOMParser().parseFromString(
              qrSvg,
              "image/svg+xml",
            ).documentElement;
          source.setAttribute("viewBox", parsed.getAttribute("viewBox"));
          source.innerHTML = parsed.innerHTML
            .replace(/#ffffff/gi, cardColor === "dark" ? "#0b0c12" : "#f7f7fa")
            .replace(/#000000/gi, cardColor === "dark" ? "#ffffff" : "#0b0c12");
        },
        { qrSvg, cardColor },
      );
    await page
      .locator("#reference img")
      .evaluateAll((images) =>
        Promise.all(images.map((i) => i.decode().catch(() => {}))),
      );
    await page.locator("#actual image").evaluateAll((images) =>
      Promise.all(
        images.map(
          (i) =>
            new Promise((r) => {
              const image = new Image();
              image.onload = image.onerror = r;
              image.src = i.getAttribute("href");
            }),
        ),
      ),
    );
    const geometry = await page.evaluate(
      ({ side, template }) => {
        const ref = document.querySelector("#reference"),
          act = document.querySelector("#actual"),
          relative = (node, host, text = false) => {
            const parent = host.getBoundingClientRect();
            let b;
            if (text) {
              const range = document.createRange();
              range.selectNodeContents(node);
              b = range.getBoundingClientRect();
            } else b = node.getBoundingClientRect();
            return {
              x: b.x - parent.x,
              y: b.y - parent.y,
              width: b.width,
              height: b.height,
            };
          },
          findFont = (size) =>
            [...ref.querySelectorAll("[style]")]
              .find((e) => e.style.fontSize === size)
              ?.querySelector(".sc-interp");
        const family =
          template === "clean"
            ? document
                .querySelector("#reference [data-card]")
                .dataset.card.startsWith("4b")
              ? "profile"
              : "clean"
            : template;
        const pairs =
          template === "portret" && side === "front"
            ? {
                cover: [
                  ref.querySelector("img"),
                  act.querySelector('image[width="380"]'),
                ],
                name: [
                  findFont("6.4mm"),
                  act.querySelector('[data-portret="name"]'),
                ],
                caption: [
                  findFont("1.7mm"),
                  act.querySelector('[data-portret="front-caption"]'),
                ],
                divider: [
                  ref.querySelector(
                    'div[style*="width: 0.25mm"],div[style*="width: 0.4mm"]',
                  ),
                  act.querySelector('[data-portret="divider"]'),
                ],
              }
            : template === "clean"
              ? side === "front"
                ? {
                    logo: [
                      ref.querySelector('img[alt="ArtBoard"]'),
                      act.querySelector(`[data-${family}="logo"]`),
                    ],
                    ...(family === "profile"
                      ? {
                          avatar: [
                            ref.querySelector('img[style*="14mm"]'),
                            act.querySelector('image[width="140"]'),
                          ],
                        }
                      : {}),
                    name: [
                      findFont(family === "profile" ? "6.6mm" : "7.6mm"),
                      act.querySelector(`[data-${family}="name"]`),
                    ],
                    caption: [
                      findFont("2mm"),
                      act.querySelector(`[data-${family}="front-caption"]`),
                    ],
                  }
                : {
                    qr: [
                      ref.querySelector('[shape-rendering="crispEdges"]'),
                      act.querySelector(`[data-${family}="qr"]`),
                    ],
                    scan: [
                      findFont("2mm"),
                      act.querySelector(`[data-${family}="scan"]`),
                    ],
                    icon: [
                      ref.querySelector('[viewBox="0 0 24 24"] rect'),
                      act.querySelector(`[data-${family}="contact-icon"] rect`),
                    ],
                  }
              : side === "front"
                ? {
                    ...(template === "classic"
                      ? {
                          cover: [
                            ref.querySelector("img"),
                            act.querySelector('image[height="365"]'),
                          ],
                        }
                      : {
                          avatar: [
                            template === "basic"
                              ? ref.querySelector('img[style*="13mm"]')
                              : (() => {
                                  const image =
                                    ref.querySelector('img[style*="16mm"]');
                                  return image.style.position === "absolute"
                                    ? image.parentElement
                                    : image;
                                })(),
                            act.querySelector(
                              template === "basic"
                                ? 'image[x="90"]'
                                : '[data-artboard="avatar"]',
                            ),
                          ],
                        }),
                    name: [
                      findFont(
                        template === "basic"
                          ? "6.4mm"
                          : template === "classic"
                            ? "6.8mm"
                            : "6.6mm",
                      ),
                      act.querySelector("[data-" + family + '="name"]'),
                    ],
                    caption: [
                      findFont(template === "basic" ? "2mm" : "1.7mm"),
                      act.querySelector(
                        "[data-" + family + '="front-caption"]',
                      ),
                    ],
                  }
                : {
                    logo: [
                      ref.querySelector("img"),
                      act.querySelector("[data-" + family + '="logo"]'),
                    ],
                    qr: [
                      ref.querySelector('[shape-rendering="crispEdges"]'),
                      act.querySelector("[data-" + family + '="qr"]'),
                    ],
                    caption: [
                      findFont("1.7mm"),
                      act.querySelector("[data-" + family + '="back-caption"]'),
                    ],
                    scan: [
                      findFont("2mm"),
                      act.querySelector("[data-" + family + '="scan"]'),
                    ],
                  };
        return Object.fromEntries(
          Object.entries(pairs).map(([key, [a, b]]) => [
            key,
            {
              reference: relative(
                a,
                ref,
                ["name", "caption", "scan"].includes(key),
              ),
              actual: relative(b, act),
            },
          ]),
        );
      },
      { side, template },
    );
    metrics.push({ id: item.id, geometry });
    for (const [name, box] of Object.entries(geometry))
      for (const dim of ["x", "y", "width", "height"])
        assert(
          Math.abs(box.reference[dim] - box.actual[dim]) <
            (name === "caption"
              ? ["y", "height"].includes(dim)
                ? 3
                : 1.2
              : template === "classic" && name === "name" && dim === "y"
                ? 1
                : 0.8),
          `${item.id} ${name}.${dim}: ${box.reference[dim]} vs ${box.actual[dim]}`,
        );
    const reference = await page.locator("#reference").screenshot(),
      result = await page.locator("#actual").screenshot();
    fs.writeFileSync(path.join(out, item.id + "-reference.png"), reference);
    fs.writeFileSync(path.join(out, item.id + "-actual.png"), result);
    await page
      .locator("#comparison")
      .screenshot({ path: path.join(out, item.id + "-comparison.png") });
    const a = await sharp(reference)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
      b = await sharp(result)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
      w = Math.min(a.info.width, b.info.width),
      h = Math.min(a.info.height, b.info.height);
    let difference = 0,
      samples = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const qr = geometry.qr?.reference;
        if (
          qr &&
          x >= (qr.x - 2) * 2 &&
          x <= (qr.x + qr.width + 2) * 2 &&
          y >= (qr.y - 2) * 2 &&
          y <= (qr.y + qr.height + 2) * 2
        )
          continue;
        for (let c = 0; c < 3; c++) {
          difference += Math.abs(
            a.data[(y * a.info.width + x) * 4 + c] -
              b.data[(y * b.info.width + x) * 4 + c],
          );
          samples++;
        }
      }
    const mae = difference / samples;
    metrics[metrics.length - 1].meanPixelDifference = mae;
    assert(mae < 5, `${item.id} visual difference ${mae}`);
    check(`${item.id}: supplied HTML geometry and raster comparison`);
  }
  assert.equal(errors.length, 0);
  check("No browser runtime errors");
  fs.writeFileSync(
    path.join(out, "visual-results.json"),
    JSON.stringify({ checks, metrics, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      passed: checks.length,
      metrics: metrics.map((m) => ({
        id: m.id,
        meanPixelDifference: m.meanPixelDifference,
      })),
    }),
  );
})()
  .catch((e) => {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, "visual-failure.json"),
      JSON.stringify({ error: e.stack, checks, metrics }, null, 2),
    );
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => browser?.close());
