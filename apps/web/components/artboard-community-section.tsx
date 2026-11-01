"use client";

import Link from "next/link";
import { ImageOff, Search } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

export type CommunityArtist = {
  id: string;
  name: string;
  slug: string;
  artworks: { url: string; alt: string }[];
  avatarUrl: string | null;
  disciplines: string[];
};

type CommunityColumn = {
  key: string;
  kind: "large" | "small";
  artists: CommunityArtist[];
};

const MAX_SHOWCASE_ARTISTS = 25;
const AUTO_SCROLL_SPEED = 0.035;

function buildCommunityColumns(artists: CommunityArtist[]) {
  const showcaseArtists = artists.slice(0, MAX_SHOWCASE_ARTISTS);
  const columns: CommunityColumn[] = [];
  let artistIndex = 0;

  while (artistIndex < showcaseArtists.length) {
    const cycle = Math.floor(artistIndex / 5);
    const largeArtist = showcaseArtists[artistIndex++];
    if (!largeArtist) break;
    columns.push({ key: `${cycle}-large-${largeArtist.id}`, kind: "large", artists: [largeArtist] });

    for (const pairName of ["a", "b"]) {
      const pair = showcaseArtists.slice(artistIndex, artistIndex + 2);
      artistIndex += pair.length;
      if (pair.length > 0) columns.push({ key: `${cycle}-small-${pairName}-${pair[0]!.id}`, kind: "small", artists: pair });
    }
  }

  return columns;
}

const CommunityArtistCard = memo(function CommunityArtistCard({
  artist,
  isClone,
  kind,
}: {
  artist: CommunityArtist;
  isClone: boolean;
  kind: CommunityColumn["kind"];
}) {
  const [isActive, setIsActive] = useState(false);
  const [activeSlide, setActiveSlide] = useState<number | null>(null);
  const [failedImageUrls, setFailedImageUrls] = useState<string[]>([]);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const galleryImages = artist.artworks.filter((artwork) => !failedImageUrls.includes(artwork.url)).slice(0, 3);
  const baseArtwork = galleryImages[0];

  useEffect(() => {
    if (!isActive || galleryImages.length <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setActiveSlide((current) => ((current ?? 0) + 1) % galleryImages.length);
    }, 900);
    return () => window.clearInterval(interval);
  }, [galleryImages.length, isActive]);

  function startGallery() {
    setActiveSlide(0);
    setIsActive(true);
  }

  function stopGallery() {
    setIsActive(false);
    setActiveSlide(null);
  }

  const [firstName, ...remainingName] = artist.name.trim().split(/\s+/);
  const lastName = remainingName.join(" ");

  return (
    <article className={`artboard-community__card artboard-community__card--${kind}`} data-ab-artist="" data-community-reveal="" data-reveal="" onMouseEnter={startGallery} onMouseLeave={stopGallery}>
      <Link aria-label={`${artist.name}, umjetnički profil`} className="artboard-community__card-link" href={`/umjetnik/${artist.slug}`} onBlur={stopGallery} onFocus={startGallery} tabIndex={isClone ? -1 : undefined} />
      <div className="artboard-community__image-wrap">
        {baseArtwork ? (
          <img alt={baseArtwork.alt} className="artboard-community__base-image" decoding="async" loading="lazy" onError={() => setFailedImageUrls((current) => current.includes(baseArtwork.url) ? current : [...current, baseArtwork.url])} src={baseArtwork.url} />
        ) : (
          <span className="artboard-community__image-fallback"><ImageOff size={22} strokeWidth={1.5} aria-hidden="true" />Rad trenutno nije dostupan</span>
        )}
        {galleryImages.map((artwork, index) => (
          <img alt="" className={`ab-cv${activeSlide === index ? " on" : ""}`} decoding="async" key={artwork.url} loading="lazy" onError={() => setFailedImageUrls((current) => current.includes(artwork.url) ? current : [...current, artwork.url])} src={artwork.url} />
        ))}
        {galleryImages.length > 1 ? (
          <span className="ab-cbars" aria-hidden="true">
            {galleryImages.map((artwork, index) => <i className={activeSlide === index ? "run" : activeSlide !== null && index < activeSlide ? "done" : ""} key={artwork.url} />)}
          </span>
        ) : null}
      </div>
      <div className="artboard-community__card-info">
        <div className="artboard-community__card-top">
          <strong><span>{firstName || artist.name}</span>{lastName ? <><br />{lastName}</> : null}</strong>
          <span className="artboard-community__avatar" aria-hidden="true">{artist.avatarUrl && !avatarFailed ? <img alt="" decoding="async" loading="lazy" onError={() => setAvatarFailed(true)} src={artist.avatarUrl} /> : null}</span>
        </div>
        <span className="artboard-community__line" aria-hidden="true" />
        <span className="artboard-community__disciplines">{artist.disciplines.length > 0 ? artist.disciplines.slice(0, 2).join(" · ") : "Umjetnost"}</span>
      </div>
    </article>
  );
});

export function ArtBoardCommunitySection({ artists }: { artists: CommunityArtist[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredArtists = useMemo(
    () => artists.filter((artist) => normalizedSearch.length === 0 || artist.name.toLocaleLowerCase().includes(normalizedSearch) || artist.disciplines.some((discipline) => discipline.toLocaleLowerCase().includes(normalizedSearch))),
    [artists, normalizedSearch],
  );
  const columns = useMemo(() => buildCommunityColumns(filteredArtists), [filteredArtists]);
  const shouldLoop = columns.length > 1;
  const renderedColumns = useMemo(
    () => shouldLoop ? [...columns.map((column) => ({ ...column, isClone: false })), ...columns.map((column) => ({ ...column, isClone: true }))] : columns.map((column) => ({ ...column, isClone: false })),
    [columns, shouldLoop],
  );
  const pointerInsideRef = useRef(false);
  const pauseUntilRef = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elements = section.querySelectorAll<HTMLElement>("[data-community-reveal]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -12% 0px" });

    elements.forEach((element) => {
      const siblings = element.parentElement ? Array.from(element.parentElement.children) : [];
      element.style.setProperty("--community-delay", `${(Math.max(0, siblings.indexOf(element)) % 6) * 0.07}s`);
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [renderedColumns]);

  useEffect(() => {
    const catalog = catalogRef.current;
    if (!catalog || !shouldLoop || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let lastTime: number | null = null;
    let remainder = 0;
    let isVisible = false;
    const half = () => catalog.scrollWidth / 2;
    const normalizeScroll = () => {
      const midpoint = half();
      if (midpoint <= 0) return;
      if (catalog.scrollLeft >= midpoint) catalog.scrollLeft -= midpoint;
      else if (catalog.scrollLeft <= 0) catalog.scrollLeft += midpoint;
    };
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.3);
      lastTime = null;
    }, { threshold: 0.3 });
    const tick = (time: number) => {
      if (lastTime === null) lastTime = time;
      const delta = Math.min(time - lastTime, 48);
      lastTime = time;
      if (isVisible && !pointerInsideRef.current && time >= pauseUntilRef.current) {
        remainder += delta * AUTO_SCROLL_SPEED;
        const pixels = Math.floor(remainder);
        if (pixels >= 1) {
          remainder -= pixels;
          catalog.scrollLeft += pixels;
        }
      }
      frame = window.requestAnimationFrame(tick);
    };

    catalog.addEventListener("scroll", normalizeScroll, { passive: true });
    observer.observe(catalog);
    frame = window.requestAnimationFrame(tick);
    return () => {
      catalog.removeEventListener("scroll", normalizeScroll);
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [renderedColumns, shouldLoop]);

  function pauseFor(milliseconds: number) {
    pauseUntilRef.current = Math.max(pauseUntilRef.current, performance.now() + milliseconds);
  }

  return (
    <section className="artboard-community" id="umjetnici" ref={sectionRef} aria-labelledby="artboard-community-title">
      <div className="artboard-community__inner">
        <header className="artboard-community__header">
          <p className="artboard-community__eyebrow" data-community-reveal="" data-reveal="">ArtBoard zajednica</p>
          <h2 className="artboard-community__title" data-community-reveal="" data-reveal="" id="artboard-community-title"><span>Zajednica umjetnika</span> koja svakodnevno raste.</h2>
          <p className="artboard-community__intro" data-community-reveal="" data-reveal="">Istraži autore i otkrij radove koji oblikuju umjetničku scenu Crne Gore i regiona.</p>
        </header>

        <label className="artboard-community__search" data-community-reveal="" data-reveal="">
          <Search aria-hidden="true" />
          <span className="sr-only">Pretraži umjetnike po imenu, disciplini ili lokaciji</span>
          <input onChange={(event) => setSearchTerm(event.target.value)} placeholder="Pretraži umjetnike po imenu, disciplini ili lokaciji" type="search" value={searchTerm} />
        </label>

        {renderedColumns.length > 0 ? (
          <div className="artboard-community__gallery-shell">
            <div className="artboard-community__gallery-viewport" data-loop="" id="ab-catalog" onFocusCapture={() => pauseFor(4000)} onPointerDown={() => pauseFor(4000)} onPointerEnter={(event) => { if (event.pointerType === "mouse") pointerInsideRef.current = true; }} onPointerLeave={(event) => { if (event.pointerType !== "mouse") return; pointerInsideRef.current = false; pauseFor(1200); }} onTouchStart={() => pauseFor(4000)} onWheel={() => pauseFor(4000)} ref={catalogRef}>
              {renderedColumns.map((column, columnIndex) => (
                <div aria-hidden={column.isClone ? "true" : undefined} className={`artboard-community__gallery-column artboard-community__gallery-column--${column.kind}`} key={`${column.isClone ? "clone" : "source"}-${column.key}-${columnIndex}`}>
                  {column.artists.map((artist) => <CommunityArtistCard artist={artist} isClone={column.isClone} key={`${column.isClone ? "clone" : "source"}-${column.key}-${artist.id}`} kind={column.kind} />)}
                </div>
              ))}
            </div>
          </div>
        ) : <p className="artboard-community__empty">{searchTerm.trim() ? "Nema umjetnika za ovu pretragu." : "Radovi umjetnika trenutno nisu dostupni."}</p>}

        <div className="artboard-community__actions" data-community-reveal="" data-reveal="">
          <Link className="artboard-community__button artboard-community__button--primary" href="/umjetnici">Pogledaj sve umjetnike</Link>
          <Link className="artboard-community__button artboard-community__button--secondary" href="/prijava">Prijavi se besplatno</Link>
        </div>
      </div>
    </section>
  );
}
