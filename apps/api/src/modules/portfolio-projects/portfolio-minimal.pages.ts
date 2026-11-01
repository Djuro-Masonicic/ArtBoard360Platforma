import { dirname, resolve } from "node:path";
import sharp from "sharp";
import QRCode from "qrcode";
import { CardsPdfPages } from "./portfolio-cards.pages";
import { buildPortfolioDocumentPlan, getMinimalDesign, readPortfolioCv, portfolioCvBlocks, type DocumentPage } from "@artboard/portfolio-document-plan";

// Coordinates are the supplied Artifact's 794 x 1123 CSS pixels. This is a
// page renderer inside the existing PDFKit generator, not another PDF pipeline.
const web = resolve(dirname(require.resolve("@artboard/portfolio-document-plan")), "../../apps/web");
const ink = "#0a0a0a", muted = "#8e8e96";
type Radius = number | readonly [number, number, number, number];
const gradientStops: ReadonlyArray<readonly [number, string]> = [[0, "#0d74ff"], [.28, "#783cff"], [.56, "#fe171d"], [1, "#ffd31b"]];
type Project = Parameters<typeof buildPortfolioDocumentPlan>[0] & Record<string, any>;
type Plan = ReturnType<typeof buildPortfolioDocumentPlan<any, any>>;
let brand: Promise<{ mark: Buffer; logo: Buffer }> | undefined;
function branding() {
  return brand ??= Promise.all([
    sharp(resolve(web, "public/artboard-logo/ArtBoard-Gradient-Odvojeno.svg"), { density: 384 }).png().toBuffer(),
    sharp(resolve(web, "public/artboard-logo/ArtBoard-Horizontal-Gradient-Mark-Black-Text.svg"), { density: 384 }).png().toBuffer(),
  ]).then(([mark, logo]) => ({ mark, logo }));
}
export function registerMinimalFonts(document: PDFKit.PDFDocument) {
  for (const weight of ["Regular", "Bold", "RegularItalic"]) document.registerFont(`Minimal-${weight}`, resolve(web, `../api/assets/portfolio-fonts/Alcyone-${weight}.ttf`));
}
function link(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try { const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !/^[a-z][a-z0-9+.-]*:/i.test(value.replace(/^https?:/i, "")) ? url.toString() : undefined; } catch { return undefined; }
}
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const joined = (...parts: unknown[]) => parts.map(clean).filter(Boolean).join(", ");

export class MinimalPdfPages {
  private images = new Map<string, Promise<Buffer | null>>();
  private mark!: Buffer;
  private logo!: Buffer;
  private monochromeLogo!: Buffer;
  private filteredImages = new Map<string, Promise<Buffer>>();
  private serial = 0;
  constructor(private readonly doc: PDFKit.PDFDocument, private readonly project: Project,
    private readonly addPage: () => void, private readonly imageLoader: (url: string) => Promise<Buffer | null>) {}
  private get sx() { return this.doc.page.width / 794; }
  private get sy() { return this.doc.page.height / 1123; }
  private get rounded() { return getMinimalDesign(this.project).style === "ROUNDED"; }
  private get gradient() { return getMinimalDesign(this.project).style === "GRADIENT"; }
  private get editorial() { return getMinimalDesign(this.project).style === "EDITORIAL"; }
  private get cards() { return getMinimalDesign(this.project).style === "CARDS"; }
  private get blocks() { return getMinimalDesign(this.project).style === "BLOCKS"; }
  private get boldName() { return this.rounded || this.gradient || this.cards || this.blocks; }
  private get imageRadius() { return this.cards ? 15.1 : this.gradient ? 11.3 : this.rounded ? 22.7 : 0; }
  private get contentTop() { return this.editorial ? 181.4 : this.rounded || this.cards ? 136.1 : 151.2; }
  private get en() { return this.project.language === "EN"; }
  private label(me: string, en: string) { return this.en ? en : me; }
  private font(bold = false, italic = false) { return this.project.fontStyle === "SERIF" ? bold ? "DejaVu Serif Bold" : "DejaVu Serif" : `Minimal-${italic ? "RegularItalic" : bold ? "Bold" : "Regular"}`; }
  private setFont(size: number, bold = false, italic = false) { this.doc.font(this.font(bold, italic)).fontSize(size * this.sx); }
  private width(value: string, size: number, bold = false) { this.setFont(size, bold); return this.doc.widthOfString(value) / this.sx; }
  private lines(value: string, width: number, size: number, bold = false) {
    this.setFont(size, bold); const lines: string[] = [];
    for (const paragraph of value.replace(/\r\n?/g, "\n").split("\n")) {
      let line = "";
      for (const token of paragraph.split(/(\s+)/)) {
        if (line && this.doc.widthOfString(line + token) > width * this.sx) { lines.push(line.trimEnd()); line = ""; }
        for (const char of token) {
          if (!line && /\s/.test(char)) continue;
          if (line && this.doc.widthOfString(line + char) > width * this.sx) { lines.push(line.trimEnd()); line = ""; }
          line += char;
        }
      }
      lines.push(line.trimEnd());
    }
    return lines.length ? lines : [""];
  }
  private text(value: unknown, x: number, y: number, width: number, size = 14, bold = false, color = ink, leading = 1.45, align: "left" | "right" | "center" = "left", target?: string, italic = false, tracking?: number) {
    const lines = this.lines(clean(value), width, size, bold);
    const spacing = tracking ?? (bold && [15.33, 11.33].includes(size) ? 0.03 : 0);
    for (const [index, line] of lines.entries()) {
      this.setFont(size, bold, italic);
      const charSpace = size * spacing * this.sx, lineWidth = this.doc.widthOfString(line, { characterSpacing: charSpace });
      const left = x * this.sx + (align === "right" ? width * this.sx - lineWidth : align === "center" ? (width * this.sx - lineWidth) / 2 : 0);
      // Each measured line is emitted unwrapped. PDFKit's width option would
      // wrap again after character spacing, clipping badges and footer labels.
      const top = (y + index * size * leading + size * (leading - (this.project.fontStyle === "SERIF" ? 1.164 : 1.2)) / 2) * this.sy;
      this.doc.fillColor(color).text(line, left, top, { lineBreak: false, characterSpacing: charSpace });
      // PDFKit's unwrapped text path has no calculated options.width. Give
      // annotations their measured rectangle explicitly to avoid NaN bounds.
      if (target && lineWidth) {
        this.doc.link(left, top, lineWidth, size * leading * this.sy, target);
        const underlineY = top + size * 1.02 * this.sy;
        this.doc.moveTo(left, underlineY).lineTo(left + lineWidth, underlineY).lineWidth(0.5 * this.sx).strokeColor(color).stroke();
      }
    }
    return y + lines.length * size * leading;
  }
  private paintGradient(x: number, y: number, w: number, h: number, angle = 90, radius: Radius = 0, stops = gradientStops) {
    if (w <= 0 || h <= 0) return;
    // CSS angles start at the top and rotate clockwise. Extend the gradient
    // line to the box's projected corners, matching CSS's 135-degree frame.
    const radians = angle * Math.PI / 180, dx = Math.sin(radians), dy = -Math.cos(radians);
    const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2, cx = x + w / 2, cy = y + h / 2;
    const fill = this.doc.linearGradient((cx - dx * half) * this.sx, (cy - dy * half) * this.sy, (cx + dx * half) * this.sx, (cy + dy * half) * this.sy);
    for (const [offset, color] of stops) fill.stop(offset, color);
    this.shape(x, y, w, h, radius).fill(fill);
  }
  private rule(x: number, y: number, width: number, color = ink) {
    if (this.gradient && color === ink) this.paintGradient(x, y, width, 1.1);
    else this.doc.moveTo(x * this.sx, y * this.sy).lineTo((x + width) * this.sx, y * this.sy).lineWidth(1.1 * this.sx).strokeColor(color).stroke();
  }
  private shape(x: number, y: number, w: number, h: number, radius: Radius = 0) {
    const d = this.doc;
    if (typeof radius !== "number") {
      const [tl, tr, br, bl] = radius.map(r => Math.min(r, w / 2, h / 2)), k = 0.5522847498307936;
      const px = (n: number) => n * this.sx, py = (n: number) => n * this.sy;
      d.moveTo(px(x + tl!), py(y)).lineTo(px(x + w - tr!), py(y))
        .bezierCurveTo(px(x + w - tr! + tr! * k), py(y), px(x + w), py(y + tr! - tr! * k), px(x + w), py(y + tr!))
        .lineTo(px(x + w), py(y + h - br!)).bezierCurveTo(px(x + w), py(y + h - br! + br! * k), px(x + w - br! + br! * k), py(y + h), px(x + w - br!), py(y + h))
        .lineTo(px(x + bl!), py(y + h)).bezierCurveTo(px(x + bl! - bl! * k), py(y + h), px(x), py(y + h - bl! + bl! * k), px(x), py(y + h - bl!))
        .lineTo(px(x), py(y + tl!)).bezierCurveTo(px(x), py(y + tl! - tl! * k), px(x + tl! - tl! * k), py(y), px(x + tl!), py(y)).closePath();
    }
    else if (radius) d.roundedRect(x * this.sx, y * this.sy, w * this.sx, h * this.sy, Math.min(radius, w / 2, h / 2) * this.sx);
    else d.rect(x * this.sx, y * this.sy, w * this.sx, h * this.sy);
    return d;
  }
  private rect(x: number, y: number, w: number, h: number, color: string, radius = 0) { this.shape(x, y, w, h, radius).fill(color); }
  private grayscale(bytes: Buffer, key: string, contrast: number) {
    if (!this.filteredImages.has(key)) this.filteredImages.set(key, sharp(bytes).recomb([[.2126, .7152, .0722], [.2126, .7152, .0722], [.2126, .7152, .0722]]).linear(contrast, 127.5 * (1 - contrast)).png().toBuffer());
    return this.filteredImages.get(key)!;
  }
  private async image(url: string | null | undefined, x: number, y: number, width: number, height: number, fit: "cover" | "contain" = "cover", positionY = 0.5, radius: Radius = 0, contrast?: number) {
    if (!url) return;
    if (!this.images.has(url)) this.images.set(url, this.imageLoader(url));
    let bytes = await this.images.get(url); if (!bytes) return;
    if (contrast) bytes = await this.grayscale(bytes, `${contrast}:${url}`, contrast);
    const metadata = await sharp(bytes).metadata(); if (!metadata.width || !metadata.height) return;
    const scale = fit === "cover" ? Math.max(width / metadata.width, height / metadata.height) : Math.min(width / metadata.width, height / metadata.height);
    const w = metadata.width * scale, h = metadata.height * scale;
    this.doc.save(); this.shape(x, y, fit === "contain" ? w : width, fit === "contain" ? h : height, radius).clip();
    this.doc.image(bytes, (x + (fit === "cover" ? (width - w) / 2 : 0)) * this.sx, (y + (fit === "cover" ? (height - h) * positionY : 0)) * this.sy, { width: w * this.sx, height: h * this.sy }); this.doc.restore();
  }
  private brandImage(kind: "mark" | "logo", x: number, y: number, w: number, h: number) {
    if (this.project.includeBranding) this.doc.image(this[kind], x * this.sx, y * this.sy, { width: w * this.sx, height: h * this.sy });
  }
  private page(title?: string, footer = true, footerLeft = 68) {
    this.addPage(); this.rect(0, 0, 794, 1123, this.cards ? "#eef0f4" : "#ffffff");
    if (title) {
      if (this.cards) { this.brandImage("mark", 68, 64.3, 18.9, 17); this.text(title.toUpperCase(), this.project.includeBranding ? 98.2 : 68, 64.73, this.project.includeBranding ? 627.8 : 658, 14.67, true, ink, 1.1, "left", undefined, false, .04); }
      else if (this.editorial) {
        this.brandImage("mark", 68, 39, 13.5, 12.1);
        this.text(this.project.includeBranding ? "ARTBOARD PORTFOLIO" : "PORTFOLIO", this.project.includeBranding ? 89.1 : 68, 37.8, 310, 10, true, ink, 1.45, "left", undefined, false, .14);
        this.text(`${clean(this.project.artistName)} · ${this.dateLine().split(", ").at(-1)}`.toUpperCase(), 390, 37.8, 336, 10, false, ink, 1.45, "right", undefined, false, .14);
        this.rule(68, 57.25, 658); this.rule(68, 61.35, 658);
        const number = String(this.doc.bufferedPageRange().count).padStart(2, "0");
        let size = 40; const numberWidth = this.width(number, 40);
        while (size > 16 && this.width(title.toUpperCase(), size, true) > 658 - numberWidth - 15.1) size -= .5;
        this.text(number, 68, 83.1, numberWidth + 2, 40, false, muted, 1.1);
        this.text(title.toUpperCase(), 68 + numberWidth + 15.1, 83.1 + (40 - size) * .55, 658 - numberWidth - 15.1, size, true, ink, 1.1, "left", undefined, false, -.01);
        this.rule(68, 141.65, 658);
      }
      else if (this.gradient) { this.text(title.toUpperCase(), 68, 68, 658, 29.33, true, "#3a3a40", 1.1); this.rule(68, 111.56, 658); }
      else if (this.rounded) { this.brandImage("mark", 68, 69.33, 23.1, 20.8); this.text(title.toUpperCase(), 102.4, 68, 623.6, 21.33, true, ink, 1.1); }
      else { this.text(title.toUpperCase(), 68, 68, 658, 26.67, true, ink, 1.1); this.rule(68, 114.34, 658); }
    }
    if (footer) this.footer(footerLeft);
  }
  private footer(left = 68) {
    const number = this.doc.bufferedPageRange().count;
    if (this.cards) {
      const width = this.width("PORTFOLIO", 11.33, true) + 8 * 11.33 * .03, pillWidth = width + 53.2;
      this.rect(726 - pillWidth, 1052.97, pillWidth, 28.43, "#ffffff", 14.215);
      this.text(String(number).padStart(2, "0"), 68, 1058.97, 22.7, 11.33, true);
      this.text(clean(this.project.artistName).toUpperCase(), 105.8, 1058.97, 590 - pillWidth, 11.33, false, ink, 1.45, "left", undefined, false, .03);
      this.brandImage("mark", 726 - pillWidth + 13.2, 1059.2, 17.7, 15.9);
      this.text("PORTFOLIO", 726 - pillWidth + 40, 1058.97, width + 1, 11.33, true); return;
    }
    if (this.editorial) {
      this.rule(68, 1043.58, 658);
      this.text(String(number).padStart(2, "0"), 68, 1054.33, 40, 18.67);
      this.text(clean(this.project.artistName).toUpperCase(), 105.8, 1059.65, 445, 11.33, false, ink, 1.45, "left", undefined, false, .03);
      const width = this.width("PORTFOLIO", 11.33, true) + 8 * 11.33 * .03;
      this.brandImage("mark", 726 - width - 26.8, 1059.9, 17.7, 15.9);
      this.text("PORTFOLIO", 726 - width, 1059.65, width + 1, 11.33, true); return;
    }
    if (!this.rounded && !this.gradient) this.rule(left, 1053.7, 726 - left);
    this.text(String(number).padStart(2, "0"), left, 1065, 22.7, 11.33, true);
    const labelWidth = this.width("PORTFOLIO", 11.33, true) + 8 * 11.33 * 0.03;
    this.text(this.project.artistName?.toUpperCase() || "", left + 37.8, 1065, 638 - left - labelWidth, 11.33, false, ink, 1.45, "left", undefined, false, 0.03);
    this.brandImage("mark", 726 - labelWidth - 26.8, 1065.2, 17.7, 15.9);
    this.text("PORTFOLIO", 726 - labelWidth, 1065, labelWidth + 1, 11.33, true);
  }
  private flow(value: unknown, x: number, y: number, width: number, title: string, size = 14, color = muted, leading = 1.5, bottom = 1005, bold = false, target?: string) {
    for (const line of this.lines(clean(value), width, size, bold)) {
      if (y + size * leading > bottom) { this.page(title); y = this.contentTop; }
      this.text(line, x, y, width, size, bold, color, leading, "left", target); y += size * leading;
    }
    return y;
  }
  private dateLine() {
    const year = new Date(this.project.updatedAt ?? this.project.createdAt ?? Date.now()).getFullYear();
    return joined(this.project.location, String(Number.isFinite(year) ? year : new Date().getFullYear()));
  }
  private name(x: number, y: number, width: number, fontSize: number, align: "left" | "center" = "left", color = ink) {
    const [first = "", ...rest] = clean(this.project.artistName).toUpperCase().split(/\s+/); const last = rest.join(" ");
    let size = fontSize;
    while (size > 6 && Math.max(this.width(first, size, this.boldName), this.width(last, size, true)) > width) size -= 0.5;
    this.text(first, x, y, width, size, this.boldName, color, 0.96, align, undefined, false, -0.005);
    if (last) this.text(last, x, y + size * 0.96, width, size, true, color, 0.96, align, undefined, false, -0.005);
    return y + size * 0.96 * (last ? 2 : 1);
  }
  private discipline(x: number, y: number, width: number, size = 16.67, align: "left" | "center" = "left", color = "#4a4a52") {
    this.text(clean(this.project.discipline).toUpperCase(), x, y, width, size, false, color, 1.45, align, undefined, false, 0.08);
  }
  private caption(prefix: string, suffix: unknown, y: number, separator = ", ", size = 17.33) {
    const tail = clean(suffix).toUpperCase(), head = prefix.toUpperCase() + (tail ? separator : "");
    const headWidth = this.width(head, size, true) + Math.max(0, head.length - 1) * size * .01;
    if (headWidth + this.width(tail, size) <= 658) {
      this.text(head, 68, y, headWidth + 1, size, true, muted, 1.25, "left", undefined, false, 0.01);
      if (tail) this.text(tail, 68 + headWidth, y, 658 - headWidth, size, false, muted, 1.25, "left", undefined, false, 0.01);
      return y + size * 1.25;
    }
    return this.flow(head + tail, 68, y, 658, this.label("Umjetnički radovi", "Artworks"), size, muted, 1.25);
  }
  private target() { return link(this.project.artboardProfileUrl) ?? link(this.project.websiteUrl) ?? link(this.project.behanceUrl) ?? link(this.project.instagramUrl); }
  private async qr(x: number, y: number, rotate = 0, border = false) {
    const target = this.target(); if (!target) return;
    const matrix = QRCode.create(target, { errorCorrectionLevel: "M" }).modules;
    this.doc.save(); if (rotate) this.doc.rotate(rotate, { origin: [(x + 71.8) * this.sx, (y + 83) * this.sy] });
    const radius = this.blocks && rotate === -5 ? 3.8 : this.cards ? 18.9 : this.gradient ? 15.1 : this.rounded ? 26.5 : 0;
    if (this.cards || (this.blocks && rotate === -5)) {
      const blur = rotate === 4 ? 22.7 : 30.2, opacity = rotate === 4 ? .12 : .18, padding = blur * 2;
      const key = `qr-shadow:${blur}:${radius}`, w = 143.6 + padding * 2, h = 165 + padding * 2;
      if (!this.filteredImages.has(key)) this.filteredImages.set(key, sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><filter id="s" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${blur / 2}"/></filter></defs><rect x="${padding}" y="${padding}" width="143.6" height="165" rx="${radius}" fill="black" opacity="${opacity}" filter="url(#s)"/></svg>`), { density: 192 }).png().toBuffer());
      this.doc.image(await this.filteredImages.get(key)!, (x - padding) * this.sx, (y + 7.6 - padding) * this.sy, { width: w * this.sx, height: h * this.sy });
    }
    this.rect(x, y, 143.6, 165, "#ffffff", radius);
    if (border) this.shape(x, y, 143.6, 165, radius).lineWidth(1.1 * this.sx).strokeColor("#e3e3e3").stroke();
    const unit = 120.9 / (matrix.size + 8);
    for (let row = 0; row < matrix.size; row++) for (let column = 0; column < matrix.size; column++) if (matrix.get(row, column)) this.rect(x + 11.3 + (column + 4) * unit, y + 11.3 + (row + 4) * unit, unit, unit, "#000000");
    this.doc.link(x * this.sx, y * this.sy, 143.6 * this.sx, 165 * this.sy, target);
    const label = this.project.artboardProfileUrl ? this.label("ARTBOARD PROFIL", "ARTBOARD PROFILE") : this.label("PORTFOLIO LINK", "PORTFOLIO LINK");
    this.brandImage("mark", x + 14, y + 140, 12.6, 11.3); this.text(label, x + 29, y + 138.5, 109, 9.33, true, ink, 1.45);
    this.doc.restore();
  }
  async render(page: DocumentPage, plan: Plan) {
    ({ mark: this.mark, logo: this.logo } = await branding());
    if (this.editorial) this.monochromeLogo ??= await this.grayscale(this.logo, "logo", 1.05);
    if (this.cards && !["cover", "featured"].includes(page.kind)) return new CardsPdfPages({
      project: this.project, page: title => this.page(title), text: (...args) => this.text(...args), lines: (...args) => this.lines(...args), width: (...args) => this.width(...args),
      rect: (...args) => this.rect(...args), image: (...args) => this.image(...args), qr: (x, y) => this.qr(x, y, 4), links: () => this.links(), link, rule: (...args) => this.rule(...args),
      badge: (value, x, y, width) => { this.shape(x, y, width, 24.63, 12.315).lineWidth(1.1 * this.sx).fillAndStroke("#ffffff", ink); this.text(value, x + 12.4, y + 4.1, width - 24.8, 11.33); },
    }).render(page, plan);
    if (page.kind === "cover") return this.cover(plan);
    if (page.kind === "profile") return this.profile();
    if (page.kind === "featured") return this.featured(plan.selectedArtworks);
    if (page.kind === "collection") { const group = plan.groups.find(g => (g.collection?.id ?? null) === page.collectionId); if (group) return this.collection(group.collection, group.artworks); }
    if (page.kind === "artwork") { const group = plan.groups.find(g => g.artworks.some((w: any) => w.id === page.artworkId)); const artwork = group?.artworks.find((w: any) => w.id === page.artworkId); if (artwork) return this.artwork(artwork, group?.collection ?? (group?.legacyIntro ? { title: this.project.collectionName, year: this.project.collectionYear } : null), group!.artworks.indexOf(artwork) + 1, group!.artworks.length); }
    if (page.kind === "cv") return this.cv();
    if (page.kind === "contact") return this.contact(plan.selectedArtworks);
  }
  private async cover(plan: Plan) {
    const variant = getMinimalDesign(this.project).cover, cover = this.project.coverImageUrl || plan.selectedArtworks[0]?.imageUrl, profile = this.project.profileImageUrl;
    this.page(undefined, variant === "G", this.blocks ? 113.4 : 68);
    if (this.blocks && variant === "G") { await this.blocksMagazine(plan, cover, profile); this.blockRail(); return; }
    const shift = this.blocks ? 45.4 : 0;
    if (variant === "A") {
      await this.image(cover, 0, 0, 794, 718.1); const end = this.name(68 + shift, 771, 461.4 - shift, 61.33); this.discipline(68 + shift, end + 18.9, 461.4 - shift);
      await this.image(profile, 567.3, 771, 158.7, 158.7, "cover", 0.5, this.boldName ? 79.35 : 0); this.brandImage("logo", 68 + shift, 1032.3, 139.3, 30.2); this.text(`PORTFOLIO · ${this.dateLine().toUpperCase()}`, 230 + shift, 1040.1, 496 - shift, 11.33, true, ink, 1.45, "right");
    } else if (variant === "B") {
      const end = this.name(68 + shift, 75.6, 423.6 - shift, 56); this.discipline(68 + shift, end + 18.9, 423.6 - shift); this.brandImage("mark", 68 + shift, 279.7, 25.2, 22.7);
      this.text(`PORTFOLIO · ${this.dateLine().toUpperCase()}`, 104.5 + shift, 282.8, 387.1 - shift, 11.33, true);
      if (this.blocks) this.rect(548.4, 94.5, 196.5, 226.8, "#fe171d");
      await this.image(profile, 529.5, 75.6, 196.5, 226.8, "cover", 0.5, this.imageRadius); await this.image(cover, 0, 348.2, 794, 774.8);
    } else if (variant === "C") {
      if (this.gradient) { this.paintGradient(0, 0, 794, 1123, 135); this.rect(26.5, 26.5, 741, 1070, "#ffffff", 18.9); }
      this.brandImage("mark", 367.55, this.blocks ? 98.3 : 90.7, 58.9, 52.9); await this.image(profile, 276.05, this.gradient ? 294.8 : 264.6, 241.9, 241.9, "cover", 0.5, this.boldName ? 120.95 : 0);
      const end = this.name(83.1, this.gradient ? 597.2 : 566.9, 627.8, 61.33, "center"); this.discipline(83.1, end + 18.9, 627.8, 16.67, "center"); this.text(`PORTFOLIO · ${this.dateLine().toUpperCase()}`, 68, 1023.5, 658, 11.33, true, ink, 1.45, "center");
    } else if (variant === "D") {
      if (this.blocks) this.rect(132.3, 94.5, 189, 211.7, "#ffd31b");
      await this.image(profile, 68 + shift, 75.6, 189, 211.7, "cover", 0.5, this.imageRadius); const end = this.name(294.8 + shift, 75.6, 431.2 - shift, 48); this.discipline(294.8 + shift, end + 18.9, 431.2 - shift);
      this.brandImage("mark", 294.8 + shift, 264.6, 25.2, 22.7); this.text(`PORTFOLIO · ${this.dateLine().toUpperCase()}`, 331.3 + shift, 267.7, 394.7 - shift, 11.33, true); await this.image(cover, 68 + shift, 332.6, 658 - shift, 714.8, "cover", 0.5, this.imageRadius);
      if (this.blocks) { this.rect(605, 903.8, 189, 189, "#fe171d"); this.text(this.dateLine().slice(-4), 623.9, 1037.9, 151.2, 40, true, "#ffffff", .9, "left", undefined, false, -.01); }
    } else if (variant === "E") {
      const end = this.name(68 + shift, 75.6, this.blocks ? 317.5 : 362.8, 50.67); this.discipline(68 + shift, end + 18.9, this.blocks ? 317.5 : 362.8); this.text(`PORTFOLIO · ${this.dateLine().toUpperCase()}`, 68 + shift, 331.3, this.blocks ? 317.5 : 362.8, 11.33, true);
      if (this.blocks) this.rect(480, 94.5, 211.7, 272.1, "#783cff");
      await this.image(profile, 461.1, 75.6, 211.7, 272.1, "cover", 0.5, this.imageRadius); await this.image(cover, 0, 385.5, 794, 737.5);
      if (this.blocks) ["#0d74ff", "#ffd31b", "#fe171d", "#783cff"].forEach((color, index) => this.rect(60.5 + index * 183.375, 385.5, 183.375, 15.1, color));
    } else if (variant === "F") {
      await this.image(cover, 0, 0, 794, 1123); await this.qr(574.8, 75.6, -5);
      this.rect(68 + shift, 830.17, 658 - shift, 224.83, "#ffffff", this.blocks ? 0 : this.boldName ? 18.9 : 0);
      const badge = `PORTFOLIO ${new Date(this.project.updatedAt).getFullYear()}`, badgeW = this.width(badge, 12, true) + (badge.length - 1) * 0.48 + 37.8, bx = 684.4 - badgeW, by = 811.27;
      this.doc.save().rotate(6, { origin: [(bx + badgeW / 2) * this.sx, (by + 16.3) * this.sy] });
      if (this.gradient) this.paintGradient(bx, by, badgeW, 32.6, 90, 16.3);
      else this.rect(bx, by, badgeW, 32.6, this.rounded || this.cards || this.blocks ? "#ffd31b" : "#000000", this.rounded || this.cards || this.blocks ? 16.3 : 0);
      this.text(badge, bx + 18.9, by + 7.6, badgeW - 37.7, 12, true, this.rounded || this.cards || this.blocks ? "#000000" : "#ffffff", 1.45, "left", undefined, false, 0.04); this.doc.restore();
      const end = this.name(109.6 + shift, 871.77, 574.8 - shift, 53.33); this.discipline(109.6 + shift, end + 18.9, 360 - shift); this.text(this.dateLine().toUpperCase(), 482, end + 21, 163, 12, false, "#4a4a52", 1.45, "right"); this.brandImage("mark", 659.2, end + 18.9, 25.2, 22.7);
    } else {
      if (this.editorial && this.project.includeBranding) this.doc.image(this.monochromeLogo, 68 * this.sx, 37.8 * this.sy, { width: 87.1 * this.sx, height: 18.9 * this.sy });
      else this.brandImage("logo", 68, 37.8, 87.1, 18.9);
      this.text(`${this.label("IZDANJE", "EDITION")} ${new Date(this.project.updatedAt).getFullYear()}`, 550, 37.8, 176, 10, false, ink, 1.45, "right", undefined, false, 0.14);
      this.text("PORTFOLIO", 64.3, 64.3, 661.7, 112, true, this.gradient ? "#3a3a40" : ink, 0.84, "left", undefined, false, -0.02);
      for (const y of [177.6, 181.8, 215.4, 219.6]) this.rule(68, y, 658);
      this.text(clean(this.project.discipline).toUpperCase(), 68, 190.9, 400, 11.33, true, ink, 1.45, "left", undefined, false, 0.1); this.text(this.dateLine().toUpperCase(), 480, 190.9, 246, 11.33, false, ink, 1.45, "right", undefined, false, 0.1);
      if (this.gradient) this.paintGradient(68, 234.3, 328.8, 771, 180, [11.3, 0, 0, 11.3], [[0, "#0d74ff"], [.55, "#783cff"], [1, "#fe171d"]]);
      else this.shape(68, 234.3, 328.8, 771, this.cards ? [15.1, 0, 0, 15.1] : this.imageRadius).fill(this.cards ? "#ffffff" : ink);
      await this.image(cover, 396.8, 234.3, 329.2, 771, "cover", 0.5, this.cards ? [0, 15.1, 15.1, 0] : this.gradient ? [0, 11.3, 11.3, 0] : this.imageRadius, this.editorial ? 1.05 : undefined); const end = this.name(90.7, 264.6, 283.5, 45.33, "left", this.cards ? ink : "#ffffff"); this.discipline(90.7, end + 18.9, 283.5, 14.67, "left", this.cards ? "#666666" : "#bfbfbf");
      const items = this.coverItems(plan);
      items.forEach((item, index) => { this.rule(90.7, 854.2 + index * 31.6, 166.3, this.cards ? "#a6a6a6" : "#b3b3b3"); this.text(item, 90.7, 861.8 + index * 31.6, 220, 11.33, true, this.cards ? ink : "#ffffff", 1.45, "left", undefined, false, 0.08); });
      if (this.cards) this.rect(269.9, 492.9, 253.9, 253.9, "#eef0f4", 126.95);
      else this.rect(272.1, 495.1, 249.5, 249.5, "#ffffff", this.boldName || this.editorial ? 124.75 : 0);
      await this.image(profile, 275.9, 498.9, 241.9, 241.9, "cover", 0.5, this.boldName || this.editorial ? 120.95 : 0, this.editorial ? 1.05 : undefined);
    }
    if (this.blocks) this.blockRail();
  }
  private blockRail() {
    this.rect(0, 0, 60.5, 1123, "#0d74ff");
    const value = `PORTFOLIO ${this.dateLine().slice(-4)}`, height = this.width(value, 12, true) + value.length * 1.68;
    const x = 21.55, y = 68 + height;
    this.doc.save().rotate(-90, { origin: [x * this.sx, y * this.sy] });
    this.text(value, x, y, 1000, 12, true, "#ffffff", 1.45, "left", undefined, false, .14); this.doc.restore();
  }
  private coverItems(plan: Plan) {
    const sections = plan.documentSelection.sections;
    return [sections.profile ? this.label("BIOGRAFIJA I MOTO", "BIOGRAPHY & MOTTO") : "", sections.featured ? `${plan.selectedArtworks.length} ${this.label("IZDVOJENIH RADOVA", "SELECTED WORKS")}` : "", sections.collections && plan.collectionCount ? (plan.collectionCount === 1 ? this.label("KOLEKCIJA", "COLLECTION") : this.label("KOLEKCIJE", "COLLECTIONS")) : "", [sections.cv && portfolioCvBlocks(this.project.cvSections).length ? "CV" : "", sections.contact ? this.label("KONTAKT", "CONTACT") : ""].filter(Boolean).join(" · ")].filter(Boolean);
  }
  private async blocksMagazine(plan: Plan, cover: string | null | undefined, profile: string | null | undefined) {
    this.brandImage("logo", 113.4, 37.8, 87.1, 18.9);
    this.text(`${this.label("IZDANJE", "EDITION")} ${this.dateLine().slice(-4)}`, 550, 37.8, 176, 10, false, ink, 1.45, "right", undefined, false, .14);
    // The supplied heading intentionally overflows its CSS box. Emit one line.
    this.text("PORTFOLIO", 109.6, 64.3, 684.4, 112, true, ink, .84, "left", undefined, false, -.02);
    for (const y of [177.6, 181.8, 215.4, 219.6]) this.rule(113.4, y, 612.6);
    this.text(clean(this.project.discipline).toUpperCase(), 113.4, 190.9, 354.6, 11.33, true, ink, 1.45, "left", undefined, false, .1);
    this.text(this.dateLine().toUpperCase(), 480, 190.9, 246, 11.33, false, ink, 1.45, "right", undefined, false, .1);
    this.rect(113.4, 234.3, 332.6, 771, "#0d74ff"); await this.image(cover, 446, 234.3, 280, 771);
    const end = this.name(136.1, 264.6, 283.5, 45.33, "left", "#ffffff");
    this.text(clean(this.project.discipline).toUpperCase(), 136.1, end + 18.9, 283.5, 14.67, false, "#c3dcff", 1.45, "left", undefined, false, .1);
    const items = this.coverItems(plan);
    items.forEach((item, index) => { this.rule(136.1, 854.75 + index * 32.73, 166.3, "#b6d5ff"); this.text(item, 136.1, 862.9 + index * 32.73, 220, 11.33, true, "#ffffff", 1.45, "left", undefined, false, .08); });
    this.rect(269.9, 492.9, 253.9, 253.9, "#ffd31b", 126.95); await this.image(profile, 275.9, 498.9, 241.9, 241.9, "cover", .5, 120.95);
  }
  private profile() {
    if (this.editorial) return this.editorialProfile();
    const title = this.label("Profil umjetnika", "Artist profile"); this.page(title); let y = this.contentTop;
    if (clean(this.project.biography)) {
      this.text(this.label("BIOGRAFIJA", "BIOGRAPHY"), 68, y, 658, 15.33, true); y += 35.4;
      for (const paragraph of clean(this.project.biography).split(/\n\s*\n/)) y = this.flow(paragraph, 68, y, 658, title, 14, ink) + 11.3;
    }
    y += 37.8; if (y > 720) { this.page(title); y = this.contentTop; }
    const date = this.project.dateOfBirth ? new Date(this.project.dateOfBirth).toISOString().slice(0, 10).split("-").reverse().join(".") + "." : "";
    const fields = [[this.label("DISCIPLINA", "DISCIPLINE"), this.project.discipline], [this.label("DATUM ROĐENJA", "DATE OF BIRTH"), date], ["EMAIL", this.project.email], [this.label("BROJ TELEFONA", "PHONE NUMBER"), this.project.phone]];
    const links = this.links();
    const height = (value: unknown, width: number, size: number, leading = 1.45) => clean(value) ? this.lines(clean(value), width, size).length * size * leading : 0;
    const leftHeight = height(this.project.motto, 412.3, 21.33, 1.28) + height(this.project.mottoAuthor, 412.3, 12.27) + height(this.project.artistStatement, 412.3, 14, 1.5) + 120;
    const rightHeight = fields.reduce((h, [, value]) => h + (clean(value) ? 36.1 + height(value, 185.2, 12.27) : 0), 0)
      + (links.length ? 20.2 + links.reduce((h, [name, value]) => h + height(`${name}: ${value}`, 185.2, 11.07) + 6, 0) : 0);
    if (y + Math.max(leftHeight, rightHeight) > 1005) {
      // The reference's fixed columns clip unusually long input. Keep the same
      // typography but let these exceptional documents continue in one column.
      for (const [label, value] of [[this.label("MOTO", "MOTTO"), this.project.motto], [this.label("AUTOR CITATA", "QUOTE AUTHOR"), this.project.mottoAuthor], [this.label("O RADU UMJETNIKA", "ARTIST STATEMENT"), this.project.artistStatement], ...fields]) if (clean(value)) {
        if (y + 70 > 1005) { this.page(title); y = this.contentTop; }
        this.text(label, 68, y, 658, 15.33, true); y = this.flow(value, 68, y + 35.4, 658, title) + 26.5;
      }
      for (const [name, target] of links) y = this.flow(`${name}: ${target}`, 68, y, 658, title, 12.27, ink, 1.45, 1005, false, target) + 11.3;
      return;
    }
    const top = y; let left = y;
    if (clean(this.project.motto)) { this.text(this.label("MOTO", "MOTTO"), 68, left, 412.3, 15.33, true); left += 35.4; if (this.gradient) { this.rule(68, left, 37.8); left += 12.4; } left = this.flow(this.project.motto, 68, left, 412.3, title, 21.33, ink, 1.28); if (clean(this.project.mottoAuthor)) left = this.flow(this.project.mottoAuthor, 68, left + 11.3, 412.3, title, 12.27); left += 26.5; }
    if (clean(this.project.artistStatement)) { this.text(this.label("O RADU UMJETNIKA", "ARTIST STATEMENT"), 68, left, 412.3, 15.33, true); this.flow(this.project.artistStatement, 68, left + 35.4, 412.3, title); }
    let right = top;
    for (const [index, [label, value]] of fields.entries()) if (clean(value)) {
      this.text(label, 540.8, right, 185.2, 11.33, true);
      right = this.text(value, 540.8, right + 20.2, 185.2, 12.27, false, index === 1 || index === 3 ? muted : ink, 1.45, "left", index === 2 ? `mailto:${value}` : undefined) + 15.9;
    }
    if (links.length) { this.text(this.label("LINKOVI", "LINKS"), 540.8, right, 185.2, 11.33, true); right += 20.2; for (const [label, value] of links) right = this.text(`${label}: ${value.replace(/^https?:\/\//, "")}`, 540.8, right, 185.2, 11.07, false, ink, 1.45, "left", value) + 6; }
    if (this.gradient) this.paintGradient(514.3, top, 1.1, Math.min(1005, right) - top, 180);
    else this.doc.moveTo(514.3 * this.sx, top * this.sy).lineTo(514.3 * this.sx, Math.min(1005, right) * this.sy).lineWidth(1.1 * this.sx).strokeColor(ink).stroke();
  }
  private async featured(artworks: any[]) {
    const perPage = this.editorial || this.cards ? 6 : 9;
    for (let offset = 0; offset < artworks.length; offset += perPage) {
      this.page(this.label("Izdvojeni radovi", "Selected works"));
      for (const [index, artwork] of artworks.slice(offset, offset + perPage).entries()) {
        if (this.editorial || this.cards) {
          const cells = [[0, 0, 433.63, 433.3], [2, 0, 209.27, 209.1], [2, 1, 209.27, 209.1], [0, 2, 209.27, 209.1], [1, 2, 209.27, 209.1], [2, 2, 209.27, 209.1]];
          const [col, row, w, h] = cells[index]!, x = 68 + col! * 224.37, y = this.contentTop + row! * 224.2;
          await this.image(artwork.imageUrl, x, y, w!, h!, "cover", .5, this.imageRadius);
          if (this.editorial) this.editorialTileNumber(offset + index + 1, x, y + h!);
        } else await this.image(artwork.imageUrl, 68 + (index % 3) * 224.4, this.contentTop + Math.floor(index / 3) * 224.2, 209.3, 209.1, "cover", 0.5, this.imageRadius);
      }
    }
  }
  private async collection(collection: any, artworks: any[]) {
    if (this.editorial) return this.editorialCollection(collection, artworks);
    const title = this.label("Kolekcija", "Collection"); this.page(title);
    const top = this.contentTop;
    const main = collection?.coverImageUrl || this.project.collectionCoverUrl || artworks[0]?.imageUrl;
    const rest = artworks.filter(artwork => artwork.imageUrl !== main).slice(0, 2);
    await this.image(main, 68, top, rest.length ? 433.7 : 658, 672.8, "cover", 0.5, this.imageRadius);
    for (const [index, artwork] of rest.entries()) await this.image(artwork.imageUrl, 516.8, top + index * 343.95, 209.2, rest.length === 1 ? 672.8 : 328.85, "cover", 0.5, this.imageRadius);
    const name = collection?.title || this.project.collectionName;
    let y = this.caption(clean(name), collection?.year || this.project.collectionYear, top + 706.8, " ");
    if (clean(collection?.description || this.project.collectionDescription)) this.flow(collection?.description || this.project.collectionDescription, 68, y + 15.1, 658, title);
  }
  private async artwork(artwork: any, collection: any, index: number, count: number) {
    if (this.editorial) return this.editorialArtwork(artwork, collection, index, count);
    const title = collection ? this.label("Kolekcija", "Collection") : this.label("Umjetnički radovi", "Artworks"); this.page(title);
    let imageY = this.contentTop, imageH = 551.8;
    if (collection) {
      this.text(joined(collection.title, collection.year).toUpperCase(), 68, this.contentTop, 495, 12, true, muted);
      this.text(`${this.label("RAD", "WORK")} ${String(index).padStart(2, "0")} / ${String(count).padStart(2, "0")}`, 570, this.contentTop, 156, 12, true, ink, 1.45, "right");
      if (!this.rounded) this.rule(68, 178, 658);
      imageY = this.contentTop + 45.9; imageH = 468.7;
    }
    await this.image(artwork.imageUrl, 68, imageY, 658, imageH, "contain", 0.5, this.imageRadius);
    const y = imageY + imageH + 26.5;
    const values = [[this.label("NAZIV RADA", "TITLE"), artwork.title], [this.label("GODINA", "YEAR"), artwork.year], [this.label("KOLEKCIJA", "COLLECTION"), collection?.title || artwork.collectionName || "—"], [this.label("TEHNIKA / DISCIPLINA", "TECHNIQUE / DISCIPLINE"), joined(artwork.technique || this.project.discipline, artwork.dimensions)]];
    let metadataEnd = y, rowY = y;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) { const entry = values[row * 2 + col]!, x = 68 + col * 347.9; this.text(entry[0], x, rowY, 310.1, 11.33, true); metadataEnd = Math.max(metadataEnd, this.text(entry[1] || "—", x, rowY + 20.2, 310.1, 12.27, false, muted)); }
      rowY = metadataEnd + 15.9;
    }
    if (metadataEnd + 70 > 1005) { this.page(title); metadataEnd = 124; }
    let textY = this.caption(joined(artwork.title, artwork.technique || this.project.discipline), artwork.year, metadataEnd + 27.2);
    if (clean(artwork.description)) textY = this.flow(artwork.description, 68, textY + 15.1, 658, title, collection ? 13.33 : 14);
    if (this.project.includePrices && clean(artwork.price)) this.flow(artwork.price, 68, textY + 15.1, 658, title, 12.27, ink, 1.45, 1005, true);
  }
  private links(): Array<[string, string]> {
    return [["Behance", this.project.behanceUrl], ["Instagram", this.project.instagramUrl], [this.label("Web", "Website"), this.project.websiteUrl]].map(([name, url]) => [name, link(url)]).filter(row => row[1]) as Array<[string, string]>;
  }
  private async contact(artworks: any[]) {
    if (this.editorial) return this.editorialContact(artworks);
    const title = this.label("Kontakt", "Contact"); this.page(title); await this.image(this.project.profileImageUrl, 68, this.contentTop, 189, 211.7, "cover", 0.5, this.imageRadius);
    let y = this.text(clean(this.project.artistName).toUpperCase(), 294.8, this.contentTop + 7.6, 431.2, 14.67, true) + 18.9;
    for (const value of [this.project.email, this.project.phone, this.project.artboardProfileUrl, this.project.location].map(clean).filter(Boolean)) {
      this.rule(294.8, y + 9, 11.3); const target = value === this.project.email ? `mailto:${value}` : link(value);
      y = this.flow(value.replace(/^https?:\/\//, ""), 317.4, y, 408.6, title, 12.53, ink, 1.45, 1005, false, value === this.project.location || value === this.project.phone ? undefined : target) + 11.3;
    }
    y = Math.max(this.contentTop + 211.7, y) + 34;
    if (y > 800) { this.page(title); y = this.contentTop; }
    this.text(this.label("PORTFOLIO LINKOVI", "PORTFOLIO LINKS"), 68, y, 476.6, 15.33, true);
    let linksY = y + 35.4;
    await this.qr(574.8, y, 0, true);
    for (const [name, target] of this.links()) linksY = this.flow(`${name}: ${target.replace(/^https?:\/\//, "")}`, 68, linksY, 476.6, title, 12.53, ink, 1.45, 1005, false, target) + 6;
    let imageY = this.gradient ? 638.5 : 650.9;
    if (linksY > imageY - 20) { this.page(title); imageY = this.contentTop; }
    await this.image(this.project.coverImageUrl || artworks[0]?.imageUrl, 68, imageY, 658, 370.1, "cover", 0.4, this.imageRadius);
    if (this.gradient) this.rule(68, imageY + 381.4, 658);
  }
  private vertical(x: number, y: number, height: number) {
    this.doc.moveTo(x * this.sx, y * this.sy).lineTo(x * this.sx, (y + height) * this.sy).lineWidth(1.1 * this.sx).strokeColor(ink).stroke();
  }
  private editorialTileNumber(number: number, x: number, bottom: number) {
    const value = String(number).padStart(2, "0"), width = this.width(value, 10.67, true) + 10.4;
    this.rect(x, bottom - 19.97, width, 19.97, "#ffffff");
    this.text(value, x, bottom - 15.47, width, 10.67, true, ink, 1.45, "left", undefined, false, .06);
  }
  private editorialHeading(title: string, y: number, width = 658) {
    this.text(title.toUpperCase(), 68, y, width, 15.33, true);
    const line = y + 15.33 * 1.45 + 7.6;
    this.rule(68, line + .55, width); return line + 1.1 + 13.2;
  }
  // Balanced columns retain every line and continue on another physical page
  // when the Artifact's fixed-height, overflow:hidden box would lose content.
  private editorialColumns(value: unknown, y: number, title: string, dropCap = false, color = muted) {
    const paragraphs = clean(value).split(/\n\s*\n/), rows: Array<{ value: string; indent: number; gap: number }> = [];
    const first = dropCap ? Array.from(paragraphs[0] || "")[0] || "" : "";
    const indent = first ? this.width(first, 56, true) + 7.6 : 0;
    if (first) paragraphs[0] = paragraphs[0]!.slice(first.length);
    for (const paragraph of paragraphs) {
      let remaining = paragraph;
      while (remaining && indent && rows.length < 3) {
        const inset = indent;
        const line = this.lines(remaining, 313.9 - inset, 13.33)[0]!;
        rows.push({ value: line, indent: inset, gap: 0 }); remaining = remaining.slice(line.length).trimStart();
      }
      if (remaining) for (const line of this.lines(remaining, 313.9, 13.33)) rows.push({ value: line, indent: 0, gap: 0 });
      if (rows.length) rows.at(-1)!.gap = 11.3;
    }
    if (!rows.length) return y;
    rows.at(-1)!.gap = 0;
    const heights = [0]; for (const row of rows) heights.push(heights.at(-1)! + 19.995 + row.gap);
    let offset = 0, firstPage = true;
    while (offset < rows.length) {
      if (y + 60 > 1005) { this.page(title); y = this.contentTop; }
      const maxHeight = 1005 - y;
      const height = (start: number, end: number) => heights[end]! - heights[start]! - (end > start ? rows[end - 1]!.gap : 0);
      let split = offset + 1, last = rows.length, difference = Infinity;
      for (let at = offset + 1; at <= rows.length; at++) {
        const a = height(offset, at), b = height(at, rows.length);
        if (a <= maxHeight && b <= maxHeight && Math.abs(a - b) < difference) { split = at; difference = Math.abs(a - b); }
      }
      if (!Number.isFinite(difference)) {
        split = offset + 1; while (split < rows.length && height(offset, split + 1) <= maxHeight) split++;
        last = split; while (last < rows.length && height(split, last + 1) <= maxHeight) last++;
      }
      let end = y;
      for (const [col, stop] of [split, last].entries()) {
        let cursor = y;
        while (offset < stop) {
          const row = rows[offset]!, x = 68 + col * 344.1;
          if (firstPage && col === 0 && offset === 0 && first) this.text(first, 68, y + 3.8, indent, 56, true, ink, .82);
          const inset = firstPage && col === 0 ? row.indent : 0;
          this.text(row.value, x + inset, cursor, 313.9 - inset, 13.33, false, color, 1.5);
          cursor += 19.995 + row.gap; offset++;
        }
        end = Math.max(end, cursor - (rows[offset - 1]?.gap || 0));
      }
      this.vertical(397, y, end - y);
      if (offset === rows.length) return end;
      this.page(title); y = this.contentTop; firstPage = false;
    }
    return y;
  }
  private editorialProfile() {
    const title = this.label("Profil umjetnika", "Artist profile"); this.page(title); let y = this.contentTop;
    const ensure = (height: number) => { if (y + height > 1005) { this.page(title); y = this.contentTop; } };
    if (clean(this.project.biography)) y = this.editorialColumns(this.project.biography, this.editorialHeading(this.label("Biografija", "Biography"), y), title, true, ink);
    if (clean(this.project.motto)) {
      y += 30.2; ensure(130); this.rule(68, y, 658); y += 20;
      y = this.flow(this.project.motto, 68, y, 658, title, 29.33, ink, 1.22);
      y += 11.3;
      const prefix = this.label("MOTO", "MOTTO") + (clean(this.project.mottoAuthor) ? " · " : ""), width = this.width(prefix, 10.67) + prefix.length * 10.67 * .12;
      const end = this.text(prefix, 68, y, width + 1, 10.67, false, "#4a4a52", 1.45, "left", undefined, false, .12);
      y = Math.max(end, this.flow(clean(this.project.mottoAuthor).toUpperCase(), 68 + width, y, 658 - width, title, 10.67, muted, 1.45));
      this.rule(68, y + 18.9, 658); y += 20;
    }
    const date = this.project.dateOfBirth ? new Date(this.project.dateOfBirth).toISOString().slice(0, 10).split("-").reverse().join(".") + "." : "";
    const groups: Array<Array<[string, string, string?]>> = [
      [[this.label("Disciplina", "Discipline"), clean(this.project.discipline)], [this.label("Datum rođenja", "Date of birth"), date]],
      [["Email", clean(this.project.email), this.project.email ? `mailto:${this.project.email}` : undefined]],
      [[this.label("Broj telefona", "Phone number"), clean(this.project.phone)]],
      this.links().map(([label, target]) => [label, label, target]),
    ];
    y += 26.5;
    const heights = groups.map(group => group.reduce((h, [, value]) => h + (value ? 20.2 + this.lines(value, 138, 12.27).length * 17.79 + 15.9 : 0), 0));
    const height = Math.max(...heights);
    if (height <= 300) {
      ensure(height); const top = y;
      for (const [col, group] of groups.entries()) {
        const x = 68 + col * 168.275 + (col ? 16.2 : 0), width = col ? 137 : 153.175; let cursor = top;
        if (col && group.some(([, value]) => value)) this.vertical(x - 15.1, top, height);
        if (col === 3 && group.length) {
          this.text(this.label("LINKOVI", "LINKS"), x, cursor, width, 11.33, true); cursor += 20.2;
          for (const [, value, target] of group) cursor = this.text(value, x, cursor, width, 11.07, false, ink, 1.45, "left", target) + 6;
          continue;
        }
        for (const [label, value, target] of group) if (value) {
          this.text(label.toUpperCase(), x, cursor, width, 11.33, true);
          cursor = this.text(value, x, cursor + 20.2, width, col === 1 || col === 3 ? 11.07 : 12.27, false, ink, 1.45, "left", target) + 15.9;
        }
      }
      y += height;
    } else {
      for (const group of groups) for (const [label, value, target] of group) if (value) { ensure(70); this.text(label.toUpperCase(), 68, y, 658, 11.33, true); y = this.flow(value, 68, y + 20.2, 658, title, 12.27, ink, 1.45, 1005, false, target) + 15.9; }
    }
    if (clean(this.project.artistStatement)) { y += 26.5; ensure(90); y = this.editorialHeading(this.label("O radu umjetnika", "Artist statement"), y); this.flow(this.project.artistStatement, 68, y, 658, title, 13.33); }
  }
  private async editorialCollection(collection: any, artworks: any[]) {
    const title = this.label("Kolekcija", "Collection"); this.page(title);
    const main = collection?.coverImageUrl || this.project.collectionCoverUrl || artworks[0]?.imageUrl;
    const rest = artworks.filter(artwork => artwork.imageUrl !== main).slice(0, 2);
    await this.image(main, 68, this.contentTop, rest.length ? 433.63 : 658, 612.3); if (main) this.editorialTileNumber(1, 68, this.contentTop + 612.3);
    for (const [index, artwork] of rest.entries()) {
      const height = rest.length === 1 ? 612.3 : 298.6, y = this.contentTop + index * 313.7;
      await this.image(artwork.imageUrl, 516.73, y, 209.27, height); this.editorialTileNumber(index + 2, 516.73, y + height);
    }
    const top = this.contentTop + 612.3 + 30.2;
    this.rule(68, top + .55, 658); const y = top + 16.2;
    this.text(title.toUpperCase(), 68, y, 189, 10.67, false, "#4a4a52", 1.45, "left", undefined, false, .12);
    const year = clean(collection?.year || this.project.collectionYear); let size = 53.33;
    while (size > 16 && this.width(year, size, true) > 189) size -= .5;
    let left = this.text(year, 68, y + 21.17, 189, size, true, muted, .9, "left", undefined, false, -.02) + 18.9;
    this.rule(68, left + .55, 189); left += 8.7;
    this.text(this.label("BROJ RADOVA", "WORK COUNT"), 68, left, 189, 11.33, true);
    const n = artworks.length, ending = n % 10 === 1 && n % 100 !== 11 ? "rad" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "rada" : "radova";
    left = this.text(`${n} ${this.en ? n === 1 ? 'work' : 'works' : ending}`, 68, left + 20.2, 189, 12.27, false, muted);
    let cursor = y, dividerTop = y;
    const column = (value: string, fontSize: number, bold: boolean, leading: number, tracking = 0) => {
      for (const line of this.lines(value, 422.5, fontSize, bold)) {
        if (cursor + fontSize * leading > 1005) {
          this.vertical(280.25, dividerTop, 1005 - dividerTop); this.page(title); cursor = dividerTop = this.contentTop;
        }
        this.text(line, 303.5, cursor, 422.5, fontSize, bold, muted, leading, "left", undefined, false, tracking); cursor += fontSize * leading;
      }
    };
    column(clean(collection?.title || this.project.collectionName).toUpperCase(), 24, true, 1.25, .01);
    for (const [index, paragraph] of clean(collection?.description || this.project.collectionDescription).split(/\n\s*\n/).filter(Boolean).entries()) {
      cursor += index ? 9.4 : 13.2; column(paragraph, 13.33, false, 1.5);
    }
    this.vertical(280.25, dividerTop, Math.max(cursor, dividerTop === y ? left : cursor) - dividerTop);
  }
  private async editorialArtwork(artwork: any, collection: any, index: number, count: number) {
    const title = collection ? this.label("Kolekcija", "Collection") : this.label("Umjetnički radovi", "Artworks"); this.page(title);
    const imageH = collection ? 597.2 : 642.5, initialPage = this.doc.bufferedPageRange().count;
    await this.image(artwork.imageUrl, 68, this.contentTop, 438.8, imageH, "contain");
    this.text(collection ? this.label("KOLEKCIJA · RAD", "COLLECTION · WORK") : this.label("RAD", "WORK"), 537, this.contentTop, 189, 10.67, false, "#4a4a52", 1.45, "left", undefined, false, .12);
    const number = String(index).padStart(2, "0");
    this.text(number, 537, this.contentTop + 19.27, 189, 72, true, ink, .9, "left", undefined, false, -.02);
    if (collection) this.text(`/${String(count).padStart(2, "0")}`, 537 + this.width(number, 72, true) - number.length * 1.44, this.contentTop + 19.27 + 36, 100, 26.67, false, muted, .9);
    let y = this.contentTop + 99.17;
    const fields = [[this.label("NAZIV RADA", "TITLE"), artwork.title], [this.label("GODINA", "YEAR"), artwork.year], [this.label("KOLEKCIJA", "COLLECTION"), collection?.title || artwork.collectionName || "—"], [this.label("TEHNIKA / DISCIPLINA", "TECHNIQUE / DISCIPLINE"), joined(artwork.technique || this.project.discipline, artwork.dimensions)]];
    for (const [label, value] of fields) {
      if (y + 65 > 1005) { this.page(title); y = this.contentTop; }
      this.rule(537, y, 189); this.text(label, 537, y + 8.15, 189, 11.33, true);
      y = this.flow(value || "—", 537, y + 28.35, 189, title, 12.27, muted, 1.45) + 13.2;
    }
    y = Math.max(y, this.doc.bufferedPageRange().count === initialPage ? this.contentTop + imageH : y) + 26.5;
    if (y + 65 > 1005) { this.page(title); y = this.contentTop; }
    this.rule(68, y, 658); y += 16.2;
    y = this.caption(joined(artwork.title, artwork.technique || this.project.discipline), artwork.year, y, ", ", 20);
    if (clean(artwork.description)) y = this.editorialColumns(artwork.description, y + 13.2, title);
    if (this.project.includePrices && clean(artwork.price)) this.flow(artwork.price, 68, y + 15.1, 658, title, 12.27, ink, 1.45, 1005, true);
  }
  private async editorialContact(artworks: any[]) {
    const title = this.label("Kontakt", "Contact"); this.page(title);
    await this.image(this.project.profileImageUrl, 68, this.contentTop, 189, 211.7);
    let y = this.text(clean(this.project.artistName).toUpperCase(), 294.8, this.contentTop + 7.6, 431.2, 14.67, true) + 18.9;
    for (const value of [this.project.email, this.project.phone, this.project.artboardProfileUrl, this.project.location].map(clean).filter(Boolean)) {
      const target = value === this.project.email ? `mailto:${value}` : value === this.project.artboardProfileUrl ? link(value) : undefined;
      y = this.flow(value.replace(/^https?:\/\//, ""), 294.8, y, 431.2, title, 12.53, ink, 1.45, 1005, false, target);
      this.rule(294.8, y + 8.15, 431.2); y += 20;
    }
    y = Math.max(this.contentTop + 211.7, y - 11.3) + 34;
    if (y > 800) { this.page(title); y = this.contentTop; }
    await this.qr(574.8, y, 0, true);
    let linksY = this.editorialHeading(this.label("Portfolio linkovi", "Portfolio links"), y, 476.6);
    for (const [name, target] of this.links()) linksY = this.flow(`${name}: ${target.replace(/^https?:\/\//, "")}`, 68, linksY, 476.6, title, 12.53, ink, 1.45, 1005, false, target) + 6;
    let imageY = 650.9;
    if (Math.max(linksY, y + 165) > imageY - 20) { this.page(title); imageY = this.contentTop; }
    const url = this.project.coverImageUrl || artworks[0]?.imageUrl, w = 658, h = 370.1;
    this.doc.save(); this.shape(68, imageY, w, h).clip();
    await this.image(url, 68 - w * .58, imageY - h * .06, w * 1.65, h * 1.65, "cover", .5, 0, 1.1);
    this.doc.save(); this.shape(68 + w * .15, imageY + h * .06, w * .32, h * .70).clip();
    await this.image(url, 68 - w * .58, imageY - h * .06, w * 1.65, h * 1.65); this.doc.restore();
    this.shape(68 + w * .15 - 1.5, imageY + h * .06 - 1.5, w * .32 + 3, h * .70 + 3).lineWidth(3 * this.sx).strokeColor("#ffffff").stroke();
    const head = this.label("DETALJ", "DETAIL"), tail = this.label(" · NASLOVNA ILUSTRACIJA", " · COVER ILLUSTRATION"), headW = this.width(head, 10, true) + (head.length - 1) * 1.2;
    const tailW = this.width(tail, 10) + (tail.length - 1) * 1.2;
    this.rect(68, imageY + h - 20.5, headW + tailW + 11.3, 20.5, "#ffffff");
    this.text(head, 68, imageY + h - 14.5, headW + 2, 10, true, ink, 1.45, "left", undefined, false, .12);
    this.text(tail, 68 + headW, imageY + h - 14.5, tailW + 2, 10, false, ink, 1.45, "left", undefined, false, .12); this.doc.restore();
  }
  private cv() {
    const data = readPortfolioCv(this.project.cvSections);
    const extended = data && (JSON.stringify(data).length > 4500 || [data.skills, data.programs].some(value => value.split(/[,\n]/).some(item => item.length > 50)) || Object.values(data).some(value => Array.isArray(value) && value.length > 6));
    if (!data || extended) {
      const blocks = portfolioCvBlocks(this.project.cvSections, this.project.language); if (!blocks.length) return;
      this.serial = 0; this.cvPage(); let y = this.contentTop;
      for (const block of blocks) { y = this.cvHeading(block.title, y); for (const item of block.items) y = this.cvFlow(item, 68, y, 658, 12.27) + 18.9; y += 26.5; } return;
    }
    this.serial = 0;
    const first = [...data.education, ...data.experience].some(row => Object.values(row.values).some(Boolean));
    if (first) {
      this.cvPage(); let y = this.contentTop;
      for (const section of ["education", "experience"] as const) {
        if (!data[section].some(row => Object.values(row.values).some(Boolean))) continue;
        const title = section === "education" ? this.label("Obrazovanje", "Education") : this.label("Radno iskustvo", "Experience");
        y = this.cvHeading(title, y);
        for (const { values: v } of data[section]) {
          if (!Object.values(v).some(Boolean)) continue;
          if (y > 900) { this.cvPage(); y = this.cvHeading(title, this.contentTop); }
          const start = y; this.text(v.period, 68, y, 151.2, 12.27, false, muted);
          y = this.cvFlow(clean(v.institution || v.organization).toUpperCase(), 234.3, y, 491.7, 13.33, true);
          if (v.degree || v.position) y = this.cvFlow(v.degree || v.position, 234.3, y, 491.7, 12.27);
          if (v.location) y = this.cvFlow(v.location, 234.3, y, 491.7, 12.27, false, true);
          y = Math.max(y, start + 17.8);
          if (v.description) y = this.cvFlow(v.description, 68, y + 5.7, 658, 12.27);
          y += section === "education" ? 18.9 : 20.8;
        }
        y += 26.5;
      }
    }
    const second = data.skills || data.programs || ["exhibitions", "awards", "certificates", "publications"].some(key => (data as any)[key].some((row: any) => Object.values(row.values).some(Boolean)));
    if (!second) return;
    this.cvPage(); let y = this.contentTop;
    if (data.skills || data.programs) {
      let end = y;
      for (const [index, key] of (["skills", "programs"] as const).entries()) {
        if (!data[key]) continue;
        const x = 68 + index * 346; let cursor = this.cvHeading(key === "skills" ? this.label("Vještine", "Skills") : this.label("Programi", "Software"), y, x, 312);
        const items = data[key].split(/[,\n]/).map(clean).filter(Boolean);
        for (let i = 0; i < items.length; i += 2) {
          const pair = items.slice(i, i + 2), height = Math.max(...pair.map(item => this.lines(item, 126, 12.53).length * 12.53 * 1.45));
          if (cursor + height > 1005) { this.cvPage(); cursor = this.cvHeading(key === "skills" ? this.label("Vještine", "Skills") : this.label("Programi", "Software"), this.contentTop, x, 312); }
          pair.forEach((item, col) => { const colX = x + col * 166; this.rule(colX, cursor + 9, 11.3); this.text(item, colX + 20.4, cursor, 126, 12.53, false, muted); });
          cursor += height + 6.8;
        }
        if (this.editorial && index === 1) this.vertical(x - 17, y, cursor - 6.8 - y);
        end = Math.max(end, cursor - 6.8);
      }
      y = end + 22.7;
    }
    for (const section of ["exhibitions", "awards"] as const) {
      if (!data[section].some(row => Object.values(row.values).some(Boolean))) continue;
      y = this.cvHeading(section === "exhibitions" ? this.label("Izložbe", "Exhibitions") : this.label("Nagrade", "Awards"), y);
      for (const { values: v } of data[section]) {
        if (!Object.values(v).some(Boolean)) continue;
        if (y > 935) { this.cvPage(); y = this.contentTop; }
        this.text(v.year, 68, y, 151.2, 12.27, false, muted);
        y = this.cvFlow(joined(v.title, section === "exhibitions" ? v.location : "").toUpperCase(), 234.3, y, 491.7, 13.33, true);
        y = this.cvFlow(section === "exhibitions" ? v.type : joined(v.category, v.location), 234.3, y, 491.7, 12.27) + 9.8;
      }
      y += 11.3;
    }
    const top = y; let bottom = y;
    for (const [index, section] of (["certificates", "publications"] as const).entries()) {
      if (!data[section].some(row => Object.values(row.values).some(Boolean))) continue;
      const x = 68 + index * 346; let cursor = this.cvHeading(section === "certificates" ? this.label("Sertifikati", "Certificates") : this.label("Publikacije", "Publications"), top, x, 312);
      for (const { values: v } of data[section]) {
        if (!Object.values(v).some(Boolean)) continue;
        cursor = this.cvFlow(clean(v.title).toUpperCase(), x, cursor, 312, 11.33, true);
        if (v.field) cursor = this.cvFlow(v.field, x, cursor, 312, 12.27);
        if (v.issuer) cursor = this.cvFlow(v.issuer, x, cursor, 312, 12.27);
        if (v.link) cursor = this.cvFlow(v.link, x, cursor, 312, 12.27);
        cursor += 10.6;
      }
      if (this.editorial && index === 1) this.vertical(x - 17, top, cursor - 10.6 - top);
      bottom = Math.max(bottom, cursor);
    }
  }
  private cvPage() { this.serial++; this.page(`CV – ${this.serial}`); }
  private cvHeading(title: string, y: number, x = 68, width = 658) {
    if (y + 65 > 1005) { this.cvPage(); y = this.contentTop; }
    const end = this.text(title.toUpperCase(), x, y, width, 15.33, true);
    if (this.editorial) this.rule(x, end + 8.15, width);
    return end + (this.editorial ? 8.7 : 0) + 13.2;
  }
  private cvFlow(value: unknown, x: number, y: number, width: number, size: number, bold = false, italic = false) {
    for (const line of this.lines(clean(value), width, size, bold)) { if (y + size * 1.45 > 1005) { this.cvPage(); y = this.contentTop; } this.text(line, x, y, width, size, bold, muted, 1.45, "left", undefined, italic); y += size * 1.45; }
    return y;
  }
}
