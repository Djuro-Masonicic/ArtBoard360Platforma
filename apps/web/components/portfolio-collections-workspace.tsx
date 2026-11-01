"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { buildPortfolioDocumentPlan } from "@artboard/portfolio-document-plan";
import type { PortfolioCollection, PortfolioProject } from "@/types/api";
import { ApiError } from "@/services/api";
import { commandPortfolioCollections, getPortfolioCatalog, getPortfolioPublishPlan, uploadPortfolioSnapshotCover, type PortfolioCatalog, type PublishPlan } from "@/services/portfolio-collections";
import styles from "./portfolio-collections-workspace.module.css";

export function CollectionDialog({ title, theme, onClose, children }: { title: string; theme: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => { ref.current?.close(); }; }, []);
  return <dialog ref={ref} className={styles.dialog} data-theme={theme} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <h2>{title}</h2>{children}<div className={styles.actions}><button className={styles.secondary} onClick={onClose} type="button">Zatvori</button></div>
  </dialog>;
}

type Dialog = { kind: "create" | "edit" | "picker" | "import" | "publish"; id?: string };
export function PortfolioCollectionsWorkspace({ project, onProject, theme }: { project: PortfolioProject; onProject: (p: PortfolioProject) => void; theme: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const plan = buildPortfolioDocumentPlan(project);
  async function command(payload: Record<string, unknown>) {
    setBusy(true); setError("");
    try { const next = await commandPortfolioCollections(project, payload); onProject(next); return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Izmjena nije sačuvana."); return false; }
    finally { setBusy(false); }
  }
  async function upload(collectionId: string, file: File) {
    setBusy(true); setError("");
    try { onProject(await uploadPortfolioSnapshotCover(project, collectionId, file)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Slika nije sačuvana."); }
    finally { setBusy(false); }
  }
  function order(index: number, direction: number) {
    const ids = (project.collections ?? []).map(c => c.id);
    [ids[index], ids[index + direction]] = [ids[index + direction]!, ids[index]!];
    void command({ action: "reorder", collectionIds: ids });
  }
  const collections = [...(project.collections ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
  function group(collection: PortfolioCollection | null, index = 0) {
    const works = project.artworks.filter(w => (w.portfolioCollectionId ?? null) === (collection?.id ?? null))
      .sort((a, b) => collection ? (a.collectionOrderIndex ?? a.orderIndex) - (b.collectionOrderIndex ?? b.orderIndex) : a.orderIndex - b.orderIndex);
    const included = collection ? collection.isIncluded : project.includeUncollectedArtworks !== false;
    const selected = works.filter(w => w.isSelected).length;
    const title = collection?.title ?? "Radovi van kolekcija";
    return <section className={styles.card} key={collection?.id ?? "outside"} aria-label={title}>
      <div className={styles.cardHeader}>
        <button className={`${styles.checkbox} ${included ? styles.checked : ""}`} type="button" role="checkbox" aria-checked={included}
          aria-label={`Uključi ${collection ? "kolekciju " : "grupu "}${title} u portfolio`} disabled={busy}
          onClick={() => void command({ action: collection ? "toggle" : "toggleOutside", collectionId: collection?.id, included: !included })}>{included ? <Tick /> : null}</button>
        <div className={styles.copy}><span className={styles.title}>{title}</span>
          {(collection?.description || !collection) ? <span className={styles.description}>{collection?.description ?? "Radovi koji nisu ni u jednoj kolekciji ovog portfolija."}</span> : null}</div>
        <span className={styles.badge}>{included ? `${selected} od ${works.length} u PDF-u` : "Nije u portfoliju"}</span>
        {collection ? <details className={styles.menu}><summary aria-label={`Opcije kolekcije ${title}`}>⋯</summary><div onClick={event => event.currentTarget.parentElement?.removeAttribute("open")}>
          <button disabled={busy} onClick={() => setDialog({ kind: "edit", id: collection.id })}>Uredi kolekciju i radove</button>
          <button disabled={busy || index === 0} onClick={() => order(index, -1)}>Pomjeri kolekciju gore</button>
          <button disabled={busy || index === collections.length - 1} onClick={() => order(index, 1)}>Pomjeri kolekciju dolje</button>
          {!collection.sourceCollectionId ? <button disabled={busy || project.id.startsWith("profile-memory:")} title={project.id.startsWith("profile-memory:") ? "Prvo sačuvaj draft portfolija." : undefined} onClick={() => setDialog({ kind: "publish", id: collection.id })}>Sačuvaj i na profilu</button> : <span className={styles.description}>Povezana sa izvornom kolekcijom</span>}
          <button disabled={busy} onClick={() => { if (window.confirm(`Ukloni „${title}” iz portfolija? Radovi ostaju sačuvani van kolekcija. Ako je ta grupa isključena, neće biti u PDF-u.`)) void command({ action: "delete", collectionId: collection.id }); }}>Ukloni kolekciju iz portfolija</button>
        </div></details> : null}
      </div>
      {included ? <div className={styles.grid}>{works.map(work => <button className={`${styles.tile} ${!work.isSelected ? styles.unselected : ""}`} type="button" aria-pressed={work.isSelected}
        aria-label={`${work.isSelected ? "Isključi" : "Izaberi"} rad ${work.title || "Bez naziva"}`} key={work.id} disabled={busy}
        onClick={() => void command({ action: "select", artworkIds: [work.id], selected: !work.isSelected })}>
        <span className={styles.image}><img src={work.imageUrl} alt="" />{work.isSelected ? <span className={styles.selection}><Tick /></span> : null}</span>
        <span className={styles.workTitle}>{work.title || "Bez naziva"}</span>
      </button>)}<button className={styles.add} type="button" disabled={busy} onClick={() => setDialog({ kind: "picker", id: collection?.id })}><span>+</span>Dodaj radove</button></div> : null}
    </section>;
  }
  return <div className={styles.workspace}>
    <header className={styles.header}><span className={styles.eyebrow}>Korak 2 od 6</span><h1>Izaberi kolekcije i radove</h1>
      <p>Kolekcije povlačimo sa tvog ArtBoard profila. Označi kolekcije i radove koji ulaze u portfolio.</p></header>
    {error ? <div role="alert" className={styles.error}>{error}{error.includes("promijenjen") ? <p>Osvježi stranicu prije ponovnog pokušaja. Nesačuvane izmjene Podataka prvo sačuvaj ili kopiraj.</p> : null}</div> : null}
    {project.collectionSchemaVersion !== 2 ? <div className={styles.card}><h2>Postojeći draft ostaje sačuvan</h2>
      <p className={styles.description}>Ovaj draft koristi prethodni PDF raspored. Prelazak na Kolekcije kopira njegove sadašnje slike i čuva ručne podatke, izbor i redosljed. Ne osvježava ga sa profila.</p>
      <button className={styles.primary} disabled={busy} onClick={() => {
        if (window.confirm("Prebaci ovaj draft na novi format Kolekcija? Njegovi sadašnji podaci ostaju, slike dobijaju nezavisne kopije, a budući PDF prati redosljed kolekcija. Postojeći PDF fajlovi i istorija ostaju sačuvani.")) void command({ action: "convert", expectedUpdatedAt: project.updatedAt });
      }}>{busy ? "Kopiranje slika…" : "Prebaci ovaj draft na Kolekcije"}</button></div>
      : <><div className={styles.summary}><span>{plan.collectionCount} kolekcije · {plan.artworkCount} radova u PDF-u</span><span className={styles.spacer} />
        <button className={styles.tool} disabled={busy} onClick={() => setDialog({ kind: "create" })}>+ Nova kolekcija</button>
        <button className={styles.tool} disabled={busy} onClick={() => setDialog({ kind: "import" })}>Preuzmi sa profila</button></div>
        {collections.map((c, index) => group(c, index))}{group(null)}</>}
    {dialog ? <CollectionDialog title={{ create: "Nova portfolio kolekcija", edit: "Uredi portfolio kolekciju", picker: "Dodaj postojeće radove", import: "Preuzmi kolekcije sa profila", publish: "Sačuvaj i na profilu" }[dialog.kind]} theme={theme} onClose={() => { if (!busy) setDialog(null); }}>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {dialog.kind === "create" || dialog.kind === "edit" ? <CollectionForm key={dialog.id ?? "new"} project={project} collection={collections.find(c => c.id === dialog.id)} busy={busy}
        onSubmit={async payload => { if (await command(payload)) setDialog(null); }} onCommand={command} onUpload={upload} />
        : dialog.kind === "publish" ? <PublishCollection project={project} collectionId={dialog.id!} busy={busy} onSubmit={async payload => { if (await command(payload)) setDialog(null); }} />
        : <ProfilePicker project={project} collectionId={dialog.id ?? null} mode={dialog.kind} busy={busy} onSubmit={async payload => { if (await command(payload)) setDialog(null); }} />}
    </CollectionDialog> : null}
  </div>;
}

function Tick() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.2 4.2L19 7" /></svg>; }

function CollectionForm({ project, collection, busy, onSubmit, onCommand, onUpload }: { project: PortfolioProject; collection?: PortfolioCollection; busy: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>; onCommand: (payload: Record<string, unknown>) => Promise<boolean>; onUpload: (id: string, file: File) => Promise<void> }) {
  const [title, setTitle] = useState(collection?.title ?? ""), [description, setDescription] = useState(collection?.description ?? ""), [year, setYear] = useState(collection?.year ?? "");
  const [cover, setCover] = useState("keep"), [destination, setDestination] = useState<Record<string, string>>({});
  const works = project.artworks.filter(w => w.portfolioCollectionId === collection?.id).sort((a, b) => (a.collectionOrderIndex ?? a.orderIndex) - (b.collectionOrderIndex ?? b.orderIndex));
  return <div className={styles.dialogForm}>
    <form className={styles.dialogForm} onSubmit={event => { event.preventDefault(); void onSubmit({ action: collection ? "update" : "create", collectionId: collection?.id,
      title, description, year, ...(cover === "keep" ? {} : { coverArtworkId: cover === "none" ? null : cover }) }); }}>
      <label className={styles.field}>Naziv kolekcije<input className={styles.input} required maxLength={160} value={title} disabled={busy} onChange={e => setTitle(e.target.value)} /></label>
      <label className={styles.field}>Godina<input className={styles.input} maxLength={40} value={year} disabled={busy} onChange={e => setYear(e.target.value)} /></label>
      <label className={styles.field}>Opis<textarea className={styles.input} maxLength={4000} rows={4} value={description} disabled={busy} onChange={e => setDescription(e.target.value)} /></label>
      {collection ? <label className={styles.field}>Naslovna slika<select className={styles.input} value={cover} onChange={e => setCover(e.target.value)} disabled={busy}>
        <option value="keep">Zadrži sadašnju sliku</option><option value="none">Bez naslovne slike</option>{project.artworks.map(w => <option key={w.id} value={w.id}>{w.title || "Bez naziva"}</option>)}
      </select></label> : null}
      <button className={styles.primary} type="submit" disabled={busy || !title.trim()}>Sačuvaj kolekciju</button>
    </form>
    {collection ? <><label className={styles.field}>Pošalji novu naslovnu sliku<input type="file" disabled={busy} accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => { const input = event.currentTarget; const file = input.files?.[0]; if (file) void onUpload(collection.id, file).then(() => { input.value = ""; }); }} /></label>
      <h3>Redosljed i pripadnost radova</h3><ul className={styles.list}>{works.map((work, index) => <li className={styles.row} key={work.id}>
        <span className={styles.rowTitle}>{work.title || "Bez naziva"}</span>
        {[-1, 1].map(direction => <button className={styles.secondary} type="button" key={direction} aria-label={`Pomjeri ${work.title || "rad"} ${direction < 0 ? "gore" : "dolje"}`}
          disabled={busy || index + direction < 0 || index + direction >= works.length} onClick={() => {
            const ids = works.map(w => w.id); [ids[index], ids[index + direction]] = [ids[index + direction]!, ids[index]!];
            void onCommand({ action: "reorderWorks", collectionId: collection.id, artworkIds: ids });
          }}>{direction < 0 ? "↑" : "↓"}</button>)}
        <select className={styles.input} aria-label={`Odredište rada ${work.title || "Bez naziva"}`} value={destination[work.id] ?? collection.id} disabled={busy} onChange={event => setDestination({ ...destination, [work.id]: event.target.value })}>
          <option value="outside">Radovi van kolekcija</option>{project.collections?.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select><button className={styles.secondary} type="button" disabled={busy || !destination[work.id] || destination[work.id] === collection.id} onClick={() => {
          if (window.confirm("Premjesti ovaj rad samo unutar portfolija? Izvorni profil se ne mijenja.")) void onCommand({ action: "move", artworkIds: [work.id], collectionId: destination[work.id] === "outside" ? null : destination[work.id] });
        }}>Premjesti</button>
      </li>)}</ul></> : null}
  </div>;
}

function ProfilePicker({ project, collectionId, mode, busy, onSubmit }: { project: PortfolioProject; collectionId: string | null; mode: "picker" | "import"; busy: boolean; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  const [catalog, setCatalog] = useState<PortfolioCatalog | null>(null), [selected, setSelected] = useState<string[]>([]), [error, setError] = useState("");
  useEffect(() => { let active = true; getPortfolioCatalog(project.id).then(data => { if (active) setCatalog(data); }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Izbor nije dostupan."); }); return () => { active = false; }; }, [project.id]);
  if (error) return <p role="alert" className={styles.error}>{error}</p>;
  if (!catalog) return <p role="status">Učitavanje profila…</p>;
  const items = mode === "import" ? catalog.collections : catalog.artworks;
  return <form className={styles.dialogForm} onSubmit={event => {
    event.preventDefault();
    const originals = mode === "import" ? catalog.collections.filter(c => selected.includes(c.id)).flatMap(c => c.members) : selected;
    const moves = project.artworks.filter(w => w.sourceArtworkId && originals.includes(w.sourceArtworkId) && (mode === "import"
      ? project.collections?.find(c => c.id === w.portfolioCollectionId)?.sourceCollectionId !== catalog.artworks.find(item => item.id === w.sourceArtworkId)?.artistCollectionId
      : (w.portfolioCollectionId ?? null) !== collectionId));
    if (moves.length && !window.confirm(`Ovi radovi već postoje u portfoliju i biće premješteni bez duplikata:\n${moves.map(w => w.title || "Bez naziva").join("\n")}\nRučni metapodaci i slike ostaju.`)) return;
    void onSubmit({ action: mode === "import" ? "import" : "addWorks", collectionId, sourceVersion: catalog.version,
      ...(mode === "import" ? { collectionIds: selected } : { artworkIds: selected }), confirmedMoves: moves.map(w => w.id) });
  }}>
    <p className={styles.description}>Izbor mijenja samo ovaj portfolio. Izabrani radovi biće uključeni; izvorne kolekcije se ne mijenjaju. Najviše 30 sačuvanih radova.</p>
    {items.length === 0 ? <p>Na profilu još nema {mode === "import" ? "kolekcija" : "radova"}.</p> : null}
    {items.map(item => <label className={styles.pickerLabel} key={item.id}><input type="checkbox" disabled={busy} checked={selected.includes(item.id)} onChange={() => setSelected(selected.includes(item.id) ? selected.filter(id => id !== item.id) : [...selected, item.id])} />
      {"imageUrl" in item ? <img src={item.imageUrl} alt="" /> : null}<span>{item.title || "Bez naziva"}{"members" in item ? ` · ${item.members.length} radova` : ""}
        {project.artworks.some(w => w.sourceArtworkId === item.id) ? " · već u portfoliju" : ""}</span></label>)}
    <button className={styles.primary} disabled={busy || !selected.length} type="submit">{mode === "import" ? "Preuzmi izabrane kolekcije" : "Dodaj izabrane radove"}</button>
  </form>;
}

function PublishCollection({ project, collectionId, busy, onSubmit }: { project: PortfolioProject; collectionId: string; busy: boolean; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  const [plan, setPlan] = useState<PublishPlan | null>(null), [confirmed, setConfirmed] = useState(false), [error, setError] = useState("");
  useEffect(() => { let active = true; getPortfolioPublishPlan(project.id, collectionId).then(p => { if (active) setPlan(p); }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Plan nije dostupan."); }); return () => { active = false; }; }, [project.id, collectionId]);
  if (error) return <p role="alert">{error}</p>;
  if (!plan) return <p role="status">Provjera profila…</p>;
  return <div className={styles.dialogForm}><p>Na profilu će biti kreirana kolekcija „{plan.title}”. Portfolio ostaje nezavisan. Prenosi se članstvo svih njenih radova, nezavisno od PDF checkboxova.</p>
    {plan.alreadyPublished ? <p>Kolekcija je već povezana sa profilom. Ponovno objavljivanje nije automatska sinhronizacija.</p> : null}
    {plan.unsupported.length ? <div className={styles.error}>Ovi radovi nemaju postojeći izvor na tvom profilu i ne mogu se automatski objaviti:<ul>{plan.unsupported.map(w => <li key={w.id}>{w.title || "Bez naziva"}</li>)}</ul></div> : null}
    {plan.moves.length ? <><ul className={styles.list}>{plan.moves.map(move => <li key={move.artworkId}><strong>{move.title || "Bez naziva"}</strong><br />{move.from} → {move.to}</li>)}</ul>
      <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> Potvrđujem sva navedena premještanja na profilu.</label></> : null}
    <button className={styles.primary} disabled={busy || plan.alreadyPublished || Boolean(plan.unsupported.length) || (Boolean(plan.moves.length) && !confirmed)} onClick={() => void onSubmit({ action: "publish", collectionId,
      expectedRevision: plan.revision, sourceVersion: plan.sourceVersion, confirmedMoves: plan.moves.map(move => move.artworkId) })}>Sačuvaj i na profilu</button>
  </div>;
}
