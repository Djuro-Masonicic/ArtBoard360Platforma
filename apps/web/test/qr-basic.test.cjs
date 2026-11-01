const { test, before } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { createHash } = require("node:crypto");
const { renderCard, cardTemplates } = require("@artboard/qr-card-renderer"),
  QRCode = require("qrcode"),
  sharp = require("node:module").createRequire(
    path.resolve(__dirname, "../../api/package.json"),
  )("sharp");
const root = path.resolve(__dirname, "../../.."),
  out = path.join(root, ".tmp/qr-basic");
fs.mkdirSync(out, { recursive: true });
const profileUrl = "https://artboard.example/umjetnik/ivona-medenica";
const config = {
  name: "Ivona Medenica",
  contacts: {
    email: "medenica.ivona@yahoo.com",
    phone: "+382 67 123 456",
    instagram: "https://instagram.com/ivonamedenica",
    behance: "https://behance.net/ivonamedenica",
  },
  selectedContacts: ["email", "phone", "instagram"],
  imageId: "cover",
  templateId: "basic",
  variant: "standard",
  cardColor: "light",
  language: "ME",
  backTitle: "profile",
};
let model, generator;
before(async () => {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
    R2_ACCOUNT_ID: "unused",
    R2_ACCESS_KEY_ID: "unused",
    R2_SECRET_ACCESS_KEY: "unused",
    R2_BUCKET_NAME: "unused",
    R2_PUBLIC_URL: "https://storage.invalid",
    RESEND_API_KEY: "",
  });
  require("ts-node").register({
    project: path.join(root, "apps/api/tsconfig.json"),
    transpileOnly: true,
  });
  require("reflect-metadata");
  const image = await sharp({
    create: { width: 800, height: 500, channels: 3, background: "#f1785b" },
  })
    .png()
    .toBuffer();
  model = {
    config,
    profileUrl,
    avatar: `data:image/png;base64,${image.toString("base64")}`,
    cover: `data:image/png;base64,${image.toString("base64")}`,
    qrSvg: await QRCode.toString(profileUrl, {
      type: "svg",
      margin: 4,
      errorCorrectionLevel: "M",
    }),
  };
  const {
    QrCardGenerator,
  } = require("../../api/src/modules/qr-cards/qr-card.generator");
  generator = new QrCardGenerator({
    readQrSourceImage: async (value) => value,
  });
});
test("All six supplied designs are final", () => {
  assert.equal(cardTemplates.find((t) => t.id === "basic").provisional, false);
  assert.equal(cardTemplates.length, 6);
  assert(cardTemplates.every((t) => !t.provisional));
});
test("All five preceding designs retain their approved SVG outputs", () => {
  const expected = require("./fixtures/qr-unchanged-render-hashes.json"),
    base = {
      name: "Renderer regression",
      contacts: {
        email: "test@example.invalid",
        phone: "+382 67 123456",
        instagram: "https://instagram.com/test",
        behance: "",
      },
      selectedContacts: ["email", "phone", "instagram"],
      imageId: "cover",
      templateId: "classic",
      variant: "standard",
      cardColor: "light",
      language: "ME",
      backTitle: "profile",
    };
  for (const [key, hash] of Object.entries(expected)) {
    const [templateId, variant, cardColor, side] = key.split("/"),
      markup = renderCard(
        {
          config: { ...base, templateId, variant, cardColor },
          profileUrl: "https://artboard.example/umjetnik/test",
          cover: "https://storage.invalid/cover.png",
          avatar: "https://storage.invalid/avatar.png",
          qrSvg: '<svg viewBox="0 0 21 21"><path d="M0 0h21v21H0z"/></svg>',
        },
        side,
      );
    assert.equal(createHash("sha256").update(markup).digest("hex"), hash, key);
  }
});
test("Basic front follows the supplied millimetre dimensions without a decorative trim line", () => {
  const trim = renderCard(model, "front"),
    proof = renderCard(model, "front", { mode: "bleed", guides: true });
  assert(trim.includes('viewBox="30 30 850 550"'));
  assert(proof.includes('viewBox="0 0 910 610"'));
  assert(trim.includes('height="365"'));
  assert(trim.includes('x="90" y="300" width="130" height="130"'));
  assert(trim.includes('x="260" y="416" width="2.5" height="104"'));
  assert(!trim.includes('data-basic="trim-guide"'));
  assert(proof.includes('data-basic="trim-guide"'));
  assert(trim.includes("UMJETNIČKA KARTICA"));
  assert(!trim.includes("Na ArtBoardu"));
});
test("Basic branded positions the fine cover band, colored dividers and rear footer band exactly", () => {
  const branded = { ...model, config: { ...config, variant: "branded" } };
  const front = renderCard(branded, "front"),
    back = renderCard(branded, "back", { mode: "bleed" });
  assert(front.includes('y="359" width="910" height="6"'));
  assert(front.includes('x="260" y="416" width="4"'));
  assert(back.includes('y="564" width="910" height="46"'));
  assert(back.includes('x="380" y="240" width="4"'));
  assert(!back.includes("trim-guide"));
});
test("Basic back honors selected contacts, social handles, English and the portfolio title", () => {
  const markup = renderCard(
    {
      ...model,
      config: {
        ...config,
        language: "EN",
        backTitle: "portfolio",
        selectedContacts: ["behance", "email"],
      },
    },
    "back",
  );
  assert(markup.includes("View my"));
  assert(markup.includes("Portfolio"));
  assert(markup.includes("ARTIST CARD"));
  assert(markup.includes("SCAN"));
  assert(markup.includes("behance.net/ivonamedenica"));
  assert(!markup.includes("+382"));
  assert(!markup.includes("@ivonamedenica"));
});
test("Long real data remains escaped, fitted and complete", () => {
  const email = "a".repeat(110) + "@example.com",
    markup = renderCard(
      {
        ...model,
        config: {
          ...config,
          name: "<script>&".repeat(8),
          contacts: { ...config.contacts, email },
        },
      },
      "back",
    );
  assert(!markup.includes("<script>"));
  const values = Array.from(
    markup.matchAll(/data-basic="contact-text"[^>]*>(.*?)<\/text>/g),
  )
    .map((m) => m[1])
    .join("");
  assert(values.includes(email));
  const front = renderCard(
    { ...model, config: { ...config, name: "Žćđ ".repeat(20) } },
    "front",
  );
  assert(front.includes('lengthAdjust="spacingAndGlyphs"'));
  assert(front.includes("Žćđ ".repeat(20)));
});
const artboard = (patch = {}) => ({
  ...model,
  config: { ...config, templateId: "artboard", ...patch },
});
test("ArtBoard is final and its photographic front is identical for both back colors", () => {
  assert.equal(
    cardTemplates.find((t) => t.id === "artboard").provisional,
    false,
  );
  for (const variant of ["standard", "branded"]) {
    assert.equal(
      renderCard(artboard({ variant, cardColor: "light" }), "front", {
        mode: "bleed",
        guides: true,
      }),
      renderCard(artboard({ variant, cardColor: "dark" }), "front", {
        mode: "bleed",
        guides: true,
      }),
    );
  }
});
test("ArtBoard standard matches full-photo opacity and centered avatar with no back divider", () => {
  const front = renderCard(artboard(), "front"),
    back = renderCard(artboard(), "back");
  assert(front.includes('data-artboard="cover" opacity=".5"'));
  assert(front.includes('cx="455" cy="241.8"'));
  assert(front.includes('width="160" height="160"'));
  assert(front.includes('font-size="66"'));
  assert(front.includes("ARTBOARD UMJETNIČKA KARTICA"));
  assert(!back.includes('data-artboard="divider"'));
  assert(back.includes('x="380" y="274.2"'));
  assert(!back.includes('data-artboard="back-brand-band"'));
});
test("ArtBoard Branded keeps the reference ring, underline, edge band and rear divider", () => {
  const front = renderCard(artboard({ variant: "branded" }), "front", {
      mode: "bleed",
    }),
    back = renderCard(artboard({ variant: "branded" }), "back");
  assert(front.includes('cx="455" cy="227.8"'));
  assert(front.includes('stroke="url(#artboard-ring)" stroke-width="3"'));
  assert(front.includes('x="395" y="470.2" width="120" height="4"'));
  assert(front.includes('y="604" width="910" height="6"'));
  assert(back.includes('x="380" y="240" width="4" height="240"'));
  assert(back.includes('y="564" width="910" height="46"'));
});
test("ArtBoard uses real selected contacts, localized titles and safely fitted long names", () => {
  const config = {
    language: "EN",
    backTitle: "portfolio",
    selectedContacts: ["behance"],
  };
  const back = renderCard(artboard(config), "back");
  assert(back.includes("View my"));
  assert(back.includes("Portfolio"));
  assert(back.includes("ARTIST CARD"));
  assert(back.includes("behance.net/ivonamedenica"));
  assert(!back.includes("medenica.ivona@yahoo.com"));
  const front = renderCard(
    artboard({ name: "<script>&".repeat(8), language: "EN" }),
    "front",
  );
  assert(!front.includes("<script>"));
  assert(front.includes('lengthAdjust="spacingAndGlyphs"'));
  assert(front.includes("ARTBOARD ARTIST CARD"));
});
test("ArtBoard print guides stay out of downloadable artwork and unsafe images stay out of SVG", () => {
  const model = {
    ...artboard(),
    cover: "javascript:alert(1)",
    avatar: '<svg onload="alert(1)">',
  };
  for (const side of ["front", "back"]) {
    const trim = renderCard(model, side),
      proof = renderCard(model, side, { mode: "bleed", guides: true });
    assert(trim.includes('viewBox="30 30 850 550"'));
    assert(!trim.includes("trim-guide"));
    assert(proof.includes('data-artboard="trim-guide"'));
    assert(!proof.includes("javascript:"));
    assert(!proof.includes("onload="));
  }
});
const classic = (patch = {}) => ({
  ...model,
  config: { ...config, templateId: "classic", ...patch },
});
test("Classic is final and follows the cover, bottom inset and typography reference without an avatar", () => {
  assert.equal(
    cardTemplates.find((t) => t.id === "classic").provisional,
    false,
  );
  const unusedAvatar = "https://storage.invalid/unused-avatar.png";
  const svg = renderCard({ ...classic(), avatar: unusedAvatar }, "front");
  assert(svg.includes('width="910" height="365"'));
  assert(svg.includes('x="90" y="431.75" font-size="17"'));
  assert(svg.includes('x="90" y="509.8" font-size="68"'));
  assert(svg.includes('letter-spacing="-2.04"'));
  assert(svg.includes("ARTBOARD UMJETNIČKA KARTICA"));
  assert(!svg.includes(unusedAvatar));
  assert.equal((svg.match(/<image /g) || []).length, 1);
  assert(svg.includes('fill="#f7f7fa"'));
  assert(
    renderCard(classic({ cardColor: "dark" }), "front").includes(
      'fill="#ffffff"',
    ),
  );
});
test("Classic Branded has the reference fine cover band and rear footer with no divider in either variant", () => {
  const standard = renderCard(classic(), "front"),
    branded = renderCard(classic({ variant: "branded" }), "front");
  assert(!standard.includes('data-classic="front-brand-band"'));
  assert(branded.includes('y="359" width="910" height="6"'));
  for (const variant of ["standard", "branded"]) {
    const back = renderCard(classic({ variant }), "back");
    assert(!back.includes('data-classic="divider"'));
    assert(back.includes('x="380" y="274.2"'));
    assert.equal(
      back.includes('data-classic="back-brand-band"'),
      variant === "branded",
    );
  }
});
test("Classic fits escaped long names and uses localized real selected contacts", () => {
  const front = renderCard(
    classic({ name: "<script>&".repeat(8), language: "EN" }),
    "front",
  );
  assert(!front.includes("<script>"));
  assert(front.includes('lengthAdjust="spacingAndGlyphs"'));
  assert(front.includes("ARTBOARD ARTIST CARD"));
  const back = renderCard(
    classic({
      language: "EN",
      backTitle: "portfolio",
      selectedContacts: ["behance"],
    }),
    "back",
  );
  assert(back.includes("View my"));
  assert(back.includes("Portfolio"));
  assert(back.includes("behance.net/ivonamedenica"));
  assert(!back.includes("medenica.ivona@yahoo.com"));
  assert(!renderCard(classic(), "front").includes("trim-guide"));
  assert(
    renderCard(classic(), "front", { mode: "bleed", guides: true }).includes(
      'data-classic="trim-guide"',
    ),
  );
});
test("Classic generation only reads its cover, never the unused avatar", async () => {
  const {
    QrCardGenerator,
  } = require("../../api/src/modules/qr-cards/qr-card.generator");
  const reads = [];
  await new QrCardGenerator({
    readQrSourceImage: async (value) => {
      reads.push(value);
      return model.cover;
    },
  }).generate({
    ...classic(),
    avatar: "https://storage.invalid/unused-avatar.png",
    cover: "https://storage.invalid/own-cover.png",
  });
  assert.deepEqual(reads, ["https://storage.invalid/own-cover.png"]);
});
const clean = (templateId = "no-cover", patch = {}) => ({
  ...model,
  config: { ...config, templateId, ...patch },
});
test("Clean/Profilna keep legacy draft IDs and declare exactly their supported assets/variants", () => {
  const {
    usesAvatar,
    usesCover,
    supportsBranded,
  } = require("@artboard/qr-card-renderer");
  assert.equal(cardTemplates.find((t) => t.id === "no-cover").label, "Clean");
  assert.equal(
    cardTemplates.find((t) => t.id === "portrait").label,
    "Profilna",
  );
  for (const id of ["no-cover", "portrait"]) {
    assert.equal(usesCover(id), false);
    assert.equal(supportsBranded(id), false);
  }
  assert.equal(usesAvatar("no-cover"), false);
  assert.equal(usesAvatar("portrait"), true);
});
test("Clean uses the 5 mm logo and 7.6 mm name with no cover or avatar", () => {
  const svg = renderCard(
    {
      ...clean(),
      avatar: "https://storage.invalid/unused-avatar.png",
      cover: "https://storage.invalid/unused-cover.png",
    },
    "front",
  );
  assert(svg.includes('width="230.3875" height="50"'));
  assert(svg.includes('x="90" y="508.6" font-size="76"'));
  assert(svg.includes('x="90" y="423" font-size="20"'));
  assert(!svg.includes("unused-avatar.png"));
  assert(!svg.includes("unused-cover.png"));
  assert(!svg.includes("<image "));
});
test("Profilna displays the 14 mm own avatar and 6.6 mm name without a cover", () => {
  const svg = renderCard(
    {
      ...clean("portrait"),
      avatar: "https://storage.invalid/own-avatar.png",
      cover: "https://storage.invalid/unused-cover.png",
    },
    "front",
  );
  assert(svg.includes('x="90" y="380" width="140" height="140"'));
  assert(svg.includes('x="265" y="493.1" font-size="66"'));
  assert(svg.includes("own-avatar.png"));
  assert(!svg.includes("unused-cover.png"));
});
test("Clean/Profilna share the centered 25 mm QR back without decorations, including old branded drafts", () => {
  for (const id of ["no-cover", "portrait"]) {
    const normal = renderCard(clean(id), "back"),
      legacy = renderCard(clean(id, { variant: "branded" }), "back");
    assert.equal(normal, legacy);
    assert(normal.includes('x="100" y="174" width="250" height="250"'));
    assert(normal.includes('x="400" y="217.8" font-size="42"'));
    assert(!normal.includes('="logo"'));
    assert(!normal.includes('="back-brand-band"'));
    assert(!normal.includes('="divider"'));
    assert(!normal.includes("trim-guide"));
    assert(
      renderCard(clean(id), "back", { mode: "bleed", guides: true }).includes(
        '="trim-guide"',
      ),
    );
    const back = renderCard(
      clean(id, {
        language: "EN",
        backTitle: "portfolio",
        selectedContacts: ["behance"],
      }),
      "back",
    );
    assert(back.includes("View my"));
    assert(back.includes("Portfolio"));
    assert(back.includes("behance.net/ivonamedenica"));
    assert(!back.includes("medenica.ivona@yahoo.com"));
    const name = renderCard(
      clean(id, { name: "<script>&".repeat(8) }),
      "front",
    );
    assert(!name.includes("<script>"));
    assert(name.includes('lengthAdjust="spacingAndGlyphs"'));
  }
});
test("Clean export reads no user image; Profilna reads only the profile avatar", async () => {
  const {
    QrCardGenerator,
  } = require("../../api/src/modules/qr-cards/qr-card.generator");
  for (const id of ["no-cover", "portrait"]) {
    const reads = [];
    await new QrCardGenerator({
      readQrSourceImage: async (value) => {
        reads.push(value);
        return model.avatar;
      },
    }).generate({
      ...clean(id),
      avatar: "https://storage.invalid/own-avatar.png",
      cover: "https://storage.invalid/unused-cover.png",
    });
    assert.deepEqual(
      reads,
      id === "portrait" ? ["https://storage.invalid/own-avatar.png"] : [],
    );
  }
});
const portret = (patch = {}) => ({
  ...model,
  config: { ...config, templateId: "portrait-artwork", ...patch },
});
test("Portret and Profilna remain distinct choices with different image and variant capabilities", () => {
  const {
    usesCover,
    usesAvatar,
    supportsBranded,
  } = require("@artboard/qr-card-renderer");
  assert.equal(
    cardTemplates.find((t) => t.id === "portrait-artwork").label,
    "Portret",
  );
  assert.equal(
    cardTemplates.find((t) => t.id === "portrait").label,
    "Profilna",
  );
  assert(usesCover("portrait-artwork"));
  assert(!usesAvatar("portrait-artwork"));
  assert(supportsBranded("portrait-artwork"));
});
test("Portret matches the 38 mm side image and naturally wraps the name in its 39 mm group", () => {
  const svg = renderCard(portret(), "front");
  assert(svg.includes('x="530" y="0" width="380" height="610"'));
  assert(svg.includes('x="90" y="355.6" width="2.5" height="164.4"'));
  const names = [
    ...svg.matchAll(/data-portret="name-line"[^>]*>(.*?)<\/text>/g),
  ].map((m) => m[1]);
  assert.deepEqual(names, ["Ivona", "Medenica"]);
  assert(!svg.includes('data-portret="photo-divider"'));
  assert(!svg.includes("trim-guide"));
});
test("Portret Branded has exact picture/text dividers and branded back; standard back has no divider", () => {
  const front = renderCard(portret({ variant: "branded" }), "front"),
    back = renderCard(portret({ variant: "branded" }), "back");
  assert(front.includes('x="524" width="6" height="610"'));
  assert(front.includes('x="90" y="355.6" width="4" height="164.4"'));
  assert(back.includes('x="380" y="240" width="4" height="240"'));
  assert(back.includes('y="564" width="910" height="46"'));
  assert(!renderCard(portret(), "back").includes('data-portret="divider"'));
});
test("Portret preserves complete long escaped names within its left column and localizes real contacts", () => {
  const {
    measureText,
  } = require("../../../packages/qr-card-renderer/physical.cjs");
  const value = "Ž" + "W".repeat(79),
    svg = renderCard(portret({ name: value }), "front");
  const lines = [
    ...svg.matchAll(
      /data-portret="name-line" x="([^"]+)" y="([^"]+)" font-size="([^"]+)"[^>]*>(.*?)<\/text>/g,
    ),
  ];
  assert.equal(lines.map((m) => m[4]).join(""), value);
  for (const m of lines) {
    const x = Number(m[1]),
      y = Number(m[2]),
      size = Number(m[3]);
    assert(y > 90 && y < 520);
    assert(x + measureText(m[4], size, "Bold", -size * 0.03) <= 480.01);
  }
  const escaped = renderCard(
    portret({ name: "<script>&", language: "EN" }),
    "front",
  );
  assert(!escaped.includes("<script>"));
  assert(escaped.includes("ARTIST CARD"));
  const back = renderCard(
    portret({
      language: "EN",
      backTitle: "portfolio",
      selectedContacts: ["behance"],
    }),
    "back",
  );
  assert(back.includes("View my"));
  assert(back.includes("behance.net/ivonamedenica"));
  assert(!back.includes("medenica.ivona@yahoo.com"));
});
test("Portret generation reads only its chosen artwork, never the profile avatar", async () => {
  const {
    QrCardGenerator,
  } = require("../../api/src/modules/qr-cards/qr-card.generator");
  const reads = [];
  await new QrCardGenerator({
    readQrSourceImage: async (value) => {
      reads.push(value);
      return model.cover;
    },
  }).generate({
    ...portret(),
    cover: "https://storage.invalid/own-work.png",
    avatar: "https://storage.invalid/unused-avatar.png",
  });
  assert.deepEqual(reads, ["https://storage.invalid/own-work.png"]);
});
for (const templateId of [
  "basic",
  "artboard",
  "classic",
  "no-cover",
  "portrait",
  "portrait-artwork",
])
  for (const cardColor of ["light", "dark"])
    for (const variant of ["standard", "branded"])
      test(`${templateId} ${cardColor}/${variant}: real PNGs and print PDF both decode with physical trim/bleed geometry`, async () => {
        const files = await generator.generate({
            ...model,
            config: { ...config, templateId, cardColor, variant },
          }),
          name = `${templateId}-${cardColor}-${variant}`;
        for (const side of ["front", "back"]) {
          const metadata = await sharp(files[side]).metadata();
          assert.equal(metadata.width, 1004);
          assert.equal(metadata.height, 650);
          assert.equal(metadata.density, 300);
          fs.writeFileSync(path.join(out, `${name}-${side}.png`), files[side]);
        }
        const raw = await sharp(files.back)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        assert.equal(
          require("jsqr")(
            new Uint8ClampedArray(raw.data),
            raw.info.width,
            raw.info.height,
          )?.data,
          profileUrl,
        );
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs"),
          task = pdfjs.getDocument({ data: new Uint8Array(files.pdf) }),
          pdf = await task.promise;
        assert.equal(pdf.numPages, 2);
        const page = await pdf.getPage(2),
          viewport = page.getViewport({ scale: 300 / 72 }),
          canvas = require("@napi-rs/canvas").createCanvas(
            Math.ceil(viewport.width),
            Math.ceil(viewport.height),
          ),
          context = canvas.getContext("2d");
        await page.render({ canvasContext: context, viewport }).promise;
        assert(Math.abs(page.view[2] - (91 * 72) / 25.4) < 0.001);
        assert(Math.abs(page.view[3] - (61 * 72) / 25.4) < 0.001);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        assert.equal(
          require("jsqr")(image.data, canvas.width, canvas.height)?.data,
          profileUrl,
          "Actual printed PDF QR",
        );
        fs.writeFileSync(path.join(out, `${name}.pdf`), files.pdf);
        fs.writeFileSync(
          path.join(out, `${name}-pdf-back.png`),
          canvas.toBuffer("image/png"),
        );
        await task.destroy();
      });
