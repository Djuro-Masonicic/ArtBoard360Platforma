"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import markup from "./portfolio-design-preview-markup.json";
import styles from "./portfolio-design-workspace.module.css";
import type { MinimalDesign } from "@artboard/portfolio-document-plan";

const looks = [
  { id: "Minimal", name: "Minimal", samples: ["Minimal-A", "Minimal-G"] },
  { id: "Rounded", name: "Tačke", samples: ["Rounded-B", "Rounded-G"] },
  { id: "Gradient", name: "Gradijent", samples: ["Gradient-C", "Gradient-G"] },
  { id: "Editorial", name: "Editorijal", samples: ["Editorial-G", "Editorial-A"] },
  { id: "Cards", name: "Kartice", samples: ["Cards-F", "Cards-G"] },
  { id: "Blocks", name: "Blok", samples: ["Blocks-D", "Blocks-G"] },
] as const;
const covers = ["Velika slika", "Ime gore", "Centrirano", "Portret", "Vertikalno", "QR kartica", "Magazin"] as const;
const letters = ["A", "B", "C", "D", "E", "F", "G"] as const;
const parts = ["Naslovna", "Profil i biografija", "Kolekcija", "Strane radova", "Kontakt", "Podnožje"] as const;
type LookId = typeof looks[number]["id"];
type Letter = typeof letters[number];
const isImplementedLook = (look: LookId) => ["Minimal", "Rounded", "Gradient", "Editorial", "Cards", "Blocks"].includes(look);
const lookName = (look: LookId) => look === "Blocks" ? "Blok" : look === "Cards" ? "Kartice" : look === "Editorial" ? "Editorijal" : look === "Gradient" ? "Gradijent" : look === "Rounded" ? "Rounded" : "Minimal";
export type PortfolioDesignPreview = { look: LookId; cover: Letter; mode: "single" | "sections"; sections: Record<typeof parts[number], LookId> };
export function createPortfolioDesignPreview(): PortfolioDesignPreview {
  return { look: "Minimal", cover: "E", mode: "single", sections: { Naslovna: "Minimal", "Profil i biografija": "Minimal", Kolekcija: "Minimal", "Strane radova": "Minimal", Kontakt: "Minimal", Podnožje: "Minimal" } };
}
type SampleData = { coverImage?: string | null; profileImage?: string | null; artistName: string; discipline: string; artworkCount: number; qrTarget?: string | null; location?: string | null; year?: number; includeBranding?: boolean };
const qrCache = new Map<string, Promise<string>>();
function qrImage(target: string) {
  if (!qrCache.has(target)) { if (qrCache.size > 50) qrCache.clear(); qrCache.set(target, import('qrcode').then(module => module.toString(target, { type: 'svg', margin: 4, errorCorrectionLevel: 'M' })).then(svg => `data:image/svg+xml,${encodeURIComponent(svg)}`)); }
  return qrCache.get(target)!;
}
const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const fallback = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="#ff973f"/><stop offset=".5" stop-color="#ce3e99"/><stop offset="1" stop-color="#7662db"/></linearGradient></defs><rect width="400" height="500" fill="url(#a)"/></svg>')}`;
const qr = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/><rect x="8" y="8" width="84" height="84" fill="none" stroke="black" stroke-width="3"/><text x="50" y="61" text-anchor="middle" font-family="sans-serif" font-size="32">QR</text></svg>')}`;

function Miniature({ sample, data }: { sample: string; data: SampleData }) {
  const [actualQr, setActualQr] = useState("");
  useEffect(() => { let active = true; setActualQr(""); let target = "";
    try { const raw = data.qrTarget || ""; if (raw) { const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) target = url.toString(); } } catch { /* no QR without a real link */ }
    if (target) void qrImage(target).then(image => { if (active) setActualQr(image); }).catch(() => {});
    return () => { active = false; };
  }, [data.qrTarget]);
  // Static, reviewed Artifact markup, with every original blob replaced by a
  // controlled token. Escaped values cannot introduce markup or event handlers.
  const record = markup as Record<string, string>;
  let html = record[sample] ?? record[`Minimal-${sample.split("-").at(-1)}`] ?? record["Minimal-A"]!;
  const implemented = /^(Minimal|Rounded|Gradient|Editorial|Cards|Blocks)-/.test(sample);
  if (implemented) {
    html = html.replace('data-minimal-qr="true"', `data-minimal-qr="true" ${actualQr ? "" : 'hidden'}`);
    if (data.includeBranding === false) html = html.replace(/<img[^>]+src="__(LOGO|MARK)__"[^>]*>/g, "");
    if (data.year || data.location !== undefined) html = html.replaceAll("Crna Gora, 2026", escapeHtml([data.location, data.year ?? new Date().getFullYear()].filter(Boolean).join(", "))).replaceAll("Portfolio 2026", `Portfolio ${data.year ?? new Date().getFullYear()}`).replaceAll("Izdanje 2026", `Izdanje ${data.year ?? new Date().getFullYear()}`);
  }
  const name = data.artistName.trim().split(/\s+/), first = name[0] || "Ime", last = name.slice(1).join(" ") || "Prezime";
  const rendered = html.replace(/__(COVER|PROFILE|LOGO|MARK|QR)__/g, (_, key: string) => escapeHtml({
    COVER: data.coverImage || fallback, PROFILE: data.profileImage || data.coverImage || fallback,
    LOGO: "/artboard-logo/ArtBoard-Horizontal-Gradient-Mark-Black-Text.svg", MARK: "/artboard-logo/ArtBoard-Gradient-Odvojeno.svg", QR: implemented ? actualQr : qr,
  }[key]!)).replace(/>Ime Prezime</g, `>${escapeHtml(data.artistName || "Ime Prezime")}<`)
    .replace(/>Ime</g, `>${escapeHtml(first)}<`).replace(/>Prezime</g, `>${escapeHtml(last)}<`)
    .replace(/>Digitalna umjetnost</g, `>${escapeHtml(data.discipline || "Digitalna umjetnost")}<`)
    .replace(/>9 izdvojenih radova</g, `>${data.artworkCount} izdvojenih radova<`);
  return <span aria-hidden="true" className={styles.miniature} dangerouslySetInnerHTML={{ __html: rendered }} />;
}
export function MinimalCoverPreview({ cover, data, printStyle }: { cover: Letter; data: SampleData; printStyle?: MinimalDesign['style'] }) {
  return <div style={{ position: "relative", width: "100%", aspectRatio: "794/1123", flex: "1 1 auto" }}><Miniature sample={`${printStyle === "BLOCKS" ? "Blocks" : printStyle === "CARDS" ? "Cards" : printStyle === "EDITORIAL" ? "Editorial" : printStyle === "GRADIENT" ? "Gradient" : printStyle === "ROUNDED" ? "Rounded" : "Minimal"}-${cover}`} data={data} /></div>;
}

export function PortfolioDesignWorkspace({ value, onChange, isPremium, data, collectionsMode, settings, onPrevious, onNext, isSaving, isMemoryGuest, hasChanges, onSave }: {
  value: PortfolioDesignPreview; onChange: (value: PortfolioDesignPreview) => void; isPremium: boolean; data: SampleData;
  collectionsMode: boolean; settings: ReactNode; onPrevious: () => void; onNext: () => void;
  isSaving: boolean; isMemoryGuest: boolean; hasChanges: boolean; onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLook = looks.find(look => look.id === value.look)!;
  function choose(cover: Letter) { onChange({ ...value, cover }); }
  function advance(direction: number) { choose(letters[(letters.indexOf(value.cover) + direction + letters.length) % letters.length]!); }
  return <div className={styles.workspace}>
    <header className={styles.header}><div className={styles.headerCopy}><span className={styles.eyebrow}>{collectionsMode ? "Korak 5 od 6" : "Korak 3 od 4"}</span>
      <h1 className={styles.heading}>Izaberi dizajn PDF-a</h1><p className={styles.subtitle}>Stil određuje izgled svih strana.</p>
    </div></header>
    <div className={styles.body}>
      <div className={styles.styleGrid} role="group" aria-label="Stilovi portfolija">{looks.map(look => <button className={`${styles.styleCard} ${value.look === look.id ? styles.selectedStyle : ""}`} type="button" aria-pressed={value.look === look.id} aria-label={look.name}
        disabled={isSaving || !isImplementedLook(look.id)} title={!isImplementedLook(look.id) ? "Ovaj templejt još nije dostupan za PDF izvoz." : `Izaberi ${look.name}`}
        key={look.id} onClick={() => onChange({ ...value, look: look.id, mode: "single" })}>
        <span className={styles.stylePreview}>{look.samples.map(sample => <span className={styles.samplePage} key={sample}><Miniature sample={sample} data={data} /></span>)}</span>
        <span className={styles.styleCaption}><span className={styles.styleName}>{look.name}</span>{isImplementedLook(look.id) ? <span className={`${styles.radio} ${value.look === look.id ? styles.radioSelected : ""}`}><span /></span> : <span className={styles.comingSoon}>Uskoro</span>}</span>
      </button>)}</div>
      <div className={styles.selectionBar} aria-label="Izabrani templejt">
        <div><span className={styles.selectionLabel}>Izabrani templejt</span><strong>{selectedLook.name}</strong>
          <p>{value.mode !== "single" ? "Prikaz kombinacije stilova je privremen." : isMemoryGuest ? "Izbor važi za ovaj privremeni portfolio." : hasChanges ? "Sačuvaj izbor da ga zadržiš u portfoliju." : "Izbor je sačuvan u portfoliju."}</p></div>
        {!isMemoryGuest && value.mode === "single" ? <button className={styles.saveSelection} type="button" disabled={isSaving || !hasChanges || !isImplementedLook(value.look)} onClick={onSave}>{isSaving ? "Čuvanje…" : hasChanges ? "Sačuvaj izbor" : "Izbor sačuvan"}</button> : null}
      </div>
      <section className={styles.card} aria-label="Naslovna strana"><div className={styles.coverHeader}><div className={styles.coverCopy}>
        <span className={styles.cardTitle}>Naslovna strana</span><span className={styles.cardHelp}>{isImplementedLook(value.look) ? `Sedam varijanti u stilu ${lookName(value.look)}. Izabrana je prva strana PDF-a.` : "Referentni rasporedi naslovnice. Završni izgled izabranog stila dodajemo kasnije."}</span>
        </div><button className={styles.zoom} type="button" onClick={() => setOpen(true)}><Zoom />Uvećaj</button></div>
        <div className={styles.coverStrip} role="listbox" aria-label="Naslovna strana, varijante A–G" onKeyDown={event => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); const next = letters[(letters.indexOf(value.cover) + (event.key === "ArrowRight" ? 1 : -1) + letters.length) % letters.length]!; choose(next);
            event.currentTarget.querySelector<HTMLButtonElement>(`[data-cover="${next}"]`)?.focus(); }
        }}>{letters.map((letter, index) => <button className={styles.coverOption} type="button" role="option" aria-selected={value.cover === letter} aria-label={`Naslovna strana ${letter} · ${covers[index]}`} title={`Naslovna strana ${letter} · ${covers[index]}`}
          data-cover={letter} key={letter} tabIndex={value.cover === letter ? 0 : -1} onClick={() => choose(letter)}>
          <span className={`${styles.coverBorder} ${value.cover === letter ? styles.coverSelected : ""}`}><span className={styles.coverPage}><Miniature sample={`${value.look}-${letter}`} data={data} /></span></span>
          <span className={`${styles.coverLabel} ${value.cover === letter ? styles.coverLabelSelected : ""}`}><b>{letter}</b>{covers[index]}</span>
        </button>)}</div>
      </section>
      <section className={`${styles.card} ${styles.mixCard}`} aria-label="Kombinuj stilove"><div className={styles.mixHeader}>
        <div className={styles.mixCopy}><span className={styles.mixTitle}><span className={styles.cardTitle}>Kombinuj stilove</span><span className={styles.premium}>Premium</span></span><span className={styles.cardHelp}>Jedan stil za cijeli PDF ili drugačiji za svaku sekciju.</span></div>
        <div className={styles.toggle} role="group" aria-label="Način kombinovanja stilova"><button type="button" aria-pressed={value.mode === "single"} className={value.mode === "single" ? styles.activeToggle : undefined} onClick={() => onChange({ ...value, mode: "single" })}>Jedan stil</button>
          <button type="button" aria-pressed={value.mode === "sections"} disabled={!isPremium} title={!isPremium ? "Kombinovanje po sekcijama je dostupno uz Premium." : undefined} className={value.mode === "sections" ? styles.activeToggle : undefined} onClick={() => { if (isPremium) onChange({ ...value, mode: "sections" }); }}>Po sekcijama</button></div>
      </div>{value.mode === "sections" && isPremium ? <div className={styles.sectionGrid}>{parts.map(part => <label className={styles.field} key={part}><span>{part}</span><select aria-label={part} className={styles.select} value={value.sections[part]} onChange={event => onChange({ ...value, sections: { ...value.sections, [part]: event.target.value as LookId } })}>
        {looks.map(look => <option key={look.id} value={look.id}>{look.name}</option>)}</select></label>)}</div> : null}</section>
    </div>
    <p className={styles.status} role="status">{isImplementedLook(value.look) && value.mode === "single" ? `${lookName(value.look)} i naslovnice A–G povezani su sa stvarnim PDF-om. Sačuvaj draft da zadržiš izbor; Guest izbor važi samo u ovoj stranici.` : "Kombinovanje stilova po sekcijama još je prototip. Za stvarni PDF izaberi jedan stil."}</p>
    <details className={styles.settings}><summary>Aktuelna PDF podešavanja</summary><div>{settings}</div></details>
    <nav className={styles.navigation} aria-label="Navigacija kroz korake"><button className={styles.previous} type="button" onClick={onPrevious}>← {collectionsMode ? "CV" : "Radovi"}</button><button className={styles.next} type="button" onClick={onNext}>Dalje: Izvoz →</button></nav>
    {open ? <CoverDialog value={value} title={selectedLook.name} data={data} onClose={() => setOpen(false)} onChoose={choose} onAdvance={advance} /> : null}
  </div>;
}

function Zoom() { return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.3 15.3 20 20M10.5 7.8v5.4M7.8 10.5h5.4" /></svg>; }
function CoverDialog({ value, title, data, onClose, onChoose, onAdvance }: { value: PortfolioDesignPreview; title: string; data: SampleData; onClose: () => void; onChoose: (letter: Letter) => void; onAdvance: (direction: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const overflow = document.body.style.overflow, dialog = ref.current, previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden"; dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);
  return <dialog ref={ref} className={styles.dialog} aria-label="Pregled naslovnice" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}
    onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); onAdvance(event.key === "ArrowLeft" ? -1 : 1); } }}>
    <header className={styles.modalHeader}><div><span>Pregled naslovnice</span><h2>{title} · Naslovna strana {value.cover} · {covers[letters.indexOf(value.cover)]}</h2></div><button type="button" className={styles.close} aria-label="Zatvori pregled" onClick={onClose}>×</button></header>
    <div className={styles.largePage}><Miniature sample={`${value.look}-${value.cover}`} data={data} /></div>
    <div className={styles.modalNav}><button type="button" aria-label="Prethodna naslovnica" className={styles.arrow} onClick={() => onAdvance(-1)}>←</button>
      <div className={styles.letters}>{letters.map(letter => <button type="button" key={letter} aria-label={`Naslovnica ${letter}`} aria-pressed={value.cover === letter} className={value.cover === letter ? styles.activeLetter : undefined} onClick={() => onChoose(letter)}>{letter}</button>)}</div>
      <button type="button" aria-label="Sljedeća naslovnica" className={styles.arrow} onClick={() => onAdvance(1)}>→</button></div>
    <p className={styles.modalNote}>{isImplementedLook(value.look) && value.mode === "single" ? `Izabrana naslovnica je prva strana ${lookName(value.look)} PDF-a. Strelicama mijenjaš izbor.` : "Strelicama mijenjaš izbor u prototipu. Ovaj stil još nije povezan sa PDF-om."}</p>
  </dialog>;
}
