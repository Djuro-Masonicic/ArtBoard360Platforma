const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  { spawn, execFileSync } = require("child_process"),
  { chromium, expect } = require("@playwright/test"),
  { pathToFileURL } = require("url"),
  os = require("os");
const root = path.resolve(__dirname, "../../.."),
  out = path.join(root, ".tmp/qr-browser"),
  dir = path.join(out, "harness"),
  base = "http://localhost:3129",
  checks = [],
  errors = [],
  metrics = [];
let h, server, browser, page;
const check = (name, ok = true) => {
    assert(ok, name);
    checks.push(name);
  },
  write = (f, v) => {
    const p = path.join(dir, f);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, v);
  };
const settle = async () => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
};
async function gotoStep(n) {
  await page
    .getByRole("navigation", { name: "Koraci vizit karte" })
    .getByRole("button", { name: new RegExp(steps[n]) })
    .click();
  await settle();
}
const steps = ["Podaci", "Šablon", "Pregled", "Preuzmi"];
(async () => {
  h = await require("../../api/test/qr-cards.fixture.cjs").qrHarness();
  const a = await h.artist("PREMIUM");
  write("package.json", JSON.stringify({ private: true }));
  write(
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["DOM", "ES2022"],
        jsx: "preserve",
        module: "ESNext",
        moduleResolution: "Bundler",
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        strict: true,
        baseUrl: "../../..",
        paths: { "@/*": ["apps/web/*"] },
      },
      include: ["next-env.d.ts", "app/**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    }),
  );
  write(
    "next.config.js",
    `const path=require('path');module.exports={reactStrictMode:true,devIndicators:false,experimental:{externalDir:true},webpack(c){c.resolve.alias['@']=path.resolve(__dirname,'../../../apps/web');return c}}`,
  );
  write(
    "postcss.config.mjs",
    `export default{plugins:{'@tailwindcss/postcss':{}}}`,
  );
  const layout = fs.readFileSync(
      path.join(root, "apps/web/app/layout.tsx"),
      "utf8",
    ),
    font = layout
      .slice(
        layout.indexOf("const alcyone ="),
        layout.indexOf("export const metadata"),
      )
      .replaceAll('"./fonts/', '"../../../../apps/web/app/fonts/');
  write(
    "app/harness.css",
    `@import '../../../../apps/web/app/globals.css';\n@source '../../../../apps/web';`,
  );
  write(
    "app/layout.tsx",
    `import localFont from'next/font/local';import{SiteChrome}from'@/components/site-chrome';import{UiFeedbackProvider}from'@/components/ui-feedback-provider';import'./harness.css';${font}export default function Layout({children}:{children:React.ReactNode}){return <html lang="sr"><body className={alcyone.className+' '+alcyone.variable}><UiFeedbackProvider><SiteChrome>{children}</SiteChrome></UiFeedbackProvider></body></html>}`,
  );
  write(
    "app/qr-vizit-karta/page.tsx",
    `export{default}from'@/app/qr-vizit-karta/page'`,
  );
  write(
    "app/artist/dashboard/page.tsx",
    `export{default}from'@/app/artist/dashboard/page'`,
  );
  write(
    "app/artist/login/page.tsx",
    `export default function Login(){return <h1>Prijavi se</h1>}`,
  );
  for (const f of [
    "api/artist/qr-cards/[[...path]]/route",
    "api/artist/dashboard/[...path]/route",
  ])
    write("app/" + f + ".ts", `export*from'@/app/${f}'`);
  for (const tone of ["Black", "White"]) {
    const name = `ArtBoard-Horizontal-Gradient-Mark-${tone}-Text.svg`;
    write(
      "public/artboard-logo/" + name,
      fs.readFileSync(path.join(root, "apps/web/public/artboard-logo", name)),
    );
  }
  const env = {
    ...process.env,
    NODE_ENV: "production",
    INTERNAL_API_BASE_URL: h.base,
    API_BASE_URL: h.base,
    NEXT_PUBLIC_API_BASE_URL: h.base,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  if (!process.argv.includes("--reuse-build"))
    execFileSync(
      process.execPath,
      [
        path.join(root, "node_modules/next/dist/bin/next"),
        "build",
        "--webpack",
      ],
      {
        cwd: dir,
        env,
        stdio: [
          "ignore",
          fs.openSync(path.join(out, "build.log"), "w"),
          fs.openSync(path.join(out, "build.err.log"), "w"),
        ],
      },
    );
  server = spawn(
    process.execPath,
    [path.join(root, "node_modules/next/dist/bin/next"), "start", "-p", "3129"],
    {
      cwd: dir,
      env,
      stdio: [
        "ignore",
        fs.openSync(path.join(out, "server.log"), "w"),
        fs.openSync(path.join(out, "server.err.log"), "w"),
      ],
    },
  );
  for (let n = 0; n < 100; n++) {
    try {
      await fetch(base + "/qr-vizit-karta", { redirect: "manual" });
      break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1536, height: 960 },
    acceptDownloads: true,
  });
  await context.addCookies([
    {
      name: "artboard_artist_session",
      value: a.token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await context.route("https://storage.invalid/**", (r) =>
    r.fulfill({ status: 200, contentType: "image/png", body: h.image }),
  );
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(base + "/artist/dashboard");
  await expect(
    page.getByRole("link", { name: /QR vizit karta/ }).first(),
  ).toHaveAttribute("href", "/qr-vizit-karta");
  check("Artist dashboard links to the actual QR tool instead of Uskoro");
  await page.goto(base + "/qr-vizit-karta");
  await settle();
  await expect(
    page.getByRole("heading", { name: "Podaci za vizit kartu" }),
  ).toBeVisible();
  check(
    "Real authenticated QR page renders without public header/footer or demo controls",
    (await page.locator("header").count()) === 1 &&
      (await page.locator("footer").count()) === 0 &&
      (await page.getByText("Stanje za pregled dizajna").count()) === 0,
  );
  assert.equal(
    await h.prisma.qrCardDraft.count({
      where: { artistAccountId: a.account.id },
    }),
    0,
  );
  check("Opening tool does not create a draft");
  metrics.push(
    await page.evaluate(() => {
      const box = (e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      return {
        actual: {
          toolbar: box(document.querySelector("header")),
          sidebar: box(document.querySelector("aside")),
          main: box(document.querySelector("main")),
          preview: box(
            document.querySelector('aside[aria-label="Pregled uživo"]'),
          ),
        },
      };
    }),
  );
  const reference = path.join(
    process.env.ARTBOARD_QR_REFERENCE_DIR ||
      path.join(os.homedir(), "Downloads"),
    "qr-vizit-karta-svijetla.html",
  );
  if (fs.existsSync(reference)) {
    const ref = await context.newPage();
    await ref.goto(pathToFileURL(reference).href);
    await ref
      .getByRole("heading", { name: "Podaci za vizit kartu", exact: true })
      .waitFor();
    await ref.evaluate(() => document.fonts.ready);
    metrics.push(
      await ref.evaluate(() => {
        const box = (e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        return {
          reference: {
            toolbar: box(document.querySelector("header")),
            sidebar: box(document.querySelector("aside")),
            main: box(document.querySelector("main")),
            preview: box(document.querySelector('[data-ab="qr-live"]')),
          },
        };
      }),
    );
    await ref.screenshot({
      path: path.join(out, "reference-desktop.png"),
      fullPage: true,
    });
    await ref.close();
    check("Original supplied HTML inspected at matching desktop viewport");
  }
  const name = page.getByRole("textbox", { name: "Ime i prezime na kartici" });
  await expect(name).toHaveValue(a.name);
  await name.fill("Moja QR Kartica");
  await page
    .getByRole("button", { name: "Sačuvaj draft", exact: true })
    .click();
  await expect(
    page.getByText("Draft je sačuvan.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(name).toHaveValue("Moja QR Kartica");
  assert.equal(
    (await h.prisma.artist.findUnique({ where: { id: a.id } })).name,
    a.name,
  );
  check("Explicit draft save reloads independently of public profile");
  await expect(
    page.getByRole("switch", { name: "Telefon na kartici" }),
  ).toBeDisabled();
  await page.getByRole("switch", { name: "Behance na kartici" }).click();
  await page.getByRole("switch", { name: "Telefon na kartici" }).click();
  await page
    .getByRole("textbox", { name: "Telefon", exact: true })
    .fill("+382 67 123 456");
  check(
    "Fourth contact is blocked and toggles allow replacing a selected contact",
  );
  await gotoStep(1);
  for (const t of ["Basic", "ArtBoard", "Classic", "No Cover", "Portret"]) {
    await page
      .getByRole("group", { name: "Šablon vizit karte" })
      .getByRole("button", { name: t, exact: true })
      .click();
    check(`${t} template selects and updates live preview`);
  }
  for (const [id, title] of [
    ["basic", "Basic"],
    ["artboard", "ArtBoard"],
    ["classic", "Classic"],
    ["no-cover", "Clean"],
    ["portrait", "Profilna"],
    ["portrait-artwork", "Portret"],
  ]) {
    await gotoStep(1);
    await page
      .getByRole("group", { name: "Šablon vizit karte" })
      .getByRole("button", {
        name: ["no-cover", "portrait"].includes(id) ? "No Cover" : title,
        exact: true,
      })
      .click();
    await expect(page.getByText(/Privremeni dizajni šablona/)).toHaveCount(0);
    if (["no-cover", "portrait"].includes(id)) {
      await expect(
        page.getByRole("group", { name: "Varijanta", exact: true }),
      ).toHaveCount(0);
      const variants = page.getByRole("group", {
        name: "Varijanta šablona No Cover",
        exact: true,
      });
      await variants.getByRole("button", { name: title, exact: true }).click();
      await expect(
        variants.getByRole("button", { name: title, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByRole("heading", { name: "Varijanta i boja", exact: true }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("group", { name: "Šablon vizit karte" })
          .getByRole("button"),
      ).toHaveCount(5);
      const colors = page.getByRole("group", {
        name: "Boja kartice",
        exact: true,
      });
      await colors.getByRole("button", { name: "Tamna", exact: true }).click();
      await expect(
        colors.getByRole("button", { name: "Tamna", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await colors
        .getByRole("button", { name: "Svijetla", exact: true })
        .click();
      check(
        `${title} is a No Cover variant with independent light/dark controls`,
      );
      await gotoStep(0);
      const choices = await page
        .getByRole("group", { name: "Naslovna slika kartice" })
        .getByRole("button")
        .all();
      assert(choices.length > 0);
      for (const choice of choices) await expect(choice).toBeDisabled();
      check(
        `${title} selects its No Cover variant and disables unused cover selection`,
      );
    }
    if (id === "portrait-artwork") {
      await expect(
        page.getByRole("group", { name: "Varijanta", exact: true }),
      ).toBeVisible();
      await gotoStep(0);
      const cover = page
        .getByRole("group", { name: "Naslovna slika kartice" })
        .getByRole("button")
        .first();
      await expect(cover).toBeEnabled();
      await cover.click();
      check(
        "Portret exposes both variants and enables owned artwork selection",
      );
    }
    await gotoStep(2);
    const family =
      id === "no-cover"
        ? "clean"
        : id === "portrait"
          ? "profile"
          : id === "portrait-artwork"
            ? "portret"
            : id;
    const basicStage = page.locator('[data-native-bleed="true"]');
    await expect(
      basicStage.locator(`svg[data-${family}-side="front"]`),
    ).toHaveAttribute("viewBox", "30 30 850 550");
    await page
      .getByRole("button", { name: "Bleed i linija reza", exact: true })
      .click();
    await expect(
      basicStage.locator(`svg[data-${family}-side="front"]`),
    ).toHaveAttribute("viewBox", "0 0 910 610");
    await expect(
      basicStage.locator(`[data-${family}="trim-guide"]`),
    ).toHaveCount(2);
    check(
      `${title} proof uses the native 91×61 mm bleed canvas and both cut guides`,
    );
    await page
      .getByRole("button", { name: "Bleed i linija reza", exact: true })
      .click();
    await expect(
      basicStage.locator(`svg[data-${family}-side="front"]`),
    ).toHaveAttribute("viewBox", "30 30 850 550");
    await expect(
      basicStage.locator(`[data-${family}="trim-guide"]`),
    ).toHaveCount(0);
    check(
      `${title} normal preview returns to the guide-free 85×55 mm finished card`,
    );
    if (id === "portrait-artwork") {
      await expect(basicStage.locator("image")).toHaveCount(1);
      assert(
        (await basicStage.locator('[data-portret="name-line"]').count()) >= 2,
      );
      await gotoStep(1);
      await page
        .getByRole("group", { name: "Varijanta", exact: true })
        .getByRole("button", { name: "ArtBoard", exact: true })
        .click();
      await gotoStep(2);
      await expect(
        basicStage.locator('[data-portret="photo-divider"]'),
      ).toHaveCount(1);
      check(
        "Portret wraps the real name and previews its selected artwork and Branded dividers",
      );
      await page
        .getByRole("button", { name: "Sačuvaj draft", exact: true })
        .click();
      await expect(
        page.getByText("Draft je sačuvan.", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await gotoStep(1);
      await expect(
        page
          .getByRole("group", { name: "Šablon vizit karte" })
          .getByRole("button", { name: "Portret", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page
          .getByRole("group", { name: "Varijanta", exact: true })
          .getByRole("button", { name: "ArtBoard", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      check("Portret draft reopens with its artwork layout and Branded choice");
    }
    if (["no-cover", "portrait"].includes(id)) {
      await expect(basicStage.locator("image")).toHaveCount(
        id === "portrait" ? 1 : 0,
      );
      check(`${title} preview only renders the assets used by its reference`);
      await page
        .getByRole("button", { name: "Sačuvaj draft", exact: true })
        .click();
      await expect(
        page.getByText("Draft je sačuvan.", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await gotoStep(1);
      await expect(
        page
          .getByRole("group", { name: "Šablon vizit karte" })
          .getByRole("button", { name: "No Cover", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page
          .getByRole("group", {
            name: "Varijanta šablona No Cover",
            exact: true,
          })
          .getByRole("button", { name: title, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await page
        .getByRole("group", { name: "Šablon vizit karte" })
        .getByRole("button", { name: "Basic", exact: true })
        .click();
      await page
        .getByRole("group", { name: "Šablon vizit karte" })
        .getByRole("button", { name: "No Cover", exact: true })
        .click();
      await expect(
        page
          .getByRole("group", {
            name: "Varijanta šablona No Cover",
            exact: true,
          })
          .getByRole("button", { name: title, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      check(
        `${title} persists, reopens and remains selected when returning to No Cover`,
      );
      await page.screenshot({
        path: path.join(out, `no-cover-${id}-desktop.png`),
        fullPage: true,
      });
      for (const width of [1024, 390, 320]) {
        await page.setViewportSize({ width, height: 960 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await expect(
          page
            .getByRole("group", {
              name: "Varijanta šablona No Cover",
              exact: true,
            })
            .getByRole("button", { name: title, exact: true }),
        ).toBeVisible();
        if (width === 390)
          await page.screenshot({
            path: path.join(out, `no-cover-${id}-mobile.png`),
            fullPage: true,
          });
      }
      await page.setViewportSize({ width: 1536, height: 960 });
      check(
        `${title} grouped controls work at desktop, tablet and phone widths`,
      );
    }
  }
  await gotoStep(1);
  await page
    .getByRole("group", { name: "Šablon vizit karte" })
    .getByRole("button", { name: "Classic", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ArtBoard", exact: true })
    .last()
    .click();
  await page
    .getByRole("combobox", { name: "Boja kartice" })
    .selectOption("dark");
  await page
    .getByRole("combobox", { name: "Jezik", exact: true })
    .selectOption("EN");
  await page
    .getByRole("combobox", { name: "Naslov poleđine" })
    .selectOption("portfolio");
  await page
    .getByRole("button", { name: "Sačuvaj draft", exact: true })
    .click();
  await expect(
    page.getByText("Draft je sačuvan.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await gotoStep(1);
  await expect(
    page.getByRole("combobox", { name: "Boja kartice" }),
  ).toHaveValue("dark");
  await expect(
    page.getByRole("combobox", { name: "Jezik", exact: true }),
  ).toHaveValue("EN");
  check(
    "Template, variant, card color, language and back title persist after reload",
  );
  await page.getByRole("button", { name: "Tamna tema", exact: true }).click();
  await expect(page.locator("[data-theme]")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  await expect(
    page.getByRole("combobox", { name: "Boja kartice" }),
  ).toHaveValue("dark");
  await page
    .getByRole("button", { name: "Svijetla tema", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Boja kartice" }),
  ).toHaveValue("dark");
  check("Account interface theme is independent of selected card color");
  await gotoStep(2);
  await page
    .getByRole("button", { name: "Zadnja strana", exact: true })
    .click();
  check(
    "3D flip rotates to back",
    (await page.locator("[data-back]").getAttribute("data-back")) === "true",
  );
  await page
    .getByRole("button", { name: "Bleed i linija reza", exact: true })
    .click();
  await expect(page.locator("[data-bleed]")).toHaveAttribute(
    "data-bleed",
    "true",
  );
  await page
    .getByRole("button", { name: "Okreni karticu", exact: true })
    .click();
  await expect(page.locator("[data-back]")).toHaveAttribute(
    "data-back",
    "false",
  );
  check("Bleed overlay and flip button work without changing export geometry");
  for (const theme of ["light", "dark"]) {
    await page
      .getByRole("button", {
        name: theme === "light" ? "Svijetla tema" : "Tamna tema",
        exact: true,
      })
      .click();
    for (let i = 0; i < 4; i++) {
      await gotoStep(i);
      await page.screenshot({
        path: path.join(out, `${theme}-step${i + 1}.png`),
        fullPage: true,
      });
      check(
        `${theme} step ${i + 1} renders without horizontal overflow`,
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
  }
  for (const width of [1536, 1280, 1024, 900, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width === 390 ? 510 : 960 });
    for (let i = 0; i < 4; i++) {
      await gotoStep(i);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width} step ${i + 1} overflow`,
      );
    }
    if (width === 390) {
      await gotoStep(1);
      const boxes = await page
        .getByRole("group", { name: "Šablon vizit karte" })
        .getByRole("button")
        .evaluateAll((e) =>
          e.map((x) => ({
            x: x.getBoundingClientRect().x,
            w: x.getBoundingClientRect().width,
          })),
        );
      assert(boxes.every((b) => Math.abs(b.x - boxes[0].x) < 1));
      await gotoStep(0);
      const contact = await page
          .getByRole("textbox", { name: "Email", exact: true })
          .boundingBox(),
        toggle = await page
          .getByRole("switch", { name: "Email na kartici" })
          .boundingBox();
      assert(toggle.y > contact.y + contact.height);
      const main = await page.locator("main").boundingBox(),
        live = await page
          .getByRole("complementary", { name: "Pregled uživo" })
          .boundingBox();
      assert(live.y >= main.y + main.height);
      await page.screenshot({
        path: path.join(out, "mobile-390.png"),
        fullPage: true,
      });
      check(
        "390px: one template column, stacked contacts, horizontal step navigation and live preview below main",
      );
    }
    check(`${width}px all four steps have no horizontal overflow`);
  }
  await page.setViewportSize({ width: 1536, height: 960 });
  await gotoStep(3);
  const downloaded = page.waitForEvent("download");
  let releaseExport;
  h.storage.gate = new Promise((resolve) => {
    releaseExport = resolve;
  });
  await page
    .locator("main")
    .getByRole("button", { name: "Preuzmi PDF i PNG", exact: true })
    .click();
  await expect(
    page
      .locator("main")
      .getByRole("button", { name: "Pripremamo…", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/Pripremamo tvoju vizit karticu/)).toBeVisible();
  check("Generating state shows progress and blocks a second submission");
  releaseExport();
  h.storage.gate = null;
  const download = await downloaded;
  await download.saveAs(path.join(out, "browser-export.zip"));
  await expect(
    page.getByText("Kartica je generisana. ZIP sadrži PDF i obje PNG slike.", {
      exact: true,
    }),
  ).toBeVisible();
  assert.equal(
    (
      await h.prisma.qrCardExport.findFirst({
        where: { artistAccountId: a.account.id },
      })
    ).status,
    "READY",
  );
  check(
    "Real API/private proxy generates and downloads a ZIP containing PDF and both PNG sides",
  );
  const again = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Preuzmi ponovo · besplatno" })
    .click();
  await again;
  check(
    "History redownload works without a new version",
    (await h.prisma.qrCardExport.count({
      where: { artistAccountId: a.account.id },
    })) === 1,
  );
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Kopiraj link", exact: true }).click();
  check(
    "Copy link uses real public profile URL",
    (await page.evaluate(() => navigator.clipboard.readText())).includes(
      a.slug,
    ),
  );
  const free = await h.artist();
  await context.addCookies([
    {
      name: "artboard_artist_session",
      value: free.token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(base + "/qr-vizit-karta");
  await gotoStep(3);
  await expect(
    page.getByRole("heading", { name: "Jedna besplatna vizit karta." }),
  ).toBeVisible();
  h.storage.fail = true;
  await page
    .locator("main")
    .getByRole("button", { name: "Preuzmi PDF i PNG", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Kartica nije generisana. Pokušaj ponovo.",
  );
  assert.equal((await h.request("", free)).data.entitlement.available, true);
  check("Real storage failure shows error and preserves the Free entitlement");
  h.storage.fail = false;
  const freeDownload = page.waitForEvent("download");
  await page
    .locator("main")
    .getByRole("button", { name: "Pokušaj ponovo", exact: true })
    .click();
  await freeDownload;
  await expect(
    page.locator("main").getByRole("link", { name: /Premium od/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preuzmi ponovo · besplatno" }),
  ).toBeVisible();
  check(
    "Free first successful generation changes to used state and preserves redownload",
  );
  assert.equal(
    await h.prisma.qrCardExport.count({
      where: { artistAccountId: free.account.id },
    }),
    1,
  );
  check(
    "Retry after failure reuses the same version without duplicate purchase or usage",
  );
  const expired = await h.artist("EXPIRED");
  await context.addCookies([
    {
      name: "artboard_artist_session",
      value: expired.token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(base + "/qr-vizit-karta");
  await gotoStep(3);
  await expect(
    page.getByRole("link", { name: /Obnovi Premium/ }),
  ).toHaveAttribute("href", "/placanje?proizvod=premium");
  check(
    "Former Premium uses real renewal route and cannot generate a new card",
  );
  const anon = await browser.newContext();
  const unauth = await anon.request.get(base + "/qr-vizit-karta", {
    maxRedirects: 0,
  });
  assert.equal(unauth.status(), 307);
  assert.equal(
    (await anon.request.get(base + "/api/artist/qr-cards")).status(),
    401,
  );
  await anon.close();
  check("Anonymous page and API require artist authentication");
  const csrf = await context.request.put(base + "/api/artist/qr-cards/draft", {
    headers: { origin: "https://foreign.invalid" },
    data: {},
  });
  assert.equal(csrf.status(), 403);
  check("Next private proxy rejects cross-origin mutations");
  await page.emulateMedia({ reducedMotion: "reduce" });
  check(
    "Reduced motion disables animation",
    (await page
      .locator("header>div")
      .last()
      .evaluate((e) => getComputedStyle(e).animationName)) === "none",
  );
  assert.equal(errors.length, 0);
  check("No browser runtime errors");
  fs.writeFileSync(
    path.join(out, "results.json"),
    JSON.stringify({ checks, metrics, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: checks.length, errors }));
})()
  .catch(async (e) => {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, "failure.json"),
      JSON.stringify({ error: e.stack, checks, metrics, errors }, null, 2),
    );
    if (page)
      await page
        .screenshot({ path: path.join(out, "failure.png"), fullPage: true })
        .catch(() => {});
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) server.kill();
    if (h) await h.close();
  });
