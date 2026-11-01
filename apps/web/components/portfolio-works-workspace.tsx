"use client";

import { useRef, useState } from "react";
import type { PortfolioProject } from "@/types/api";
import type { UpdatePortfolioArtworkPayload } from "@/services/portfolio-projects";
import styles from "./portfolio-works-workspace.module.css";

type Artwork = PortfolioProject["artworks"][number];
type Props = {
  artworks: Artwork[];
  selectedArtworks: Artwork[];
  collectionsMode: boolean;
  isMemoryGuest: boolean;
  isBusy: boolean;
  isUploadingArtwork: boolean;
  onChooseArtworks: () => void;
  onUploadArtworks: (files: FileList | null) => void;
  onToggleArtwork: (id: string, selected: boolean) => void;
  onUpdateArtwork: (id: string, payload: UpdatePortfolioArtworkPayload) => void;
  onReorderArtwork: (dragged: string, target: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  nextStepLabel?: string;
};

export function PortfolioWorksWorkspace({ artworks, selectedArtworks, collectionsMode, isMemoryGuest, isBusy, isUploadingArtwork,
  onChooseArtworks, onUploadArtworks, onToggleArtwork, onUpdateArtwork, onReorderArtwork, onPrevious, onNext, nextStepLabel = "Dizajn" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragged, setDragged] = useState<string | null>(null), [target, setTarget] = useState<string | null>(null);
  const positions = new Map(selectedArtworks.map((artwork, index) => [artwork.id, index + 1]));
  return <div className={styles.workspace}>
    <header className={styles.header}><div className={styles.headerCopy}>
      <span className={styles.eyebrow}>{collectionsMode ? "Korak 3 od 6" : "Korak 2 od 4"}</span>
      <h1 className={styles.heading}>Radovi i detalji</h1>
      <p className={styles.subtitle}>Izaberi radove i redoslijed, pa dopuni naziv, tehniku, dimenzije i opis.</p>
    </div></header>
    <div className={styles.body}>
      <div className={styles.summary}>
        <span className={styles.count}>{selectedArtworks.length} radova u PDF-u</span>
        <div className={styles.progress} aria-hidden="true"><span style={{ width: `${Math.min(100, selectedArtworks.length / 30 * 100)}%` }} /></div>
        <span className={styles.recommendation}>Preporuka 10–30 radova</span><span className={styles.spacer} />
        <button className={styles.choose} disabled={isBusy} type="button" onClick={() => collectionsMode ? onChooseArtworks() : input.current?.click()}>{isUploadingArtwork ? "Dodajem…" : "Izbor radova"}</button>
        <input hidden ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Dodaj slike radova" onChange={event => { onUploadArtworks(event.currentTarget.files); event.currentTarget.value = ""; }} />
      </div>
      <section className={styles.card} aria-label="Radovi u portfoliju">
        <div className={styles.cardCopy}><span className={styles.cardTitle}>Radovi u portfoliju</span><span className={styles.cardHelp}>Klikni na rad da ga dodaš ili ukloniš. Redoslijed izbora je redoslijed u PDF-u.</span></div>
        {artworks.length ? <div className={styles.grid}>{artworks.map(artwork => <button key={artwork.id} type="button" className={`${styles.tile} ${dragged === artwork.id ? styles.dragging : ""} ${target === artwork.id && dragged !== artwork.id ? styles.dragTarget : ""}`}
          aria-label={`${artwork.isSelected ? "Isključi" : "Izaberi"} rad ${artwork.title || "Bez naziva"}`} aria-pressed={artwork.isSelected} disabled={isBusy}
          draggable={!isBusy} onDragStart={event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", artwork.id); setDragged(artwork.id); }}
          onDragOver={event => { event.preventDefault(); setTarget(artwork.id); }} onDragEnd={() => { setDragged(null); setTarget(null); }}
          onDrop={event => { event.preventDefault(); if (dragged) onReorderArtwork(dragged, artwork.id); setDragged(null); setTarget(null); }}
          onClick={() => onToggleArtwork(artwork.id, !artwork.isSelected)}>
          <span className={`${styles.image} ${artwork.isSelected ? styles.selected : ""}`}><img src={artwork.imageUrl} alt="" draggable={false} />{positions.has(artwork.id) ? <span className={styles.number}>{positions.get(artwork.id)}</span> : null}</span>
          <span className={styles.tileCopy}><span className={styles.tileTitle}>{artwork.title || "Bez naziva"}</span><span className={styles.tileMeta}>{[artwork.technique, artwork.year].filter(Boolean).join(", ")}</span></span>
        </button>)}</div> : <p className={styles.empty}>{isMemoryGuest ? "Još nema radova u ovoj privremenoj sesiji." : "Još nema radova u ovom draftu."}</p>}
      </section>
      <section className={styles.card} aria-label="Detalji radova">
        <div className={styles.detailsHeader}><span className={styles.cardTitle}>Detalji radova</span><span className={styles.detailsNote}>Izmjene važe za ovaj PDF, profil ostaje isti.</span></div>
        {selectedArtworks.map((artwork, index) => <div className={styles.detail} key={artwork.id} role="group" aria-label={`Detalji rada ${index + 1}`}>
          <span className={styles.thumbnail}><img src={artwork.imageUrl} alt="" /><span className={styles.number}>{index + 1}</span></span>
          <div className={styles.fields}>
            <WorkField label="Naziv rada" full value={artwork.title} placeholder="Naziv rada" maxLength={180} disabled={isBusy} onChange={title => onUpdateArtwork(artwork.id, { title })} />
            <WorkField label="Tehnika i materijal" value={artwork.technique} placeholder="npr. Ulje na platnu" maxLength={160} disabled={isBusy} onChange={technique => onUpdateArtwork(artwork.id, { technique })} />
            <WorkField label="Dimenzije" value={artwork.dimensions} placeholder="npr. 50 × 70 cm" maxLength={80} disabled={isBusy} onChange={dimensions => onUpdateArtwork(artwork.id, { dimensions })} />
            <WorkField label="Godina" value={artwork.year} placeholder="npr. 2025" maxLength={40} disabled={isBusy} onChange={year => onUpdateArtwork(artwork.id, { year })} />
            <label className={`${styles.field} ${styles.full}`}><span className={`${styles.label} ${styles.descriptionLabel}`}><span>Opis rada · <span className={styles.optional}>opciono</span></span><span className={styles.optional}>do 40 riječi</span></span>
              <textarea aria-label="Opis rada" className={styles.textarea} rows={2} placeholder="Kratak opis koji ide uz rad u PDF-u." value={artwork.description ?? ""} disabled={isBusy} onChange={event => onUpdateArtwork(artwork.id, { description: event.target.value })} />
            </label>
            {!artwork.title?.trim() || !artwork.technique?.trim() ? <p className={styles.mobileValidation} role="status">Dodaj naziv i tehniku da bi rad izašao u PDF-u.</p> : null}
          </div>
        </div>)}
        {!selectedArtworks.length ? <p className={styles.empty}>Izaberi radove za unos detalja.</p> : null}
      </section>
    </div>
    <nav className={styles.navigation} aria-label="Navigacija kroz korake">
      <button className={styles.previous} type="button" onClick={onPrevious}>← {collectionsMode ? "Kolekcije" : "Podaci"}</button>
      <button className={styles.next} type="button" onClick={onNext}>Dalje: {nextStepLabel} →</button>
    </nav>
  </div>;
}

function WorkField({ label, value, placeholder, maxLength, full, disabled, onChange }: {
  label: string; value?: string | null; placeholder: string; maxLength: number; full?: boolean; disabled: boolean; onChange: (value: string) => void;
}) {
  return <label className={`${styles.field} ${full ? styles.full : ""}`}><span className={styles.label}>{label}</span>
    <input className={styles.input} value={value ?? ""} placeholder={placeholder} maxLength={maxLength} disabled={disabled} onChange={event => onChange(event.target.value)} />
  </label>;
}
