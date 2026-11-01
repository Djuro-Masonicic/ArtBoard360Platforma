"use client";
import { useEffect, useState } from "react";
import type { PortfolioProject } from "@/types/api";
import { commandPortfolioCollections, getPortfolioSourceChanges, type SourceReview } from "@/services/portfolio-collections";
import { CollectionDialog } from "./portfolio-collections-workspace";
import styles from "./portfolio-collections-workspace.module.css";

const labels: Record<string, string> = { artistName: "Ime", biography: "Biografija", artistStatement: "Umjetnički iskaz", email: "E-mail", dateOfBirth: "Datum rođenja", discipline: "Discipline", behanceUrl: "Behance", websiteUrl: "Website", instagramUrl: "Instagram", profileImageUrl: "Profilna slika", coverImageUrl: "Naslovna slika", imageUrl: "Slika rada", title: "Naziv", description: "Opis", year: "Godina", members: "Radovi kolekcije", orderIndex: "Redosljed", collectionOrderIndex: "Redosljed rada", artistCollectionId: "Pripadnost kolekciji", deleted: "Uklonjen izvor", new: "Novi sadržaj" };
function value(v: unknown) { return v == null || v === "" ? "Nije uneseno" : typeof v === "string" ? v : JSON.stringify(v); }

export function PortfolioSourceChanges({ project, theme, onPrepare, onProject }: { project: PortfolioProject; theme: string;
  onPrepare: () => Promise<PortfolioProject | null>; onProject: (p: PortfolioProject) => void }) {
  const [review, setReview] = useState<SourceReview | null>(null), [open, setOpen] = useState(false), [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () => { void getPortfolioSourceChanges(project.id).then(data => { if (active) setReview(data); }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Promjene nijesu dostupne."); }); };
    refresh(); window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, [project.id]);
  async function inspect() {
    setBusy(true); setError("");
    try {
      const saved = await onPrepare(); if (!saved) return;
      const next = await getPortfolioSourceChanges(saved.id); setReview(next); setSelected([]); setOpen(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Pregled nije dostupan."); }
    finally { setBusy(false); }
  }
  async function apply(keep: boolean) {
    if (!review) return; setBusy(true); setError("");
    try {
      const next = await commandPortfolioCollections(project, { action: keep ? "ackSource" : "applySource", expectedRevision: review.revision,
        sourceVersion: review.sourceVersion, changes: selected });
      onProject(next); setReview({ ...review, changes: [], historyUnknown: false }); setOpen(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Izmjene nijesu primijenjene."); }
    finally { setBusy(false); }
  }
  if (!review?.changes.length && !review?.historyUnknown && !error) return null;
  return <div className={styles.workspace}>
    <div className={`${styles.notice} ${styles.reviewNotice}`}><span>{review?.historyUnknown ? "Ovaj draft nema istoriju izvornog stanja." : `Profil ima ${review?.changes.length ?? 0} relevantnih promjena.`} Portfolio nije automatski izmijenjen.</span>
      <button className={styles.secondary} disabled={busy} onClick={() => void inspect()}>Pregledaj razlike</button>
      {!open && error ? <p role="alert" className={styles.error}>{error}</p> : null}</div>
    {open && review ? <CollectionDialog title="Promjene na izvornom profilu" theme={theme} onClose={() => { if (!busy) setOpen(false); }}>
      <p>Prije pregleda čuvaju se tvoje trenutne izmjene. Označi samo podatke koje želiš preuzeti. Neoznačene vrijednosti ostaju iz ovog portfolija.</p>
      {review.historyUnknown ? <p className={styles.notice}>Prikazane su sadašnje razlike. Za ovaj stari draft nije moguće utvrditi istorijski redosljed izmjena.</p> : null}
      <p className={styles.description}>Nove radove, pripadnost i redosljed uređuješ u Kolekcijama. Uklanjanje izvora ne briše sačuvanu portfolio kopiju.</p>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <ul className={styles.list}>{review.changes.map(change => <li className={styles.row} key={change.key}><div className={styles.rowTitle}>
        <label><input type="checkbox" disabled={busy || !change.actionable} checked={selected.includes(change.key)} onChange={() => setSelected(selected.includes(change.key) ? selected.filter(key => key !== change.key) : [...selected, change.key])} />
          <strong> {labels[change.field] ?? change.field}{change.scope === "profile" ? "" : ` · ${change.label}`}</strong></label>
        {change.conflict ? <p>{review.historyUnknown ? "Portfolio i profil se razlikuju; istorija izmjena nije poznata." : "Postoji i ručna izmjena u portfoliju."}</p> : null}
        <div className={styles.values}><div>Portfolio<pre>{value(change.local)}</pre></div><div>Profil<pre>{value(change.source)}</pre></div></div>
      </div></li>)}</ul>
      <div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={() => void apply(true)}>Zadrži portfolio i potvrdi pregled</button>
        <button className={styles.primary} disabled={busy || !selected.length} onClick={() => void apply(false)}>Preuzmi izabrane promjene</button></div>
    </CollectionDialog> : null}
  </div>;
}
