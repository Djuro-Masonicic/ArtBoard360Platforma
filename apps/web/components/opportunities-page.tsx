"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, CalendarDays, Check, Clock3, Copy, Globe2, Grid2X2, Languages, List, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { OpportunityApplyButton } from "@/components/opportunity-apply-button";
import { ARTBOARD_DISCIPLINES } from "@/lib/artboard-disciplines";
import { OPPORTUNITY_COUNTRIES } from "@/lib/opportunity-countries";
import { compensationLabel, compensationValue, countryLabel, daysRemaining, deadlineLabel, documentLabels, feeLabel, isOpenOpportunity, languageLabels, locationLabel, normalizeOpportunityText, opportunityTypeLabels as typeLabels, opportunityTypeOrder as typeOrder, organizerTypeLabels, publishedLabel, workModeLabels } from "@/lib/opportunity-presentation";
import type { Opportunity, OpportunityType, OpportunityWorkMode } from "@/services/opportunities";
import styles from "./opportunities-page.module.css";

type View = "list" | "grid";
const storageKey = "artboard:saved-opportunities";

export function OpportunitiesPage({ couldLoad, opportunities, initialSelected = null, now }: { couldLoad: boolean; opportunities: Opportunity[]; initialSelected?: Opportunity | null; now: number }) {
  const boardRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [types, setTypes] = useState<OpportunityType[]>([]);
  const [discipline, setDiscipline] = useState("");
  const [workMode, setWorkMode] = useState<OpportunityWorkMode | "">("");
  const [deadline, setDeadline] = useState("all");
  const [minAmount, setMinAmount] = useState(0);
  const [onlyPaid, setOnlyPaid] = useState(false);
  const [onlyYoung, setOnlyYoung] = useState(false);
  const [tab, setTab] = useState<"all" | "saved">("all");
  const [sort, setSort] = useState("deadline");
  const [view, setView] = useState<View>("list");
  const [saved, setSaved] = useState<string[]>([]);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [selected, setSelected] = useState<Opportunity | null>(null);

  useEffect(() => {
    function readSaved() {
      try {
        const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
        setSaved(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);
      } catch { setSaved([]); }
    }
    readSaved();
    window.addEventListener("storage", readSaved);
    return () => window.removeEventListener("storage", readSaved);
  }, []);
  useEffect(() => {
    function readSelection() {
      const identifier = new URL(window.location.href).searchParams.get("oglas");
      setSelected(opportunities.find((item) => item.slug === identifier || item.id === identifier) ?? (initialSelected?.slug === identifier || initialSelected?.id === identifier ? initialSelected : null));
    }
    readSelection();
    window.addEventListener("popstate", readSelection);
    return () => window.removeEventListener("popstate", readSelection);
  }, [opportunities, initialSelected]);

  const active = useMemo(() => opportunities.filter((item) => isOpenOpportunity(item, now)), [opportunities, now]);
  const featured = useMemo(() => active.filter((item) => item.isFeatured).slice(0, 2), [active]);
  const savedItems = opportunities.filter((item) => saved.includes(item.id));
  const typeCounts = Object.fromEntries(typeOrder.map((type) => [type, active.filter((item) => item.type === type).length]));
  const newThisWeek = active.filter((item) => now - new Date(item.createdAt).getTime() >= 0 && now - new Date(item.createdAt).getTime() <= 7 * 86400000).length;

  const filtered = useMemo(() => {
    const base = tab === "saved" ? opportunities.filter((item) => saved.includes(item.id)) : active;
    return base.filter((item) => {
      const text = normalizeOpportunityText([item.title, item.organization, item.location, item.city, item.summary, item.description, ...item.disciplines].filter(Boolean).join(" "));
      if (query && !text.includes(normalizeOpportunityText(query.trim()))) return false;
      if (country === "REG" && item.workMode !== "REMOTE" && item.countryCode !== "REG") return false;
      if (country && country !== "REG" && (item.countryCode ? item.countryCode !== country : !normalizeOpportunityText(item.location ?? "").includes(normalizeOpportunityText(countryLabel(country))))) return false;
      if (types.length && !types.includes(item.type)) return false;
      if (discipline && !item.disciplines.includes(discipline)) return false;
      if (workMode && item.workMode !== workMode) return false;
      if (onlyPaid && (item.compensationKind === "NONE" || (!item.isPaid && Number(item.compensationAmount ?? 0) <= 0))) return false;
      if (onlyYoung && (item.maxAge === null || item.maxAge > 35)) return false;
      if (minAmount > 0 && (item.compensationCurrency !== "EUR" || Number(item.compensationAmount ?? 0) < minAmount || item.compensationKind === "NONE")) return false;
      const days = daysRemaining(item, now);
      return deadline === "all" || (days !== null && days >= 0 && days <= Number(deadline));
    }).sort((a, b) => {
      if (sort === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "amount") return (b.compensationCurrency === "EUR" ? Number(b.compensationAmount ?? 0) : 0) - (a.compensationCurrency === "EUR" ? Number(a.compensationAmount ?? 0) : 0);
      return (daysRemaining(a, now) ?? Infinity) - (daysRemaining(b, now) ?? Infinity) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [active, country, deadline, discipline, minAmount, now, onlyPaid, onlyYoung, opportunities, query, saved, sort, tab, types, workMode]);

  const filters: { label: string; clear: () => void }[] = [
    ...(query ? [{ label: query, clear: () => setQuery("") }] : []),
    ...(country ? [{ label: countryLabel(country), clear: () => setCountry("") }] : []),
    ...types.map((type) => ({ label: typeLabels[type], clear: () => setTypes((current) => current.filter((value) => value !== type)) })),
    ...(discipline ? [{ label: discipline, clear: () => setDiscipline("") }] : []),
    ...(workMode ? [{ label: workModeLabels[workMode], clear: () => setWorkMode("") }] : []),
    ...(deadline !== "all" ? [{ label: `U narednih ${deadline} dana`, clear: () => setDeadline("all") }] : []),
    ...(minAmount ? [{ label: `Od ${minAmount} €`, clear: () => setMinAmount(0) }] : []),
    ...(onlyPaid ? [{ label: "Plaćene prilike", clear: () => setOnlyPaid(false) }] : []),
    ...(onlyYoung ? [{ label: "Za mlade", clear: () => setOnlyYoung(false) }] : []),
  ];
  function clearFilters() { setQuery(""); setCountry(""); setTypes([]); setDiscipline(""); setWorkMode(""); setDeadline("all"); setMinAmount(0); setOnlyPaid(false); setOnlyYoung(false); }
  function toggleSaved(id: string) {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
      return next;
    });
  }
  function openOpportunity(item: Opportunity | null) {
    setSelected(item);
    const url = new URL(window.location.href);
    if (item) url.searchParams.set("oglas", item.slug); else url.searchParams.delete("oglas");
    window.history.replaceState(window.history.state, "", url);
  }
  function submitSearch(event: FormEvent) { event.preventDefault(); boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }

  return <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <h1>Prilike za umjetnike <span>u cijelom regionu.</span></h1>
          <p className={styles.lead}>Pronađi konkurse, poslove i saradnje na jednom mjestu. Izaberi prilike koje odgovaraju tvom radu i prijavi se direktno organizatoru, bez komplikovanih procedura.</p>
          <form className={styles.searchBar} onSubmit={submitSearch} role="search">
            <label className={styles.searchField}><Search size={18} aria-hidden="true" /><input aria-label="Pretraga oglasa" placeholder="Ilustracija, izložba, Podgorica" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <label className={styles.countryField}><MapPin size={17} aria-hidden="true" /><CountrySelect label="Pretraži po državi" value={country} onChange={setCountry} /></label>
            <button type="submit"><Search size={15} aria-hidden="true" />Pretraži</button>
          </form>
        </div>
        <div className={styles.liveStats}>
          <p className={styles.liveLabel}><i />Uživo na tabli</p>
          <div><strong>{couldLoad ? active.length : "—"}</strong><span>Aktivnih prilika</span></div>
          <div><strong>{couldLoad ? newThisWeek : "—"}</strong><span>Novo ove sedmice</span></div>
        </div>
      </div>
    </section>
    {featured.length > 0 && <section className={styles.featuredSection} aria-labelledby="featured-title"><div className={styles.wrap}>
      <h2 className={styles.sectionTitle} id="featured-title">Izdvojeno <span>ove sedmice.</span></h2>
      <div className={styles.featuredGrid}>{featured.map((item) => <article className={styles.featuredCard} key={item.id}>
        <OpportunityCover item={item} className={styles.featuredMedia}><div className={styles.mediaBadges}><span className={styles.darkBadge}><i data-type={item.type} />{typeLabels[item.type]}</span><span className={styles.whiteBadge}>{deadlineLabel(item, now)}</span></div></OpportunityCover>
        <div className={styles.featuredBody}>
          <h3><button className={styles.cardTitle} onClick={() => openOpportunity(item)} type="button">{item.title}</button></h3>
          <p className={styles.organization}>{item.organization || "Organizator nije naveden"} · {locationLabel(item)}</p>
          <p className={styles.featuredSummary}>{item.summary || item.description}</p>
          <div className={styles.featuredBottom}><div><small>{compensationLabel(item)}</small><strong>{compensationValue(item)}</strong></div><span className={styles.featuredOpenButton}>Pogledaj oglas <ArrowRight size={15} /></span></div>
        </div>
      </article>)}</div>
    </div></section>}

    <section className={styles.boardSection} id="tabla" ref={boardRef} aria-label="Oglasna tabla"><div className={`${styles.wrap} ${styles.boardLayout}`}>
      <button aria-expanded={mobileFilters} aria-controls="opportunity-filters" className={styles.mobileFilterButton} onClick={() => setMobileFilters((current) => !current)} type="button"><SlidersHorizontal size={18} />Filteri {filters.length > 0 && <span>{filters.length}</span>}{mobileFilters ? <X size={18} /> : null}</button>
      <aside className={`${styles.filters} ${mobileFilters ? styles.filtersOpen : ""}`} id="opportunity-filters" aria-label="Filteri oglasa" data-lenis-prevent>
        <div className={styles.filterHeader}><h2>Filteri</h2><button disabled={!filters.length} onClick={clearFilters} type="button">Očisti sve</button></div>
        <FilterGroup label="Država"><CountrySelect label="Filtriraj po državi" value={country} onChange={setCountry} /></FilterGroup>
        <FilterGroup label="Vrsta prilike"><div className={styles.typePills}>{typeOrder.map((type) => <button aria-pressed={types.includes(type)} className={types.includes(type) ? styles.activeFilter : ""} key={type} onClick={() => setTypes((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type])} type="button">{typeLabels[type]}<span>{typeCounts[type]}</span></button>)}</div></FilterGroup>
        <FilterGroup label="Disciplina"><select aria-label="Disciplina" value={discipline} onChange={(event) => setDiscipline(event.target.value)}><option value="">Sve discipline</option>{ARTBOARD_DISCIPLINES.map(({ name }) => <option key={name}>{name}</option>)}</select></FilterGroup>
        <FilterGroup label="Način rada"><div className={`${styles.segmented} ${styles.workModes}`}>{(["", "ONSITE", "REMOTE", "HYBRID"] as const).map((value) => <button aria-pressed={workMode === value} className={workMode === value ? styles.selectedSegment : ""} key={value} onClick={() => setWorkMode(value)} type="button">{value ? workModeLabels[value] : "Sve"}</button>)}</div></FilterGroup>
        <FilterGroup label="Rok za prijavu"><div className={styles.segmented}>{["all", "7", "30"].map((value) => <button aria-pressed={deadline === value} className={deadline === value ? styles.selectedSegment : ""} key={value} onClick={() => setDeadline(value)} type="button">{value === "all" ? "Svi" : `${value} dana`}</button>)}</div></FilterGroup>
        <FilterGroup label="Minimalna naknada (EUR)"><div className={styles.rangeLabel}><output htmlFor="minimum-compensation">{minAmount ? `${minAmount.toLocaleString("sr-Latn-ME")} €` : "Bilo koja"}</output></div><input aria-label="Minimalna naknada u eurima" id="minimum-compensation" type="range" min="0" max="5000" step="100" value={minAmount} onChange={(event) => setMinAmount(Number(event.target.value))} /></FilterGroup>
        <Toggle checked={onlyPaid} onChange={setOnlyPaid} title="Samo plaćene prilike" description="Honorar, nagrada ili stipendija" />
        <Toggle checked={onlyYoung} onChange={setOnlyYoung} title="Za mlade umjetnike" description="Pozivi sa granicom do 35 godina" />
      </aside>
      <div className={styles.results}>
        <div className={styles.tabs} role="group" aria-label="Prikaz prilika"><button aria-pressed={tab === "all"} className={tab === "all" ? styles.activeTab : ""} onClick={() => setTab("all")} type="button">Sve prilike <span>{active.length}</span></button><button aria-pressed={tab === "saved"} className={tab === "saved" ? styles.activeTab : ""} onClick={() => setTab("saved")} type="button"><Bookmark size={14} />Sačuvano <span>{savedItems.length}</span></button></div>
        <div className={styles.resultsToolbar}>
          <strong className={styles.resultCount} aria-live="polite">{filtered.length} {filtered.length === 1 ? "prilika" : filtered.length > 1 && filtered.length < 5 ? "prilike" : "prilika"}</strong>
          <div className={styles.resultControls}><select aria-label="Sortiraj oglase" value={sort} onChange={(event) => setSort(event.target.value)}><option value="deadline">Rok: najbliži prvo</option><option value="new">Najnovije objavljeno</option><option value="amount">Najveća naknada (EUR)</option></select><div className={styles.viewToggle}><button type="button" aria-label="Prikaži kao listu" aria-pressed={view === "list"} className={view === "list" ? styles.activeView : ""} onClick={() => setView("list")}><List size={18} /></button><button type="button" aria-label="Prikaži kao mrežu" aria-pressed={view === "grid"} className={view === "grid" ? styles.activeView : ""} onClick={() => setView("grid")}><Grid2X2 size={17} /></button></div></div>
        </div>
        {filters.length > 0 && <div className={styles.filterChips}>{filters.map(({ label, clear }, index) => <button key={`${index}-${label}`} type="button" onClick={clear}>{label}<X size={12} /></button>)}</div>}
        {!couldLoad && <div className={styles.empty} role="status"><h3>Oglasi trenutno nijesu dostupni.</h3><p>Pokušaj ponovo za nekoliko minuta.</p><button type="button" onClick={() => window.location.reload()}>Pokušaj ponovo</button></div>}
        <div className={`${styles.cards} ${view === "grid" ? styles.cardGrid : ""}`}>{filtered.map((item) => <OpportunityCard key={item.id} item={item} now={now} view={view} isSaved={saved.includes(item.id)} onOpen={openOpportunity} onSave={toggleSaved} />)}</div>
        {couldLoad && filtered.length === 0 && <div className={styles.empty}><Search size={28} /><h3>{tab === "saved" && !savedItems.length ? "Tvoje sačuvane prilike su ovdje." : "Trenutno nema prilika za ove filtere."}</h3><p>{tab === "saved" && !savedItems.length ? "Sačuvaj zanimljiv oglas klikom na oznaku u njegovom uglu." : "Promijeni filtere ili pogledaj sve dostupne prilike."}</p><button onClick={() => { clearFilters(); setTab("all"); }} type="button">Pogledaj sve prilike</button></div>}
      </div>
    </div></section>

    <section className={styles.organizers} id="organizatori"><div className={styles.wrap}>
      <p className={styles.darkEyebrow}><i />Za organizatore</p><h2>Tražiš umjetnike?<span>Objavi oglas besplatno.</span></h2>
      <p className={styles.organizerLead}>Bilo da si pojedinac, neformalna grupa ili organizacija, predstavi svoju priliku umjetnicima besplatno. Popuni kratku formu, a nakon provjere oglas postaje dostupan ArtBoard zajednici.</p>
      <div className={styles.steps}>{[{ title: "Popuni formu", text: "Unesi podatke o prilici, uslovima i prijavi." }, { title: "Pošalji na provjeru", text: "ArtBoard tim provjerava oglas prije objave." }, { title: "Poveži se sa umjetnicima", text: "Umjetnici vide odobren oglas i javljaju se tebi." }].map(({ title, text }, index) => <article key={title}><h3><span>0{index + 1}</span>{title}</h3><p>{text}</p></article>)}</div>
      <Link className={styles.organizerButton} href="/oglasi/objavi">Objavi oglas besplatno <ArrowRight size={16} /></Link>
    </div></section>
    {selected && createPortal(<OpportunityDrawer key={selected.id} item={selected} now={now} isSaved={saved.includes(selected.id)} onSave={toggleSaved} onClose={() => openOpportunity(null)} />, document.body)}
  </div>;
}

function CountrySelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{OPPORTUNITY_COUNTRIES.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}</select>;
}
function FilterGroup({ label, children }: { label: string; children: ReactNode }) { return <div className={styles.filterGroup}><p className={styles.filterLabel}>{label}</p>{children}</div>; }
function Toggle({ checked, description, onChange, title }: { checked: boolean; description: string; onChange: (value: boolean) => void; title: string }) {
  return <button className={styles.toggleRow} role="switch" aria-checked={checked} onClick={() => onChange(!checked)} type="button"><span><strong>{title}</strong><small>{description}</small></span><i className={checked ? styles.toggleOn : ""}><b /></i></button>;
}
function OpportunityCover({ item, className, children }: { item: Opportunity; className?: string; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const src = item.coverImageUrl && !failed ? item.coverImageUrl : item.type === "RESIDENCY" ? "/opportunities/ribbons-ocean.svg" : "/opportunities/ribbons-rose.svg";
  return <div className={className}><img alt="" src={src} loading="lazy" onError={() => setFailed(true)} />{children}</div>;
}
function Badges({ item, now }: { item: Opportunity; now: number }) {
  const days = daysRemaining(item, now);
  const isNew = now - new Date(item.createdAt).getTime() >= 0 && now - new Date(item.createdAt).getTime() <= 7 * 86400000;
  return <><span className={styles.typeBadge} data-type={item.type}><i />{typeLabels[item.type]}</span><span className={`${styles.deadlineBadge} ${days !== null && days >= 0 && days <= 7 ? styles.urgent : ""}`}><Clock3 size={13} />{deadlineLabel(item, now)}</span>{item.isDemo ? <span className={styles.demoBadge}>Primjer oglasa</span> : isNew ? <span className={styles.newBadge}>Novo</span> : null}</>;
}
function OpportunityCard({ item, now, view, isSaved, onOpen, onSave }: { item: Opportunity; now: number; view: View; isSaved: boolean; onOpen: (item: Opportunity) => void; onSave: (id: string) => void }) {
  return <article className={`${styles.opportunityCard} ${item.isFeatured ? styles.featuredOpportunity : ""}`} data-opportunity-id={item.id}>
    {(item.isFeatured || (view === "grid" && item.coverImageUrl)) && <OpportunityCover item={item} className={styles.cardMedia}>{item.isFeatured && <span className={styles.featuredBadge}><i />Istaknuto</span>}</OpportunityCover>}
    <div className={styles.cardContent}><div className={styles.cardBadges}><Badges item={item} now={now} /><button className={`${styles.saveButton} ${isSaved ? styles.savedButton : ""}`} aria-label={isSaved ? "Ukloni iz sačuvanih" : "Sačuvaj oglas"} aria-pressed={isSaved} onClick={() => onSave(item.id)} type="button"><Bookmark size={18} fill={isSaved ? "currentColor" : "none"} /></button></div>
      <div className={styles.cardDetails}><div className={styles.cardMain}>
        <h3><button className={styles.cardTitle} onClick={() => onOpen(item)} type="button">{item.title}</button></h3>
        <p className={styles.cardOrganization}>{item.organization || "Organizator nije naveden"}{item.organizerType && <span> · {organizerTypeLabels[item.organizerType]}</span>}</p>
        <div className={styles.cardFacts}><span><MapPin size={15} />{locationLabel(item)}</span>{item.workMode && <span><Globe2 size={15} />{workModeLabels[item.workMode]}</span>}{item.applicationLanguages.length > 0 && <span><Languages size={15} />{item.applicationLanguages.map((code) => languageLabels[code] || code).join(", ")}</span>}</div>
        {item.disciplines.length > 0 && <div className={styles.disciplineTags}>{item.disciplines.slice(0, 3).map((name) => <span key={name}>{name}</span>)}{item.disciplines.length > 3 && <span title={item.disciplines.slice(3).join(", ")}>+{item.disciplines.length - 3}</span>}</div>}
      </div><div className={styles.cardSide}><small>{compensationLabel(item)}</small><strong>{compensationValue(item)}</strong>{feeLabel(item) && <span>{feeLabel(item)}</span>}</div></div>
    </div>
  </article>;
}
function Meta({ label, children }: { label: string; children: ReactNode }) { return <div className={styles.drawerMetaCard}><small>{label}</small><strong>{children}</strong></div>; }
function ApplicationAction({ item, now }: { item: Opportunity; now: number }) {
  if (item.isDemo) return <span className={styles.disabledAction} aria-disabled="true">Demonstracioni oglas</span>;
  if (!isOpenOpportunity(item, now)) return <span className={styles.disabledAction}>Prijave su završene</span>;
  if (item.applyUrl && (item.applicationMethod === "LINK" || !item.applicationMethod)) return <a className={styles.primaryAction} href={item.applyUrl} target="_blank" rel="noopener noreferrer">Prijavi se putem linka <ArrowRight size={16} /></a>;
  if (item.applyEmail) return <a className={styles.primaryAction} href={`mailto:${item.applyEmail}?subject=${encodeURIComponent(`Prijava: ${item.title}`)}`}>Prijavi se e-mailom <ArrowRight size={16} /></a>;
  if (item.hasArtboardApplication) return <OpportunityApplyButton className={styles.primaryAction} label="Prijavi se" opportunityId={item.id} />;
  return <Link className={styles.primaryAction} href="/artboard/kontakt">Pitaj za detalje <ArrowRight size={16} /></Link>;
}
function calendarDownload(item: Opportunity) {
  if (!item.deadlineAt || item.isOpenEnded) return null;
  const start = new Date(item.deadlineAt);
  const end = new Date(start.getTime() + 86400000);
  const date = (value: Date) => value.toISOString().slice(0, 10).replaceAll("-", "");
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r/g, "");
  const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ArtBoard//Oglasi//ME", "BEGIN:VEVENT", `UID:${item.id}@artboard`, `DTSTAMP:${new Date(item.createdAt).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`, `DTSTART;VALUE=DATE:${date(start)}`, `DTEND;VALUE=DATE:${date(end)}`, `SUMMARY:${escape(`Rok za prijavu: ${item.title}`)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
}
function OpportunityDrawer({ item, now, isSaved, onSave, onClose }: { item: Opportunity; now: number; isSaved: boolean; onSave: (id: string) => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [views, setViews] = useState(item.viewCount);
  const calendar = calendarDownload(item);
  const age = item.maxAge ? `Do ${item.maxAge} godina` : "Bez navedene starosne granice";
  useEffect(() => {
    const dialog = dialogRef.current;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previous = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = previous; document.documentElement.style.overflow = htmlOverflow; focused?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    if (item.isDemo) return;
    const key = `artboard:opportunity-view:${item.id}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { return; }
    fetch(`/api/opportunities/${item.id}/view`, { method: "POST" }).then((response) => {
      if (response.ok) setViews((value) => value + 1); else sessionStorage.removeItem(key);
    }).catch(() => { try { sessionStorage.removeItem(key); } catch {} });
  }, [item.id, item.isDemo]);
  async function copyLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/oglasi?oglas=${encodeURIComponent(item.slug)}`); setCopied(true); setCopyError(false); } catch { setCopyError(true); }
  }
  return <dialog ref={dialogRef} className={styles.drawer} aria-labelledby="opportunity-title" data-lenis-prevent onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && event.clientX < event.currentTarget.getBoundingClientRect().left) onClose(); }}>
    <header className={styles.drawerHeader}><div className={styles.drawerHeaderBadges}><Badges item={item} now={now} /></div><button type="button" aria-label="Zatvori oglas" onClick={onClose} className={styles.drawerClose} autoFocus><X size={21} /></button></header>
    <div className={styles.drawerContent}>
      <h2 id="opportunity-title">{item.title}</h2><p className={styles.drawerOrganization}>{item.organization || "Organizator nije naveden"}{item.organizerType && <span> · {organizerTypeLabels[item.organizerType]}</span>}</p><p className={styles.drawerPublished}>{publishedLabel(item, now)}{views > 0 && ` · ${views.toLocaleString("sr-Latn-ME")} pregleda`}</p>
      {item.isDemo && <p className={styles.demoNotice}>Ovo je primjer oglasa za pregled platforme. Prijave nijesu otvorene.</p>}
      <div className={styles.drawerMetaGrid}>
        <Meta label={compensationLabel(item)}>{compensationValue(item)}{feeLabel(item) && ` (${feeLabel(item)})`}</Meta>
        <Meta label="Rok za prijavu">{deadlineLabel(item, now, true)}</Meta><Meta label="Lokacija">{locationLabel(item)}</Meta>
        {item.workMode && <Meta label="Način rada">{workModeLabels[item.workMode]}</Meta>}
        <Meta label="Uslovi">{age}{item.eligibleCountries.length > 0 && ` · ${item.eligibleCountries.map(countryLabel).join(", ")}`}</Meta>
        {item.applicationLanguages.length > 0 && <Meta label="Jezik prijave">{item.applicationLanguages.map((code) => languageLabels[code] || code).join(", ")}</Meta>}
        {feeLabel(item) && <Meta label="Kotizacija">{feeLabel(item)}</Meta>}
        {item.compensation && item.compensationAmount !== null && <Meta label="Napomena">{item.compensation}</Meta>}
      </div>
      {item.disciplines.length > 0 && <div className={styles.disciplineTags}>{item.disciplines.map((name) => <span key={name}>{name}</span>)}</div>}
      <section className={styles.drawerSection}><h3>O prilici</h3><p>{item.description}</p></section>
      {item.conditions && <section className={styles.drawerSection}><h3>Uslovi i kriterijumi</h3><p>{item.conditions}</p></section>}
      {item.coveredCosts.length > 0 && <div className={styles.coveredCosts}>{item.coveredCosts.map((label) => <span key={label}><Check size={15} />{label}</span>)}</div>}
      {item.requiredDocuments.length > 0 && <section className={styles.documents}><div><h3>Šta treba poslati</h3><span>Šalješ direktno organizatoru</span></div><ol>{item.requiredDocuments.map((label) => <li key={label}>{documentLabels[label] || label}</li>)}</ol></section>}
      {item.additionalInformation && <section className={styles.drawerSection}><h3>Dodatne informacije</h3><p>{item.additionalInformation}</p></section>}
      <div className={styles.drawerActions}><ApplicationAction item={item} now={now} /><button className={styles.outlineAction} onClick={() => onSave(item.id)} type="button">{isSaved ? "Sačuvano" : "Sačuvaj"}<Bookmark size={15} fill={isSaved ? "currentColor" : "none"} /></button></div>
      <div className={styles.drawerTools}>{calendar && <a href={calendar} download={`artboard-${item.slug}.ics`}><CalendarDays size={16} />Dodaj rok u kalendar</a>}<button onClick={copyLink} type="button">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Link kopiran" : "Kopiraj link"}</button><a className={styles.reportLink} href={`mailto:info@artstudio360.me?subject=${encodeURIComponent(`Prijava netačnog oglasa: ${item.title}`)}&body=${encodeURIComponent(`Oglas: ${item.slug}\n\nRazlog prijave: `)}`}>Prijavi netačan oglas</a></div>
      {copyError && <p className={styles.copyError}>Kopiraj adresu iz preglednika da podijeliš ovaj oglas.</p>}
    </div>
  </dialog>;
}
