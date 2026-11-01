"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";
import { requestArtistCollections, uploadArtistCollectionCover, type ArtistCollectionsReady, type ArtistCollectionsState } from "@/services/artist-collections";
import styles from "./artist-dashboard.module.css";

type Draft = { id: string; title: string; description: string; year: string; cover: string; ids: string[]; fresh: boolean; picker: boolean };
export function ArtistDashboardCollections({ newRequest, active, onSaved, onDirty, onBusy }: { newRequest: number; active: boolean; onSaved: (state: ArtistCollectionsReady) => void; onDirty: (dirty: boolean) => void; onBusy: (busy: boolean) => void }) {
  const [state, setState] = useState<ArtistCollectionsState | null>(null), [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  const picker = useRef<HTMLDivElement>(null), uploadInput = useRef<HTMLInputElement>(null), lastNew = useRef(0), lock = useRef(false), dirtyRef = useRef(false);
  const markDirty = (value: boolean) => { dirtyRef.current = value; setDirty(value); };
  useEffect(() => {
    if (!active || dirtyRef.current) return;
    let live = true; setBusy(true);
    void requestArtistCollections().then(s => { if (live && !dirtyRef.current) { setState(s); setDraft(null); } }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; setBusy(false); };
  }, [active]);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => { onBusy(busy); }, [busy, onBusy]);
  useEffect(() => {
    if (!active || !state?.available || newRequest === lastNew.current) return;
    lastNew.current = newRequest;
    setDraft({ id: crypto.randomUUID(), title: "Nova kolekcija", description: "", year: "", cover: "keep", ids: [], fresh: true, picker: true }); markDirty(true); setError("");
  }, [active, newRequest, state]);
  useEffect(() => {
    if (!draft?.fresh || !draft.picker) return;
    const timer = window.setTimeout(() => picker.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }), 50);
    return () => window.clearTimeout(timer);
  }, [draft?.id, draft?.fresh, draft?.picker]);
  function edit(id: string) {
    if (!state?.available) return;
    if (dirty && draft?.id !== id && !window.confirm("Odbaci nesačuvane izmjene kolekcije?")) return;
    const c = state.collections.find(c => c.id === id)!;
    setDraft({ id, title: c.title, description: c.description || "", year: c.year || "", cover: "keep", ids: state.artworks.filter(w => w.artistCollectionId === id).sort((a,b) => (a.collectionOrderIndex ?? a.orderIndex) - (b.collectionOrderIndex ?? b.orderIndex)).map(w => w.id), fresh: false, picker: false }); markDirty(false); setError("");
  }
  function update(patch: Partial<Draft>) { setDraft(d => d ? { ...d, ...patch } : null); markDirty(true); }
  async function mutate(operation: string, method: string, payload: Record<string, unknown>, finish = false) {
    if (!state?.available || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const next = await requestArtistCollections(operation, method, { ...payload, expectedVersion: state.version });
      setState(next);
      if (next.available) { onSaved(next); if (finish) { setDraft(null); markDirty(false); } }
    } catch (e) { setError(e instanceof Error ? e.message : "Kolekcija nije sačuvana."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function save() {
    if (!draft || !state?.available) return;
    if (!draft.title.trim()) { setError("Unesi naziv kolekcije."); return; }
    const moving = state.artworks.filter(w => draft.ids.includes(w.id) && w.artistCollectionId && w.artistCollectionId !== draft.id);
    if (moving.length && !window.confirm(`${moving.length} radova biće premješteno iz drugih kolekcija. Nastavi?`)) return;
    await mutate("snapshot", "PUT", { id: draft.id, title: draft.title.trim(), description: draft.description.trim(), year: draft.year, artworkIds: draft.ids,
      ...(draft.cover === "keep" ? {} : { coverArtworkId: draft.cover === "none" ? null : draft.cover }) }, true);
  }
  async function uploadCover(file?: File) {
    if (!file || !draft || draft.fresh || dirty || !state?.available || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { const next = await uploadArtistCollectionCover(draft.id, state.version, file); setState(next); if (next.available) onSaved(next); }
    catch (e) { setError(e instanceof Error ? e.message : "Naslovna slika nije sačuvana."); }
    finally { lock.current = false; setBusy(false); }
  }
  function orderCollection(index: number, direction: number) {
    if (!state?.available) return; const ids = state.collections.map(c => c.id); [ids[index], ids[index+direction]] = [ids[index+direction]!, ids[index]!]; void mutate("order", "PUT", { ids });
  }
  function reorderWork(index: number, direction: number) {
    if (!draft) return; const ids = [...draft.ids]; [ids[index], ids[index+direction]] = [ids[index+direction]!, ids[index]!]; update({ ids });
  }
  const renderEditor = () => draft && state?.available ? <form className={styles.collectionEditor} onSubmit={e => { e.preventDefault(); void save(); }} aria-label="Uređivanje kolekcije">
    <div className={styles.workFields}><label className={styles.field}><span className={styles.fieldLabel}>Naziv kolekcije</span><input className={styles.input} required maxLength={160} value={draft.title} disabled={busy} onChange={e => update({ title: e.target.value })} /></label><label className={styles.field}><span className={styles.fieldLabel}>Kratak opis <span className={styles.optional}>· opciono</span></span><input className={styles.input} maxLength={4000} placeholder="Jedna rečenica o kolekciji" value={draft.description} disabled={busy} onChange={e => update({ description: e.target.value })} /></label></div>
    <div className={styles.fieldHeader}><span className={styles.fieldLabel}>Radovi u kolekciji · redoslijed na profilu</span><span className={styles.counter}>{draft.ids.length} odabrano</span></div>
    <div className={styles.selectedWorks}>{draft.ids.map((id, i) => { const w = state.artworks.find(w => w.id === id); return w ? <div className={styles.selectedWork} key={id}><img src={w.imageUrl} alt="" /><span className={styles.selectedWorkName}>{i+1}. {w.title || "Bez naziva"}</span><button type="button" className={styles.iconButton} disabled={busy || i===0} aria-label={`Pomjeri ${w.title || "rad"} gore`} onClick={() => reorderWork(i,-1)}><ArrowUp size={14} /></button><button type="button" className={styles.iconButton} disabled={busy || i===draft.ids.length-1} aria-label={`Pomjeri ${w.title || "rad"} dolje`} onClick={() => reorderWork(i,1)}><ArrowDown size={14} /></button><button type="button" className={styles.iconButton} disabled={busy} aria-label={`Ukloni ${w.title || "rad"} iz kolekcije`} onClick={() => update({ ids: draft.ids.filter(x => x!==id) })}><X size={14} /></button></div> : null; })}</div>
    <div className={styles.collectionEditor} ref={picker}><button className={styles.add} type="button" disabled={busy} aria-expanded={draft.picker} onClick={() => setDraft({ ...draft, picker: !draft.picker })}><span className={styles.addCircle}><Plus size={15} /></span>{draft.picker ? "Zatvori izbor radova" : "Dodaj postojeće radove"}</button>
      {draft.picker ? <div className={styles.collectionPicker}>{state.artworks.map(w => <button className={styles.pickWork} type="button" key={w.id} disabled={busy} aria-pressed={draft.ids.includes(w.id)} onClick={() => update({ ids: draft.ids.includes(w.id) ? draft.ids.filter(x=>x!==w.id) : [...draft.ids,w.id] })}><img src={w.imageUrl} alt="" loading="lazy" /><span>{w.title || "Bez naziva"}</span>{draft.ids.includes(w.id) ? <span className={styles.picked}><Check size={14} /></span> : null}{w.artistCollectionId && w.artistCollectionId !== draft.id ? <span>U drugoj kolekciji</span> : null}</button>)}</div> : null}
      {!state.artworks.length ? <p className={styles.helper}>Prvo dodaj radove u sekciji Radovi.</p> : null}
    </div><div className={styles.rightActions}><button className={styles.outline} type="button" disabled={busy} onClick={() => { if (!dirty || window.confirm("Odbaci nesačuvane izmjene kolekcije?")) { setDraft(null); markDirty(false); } }}>Odustani</button><button className={styles.primary} type="submit" disabled={busy}>{busy ? "Čuvanje…" : "Sačuvaj kolekciju"}</button></div>
    <details className={styles.notice}><summary style={{cursor:"pointer"}}>Godina i naslovna slika</summary><div className={styles.workFields} style={{marginTop:12}}><label className={styles.field}><span className={styles.fieldLabel}>Godina kolekcije</span><input className={styles.input} maxLength={40} value={draft.year} disabled={busy} onChange={e=>update({year:e.target.value})}/></label><label className={styles.field}><span className={styles.fieldLabel}>Naslovni rad kolekcije</span><select className={styles.select} value={draft.cover} disabled={busy} onChange={e=>update({cover:e.target.value})}><option value="keep">Zadrži postojeću sliku</option><option value="none">Bez posebne naslovne slike</option>{state.artworks.map(w=><option value={w.id} key={w.id}>{w.title||"Bez naziva"}</option>)}</select></label></div><div className={styles.actions} style={{marginTop:12}}><button className={styles.outline} type="button" disabled={busy||dirty||draft.fresh} onClick={()=>uploadInput.current?.click()}>Otpremi posebnu naslovnu sliku</button><span className={styles.helper}>Prvo sačuvaj kolekciju. Posebna fotografija se čuva odmah nakon izbora.</span></div></details>
  </form> : null;
  return <section className={styles.panel} aria-label="Kolekcije umjetnika" aria-busy={busy}>
    <p className={styles.notice}>Kolekcija koristi radove koje već imaš u koraku Radovi, bez ponovnog dodavanja fotografija. Brisanjem kolekcije radovi ostaju na profilu.</p>
    {error ? <div className={styles.message} role="alert">{error} <button type="button" className={styles.iconButton} aria-label="Osvježi podatke kolekcija bez brisanja unosa" onClick={() => void requestArtistCollections().then(setState).catch(e => setError(e.message))}>↻</button></div> : null}
    {!state && !error ? <p className={styles.helper}>Učitavanje kolekcija…</p> : null}
    {state && !state.available ? <p className={styles.message}>{state.message}</p> : null}
    {state?.available ? <>
      {state.collections.map((c, index) => <article className={`${styles.card} ${styles.collectionCard}`} key={c.id} aria-label={`Kolekcija ${c.title}`}><div className={styles.collectionTop}><div className={styles.collectionTitle}><h2>{c.title}</h2><p className={styles.helper}>{state.artworks.filter(w => w.artistCollectionId===c.id).length} radova{c.description ? ` · ${c.description}` : ""}</p></div><div className={styles.actions}><button type="button" className={styles.iconButton} disabled={busy || index===0} aria-label={`Pomjeri kolekciju ${c.title} gore`} onClick={() => orderCollection(index,-1)}><ArrowUp size={14} /></button><button type="button" className={styles.iconButton} disabled={busy || index===state.collections.length-1} aria-label={`Pomjeri kolekciju ${c.title} dolje`} onClick={() => orderCollection(index,1)}><ArrowDown size={14} /></button><button type="button" className={styles.outline} disabled={busy} onClick={() => edit(c.id)}>Uredi</button><button type="button" className={styles.danger} disabled={busy} onClick={() => { if (window.confirm(`Obriši kolekciju „${c.title}”? Radovi i fotografije ostaju sačuvani.`)) void mutate(c.id,"DELETE",{},draft?.id===c.id); }}>Obriši</button></div></div>
        {draft?.id===c.id ? renderEditor() : <div className={styles.collectionThumbs}>{state.artworks.filter(w => w.artistCollectionId===c.id).sort((a,b)=>(a.collectionOrderIndex??a.orderIndex)-(b.collectionOrderIndex??b.orderIndex)).slice(0,8).map(w=><img src={w.imageUrl} key={w.id} alt={w.title||"Rad"} loading="lazy" />)}</div>}
      </article>)}
      {draft?.fresh ? <article className={`${styles.card} ${styles.collectionCard}`}><h2 className={styles.fieldLabel}>Nova kolekcija</h2>{renderEditor()}</article> : null}
      {!state.collections.length && !draft ? <p className={styles.notice}>Još nema kolekcija. Napravi prvu i dodaj joj radove iz profila.</p> : null}
    </> : null}
    <input ref={uploadInput} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Posebna naslovna slika kolekcije" onChange={e=>{const file=e.target.files?.[0];e.target.value="";void uploadCover(file)}}/>
  </section>;
}


