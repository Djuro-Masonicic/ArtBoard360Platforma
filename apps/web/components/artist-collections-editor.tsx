"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/services/api";
import { requestArtistCollections, uploadArtistCollectionCover, type ArtistCollectionItem, type ArtistCollectionsReady, type ArtistCollectionsState, type CollectionMetadata } from "@/services/artist-collections";
import styles from "./artist-collections-editor.module.css";

type Run = (action: () => Promise<ArtistCollectionsState>) => Promise<boolean>;

export function ArtistCollectionsEditor() {
  const [state, setState] = useState<ArtistCollectionsState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  useEffect(() => {
    let mounted = true;
    requestArtistCollections().then((data) => { if (mounted) setState(data); })
      .catch((failure: unknown) => { if (mounted) setError(failure instanceof Error ? failure.message : "Učitavanje nije uspjelo."); });
    return () => { mounted = false; };
  }, []);

  const run: Run = async (action) => {
    setBusy(true); setError("");
    try { setState(await action()); return true; }
    catch (failure) {
      setError(failure instanceof Error ? failure.message : "Izmjena nije sačuvana.");
      if (failure instanceof ApiError && failure.status === 409) {
        try { setState(await requestArtistCollections()); } catch { /* Keep the last visible state and error. */ }
      }
      return false;
    } finally { setBusy(false); }
  };

  return <section className={styles.workspace} aria-labelledby="artist-collections-heading">
    <header><h2 id="artist-collections-heading" className={styles.heading}>Kolekcije</h2>
      <p className={styles.helper}>Organizuj svoje radove. Redosljed unutar kolekcija ne mijenja redosljed galerije.</p></header>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {!state ? <div className={styles.notice}><p role="status">{error ? "Podaci nijesu učitani." : "Učitavanje kolekcija…"}</p>
      {error ? <button className={styles.secondary} disabled={busy} onClick={() => void run(() => requestArtistCollections())}>Pokušaj ponovo</button> : null}</div>
      : !state.available ? <p role="status" className={styles.notice}>{state.message}</p>
      : <>
        <form className={styles.card} onSubmit={(event) => {
          event.preventDefault();
          void run(() => requestArtistCollections("", "POST", { title, expectedVersion: state.version }))
            .then((saved) => { if (saved) setTitle(""); });
        }}>
          <label className={styles.field}>Naziv nove kolekcije<input className="dashboard-input" required maxLength={160} value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} /></label>
          <div className={styles.actions}><button className={styles.button} disabled={busy || !title.trim()} type="submit">Kreiraj kolekciju</button></div>
        </form>
        {state.collections.length === 0 ? <p className={styles.notice}>Još nemaš kolekcije. Kreiraj prvu i dodaj postojeće radove.</p> : null}
        {state.collections.map((collection, index) => <CollectionCard key={collection.id} collection={collection} state={state} busy={busy} run={run}
          index={index} />)}
        <section className={styles.card} aria-label="Radovi van kolekcija"><h3>Radovi van kolekcija</h3>
          <p className={styles.helper}>Dodaj ih pomoću izbora „Dodaj postojeći rad” u željenoj kolekciji.</p>
          <ul className={styles.works}>{state.artworks.filter((work) => work.artistCollectionId === null).map((work) => <li className={styles.work} key={work.id}>
            <img src={work.imageUrl} alt="" /><span className={styles.workTitle}>{work.title || "Bez naziva"}</span></li>)}</ul>
          {!state.artworks.some((work) => work.artistCollectionId === null) ? <p className={styles.helper}>Nema radova van kolekcija.</p> : null}
        </section>
      </>}
  </section>;
}

function CollectionCard({ collection, state, busy, run, index }: {
  collection: ArtistCollectionItem; state: ArtistCollectionsReady; busy: boolean; run: Run; index: number;
}) {
  // Keep unsaved inputs after a conflict refresh; saving again is explicit.
  const [draft, setDraft] = useState<CollectionMetadata>({ title: collection.title, description: collection.description ?? "", year: collection.year ?? "" });
  const [cover, setCover] = useState("keep");
  const [candidate, setCandidate] = useState("");
  const works = state.artworks.filter((work) => work.artistCollectionId === collection.id)
    .sort((a, b) => (a.collectionOrderIndex ?? a.orderIndex) - (b.collectionOrderIndex ?? b.orderIndex) || a.id.localeCompare(b.id));
  const mutate = (operation: string, method: string, payload: Record<string, unknown>) =>
    run(() => requestArtistCollections(operation, method, { ...payload, expectedVersion: state.version }));
  function reorderCollection(direction: number) {
    const ids = state.collections.map((item) => item.id);
    [ids[index], ids[index + direction]] = [ids[index + direction]!, ids[index]!];
    void mutate("order", "PUT", { ids });
  }
  function reorderWork(position: number, direction: number) {
    const artworkIds = works.map((work) => work.id);
    [artworkIds[position], artworkIds[position + direction]] = [artworkIds[position + direction]!, artworkIds[position]!];
    void mutate(`${collection.id}/artworks/order`, "PUT", { artworkIds });
  }
  function addWork() {
    const work = state.artworks.find((item) => item.id === candidate);
    if (!work) return;
    if (work.artistCollectionId) {
      const source = state.collections.find((item) => item.id === work.artistCollectionId);
      if (!window.confirm(`Premjesti „${work.title || "Bez naziva"}” iz „${source?.title ?? "kolekcije"}” u „${collection.title}”?`)) return;
    }
    void mutate("membership", "PUT", { artworkIds: [work.id], collectionId: collection.id }).then((saved) => { if (saved) setCandidate(""); });
  }
  return <article className={styles.card} aria-label={`Kolekcija ${collection.title}`}>
    <fieldset className={styles.fieldset} disabled={busy}>
      <div className={styles.topline}><h3>{collection.title}</h3><div className={styles.arrows}>
        <button type="button" className={styles.secondary} aria-label={`Pomjeri kolekciju ${collection.title} gore`} disabled={busy || index === 0} onClick={() => reorderCollection(-1)}>↑</button>
        <button type="button" className={styles.secondary} aria-label={`Pomjeri kolekciju ${collection.title} dolje`} disabled={busy || index === state.collections.length - 1} onClick={() => reorderCollection(1)}>↓</button>
      </div></div>
      {collection.coverImageUrl ? <img className={styles.cover} alt={`Naslovna slika: ${collection.title}`} src={collection.coverImageUrl} /> : null}
      <form className={styles.form} onSubmit={(event) => {
        event.preventDefault();
        void mutate(collection.id, "PATCH", { ...draft, ...(cover === "keep" ? {} : { coverArtworkId: cover === "none" ? null : cover }) })
          .then((saved) => { if (saved) setCover("keep"); });
      }}>
        <label className={styles.field}>Naziv kolekcije<input className="dashboard-input" required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label className={styles.field}>Godina<input className="dashboard-input" maxLength={40} value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })} /></label>
        <label className={`${styles.field} ${styles.wide}`}>Opis<textarea className="dashboard-textarea" maxLength={4000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
        <label className={`${styles.field} ${styles.wide}`}>Naslovna slika iz radova<select className="dashboard-input" value={cover} onChange={(event) => setCover(event.target.value)}>
          <option value="keep">Zadrži trenutnu sliku</option><option value="none">Bez naslovne slike</option>
          {state.artworks.map((work) => <option key={work.id} value={work.id}>{work.title || "Bez naziva"}</option>)}
        </select></label>
        <div className={`${styles.actions} ${styles.wide}`}><button type="submit" className={styles.button} disabled={!draft.title.trim()}>Sačuvaj kolekciju</button></div>
      </form>
      <div className={styles.actions}><label className={styles.field}>Ili pošalji novu naslovnu sliku<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => {
        const input = event.currentTarget; const file = input.files?.[0]; if (!file) return;
        void run(() => uploadArtistCollectionCover(collection.id, state.version, file)).then(() => { input.value = ""; });
      }} /></label></div>
      <ul className={styles.works}>{works.map((work, position) => <li className={styles.work} key={work.id}>
        <img src={work.imageUrl} alt="" /><span className={styles.workTitle}>{work.title || "Bez naziva"}</span>
        <div className={styles.arrows}>
          <button type="button" className={styles.secondary} disabled={position === 0} aria-label={`Pomjeri rad ${work.title || "Bez naziva"} gore`} onClick={() => reorderWork(position, -1)}>↑</button>
          <button type="button" className={styles.secondary} disabled={position === works.length - 1} aria-label={`Pomjeri rad ${work.title || "Bez naziva"} dolje`} onClick={() => reorderWork(position, 1)}>↓</button>
        </div>
        <button type="button" className={styles.secondary} onClick={() => void mutate("membership", "PUT", { artworkIds: [work.id], collectionId: null })}>Ukloni iz kolekcije</button>
      </li>)}</ul>
      {works.length === 0 ? <p className={styles.helper}>Kolekcija još nema radove.</p> : null}
      <div className={styles.actions}>
        <select className={`dashboard-input ${styles.picker}`} aria-label={`Dodaj postojeći rad u ${collection.title}`} value={candidate} onChange={(event) => setCandidate(event.target.value)}>
          <option value="">Dodaj postojeći rad</option>
          {state.artworks.filter((work) => work.artistCollectionId !== collection.id).map((work) => <option key={work.id} value={work.id}>
            {work.title || "Bez naziva"}{work.artistCollectionId ? ` — ${state.collections.find((item) => item.id === work.artistCollectionId)?.title ?? "druga kolekcija"}` : " — van kolekcija"}
          </option>)}
        </select>
        <button type="button" className={styles.secondary} disabled={!candidate} onClick={addWork}>Dodaj rad</button>
        <button type="button" className={styles.danger} onClick={() => {
          if (window.confirm(`Obriši kolekciju „${collection.title}”? Radovi i njihove slike ostaju sačuvani.`)) void mutate(collection.id, "DELETE", {});
        }}>Obriši kolekciju</button>
      </div>
    </fieldset>
  </article>;
}
