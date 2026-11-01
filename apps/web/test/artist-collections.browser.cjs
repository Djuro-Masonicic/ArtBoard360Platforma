const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");
const { chromium, expect } = require("@playwright/test");
const { startHarness } = require("../../api/test/artist-collections.fixture.cjs");
// Use the API's native sharp build; loading two libvips builds in one Windows
// process can conflict when the API fixture imports its image validator.
const sharp = require(require.resolve("sharp", { paths: [path.join(__dirname, "../../api")] }));
const root = path.resolve(__dirname, "../../..");
const output = path.join(root, ".tmp/collections-4-2-package2");
const dir = path.join(output, "browser-harness");
const port = Number(process.env.ARTIST_COLLECTIONS_BROWSER_PORT || 3111);
const url = `http://localhost:${port}`;
const checks = [], errors = [];
let h, server, browser;
const check = (name, value) => { assert(value, name); checks.push(name); };

(async () => {
  h = await startHarness();
  const fixture = await h.fresh();
  const image = await sharp({ create: { width: 40, height: 50, channels: 3, background: "#6655aa" } }).png().toBuffer();
  fs.mkdirSync(path.join(dir, "app/api/artist/collections/[[...operation]]"), { recursive: true });
  const write = (file, content) => fs.writeFileSync(path.join(dir, file), content);
  write("package.json", JSON.stringify({ private: true }));
  write("tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2022", lib: ["DOM", "ES2022"], jsx: "preserve", module: "ESNext", moduleResolution: "Bundler", esModuleInterop: true, skipLibCheck: true, strict: true, baseUrl: "../../..", paths: { "@/*": ["apps/web/*"] } }, include: ["next-env.d.ts", "app/**/*.tsx", "app/**/*.ts", "session-stub.ts", ".next/types/**/*.ts"], exclude: ["node_modules"] }));
  write("next.config.js", `const path=require('path');module.exports={reactStrictMode:true,devIndicators:false,experimental:{externalDir:true},webpack(config){config.resolve.alias['@']=path.resolve(__dirname,'../../../apps/web');return config;}};`);
  write("session-stub.ts", "export {}; // Real HTTP-only session cookies are used by this harness.\n");
  write("postcss.config.mjs", `export default {plugins:{'@tailwindcss/postcss':{}}};`);
  write("app/harness.css", `@import '../../../../apps/web/app/globals.css';\n@source '../../../../apps/web';`);
  const layout = fs.readFileSync(path.join(root, "apps/web/app/layout.tsx"), "utf8");
  const fonts = layout.slice(layout.indexOf("const alcyone ="), layout.indexOf("export const metadata")).replaceAll('"./fonts/', '"../../../../apps/web/app/fonts/');
  write("app/layout.tsx", `import localFont from 'next/font/local';import './harness.css';${fonts}\nexport default function Layout({children}:{children:React.ReactNode}){return <html lang="sr"><body className={alcyone.className+' '+alcyone.variable}>{children}</body></html>;}`);
  const sourceArtist = fixture.a.artist;
  const artist = { id: sourceArtist.id, name: sourceArtist.name, slug: sourceArtist.slug,
    bio: sourceArtist.bio, quote: sourceArtist.quote, email: sourceArtist.email,
    profileImageUrl: sourceArtist.profileImageUrl, coverImageUrl: sourceArtist.coverImageUrl,
    isNsfw: sourceArtist.isNsfw, darkenCoverOverlay: sourceArtist.darkenCoverOverlay,
    createdAt: sourceArtist.createdAt, updatedAt: sourceArtist.updatedAt,
    artworks: fixture.a.artworks, disciplines: [], socialLinks: [], testimonials: [] };
  write("app/page.tsx", `import {ArtistDashboardEditor} from '@/components/artist-dashboard-editor';import {UiFeedbackProvider} from '@/components/ui-feedback-provider';export default function Page(){return <UiFeedbackProvider><div className="mx-auto w-full max-w-[100vw] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12"><ArtistDashboardEditor artist={${JSON.stringify(artist)}} portfolioProjects={[]} sessionEmail="isolated@example.invalid" mustChangePassword={false}/></div></UiFeedbackProvider>;}`);
  write("app/api/artist/collections/[[...operation]]/route.ts", fs.readFileSync(path.join(root, "apps/web/app/api/artist/collections/[[...operation]]/route.ts")));
  const childEnv = { ...process.env, INTERNAL_API_BASE_URL: h.baseUrl, NEXT_TELEMETRY_DISABLED: "1" };
  if (!process.argv.includes("--reuse-build")) execFileSync(process.execPath, [require.resolve("next/dist/bin/next"), "build", "--webpack"], { cwd: dir, stdio: "inherit", windowsHide: true, env: childEnv });
  server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "localhost", "--port", String(port)], { cwd: dir, stdio: "inherit", windowsHide: true, env: childEnv });
  let ready = false;
  for (let n = 0; n < 80; n++) { if (server.exitCode !== null) throw Error("Harness exited"); try { if ((await fetch(url)).ok) { ready = true; break; } } catch {} await new Promise((resolve) => setTimeout(resolve, 250)); }
  assert(ready, "Next harness ready");
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1536, height: 1000 } });
  await context.addCookies([{ name: "artboard_artist_session", value: fixture.a.token,
    domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax", secure: false }]);
  await context.route("https://storage.invalid/**", (route) => route.fulfill({ contentType: "image/png", body: image }));
  const page = await context.newPage(); page.on("pageerror", (error) => errors.push(error.message));
  async function open() {
    await page.goto(url);
    await page.getByRole("navigation", { name: "Artist dashboard sekcije" }).getByRole("button", { name: /^Kolekcije/ }).click();
    await expect(page.getByRole("heading", { name: "Kolekcije", exact: true })).toBeVisible();
  }
  async function getState() { const r = await h.send("GET", "", undefined, fixture.a.token); assert.equal(r.status, 200); return r.body; }
  async function create(title) {
    await page.getByLabel("Naziv nove kolekcije").fill(title); await page.getByRole("button", { name: "Kreiraj kolekciju", exact: true }).click();
    await expect(page.getByRole("article", { name: `Kolekcija ${title}`, exact: true })).toBeVisible();
  }
  await open(); await expect(page.getByText("Još nemaš kolekcije.", { exact: false })).toBeVisible(); check("dashboard navigation opens real collection controls", true);
  await create("Browser first");
  let card = page.getByRole("article", { name: "Kolekcija Browser first", exact: true });
  await card.getByLabel("Naziv kolekcije", { exact: true }).fill("Edited collection");
  await card.getByLabel("Godina", { exact: true }).fill("2020–2026"); await card.getByLabel("Opis", { exact: true }).fill("Saved description");
  await card.getByLabel("Naslovna slika iz radova").selectOption(fixture.a.artworks[0].id);
  await card.getByRole("button", { name: "Sačuvaj kolekciju", exact: true }).click();
  card = page.getByRole("article", { name: "Kolekcija Edited collection", exact: true }); await expect(card).toBeVisible();
  check("create and metadata save reach the isolated database", (await getState()).collections[0].description === "Saved description");
  for (const work of fixture.a.artworks.slice(0, 2)) {
    await card.getByLabel("Dodaj postojeći rad u Edited collection").selectOption(work.id); await card.getByRole("button", { name: "Dodaj rad", exact: true }).click();
    await expect(card.locator("li").filter({ hasText: work.title })).toHaveCount(1);
  }
  await card.getByRole("button", { name: "Pomjeri rad A work 2 gore", exact: true }).click();
  await expect.poll(async () => (await getState()).artworks.find((work) => work.id === fixture.a.artworks[1].id).collectionOrderIndex).toBe(0);
  check("member ordering persists independently of global gallery order", (await getState()).artworks.map((work) => work.orderIndex).join(",") === "0,10,20");
  await create("Browser second"); const second = page.getByRole("article", { name: "Kolekcija Browser second", exact: true });
  await second.getByLabel("Dodaj postojeći rad u Browser second").selectOption(fixture.a.artworks[0].id);
  page.once("dialog", (dialog) => dialog.dismiss()); await second.getByRole("button", { name: "Dodaj rad", exact: true }).click();
  check("cancelled move does not change membership", (await getState()).artworks.find((work) => work.id === fixture.a.artworks[0].id).artistCollectionId === (await getState()).collections[0].id);
  page.once("dialog", (dialog) => dialog.accept()); await second.getByRole("button", { name: "Dodaj rad", exact: true }).click();
  await expect(second.locator("li")).toHaveCount(1); check("confirmed move uses the same original work without duplication", (await getState()).artworks.length === 3);
  await second.getByRole("button", { name: "Pomjeri kolekciju Browser second gore", exact: true }).click();
  await expect.poll(async () => (await getState()).collections[0].title).toBe("Browser second"); check("collection order persists", true);
  await second.getByRole("button", { name: "Ukloni iz kolekcije", exact: true }).click();
  await expect(second.locator("li")).toHaveCount(0);
  check("detaching retains work in the uncollected group", (await getState()).artworks.find((work) => work.id === fixture.a.artworks[0].id).artistCollectionId === null);
  await card.getByLabel("Ili pošalji novu naslovnu sliku").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: image });
  await expect.poll(async () => h.storage.calls.length).toBe(1); check("cover upload passes Next proxy and isolated storage transport", true);
  await open(); card = page.getByRole("article", { name: "Kolekcija Edited collection", exact: true });
  await expect(card.getByLabel("Godina", { exact: true })).toHaveValue("2020–2026"); check("reload restores saved collections, metadata and member choices", true);
  const beforeConflict = await getState(), current = beforeConflict.collections.find((item) => item.title === "Edited collection");
  await card.getByLabel("Godina", { exact: true }).fill("Unsaved year");
  assert.equal((await h.send("PATCH", current.id, { expectedVersion: beforeConflict.version, title: "External change" }, fixture.a.token)).status, 200);
  await card.getByRole("button", { name: "Sačuvaj kolekciju", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "Podaci su promijenjeni" })).toBeVisible();
  check("stale browser save does not overwrite another edit", (await getState()).collections.find((item) => item.id === current.id).title === "External change");
  await expect(page.getByRole("article", { name: "Kolekcija External change", exact: true }).getByLabel("Godina", { exact: true })).toHaveValue("Unsaved year");
  check("unsaved form values survive conflict refresh", true);
  await open(); card = page.getByRole("article", { name: "Kolekcija External change", exact: true });
  page.once("dialog", (dialog) => dialog.dismiss()); await card.getByRole("button", { name: "Obriši kolekciju", exact: true }).click(); await expect(card).toBeVisible(); check("delete cancellation preserves collection", true);
  page.once("dialog", (dialog) => dialog.accept()); await card.getByRole("button", { name: "Obriši kolekciju", exact: true }).click(); await expect(card).toHaveCount(0);
  check("deletion preserves every original artwork and never deletes storage", (await getState()).artworks.length === 3 && h.storage.deletes.length === 0);
  for (const width of [1536, 1440, 1280, 1024, 768, 440, 375, 320]) {
    await page.setViewportSize({ width, height: 1000 }); await page.evaluate(() => document.fonts.ready);
    check(`dashboard collections have no horizontal overflow at ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const outside = await page.getByRole("region", { name: "Kolekcije", exact: true }).evaluate((section) =>
      [section, ...section.querySelectorAll("article,input,select,textarea,button")].map((element) => {
        const rect = element.getBoundingClientRect(); return { tag: element.tagName, label: element.getAttribute("aria-label") ?? element.getAttribute("type"),
          left: rect.left, right: rect.right, width: rect.width, parentWidth: element.parentElement?.getBoundingClientRect().width };
      }).filter((rect) => rect.left < -1 || rect.right > innerWidth + 1));
    if (outside.length) fs.writeFileSync(path.join(output, "responsive-outliers.json"), JSON.stringify({ width, outside }, null, 2));
    check(`cards and controls stay inside the viewport at ${width}px`, outside.length === 0);
    await expect(page.getByRole("button", { name: "Kreiraj kolekciju", exact: true })).toBeVisible();
    if ([1536, 375].includes(width)) await page.screenshot({ path: path.join(output, `dashboard-collections-${width}.png`), fullPage: true });
  }
  h.env.artistCollectionsEnabled = false; await open(); await expect(page.getByRole("status").filter({ hasText: "Kolekcije čekaju" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kreiraj kolekciju", exact: true })).toHaveCount(0); check("unmigrated/disabled state exposes no fake write controls", true); h.env.artistCollectionsEnabled = true;
  const missingSession = await fetch(`${url}/api/artist/collections`, { headers: { Authorization: `Bearer ${fixture.a.token}` } });
  check("real Next route rejects forged browser authorization without a session", missingSession.status === 401);
  check("browser has no runtime errors", errors.length === 0);
  fs.writeFileSync(path.join(output, "browser-results.json"), JSON.stringify({ checks, errors, database: h.database, compatibilityDatabase: h.legacyDatabase }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, runtimeErrors: errors.length, isolatedDatabase: h.database }));
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (server) server.kill(); if (h) await h.close();
});
