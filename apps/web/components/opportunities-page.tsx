"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  Clock3,
  Grid2X2,
  List,
  MapPin,
  Search,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { OpportunityApplyButton } from "@/components/opportunity-apply-button";
import type { Opportunity, OpportunityType } from "@/services/opportunities";

import styles from "./opportunities-page.module.css";

const typeLabels: Record<OpportunityType, string> = {
  OPEN_CALL: "Konkurs",
  JOB: "Posao",
  RESIDENCY: "Rezidencija",
  EXHIBITION: "Izlozba",
  COLLABORATION: "Saradnja",
  GRANT: "Grant i stipendija",
  OTHER: "Drugo",
};

const typeOrder: OpportunityType[] = [
  "OPEN_CALL",
  "RESIDENCY",
  "JOB",
  "COLLABORATION",
  "EXHIBITION",
  "GRANT",
  "OTHER",
];

const covers = [
  "/artboard-ad/pexels-bertellifotografia-33714927.jpg",
  "/artboard-opportunities-optimized.webp",
  "/artboard-opportunities-studio.png",
  "/artboard-why/opportunities.webp",
];

type Tab = "all" | "matched" | "saved";
type View = "list" | "grid";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function countryFrom(location: string | null) {
  if (!location) return "Lokacija nije navedena";
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) ?? location;
}

function formatDeadline(deadlineAt: string | null) {
  if (!deadlineAt) return "Rok nije naveden";
  const deadline = new Date(deadlineAt);
  const days = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
  if (days >= 0 && days <= 7) return `Ističe za ${days === 1 ? "1 dan" : `${days} dana`}`;
  return `Rok: ${new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(deadline)}`;
}

function OpportunityAction({ opportunity }: { opportunity: Opportunity }) {
  if (opportunity.contactEmail) {
    return (
      <OpportunityApplyButton
        className={styles.primaryAction}
        label="Prijavi se"
        opportunityId={opportunity.id}
      />
    );
  }
  if (opportunity.applyUrl) {
    return (
      <a className={styles.primaryAction} href={opportunity.applyUrl} rel="noreferrer" target="_blank">
        Pogledaj oglas <ArrowRight size={16} />
      </a>
    );
  }
  return (
    <Link className={styles.primaryAction} href="/artboard/kontakt">
      Pitaj za detalje <ArrowRight size={16} />
    </Link>
  );
}

export function OpportunitiesPage({
  couldLoad,
  opportunities,
}: {
  couldLoad: boolean;
  opportunities: Opportunity[];
}) {
  const boardRef = useRef<HTMLElement>(null);
  const featuredRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [heroCountry, setHeroCountry] = useState("");
  const [type, setType] = useState<OpportunityType | "">("");
  const [country, setCountry] = useState("");
  const [deadline, setDeadline] = useState<"all" | "7" | "30">("all");
  const [onlyPaid, setOnlyPaid] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState("deadline");
  const [view, setView] = useState<View>("list");
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("artboard:saved-opportunities");
    if (stored) setSaved(JSON.parse(stored) as string[]);
  }, []);

  const countries = useMemo(
    () => Array.from(new Set(opportunities.map((item) => countryFrom(item.location)))).sort(),
    [opportunities],
  );

  const typeCounts = useMemo(
    () => Object.fromEntries(typeOrder.map((itemType) => [itemType, opportunities.filter((item) => item.type === itemType).length])) as Record<OpportunityType, number>,
    [opportunities],
  );

  const matchedIds = useMemo(
    () => opportunities.filter((item) => item.isFeatured || item.isPaid).map((item) => item.id),
    [opportunities],
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    return opportunities
      .filter((item) => {
        const haystack = normalize([item.title, item.organization, item.location, item.summary, item.description].filter(Boolean).join(" "));
        if (query && !haystack.includes(normalize(query))) return false;
        if (country && countryFrom(item.location) !== country) return false;
        if (type && item.type !== type) return false;
        if (onlyPaid && !item.isPaid) return false;
        if (tab === "matched" && !matchedIds.includes(item.id)) return false;
        if (tab === "saved" && !saved.includes(item.id)) return false;
        if (deadline !== "all") {
          if (!item.deadlineAt) return false;
          const remaining = (new Date(item.deadlineAt).getTime() - now) / 86_400_000;
          if (remaining < 0 || remaining > Number(deadline)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sort === "paid") return Number(b.isPaid) - Number(a.isPaid);
        if (sort === "match") return Number(b.isFeatured) - Number(a.isFeatured);
        const aDate = a.deadlineAt ? new Date(a.deadlineAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.deadlineAt ? new Date(b.deadlineAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });
  }, [country, deadline, matchedIds, onlyPaid, opportunities, query, saved, sort, tab, type]);

  const featured = useMemo(() => {
    const prioritized = [...opportunities].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    return prioritized.slice(0, 2);
  }, [opportunities]);

  const newThisWeek = opportunities.filter(
    (item) => Date.now() - new Date(item.createdAt).getTime() <= 7 * 86_400_000,
  ).length;

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setCountry(heroCountry);
    boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleSaved(id: string) {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem("artboard:saved-opportunities", JSON.stringify(next));
      return next;
    });
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><i />ArtBoard oglasi</p>
            <h1>Prilike za umjetnike <span>u cijelom regionu.</span></h1>
            <p className={styles.lead}>Konkursi, rezidencije, poslovi i saradnje na jednom mjestu. Provjereni, filtrirani i usklađeni sa tvojim profilom.</p>
            <form className={styles.searchBar} onSubmit={submitSearch}>
              <label>
                <Search aria-hidden="true" size={20} />
                <input aria-label="Pretraži oglase" onChange={(event) => setQuery(event.target.value)} placeholder="Pretraži: ilustracija, mural, rezidencija..." value={query} />
              </label>
              <select aria-label="Izaberi zemlju" onChange={(event) => setHeroCountry(event.target.value)} value={heroCountry}>
                <option value="">Sve zemlje</option>
                {countries.map((item) => <option key={item}>{item}</option>)}
              </select>
              <button type="submit">Pretraži</button>
            </form>
            <p className={styles.searchHint}>Pretraga radi i bez kvačica: "cetinje", "crtez", "skolska".</p>
          </div>
          <div className={styles.liveStats}>
            <p className={styles.liveLabel}><i />Uživo na tabli</p>
            <div><strong>{opportunities.length}</strong><span>Aktivnih prilika</span></div>
            <div><strong>{newThisWeek}</strong><span>Novo ove sedmice</span></div>
          </div>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className={styles.featuredSection} ref={featuredRef}>
          <div className={styles.wrap}>
            <p className={styles.eyebrow}><i />Istaknute prilike</p>
            <h2 className={styles.sectionTitle}>Izdvojeno <span>ove sedmice.</span></h2>
            <div className={styles.featuredGrid}>
              {featured.map((item, index) => (
                <article className={styles.featuredCard} key={item.id}>
                  <div className={styles.featuredMedia}>
                    <Image alt="" fill priority={index === 0} sizes="(max-width: 800px) 100vw, 50vw" src={covers[index % covers.length] ?? covers[0]!} />
                    <div className={styles.mediaBadges}>
                      <span className={styles.darkBadge}><i />{typeLabels[item.type]}</span>
                      <span className={styles.whiteBadge}>{formatDeadline(item.deadlineAt)}</span>
                    </div>
                  </div>
                  <div className={styles.featuredBody}>
                    <h3>{item.title}</h3>
                    <p className={styles.organization}>{item.organization ?? "ArtBoard partner"} · {item.location ?? "Online"}</p>
                    <p>{item.summary ?? item.description}</p>
                    <div className={styles.featuredBottom}>
                      <div><small>{item.isPaid ? "Plaćena prilika" : "Uslovi prijave"}</small><strong>{item.isPaid ? "Naknada uključena" : "Detalji u oglasu"}</strong></div>
                      <OpportunityAction opportunity={item} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.boardSection} id="tabla" ref={boardRef}>
        <div className={`${styles.wrap} ${styles.boardLayout}`}>
          <aside className={styles.filters}>
            <h2>Filteri</h2>
            <FilterLabel>Država</FilterLabel>
            <select onChange={(event) => setCountry(event.target.value)} value={country}>
              <option value="">Sve zemlje</option>
              {countries.map((item) => <option key={item}>{item}</option>)}
            </select>

            <FilterLabel>Vrsta prilike</FilterLabel>
            <div className={styles.typePills}>
              {typeOrder.map((itemType) => (
                <button className={type === itemType ? styles.activeFilter : ""} key={itemType} onClick={() => setType(type === itemType ? "" : itemType)} type="button">
                  <i data-type={itemType} />{typeLabels[itemType]} <span>{typeCounts[itemType]}</span>
                </button>
              ))}
            </div>

            <FilterLabel>Rok za prijavu</FilterLabel>
            <div className={styles.segmented}>
              {(["all", "7", "30"] as const).map((value) => (
                <button className={deadline === value ? styles.selectedSegment : ""} key={value} onClick={() => setDeadline(value)} type="button">
                  {value === "all" ? "Svi" : `${value} dana`}
                </button>
              ))}
            </div>

            <button className={styles.toggleRow} onClick={() => setOnlyPaid((value) => !value)} type="button">
              <span><strong>Samo plaćene prilike</strong><small>Honorar, nagrada ili stipendija</small></span>
              <i className={onlyPaid ? styles.toggleOn : ""}><b /></i>
            </button>
          </aside>

          <div className={styles.results}>
            <div className={styles.tabs}>
              <TabButton active={tab === "all"} count={opportunities.length} label="Sve prilike" onClick={() => setTab("all")} />
              <TabButton active={tab === "matched"} count={matchedIds.length} label="Za tebe" onClick={() => setTab("matched")} />
              <TabButton active={tab === "saved"} count={saved.length} label="Sačuvano" onClick={() => setTab("saved")} />
            </div>
            <div className={styles.resultsToolbar}>
              <strong>{filtered.length} {filtered.length === 1 ? "prilika" : "prilike"}</strong>
              <div>
                <select aria-label="Sortiraj oglase" onChange={(event) => setSort(event.target.value)} value={sort}>
                  <option value="deadline">Rok: najbliži prvo</option>
                  <option value="new">Najnovije objavljeno</option>
                  <option value="paid">Plaćene prvo</option>
                  <option value="match">Najbolje poklapanje</option>
                </select>
                <span className={styles.viewToggle}>
                  <button aria-label="Prikaži kao listu" className={view === "list" ? styles.activeView : ""} onClick={() => setView("list")} type="button"><List size={18} /></button>
                  <button aria-label="Prikaži kao mrežu" className={view === "grid" ? styles.activeView : ""} onClick={() => setView("grid")} type="button"><Grid2X2 size={17} /></button>
                </span>
              </div>
            </div>

            {!couldLoad ? <p className={styles.notice}>Oglasi trenutno nijesu dostupni. Pokušaj ponovo za nekoliko minuta.</p> : null}
            <div className={`${styles.cards} ${view === "grid" ? styles.cardGrid : ""}`}>
              {filtered.map((item, index) => (
                <OpportunityCard
                  index={index}
                  isSaved={saved.includes(item.id)}
                  key={item.id}
                  opportunity={item}
                  toggleSaved={toggleSaved}
                  view={view}
                />
              ))}
            </div>
            {couldLoad && filtered.length === 0 ? (
              <div className={styles.empty}><Search size={26} /><h3>Nema oglasa za ove filtere.</h3><p>Promijeni kriterijum ili pogledaj sve aktivne prilike.</p><button onClick={() => { setQuery(""); setCountry(""); setType(""); setDeadline("all"); setOnlyPaid(false); setTab("all"); }} type="button">Očisti filtere</button></div>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.organizers} id="organizatori">
        <div className={styles.stars} />
        <div className={styles.wrap}>
          <p className={styles.darkEyebrow}><i />Za organizatore</p>
          <h2>Tražiš umjetnike? <span>Objavi oglas besplatno.</span></h2>
          <p className={styles.organizerLead}>Galerije, festivali, institucije, agencije i kompanije iz cijelog regiona objavljuju poziv za nekoliko minuta. Svaki oglas prolazi kratku provjeru prije objave.</p>
          <div className={styles.steps}>
            <OrganizerStep number="01" title="Strukturisan obrazac">Vrsta, rok, naknada i uslovi, sve u poljima po kojima umjetnici filtriraju.</OrganizerStep>
            <OrganizerStep number="02" title="Provjera za 24 sata">Tim ArtBoarda provjerava organizatora i uslove prije nego što oglas postane javan.</OrganizerStep>
            <OrganizerStep number="03" title="Uredne prijave">Prijave stižu u istom formatu, sa pregledom kandidata i njihovih portfolija.</OrganizerStep>
          </div>
          <div className={styles.organizerActions}>
            <a href="mailto:info@artstudio360.me?subject=Objava oglasa na ArtBoardu">Objavi oglas besplatno</a>
            <button onClick={() => featuredRef.current?.scrollIntoView({ behavior: "smooth" })} type="button">Pogledaj primjer oglasa</button>
          </div>
        </div>
      </section>
    </main>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <p className={styles.filterLabel}>{children}</p>;
}

function TabButton({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return <button className={active ? styles.activeTab : ""} onClick={onClick} type="button">{label}<span>{count}</span></button>;
}

function OrganizerStep({ children, number, title }: { children: React.ReactNode; number: string; title: string }) {
  return <article><strong>{number}</strong><h3>{title}</h3><p>{children}</p></article>;
}

function OpportunityCard({ index, isSaved, opportunity, toggleSaved, view }: { index: number; isSaved: boolean; opportunity: Opportunity; toggleSaved: (id: string) => void; view: View }) {
  return (
    <article className={`${styles.opportunityCard} ${view === "grid" ? styles.gridCard : ""}`}>
      {(opportunity.isFeatured || view === "grid") ? (
        <div className={styles.cardMedia}>
          <Image alt="" fill sizes={view === "grid" ? "(max-width: 800px) 100vw, 40vw" : "70vw"} src={covers[(index + 1) % covers.length] ?? covers[0]!} />
          {opportunity.isFeatured ? <span><i />Istaknuto</span> : null}
        </div>
      ) : null}
      <div className={styles.cardContent}>
        <div className={styles.cardBadges}>
          <span className={styles.typeBadge}><i />{typeLabels[opportunity.type]}</span>
          <span className={styles.deadlineBadge}><Clock3 size={14} />{formatDeadline(opportunity.deadlineAt)}</span>
          <button aria-label={isSaved ? "Ukloni iz sačuvanih" : "Sačuvaj oglas"} className={isSaved ? styles.savedButton : ""} onClick={() => toggleSaved(opportunity.id)} title={isSaved ? "Ukloni iz sačuvanih" : "Sačuvaj"} type="button"><Bookmark fill={isSaved ? "currentColor" : "none"} size={19} /></button>
        </div>
        <div className={styles.cardDetails}>
          <div className={styles.cardMain}>
            <h3>{opportunity.title}</h3>
            <p className={styles.cardOrganization}>{opportunity.organization ?? "Organizator nije naveden"} {opportunity.organization ? <BadgeCheck aria-label="Verifikovan organizator" size={17} /> : null}</p>
            <p className={styles.cardLocation}><MapPin size={16} />{opportunity.location ?? "Online / lokacija nije navedena"}</p>
            <p className={styles.cardSummary}>{opportunity.summary ?? opportunity.description}</p>
          </div>
          <div className={styles.cardSide}>
            <small>{opportunity.isPaid ? "Plaćena prilika" : "Uslovi prijave"}</small>
            <strong>{opportunity.isPaid ? "Naknada uključena" : "Detalji u oglasu"}</strong>
            <OpportunityAction opportunity={opportunity} />
          </div>
        </div>
      </div>
    </article>
  );
}
