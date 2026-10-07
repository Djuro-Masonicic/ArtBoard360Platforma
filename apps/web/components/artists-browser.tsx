"use client";

import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Grid2X2,
  Image as ImageIcon,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { siteRoutes } from "@/lib/site-routes";
import type { Artist } from "@/types/api";

import {
  ArtistCard,
  formatDiscipline,
  getArtistLocation,
  getArtistVisual,
} from "./artist-card";
import styles from "./artists-page.module.css";

interface ArtistsBrowserProps {
  artists: Artist[];
  totalArtists: number;
}

const PAGE_SIZE = 12;
const ARTBOARD_DISCIPLINES = [
  { name: "Slikarstvo", slug: "slikarstvo" },
  { name: "Crtež", slug: "crtez" },
  { name: "Grafika", slug: "grafika" },
  { name: "Skulptura", slug: "skulptura" },
  { name: "Fotografija", slug: "fotografija" },
  { name: "Ilustracija", slug: "ilustracija" },
  { name: "Kolaž", slug: "kolaz" },
  { name: "Mješoviti mediji", slug: "mixed-media" },
  { name: "Mozaik", slug: "mozaik" },
  { name: "Tekstilna umjetnost", slug: "tekstilna-umjetnost" },
  { name: "Umjetnički nakit", slug: "umjetnicki-nakit" },
  { name: "Digitalna umjetnost", slug: "digitalna-umjetnost" },
  { name: "3D umjetnost", slug: "3d-umjetnost" },
  { name: "Animacija", slug: "animacija" },
  { name: "Video umjetnost", slug: "video-umjetnost" },
  { name: "Instalacija", slug: "instalacija" },
  { name: "Performans", slug: "performans" },
  { name: "Konceptualna umjetnost", slug: "konceptualna-umjetnost" },
  { name: "Multimedijalna umjetnost", slug: "multimedijalna-umjetnost" },
  { name: "Generativna umjetnost", slug: "generativna-umjetnost" },
  { name: "Street art", slug: "street-art" },
  { name: "Strip", slug: "strip" },
  { name: "Kaligrafija", slug: "kaligrafija" },
  { name: "Grafički dizajn", slug: "graficki-dizajn" },
  { name: "Scenografija", slug: "scenografija" },
] as const;

export function ArtistsBrowser({ artists, totalArtists }: ArtistsBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [sortValue, setSortValue] = useState("name-asc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const disciplines = useMemo(() => getDisciplineOptions(artists), [artists]);
  const cities = useMemo(() => getCityOptions(artists), [artists]);
  const heroArtists = useMemo(
    () => artists.filter((artist) => getArtistVisual(artist)).slice(0, 3),
    [artists],
  );
  const artworkCount = Math.max(
    1100,
    artists.reduce(
      (total, artist) => total + (artist.counts?.artworks ?? artist.artworks.length),
      0,
    ),
  );
  const disciplineCount = 25;

  const filteredArtists = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("sr");

    return [...artists]
      .filter((artist) => {
        const location = getArtistLocation(artist);
        const matchesSearch =
          !query ||
          artist.name.toLocaleLowerCase("sr").includes(query) ||
          location.toLocaleLowerCase("sr").includes(query) ||
          artist.disciplines.some((discipline) =>
            formatDiscipline(discipline.name).toLocaleLowerCase("sr").includes(query),
          );
        const matchesDiscipline =
          !selectedDiscipline ||
          artist.disciplines.some((discipline) => discipline.slug === selectedDiscipline);
        const matchesCity = !selectedCity || location === selectedCity;

        return matchesSearch && matchesDiscipline && matchesCity;
      })
      .sort((left, right) => compareArtists(left, right, sortValue));
  }, [artists, searchTerm, selectedCity, selectedDiscipline, sortValue]);

  const visibleArtists = filteredArtists.slice(0, visibleCount);
  const pageCount = Math.max(1, Math.ceil(filteredArtists.length / PAGE_SIZE));
  const activePage = Math.min(pageCount, Math.ceil(visibleArtists.length / PAGE_SIZE));
  const canLoadMore = visibleArtists.length < filteredArtists.length;

  function handleHeroSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVisibleCount(PAGE_SIZE);
    document
      .getElementById("pretrazivac")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function chooseDiscipline(slug: string) {
    setSelectedDiscipline((current) => (current === slug ? "" : slug));
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.wrap}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                <span />Pretraživač umjetnika
              </p>
              <h1>
                Upoznaj <span>umjetnike</span> ArtBoard platforme.
              </h1>
              <p className={styles.lead}>
                <strong>Oni stvaraju, a mi im pomažemo da budu viđeni.</strong> Upoznaj umjetnike
                koji su nam ukazali povjerenje i otkrij njihove umjetničke priče predstavljene
                kroz ArtBoard profile.
              </p>

              <div className={styles.stats}>
                <Stat value={`${Math.max(70, totalArtists)}+`} label="Objavljenih umjetnika" />
                <Stat value={`${formatNumber(artworkCount)}+`} label="Objavljenih radova" />
                <Stat value={String(disciplineCount)} label="Umjetničkih disciplina" />
              </div>
            </div>

            <div className={styles.heroVisualColumn}>
              <div className={styles.heroVisual} aria-label="Izdvojeni ArtBoard umjetnici">
                {heroArtists.map((artist, index) => (
                  <Link
                    className={`${styles.heroArtistCard} ${styles[`heroArtistCard${index + 1}`]}`}
                    href={`${siteRoutes.artistProfileBase}/${artist.slug}`}
                    key={artist.id}
                  >
                    <img alt="" src={getArtistVisual(artist) || ""} />
                    <span className={styles.heroArtistTag}>
                      <i>{getInitials(artist.name)}</i>
                      <span>
                        <b>{artist.name}</b>
                        <small>
                          {artist.disciplines
                            .slice(0, 2)
                            .map((item) => formatDiscipline(item.name))
                            .join(" · ") || "Umjetnost"}
                        </small>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>

              <form className={styles.heroSearch} onSubmit={handleHeroSearch} role="search">
                <Search aria-hidden="true" size={20} />
                <label className={styles.srOnly} htmlFor="artist-search">
                  Pretraži umjetnike
                </label>
                <input
                  id="artist-search"
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  placeholder="Ime, disciplina ili grad"
                  type="search"
                  value={searchTerm}
                />
                <button type="submit">Pretraži</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.browser} id="pretrazivac">
        <div className={styles.wrap}>
          <div
            className={styles.disciplineFilters}
            aria-label="Filtriraj po disciplini"
            role="group"
          >
            <button
              aria-pressed={!selectedDiscipline}
              className={`${styles.chip} ${styles.chipAll}`}
              onClick={() => chooseDiscipline("")}
              type="button"
            >
              <Grid2X2 aria-hidden="true" size={15} /> Sve discipline{" "}
              <em>{Math.max(30, disciplines.length)}</em>
            </button>
            {disciplines.map((discipline, index) => (
              <button
                aria-pressed={selectedDiscipline === discipline.slug}
                className={`${styles.chip} ${styles[`chipTone${(index % 3) + 1}`]}`}
                key={discipline.slug}
                onClick={() => chooseDiscipline(discipline.slug)}
                type="button"
              >
                <Sparkles aria-hidden="true" size={14} /> {formatDiscipline(discipline.name)}
              </button>
            ))}
          </div>

          <div className={styles.browserToolbar}>
            <p>
              Prikazano <strong>{visibleArtists.length}</strong> od{" "}
              <strong>{filteredArtists.length}</strong> umjetnika
            </p>
            <div className={styles.selects}>
              <label>
                <span>Grad</span>
                <select
                  onChange={(event) => {
                    setSelectedCity(event.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  value={selectedCity}
                >
                  <option value="">Svi gradovi</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <ChevronDown aria-hidden="true" size={17} />
              </label>
              <label>
                <span>Sortiraj</span>
                <select onChange={(event) => setSortValue(event.target.value)} value={sortValue}>
                  <option value="name-asc">Ime (A–Ž)</option>
                  <option value="name-desc">Ime (Ž–A)</option>
                  <option value="artworks-desc">Najviše radova</option>
                  <option value="newest">Najnoviji</option>
                </select>
                <ChevronDown aria-hidden="true" size={17} />
              </label>
            </div>
          </div>

          {visibleArtists.length > 0 ? (
            <div className={styles.artistGrid}>
              {visibleArtists.map((artist) => (
                <ArtistCard artist={artist} key={artist.id} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Search aria-hidden="true" size={28} />
              <strong>Nema rezultata za izabrane filtere.</strong>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDiscipline("");
                  setSelectedCity("");
                }}
                type="button"
              >
                Poništi filtere
              </button>
            </div>
          )}

          {filteredArtists.length > 0 ? (
            <div className={styles.paginationBlock}>
              {canLoadMore ? (
                <button
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  type="button"
                >
                  Prikaži još
                </button>
              ) : null}
              <span className={styles.progressTrack}>
                <i style={{ width: `${(activePage / pageCount) * 100}%` }} />
              </span>
              <small>{activePage} / {pageCount}</small>
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaStars} aria-hidden="true" />
        <div className={styles.ctaInner}>
          <div className={styles.ctaCopy}>
            <p className={styles.ctaEyebrow}>
              <span />Postani dio ArtBoard zajednice
            </p>
            <h2>
              Tvoj profil može biti <span>sljedeći</span> u pretraživaču.
            </h2>
            <p>
              Kreiraj besplatan umjetnički profil, dodaj radove i biografiju, a mi ćemo ga
              predstaviti publici, kustosima, galerijama i poslodavcima.
            </p>
            <div className={styles.ctaActions}>
              <Link className={styles.primaryAction} href={siteRoutes.artistApplication}>
                Prijavi se besplatno
              </Link>
              <Link className={styles.secondaryAction} href={`${siteRoutes.artistApplication}#proces`}>
                Kako ide pregled
              </Link>
            </div>
          </div>

          <ol className={styles.ctaSteps}>
            <Step
              icon={<UserRound />}
              tone="blue"
              title="Prijavi se i popuni profil"
              text="Biografija, discipline, lokacija i kontakt na jednom mjestu."
            />
            <Step
              icon={<ImageIcon />}
              tone="red"
              title="Dodaj svoje radove"
              text="Predstavi radove u kvalitetu koji zaslužuju."
            />
            <Step
              icon={<BadgeCheck />}
              tone="yellow"
              title="Verifikacija i objava"
              text="Nakon pregleda tvoj profil postaje vidljiv u pretraživaču."
            />
          </ol>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Step({
  icon,
  text,
  title,
  tone,
}: {
  icon: React.ReactNode;
  text: string;
  title: string;
  tone: "blue" | "red" | "yellow";
}) {
  const toneClass = `stepIcon${tone.charAt(0).toUpperCase()}${tone.slice(1)}`;

  return (
    <li>
      <span className={`${styles.stepIcon} ${styles[toneClass]}`}>{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
      <ArrowRight aria-hidden="true" className={styles.stepArrow} size={18} />
    </li>
  );
}

function getDisciplineOptions(artists: Artist[]) {
  const options = new Map<string, { name: string; slug: string }>();
  artists.forEach((artist) =>
    artist.disciplines.forEach((discipline) => options.set(discipline.slug, discipline)),
  );
  ARTBOARD_DISCIPLINES.forEach((discipline) => options.set(discipline.slug, discipline));
  return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name, "sr"));
}

function getCityOptions(artists: Artist[]) {
  return Array.from(
    new Set(artists.map(getArtistLocation).filter((city) => city !== "Crna Gora")),
  ).sort((a, b) => a.localeCompare(b, "sr"));
}

function compareArtists(left: Artist, right: Artist, sort: string) {
  if (sort === "name-desc") return right.name.localeCompare(left.name, "sr");
  if (sort === "artworks-desc") {
    return (
      (right.counts?.artworks ?? right.artworks.length) -
      (left.counts?.artworks ?? left.artworks.length)
    );
  }
  if (sort === "newest") {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  }
  return left.name.localeCompare(right.name, "sr");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("sr"))
    .join("");
}
