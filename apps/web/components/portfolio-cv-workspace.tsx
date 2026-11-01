"use client";

import styles from "./portfolio-cv-workspace.module.css";
import { readPortfolioCv, type PortfolioCvData } from "@artboard/portfolio-document-plan";

const rowSections = [
  { id: "education", title: "Obrazovanje", description: "Škole, fakulteti, kursevi i rezidencije.", add: "Dodaj obrazovanje", fields: [
    ["period", "Period", "npr. 2020 – 2024"], ["institution", "Ustanova", "Ustanova, univerzitet"], ["degree", "Smjer i zvanje", "Smjer, zvanje"], ["location", "Mjesto", "Grad, država"],
  ] },
  { id: "experience", title: "Radno iskustvo", description: "Posao, saradnje i projekti.", add: "Dodaj iskustvo", fields: [
    ["period", "Period", "npr. 2025 – danas"], ["organization", "Organizacija", "Organizacija"], ["position", "Pozicija", "Pozicija"], ["location", "Mjesto", "Grad, država"], ["description", "Opis", "Kratak opis: odgovornosti, projekti i rezultati"],
  ] },
  { id: "exhibitions", title: "Izložbe", description: "Samostalne i grupne izložbe.", add: "Dodaj izložbu", fields: [
    ["year", "Godina", "npr. 2025"], ["title", "Naziv izložbe", "Naziv izložbe"], ["location", "Lokacija", "Galerija, grad"], ["type", "Vrsta", "Samostalna / grupna"],
  ] },
  { id: "awards", title: "Nagrade", description: "Nagrade, priznanja i stipendije.", add: "Dodaj nagradu", fields: [
    ["year", "Godina", "npr. 2024"], ["title", "Naziv nagrade", "Naziv nagrade"], ["category", "Kategorija", "Kategorija, takmičenje"], ["location", "Lokacija", "Grad, država"],
  ] },
  { id: "certificates", title: "Sertifikati", description: "Kursevi i sertifikati.", add: "Dodaj sertifikat", fields: [
    ["title", "Naziv", "Naziv sertifikata"], ["field", "Oblast", "Disciplina"], ["issuer", "Izdavač i godina", "Kompanija, godina"],
  ] },
  { id: "publications", title: "Publikacije", description: "Katalozi, članci i knjige.", add: "Dodaj publikaciju", fields: [
    ["title", "Naziv", "Naziv publikacije"], ["issuer", "Izdavač i godina", "Izdavač, godina"], ["link", "Link", "https://"],
  ] },
] as const;
type RowSection = typeof rowSections[number];
type RowKey = RowSection["id"];
type CvRow = { id: string; values: Record<string, string> };
export type PortfolioCvDraft = PortfolioCvData;
export function createPortfolioCvDraft(initial?: unknown): PortfolioCvDraft {
  const saved = readPortfolioCv(initial);
  if (saved) return saved;
  return { version: 1, education: [newRow()], experience: [newRow()], exhibitions: [newRow()], awards: [newRow()],
    certificates: [newRow()], publications: [newRow()], skills: "", programs: "" };
}
function newRow(): CvRow { return { id: crypto.randomUUID(), values: {} }; }

export function PortfolioCvWorkspace({ value, onChange, onPrevious, onNext, previousCv, includeInPdf = false, onIncludeChange,
  isMemoryGuest = false, replaceLegacy = false, onReplaceLegacy, isBusy = false }: {
  value: PortfolioCvDraft; onChange: (value: PortfolioCvDraft) => void;
  onPrevious: () => void; onNext: () => void; previousCv?: unknown;
  includeInPdf?: boolean; onIncludeChange?: (included: boolean) => void; isMemoryGuest?: boolean;
  replaceLegacy?: boolean; onReplaceLegacy?: (replace: boolean) => void;
  isBusy?: boolean;
}) {
  const hasPreviousCv = previousCv != null && !readPortfolioCv(previousCv) && (typeof previousCv !== "object" || Object.keys(previousCv).length > 0);
  function section(config: RowSection) {
    const rows = value[config.id];
    return <section className={styles.card} aria-label={config.title} key={config.id}>
      <div className={styles.cardHeader}><span className={styles.cardCopy}><span className={styles.cardTitle}>{config.title}</span><span className={styles.cardHelp}>{config.description}</span></span>
        <button className={styles.add} disabled={rows.length >= 20} type="button" onClick={() => onChange({ ...value, [config.id]: [...rows, newRow()] })}>
          <span className={styles.addCircle} aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>{config.add}
        </button>
      </div>
      {rows.length ? <div className={styles.rows}>{rows.map((row, index) => <div className={styles.row} role="group" aria-label={`${config.title} ${index + 1}`} key={row.id}>
        {config.fields.map(([key, label, placeholder]) => <label className={`${styles.field} ${key === "description" ? styles.full : ""}`} key={key}><span>{label}</span>
          <input className={styles.input} maxLength={key === "description" ? 1500 : key === "link" ? 500 : 240} value={row.values[key] ?? ""} placeholder={placeholder} onChange={event => onChange({ ...value,
            [config.id]: rows.map(item => item.id === row.id ? { ...item, values: { ...item.values, [key]: event.target.value } } : item) })} />
        </label>)}
        <button className={styles.remove} type="button" aria-label="Ukloni" title="Ukloni" onClick={() => onChange({ ...value, [config.id]: rows.filter(item => item.id !== row.id) })}>×</button>
      </div>)}</div> : null}
    </section>;
  }
  function textSection(key: "skills" | "programs", title: string, description: string, placeholder: string) {
    return <section className={styles.card} aria-label={title}><div className={styles.cardHeader}><span className={styles.cardCopy}>
      <span className={styles.cardTitle}>{title}</span><span className={styles.cardHelp}>{description}</span></span></div>
      <textarea aria-label={title} maxLength={2000} className={styles.textarea} rows={3} value={value[key]} placeholder={placeholder} onChange={event => onChange({ ...value, [key]: event.target.value })} />
    </section>;
  }
  return <div className={styles.workspace}>
    <header className={styles.header}><div className={styles.headerCopy}><span className={styles.eyebrow}>{isMemoryGuest ? "Korak 3 od 5" : "Korak 4 od 6"}</span><h1 className={styles.heading}>CV</h1>
      <p className={styles.subtitle}>Dodaj obrazovanje, iskustvo, izložbe i nagrade. CV se raspoređuje na onoliko PDF strana koliko je potrebno.</p>
    </div></header>
    <div className={styles.body}>
      {section(rowSections[0])}{section(rowSections[1])}{section(rowSections[2])}{section(rowSections[3])}
      {textSection("skills", "Vještine", "Odvoji zarezom, npr. crtež, kolaž, grafika.", "Vještine koje koristiš u radu")}
      {textSection("programs", "Programi", "Odvoji zarezom, npr. Photoshop, Procreate, Blender.", "Programi koje koristiš")}
      {section(rowSections[4])}{section(rowSections[5])}
    </div>
    <label className={styles.status}><input type="checkbox" checked={includeInPdf} disabled={!onIncludeChange || isBusy} onChange={event => onIncludeChange?.(event.target.checked)} /> Uključi CV u portfolio PDF</label>
    <p className={styles.status} role="status">{isMemoryGuest ? "CV ostaje u otvorenoj stranici. PDF pregled i priprema narudžbine su u koraku Izvoz."
      : "Sačuvaj draft da zadržiš CV za sljedeće otvaranje. Za zaseban CV izaberi „Samo CV” u koraku Izvoz."}</p>
    {hasPreviousCv ? <><details className={styles.existing}><summary>Postojeći CV podaci ostaju sačuvani u prethodnom formatu</summary><ExistingCv value={previousCv} /></details>
      <label className={styles.status}><input type="checkbox" checked={replaceLegacy} onChange={event => onReplaceLegacy?.(event.target.checked)} /> Pri čuvanju zamijeni prethodni CV novim unosom. Prethodni podaci neće biti automatski prepisani.</label></> : null}
    <nav className={styles.navigation} aria-label="Navigacija kroz korake"><button className={styles.previous} type="button" onClick={onPrevious}>← Radovi</button><button className={styles.next} type="button" onClick={onNext}>Dalje: Dizajn →</button></nav>
  </div>;
}

function ExistingCv({ value }: { value: unknown }) {
  if (value == null) return null;
  if (typeof value !== "object") return <p>{String(value)}</p>;
  if (Array.isArray(value)) return <ul>{value.map((item, index) => <li key={index}><ExistingCv value={item} /></li>)}</ul>;
  if ("title" in value && typeof value.title === "string" && "items" in value && Array.isArray(value.items)) return <div><strong>{value.title}</strong><ExistingCv value={value.items} /></div>;
  return <dl>{Object.entries(value).map(([key, item]) => <div key={key}><dt>{key}</dt><dd><ExistingCv value={item} /></dd></div>)}</dl>;
}
