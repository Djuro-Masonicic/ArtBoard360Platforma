import { buildPortfolioDocumentPlan, portfolioCvBlocks, readPortfolioCv, type DocumentPage } from "@artboard/portfolio-document-plan";

// Layout only. Fonts, images, safe QR links, page creation and watermarking
// remain in the existing PDFKit pipeline shared by all reference templates.
type Text = (value: unknown, x: number, y: number, width: number, size?: number, bold?: boolean, color?: string, leading?: number, align?: "left" | "right" | "center", target?: string, italic?: boolean, tracking?: number) => number;
export interface CardsPageKit {
  project: Record<string, any>;
  page(title: string): void;
  text: Text;
  lines(value: string, width: number, size: number, bold?: boolean): string[];
  width(value: string, size: number, bold?: boolean): number;
  rect(x: number, y: number, width: number, height: number, color: string, radius?: number): void;
  image(url: string | null | undefined, x: number, y: number, width: number, height: number, fit?: "cover" | "contain", positionY?: number, radius?: number): Promise<void>;
  qr(x: number, y: number): Promise<void>;
  badge(value: string, x: number, y: number, width: number): void;
  rule(x: number, y: number, width: number, color?: string): void;
  links(): Array<[string, string]>;
  link(value: unknown): string | undefined;
}
type Command = { y: number; height: number; text: boolean; draw(top: number, left: number): void | Promise<void> };
type Plan = ReturnType<typeof buildPortfolioDocumentPlan<any, any>>;
const ink = "#0a0a0a", muted = "#8e8e96", contentWidth = 612.6;
const clean = (v: unknown) => typeof v === "string" ? v.trim() : "";
const joined = (...v: unknown[]) => v.map(clean).filter(Boolean).join(", ");

class Card {
  commands: Command[] = [];
  height = 0;
  constructor(private readonly k: CardsPageKit) {}
  add(y: number, height: number, draw: Command["draw"], text = false) { this.commands.push({ y, height, draw, text }); this.height = Math.max(this.height, y + height); }
  text(value: unknown, x: number, y: number, width: number, size = 14, bold = false, color = muted, leading = 1.45, target?: string, italic = false, tracking?: number) {
    if (!clean(value)) return y;
    for (const line of this.k.lines(clean(value), width, size, bold)) {
      const at = y;
      this.add(at, size * leading, (top, left) => { this.k.text(line, left + x, top + at, width, size, bold, color, leading, "left", target, italic, tracking); }, true); y += size * leading;
    }
    return y;
  }
  heading(value: string, y = 0, x = 0, width = contentWidth) { return this.text(value.toUpperCase(), x, y, width, 15.33, true, ink) + 13.2; }
  caption(prefix: unknown, suffix: unknown, y: number, separator = ", ") {
    const tail = clean(suffix).toUpperCase(), head = clean(prefix).toUpperCase() + (tail ? separator : ""), width = this.k.width(head, 17.33, true) + Math.max(0, head.length - 1) * .1733;
    if (width + this.k.width(tail, 17.33) <= contentWidth) {
      const a = this.text(head, 0, y, width + 1, 17.33, true, muted, 1.25, undefined, false, .01);
      return Math.max(a, this.text(tail, width, y, contentWidth - width, 17.33, false, muted, 1.25, undefined, false, .01));
    }
    return this.text(head + tail, 0, y, contentWidth, 17.33, true, muted, 1.25);
  }
  paragraphs(value: unknown, y: number, size = 14, width = contentWidth, x = 0, color = muted, firstGap = 0, gap = 9.4) {
    for (const [i, p] of clean(value).split(/\n\s*\n/).filter(Boolean).entries()) y = this.text(p, x, y + (i ? gap : firstGap), width, size, false, color, 1.5);
    return y;
  }
}

export class CardsPdfPages {
  private y = 136.1;
  private title = "";
  private cvSerial = 0;
  constructor(private readonly k: CardsPageKit) {}
  private get p() { return this.k.project; }
  private label(me: string, en: string) { return this.p.language === "EN" ? en : me; }
  private page(title: string) { this.title = title; this.k.page(title); this.y = 136.1; }
  private continuation() { this.page(this.title.startsWith("CV – ") ? `CV – ${++this.cvSerial}` : this.title); }
  private cvPage() { this.page(`CV – ${++this.cvSerial}`); }
  private async put(card: Card, split = false) {
    if (!card.commands.length) return;
    // Measure before painting. Images stay atomic; each text line belongs to
    // the page containing its top. The 22.7px bottom padding fits the complete
    // ink height of these <=21.33px fonts even when column baselines differ.
    if (!split && card.height + 45.4 <= 884.9 && this.y + card.height + 45.4 > 1021) this.continuation();
    let offset = 0;
    while (offset < card.height) {
      if (this.y + 75 > 1021) this.continuation();
      let end = Math.min(card.height, offset + 1021 - this.y - 45.4);
      for (;;) {
        const crossing = card.commands.filter(c => !c.text && c.y < end - .01 && c.y + c.height > end + .01);
        const cut = crossing.length ? Math.min(...crossing.map(c => c.y)) : end;
        if (cut >= end - .01) break; end = cut;
      }
      if (end <= offset + .01) { this.continuation(); continue; }
      this.k.rect(68, this.y, 658, end - offset + 45.4, "#ffffff", 15.1);
      for (const c of card.commands) if (c.y >= offset - .01 && (c.text ? c.y < end - .01 : c.y + c.height <= end + .01)) await c.draw(this.y + 22.7 - offset, 90.7);
      this.y += end - offset + 60.5; offset = end;
      if (offset < card.height) {
        if (!card.commands.some(c => c.y >= offset - .01)) break;
        this.continuation();
      }
    }
  }
  async render(page: DocumentPage, plan: Plan) {
    if (page.kind === "profile") return this.profile();
    if (page.kind === "contact") return this.contact(plan.selectedArtworks);
    if (page.kind === "cv") return this.cv();
    if (page.kind !== "collection" && page.kind !== "artwork") return;
    const group = plan.groups.find(g => page.kind === "collection" ? (g.collection?.id ?? null) === page.collectionId : g.artworks.some((a: any) => a.id === page.artworkId));
    if (!group) return;
    if (page.kind === "collection") return this.collection(group.collection, group.artworks);
    const artwork = group.artworks.find((a: any) => a.id === page.artworkId);
    if (artwork) return this.artwork(artwork, group.collection ?? (group.legacyIntro ? { title: this.p.collectionName, year: this.p.collectionYear } : null), group.artworks.indexOf(artwork) + 1, group.artworks.length);
  }
  private async profile() {
    this.page(this.label("Profil umjetnika", "Artist profile"));
    if (clean(this.p.biography)) {
      const c = new Card(this.k); let y = c.heading(this.label("Biografija", "Biography"));
      for (const p of clean(this.p.biography).split(/\n\s*\n/)) y = c.text(p, 0, y, contentWidth, 14, false, ink, 1.5) + 11.3;
      c.height = Math.max(c.height, y); await this.put(c);
    }
    const c = new Card(this.k); let y = 0;
    if (clean(this.p.motto)) { y = c.heading(this.label("Moto", "Motto"), y, 0, 366.9); y = c.text(this.p.motto, 0, y, 366.9, 21.33, false, ink, 1.28); if (clean(this.p.mottoAuthor)) y = c.text(this.p.mottoAuthor, 0, y + 11.3, 366.9, 12.27); }
    if (clean(this.p.artistStatement)) { y = c.heading(this.label("O radu umjetnika", "Artist statement"), y ? y + 26.5 : 0, 0, 366.9); c.text(this.p.artistStatement, 0, y, 366.9); }
    let right = 0;
    const badgeWidth = this.k.width(clean(this.p.discipline), 11.33) + 24.8;
    if (clean(this.p.discipline) && badgeWidth <= 211.7) { c.add(0, 24.63, (top, left) => this.k.badge(this.p.discipline, left + 400.9, top, badgeWidth)); right = 41.63; }
    const date = this.p.dateOfBirth ? new Date(this.p.dateOfBirth).toISOString().slice(0, 10).split("-").reverse().join(".") + "." : "";
    for (const [index, [label, value, target]] of [[this.label("Disciplina", "Discipline"), this.p.discipline], [this.label("Datum rođenja", "Date of birth"), date], ["Email", this.p.email, this.p.email ? `mailto:${this.p.email}` : undefined], [this.label("Broj telefona", "Phone number"), this.p.phone]].entries()) if (clean(value)) {
      right = c.text(label!.toUpperCase(), 400.9, right, 211.7, 11.33, true, ink) + 3.8;
      right = c.text(value, 400.9, right, 211.7, 12.27, false, index === 1 || index === 3 ? muted : ink, 1.45, target) + 15.9;
    }
    const links = this.k.links();
    if (links.length) { right = c.text(this.label("LINKOVI", "LINKS"), 400.9, right, 211.7, 11.33, true, ink) + 3.8; for (const [name, url] of links) right = c.text(`${name}: ${url.replace(/^https?:\/\//, "")}`, 400.9, right, 211.7, 11.07, false, ink, 1.45, url) + 6; c.height = Math.max(c.height, right); }
    await this.put(c);
  }
  private async collection(collection: any, artworks: any[]) {
    this.page(this.label("Kolekcija", "Collection"));
    const main = collection?.coverImageUrl || this.p.collectionCoverUrl || artworks[0]?.imageUrl, rest = artworks.filter(a => a.imageUrl !== main).slice(0, 2);
    await this.k.image(main, 68, this.y, rest.length ? 433.63 : 658, 672.8, "cover", .5, 15.1);
    for (const [i, a] of rest.entries()) await this.k.image(a.imageUrl, 516.73, this.y + i * 343.95, 209.27, rest.length === 1 ? 672.8 : 328.85, "cover", .5, 15.1);
    this.y += 703;
    const c = new Card(this.k), end = c.caption(collection?.title || this.p.collectionName, collection?.year || this.p.collectionYear, 0, " ");
    c.paragraphs(collection?.description || this.p.collectionDescription, end, 14, contentWidth, 0, muted, 15.1); await this.put(c, true);
  }
  private async artwork(a: any, collection: any, index: number, count: number) {
    this.page(collection ? this.label("Kolekcija", "Collection") : this.label("Umjetnički radovi", "Artworks"));
    if (collection) {
      const name = clean(collection.title).toUpperCase(), year = clean(collection.year).toUpperCase(), suffix = year ? ` · ${year}` : "", width = this.k.width(name, 12, true) + Math.max(0, name.length - 1) * .72;
      let end: number;
      if (width + this.k.width(suffix, 12) + suffix.length * .72 <= 495) {
        end = this.k.text(name, 68, this.y, width + 1, 12, true, muted, 1.45, "left", undefined, false, .06);
        if (suffix) end = Math.max(end, this.k.text(suffix, 68 + width, this.y, 495 - width, 12, false, muted, 1.45, "left", undefined, false, .06));
      } else end = this.k.text(name + suffix, 68, this.y, 495, 12, true, muted, 1.45, "left", undefined, false, .06);
      this.k.text(`${this.label("RAD", "WORK")} ${String(index).padStart(2, "0")} / ${String(count).padStart(2, "0")}`, 570, this.y, 156, 12, true, ink, 1.45, "right", undefined, false, .06);
      this.k.rule(68, end + 8.85, 658); this.y = end + 43.4;
    }
    const height = collection ? 468.7 : 551.8;
    await this.k.image(a.imageUrl, 68, this.y, 658, height, "contain", .5, 15.1); this.y += height + 30.2;
    const c = new Card(this.k), fields = [[this.label("NAZIV RADA", "TITLE"), a.title], [this.label("GODINA", "YEAR"), a.year], [this.label("KOLEKCIJA", "COLLECTION"), collection?.title || a.collectionName || "—"], [this.label("TEHNIKA / DISCIPLINA", "TECHNIQUE / DISCIPLINE"), joined(a.technique || this.p.discipline, a.dimensions)]];
    let y = 0;
    for (let row = 0; row < 2; row++) {
      let end = y;
      for (let col = 0; col < 2; col++) { const [label, value] = fields[row * 2 + col]!, x = col * 325.2; c.text(label, x, y, 287.4, 11.33, true, ink); end = Math.max(end, c.text(value || "—", x, y + 20.23, 287.4, 12.27)); }
      y = end + 15.9;
    }
    y = c.caption(joined(a.title, a.technique || this.p.discipline), a.year, y + 11.3);
    y = c.paragraphs(a.description, y, collection ? 13.33 : 14, contentWidth, 0, muted, 15.1);
    if (this.p.includePrices && clean(a.price)) c.text(a.price, 0, y + 15.1, contentWidth, 12.27, true, ink);
    await this.put(c, true);
  }
  private async contact(artworks: any[]) {
    this.page(this.label("Kontakt", "Contact"));
    const c = new Card(this.k); if (this.p.profileImageUrl) c.add(0, 211.7, (top, left) => this.k.image(this.p.profileImageUrl, left, top, 189, 211.7, "cover", .5, 15.1));
    let y = c.text(clean(this.p.artistName).toUpperCase(), 226.8, 7.6, 385.8, 14.67, true, ink) + 18.9;
    for (const value of [this.p.email, this.p.phone, this.p.artboardProfileUrl, this.p.location].map(clean).filter(Boolean)) {
      const lineY = y; c.add(lineY + 9, 1.1, (top, left) => this.k.rule(left + 226.8, top + lineY + 9, 11.3));
      const target = value === this.p.email ? `mailto:${value}` : value === this.p.artboardProfileUrl ? this.k.link(value) : undefined;
      y = c.text(value.replace(/^https?:\/\//, ""), 249.4, y, 363.2, 12.53, false, ink, 1.45, target) + 11.3;
    }
    c.height = Math.max(c.height, y - 11.3); await this.put(c);
    const links = new Card(this.k); y = links.heading(this.label("Portfolio linkovi", "Portfolio links"), 0, 0, 431.2);
    for (const [name, url] of this.k.links()) y = links.text(`${name}: ${url.replace(/^https?:\/\//, "")}`, 0, y, 431.2, 12.53, false, ink, 1.45, url) + 6;
    links.add(0, 164.63, (top, left) => this.k.qr(left + 461.4, top)); await this.put(links);
    const imageHeight = 635.4 * 675 / 1200, height = imageHeight + 22.6;
    if (this.y + height > 1021) this.continuation(); this.y = Math.max(this.y, 1021 - height);
    this.k.rect(68, this.y, 658, height, "#ffffff", 15.1);
    await this.k.image(this.p.coverImageUrl || artworks[0]?.imageUrl, 79.3, this.y + 11.3, 635.4, imageHeight, "cover", .4, 9.4);
  }
  private async cv() {
    const data = readPortfolioCv(this.p.cvSections);
    if (!data) {
      const blocks = portfolioCvBlocks(this.p.cvSections, this.p.language); if (!blocks.length) return;
      this.cvPage(); for (const block of blocks) { const c = new Card(this.k); let y = c.heading(block.title); for (const item of block.items) y = c.text(item, 0, y, contentWidth, 12.27) + 18.9; await this.put(c); } return;
    }
    if ([...data.education, ...data.experience].some(row => Object.values(row.values).some(Boolean))) {
      this.cvPage();
      for (const section of ["education", "experience"] as const) {
        const rows = data[section].filter(row => Object.values(row.values).some(Boolean)); if (!rows.length) continue;
        const c = new Card(this.k); let y = c.heading(section === "education" ? this.label("Obrazovanje", "Education") : this.label("Radno iskustvo", "Experience"));
        for (const { values: v } of rows) {
          const periodEnd = c.text(v.period, 0, y, 151.2, 12.27);
          y = c.text(clean(v.institution || v.organization).toUpperCase(), 166.3, y, 446.3, 13.33, true);
          y = c.text(v.degree || v.position, 166.3, y, 446.3, 12.27); y = c.text(v.location, 166.3, y, 446.3, 12.27, false, muted, 1.45, undefined, true); y = Math.max(y, periodEnd);
          if (v.description) y = c.text(v.description, 0, y + 5.7, contentWidth, 12.27);
          y += 15.1;
        }
        c.height = Math.max(c.height, y); await this.put(c);
      }
    }
    if (!(data.skills || data.programs || [data.exhibitions, data.awards, data.certificates, data.publications].some(rows => rows.some(row => Object.values(row.values).some(Boolean))))) return;
    this.cvPage();
    if (data.skills || data.programs) {
      const c = new Card(this.k);
      for (const [index, key] of (["skills", "programs"] as const).entries()) if (data[key]) {
        const x = index * 323.3; let y = c.heading(key === "skills" ? this.label("Vještine", "Skills") : this.label("Programi", "Software"), 0, x, 289.3);
        const items = data[key].split(/[,\n]/).map(clean).filter(Boolean);
        for (let i = 0; i < items.length; i += 2) {
          let end = y;
          items.slice(i, i + 2).forEach((item, col) => { const left = x + col * 154.1, lineY = y; c.add(lineY + 9, 1.1, (top, origin) => this.k.rule(origin + left, top + lineY + 9, 11.3)); end = Math.max(end, c.text(item, left + 20.4, lineY, 114.8, 12.53)); });
          y = end + 6.8;
        }
      }
      await this.put(c);
    }
    const list = new Card(this.k); let y = 0;
    for (const section of ["exhibitions", "awards"] as const) {
      const rows = data[section].filter(row => Object.values(row.values).some(Boolean)); if (!rows.length) continue;
      y = list.heading(section === "exhibitions" ? this.label("Izložbe", "Exhibitions") : this.label("Nagrade", "Awards"), y ? y + 11.3 : 0);
      for (const { values: v } of rows) {
        const end = list.text(v.year, 0, y, 151.2, 12.27);
        y = list.text(joined(v.title, section === "exhibitions" ? v.location : "").toUpperCase(), 166.3, y, 446.3, 13.33, true);
        y = Math.max(end, list.text(section === "exhibitions" ? v.type : joined(v.category, v.location), 166.3, y, 446.3, 12.27)) + 6.8;
      }
    }
    list.height = Math.max(list.height, y); await this.put(list);
    const c = new Card(this.k);
    for (const [index, section] of (["certificates", "publications"] as const).entries()) {
      const rows = data[section].filter(row => Object.values(row.values).some(Boolean)); if (!rows.length) continue;
      const x = index * 323.3; let y = c.heading(section === "certificates" ? this.label("Sertifikati", "Certificates") : this.label("Publikacije", "Publications"), 0, x, 289.3);
      for (const { values: v } of rows) {
        y = c.text(clean(v.title).toUpperCase(), x, y, 289.3, 11.33, true) + 3.8;
        y = c.text(v.field, x, y, 289.3, 12.27); y = c.text(v.issuer, x, y, 289.3, 12.27); y = c.text(v.link, x, y, 289.3, 12.27); y += 10.6;
      }
      c.height = Math.max(c.height, y);
    }
    await this.put(c);
  }
}
