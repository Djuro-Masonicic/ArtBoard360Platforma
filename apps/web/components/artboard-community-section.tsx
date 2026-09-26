"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ImageOff, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ArtBoardLogo } from "@/components/artboard-logo";
import { siteRoutes } from "@/lib/site-routes";

export type CommunityArtist = {
  id: string;
  name: string;
  slug: string;
  artworks: { url: string; alt: string }[];
  avatarUrl: string | null;
  disciplines: string[];
};

const dotColors = ["blue", "red", "yellow"] as const;
const MAX_SHOWCASE_ARTISTS = 25;

type CommunityColumn = {
  key: string;
  kind: "large" | "small";
  artists: CommunityArtist[];
};

function buildCommunityColumns(artists: CommunityArtist[]) {
  const showcaseArtists = artists.slice(0, MAX_SHOWCASE_ARTISTS);
  if (showcaseArtists.length === 0) return [];

  const columns: CommunityColumn[] = [];
  const cycleCount = Math.max(1, Math.ceil(showcaseArtists.length / 5));
  let artistIndex = 0;
  const takeArtist = () => showcaseArtists[artistIndex++ % showcaseArtists.length]!;

  for (let cycle = 0; cycle < cycleCount; cycle += 1) {
    const largeArtist = takeArtist();
    const firstSmallPair = [takeArtist(), takeArtist()];
    const secondSmallPair = [takeArtist(), takeArtist()];

    columns.push(
      { key: `${cycle}-large-${largeArtist.id}`, kind: "large", artists: [largeArtist] },
      { key: `${cycle}-small-a-${firstSmallPair[0]!.id}`, kind: "small", artists: firstSmallPair },
      { key: `${cycle}-small-b-${secondSmallPair[0]!.id}`, kind: "small", artists: secondSmallPair },
    );
  }

  return columns;
}

function CommunityArtistCard({ artist }: { artist: CommunityArtist }) {
  const [isActive, setIsActive] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [failedImageUrls, setFailedImageUrls] = useState<string[]>([]);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const rotationImages = artist.artworks.filter((artwork) => !failedImageUrls.includes(artwork.url));
  const visibleImageIndex = rotationImages.length > 0 ? activeImageIndex % rotationImages.length : 0;
  const visibleArtwork = rotationImages[visibleImageIndex];

  useEffect(() => {
    if (!isActive || rotationImages.length <= 1) {
      setActiveImageIndex(0);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const startTimeout = window.setTimeout(() => {
      setActiveImageIndex((index) => (index + 1) % rotationImages.length);
    }, 450);
    const interval = window.setInterval(() => {
      setActiveImageIndex((index) => (index + 1) % rotationImages.length);
    }, 1800);

    return () => {
      window.clearTimeout(startTimeout);
      window.clearInterval(interval);
    };
  }, [isActive, rotationImages.length]);

  return (
    <Link
      className="artboard-community__card"
      href={`${siteRoutes.artistProfileBase}/${artist.slug}`}
      onBlur={() => setIsActive(false)}
      onFocus={() => setIsActive(true)}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
    >
      <span className="artboard-community__image-wrap">
        {!visibleArtwork ? (
          <span className="artboard-community__image-fallback">
            <ImageOff size={22} strokeWidth={1.5} aria-hidden="true" />
            Rad trenutno nije dostupan
          </span>
        ) : (
          <img
            alt={visibleArtwork.alt}
            className="artboard-community__image is-visible"
            key={visibleArtwork.url}
            loading="lazy"
            onError={() => setFailedImageUrls((current) => current.includes(visibleArtwork.url) ? current : [...current, visibleArtwork.url])}
            src={visibleArtwork.url}
          />
        )}
      </span>
      <span className="artboard-community__card-info">
        <span className="artboard-community__card-top">
          <strong>{artist.name}</strong>
          <span className="artboard-community__avatar" aria-hidden="true">
            {artist.avatarUrl && !avatarFailed ? (
              <img alt="" loading="lazy" onError={() => setAvatarFailed(true)} src={artist.avatarUrl} />
            ) : null}
          </span>
        </span>
        <span className="artboard-community__disciplines">
          {artist.disciplines.length > 0 ? artist.disciplines.slice(0, 2).join(" · ") : "Umjetnost"}
        </span>
      </span>
    </Link>
  );
}

export function ArtBoardCommunitySection({ artists }: { artists: CommunityArtist[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDot, setActiveDot] = useState(0);
  const [isSearchInviting, setIsSearchInviting] = useState(false);
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredArtists = useMemo(
    () => artists.filter((artist) =>
      normalizedSearch.length === 0 ||
      artist.name.toLocaleLowerCase().includes(normalizedSearch) ||
      artist.disciplines.some((discipline) => discipline.toLocaleLowerCase().includes(normalizedSearch)),
    ),
    [artists, normalizedSearch],
  );
  const communityColumns = useMemo(() => buildCommunityColumns(filteredArtists), [filteredArtists]);
  const hasScrollableGallery = filteredArtists.length > 1;
  const loopedColumns = useMemo(
    () => hasScrollableGallery
      ? [
          ...communityColumns.map((column) => ({ ...column, copy: 0 })),
          ...communityColumns.map((column) => ({ ...column, copy: 1 })),
          ...communityColumns.map((column) => ({ ...column, copy: 2 })),
        ]
      : communityColumns.map((column) => ({ ...column, copy: 0 })),
    [communityColumns, hasScrollableGallery],
  );
  const galleryViewportRef = useRef<HTMLDivElement>(null);
  const galleryTrackRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLLabelElement>(null);
  const activeColumnRef = useRef(0);
  const isShiftingRef = useRef(false);
  const shiftTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveDot((index) => (index + 1) % dotColors.length);
    }, 3200);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const searchBox = searchBoxRef.current;
    if (!searchBox || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setIsSearchInviting(true);
      observer.disconnect();
    }, { threshold: 0.7 });

    observer.observe(searchBox);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = galleryViewportRef.current;
    const track = galleryTrackRef.current;
    if (!viewport || !track || communityColumns.length === 0) return;

    activeColumnRef.current = hasScrollableGallery ? communityColumns.length : 0;
    isShiftingRef.current = false;

    const placeAtActiveColumn = () => {
      const activeColumn = track.children.item(activeColumnRef.current);
      if (!(activeColumn instanceof HTMLElement)) return;

      track.classList.remove("is-animated");
      track.style.transform = `translate3d(-${activeColumn.offsetLeft}px, 0, 0)`;
    };
    const frame = window.requestAnimationFrame(placeAtActiveColumn);
    const resizeObserver = new ResizeObserver(() => {
      if (!isShiftingRef.current) placeAtActiveColumn();
    });
    resizeObserver.observe(viewport);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      if (shiftTimeoutRef.current !== null) window.clearTimeout(shiftTimeoutRef.current);
    };
  }, [communityColumns, hasScrollableGallery]);

  function shiftArtists(direction: -1 | 1) {
    const viewport = galleryViewportRef.current;
    const track = galleryTrackRef.current;
    if (!hasScrollableGallery || isShiftingRef.current || !viewport || !track) return;

    const nextColumnIndex = activeColumnRef.current + direction;
    const nextColumn = track.children.item(nextColumnIndex);
    if (!(nextColumn instanceof HTMLElement)) return;

    isShiftingRef.current = true;
    activeColumnRef.current = nextColumnIndex;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.classList.toggle("is-animated", !prefersReducedMotion);
    track.style.transform = `translate3d(-${nextColumn.offsetLeft}px, 0, 0)`;

    shiftTimeoutRef.current = window.setTimeout(() => {
      let normalizedIndex = activeColumnRef.current;
      const columnCount = communityColumns.length;

      if (normalizedIndex < columnCount) normalizedIndex += columnCount;
      if (normalizedIndex >= columnCount * 2) normalizedIndex -= columnCount;

      if (normalizedIndex !== activeColumnRef.current) {
        const normalizedColumn = track.children.item(normalizedIndex);
        if (normalizedColumn instanceof HTMLElement) {
          track.classList.remove("is-animated");
          track.style.transform = `translate3d(-${normalizedColumn.offsetLeft}px, 0, 0)`;
        }
        activeColumnRef.current = normalizedIndex;
      }

      isShiftingRef.current = false;
      shiftTimeoutRef.current = null;
    }, prefersReducedMotion ? 0 : 560);
  }

  return (
    <section className="artboard-community" id="artboard-zajednica" aria-labelledby="artboard-community-title">
      <div className="artboard-community__inner">
        <div className="artboard-community__header">
          <div>
            <p className="artboard-community__eyebrow"><span aria-hidden="true" />ArtBoard zajednica</p>
            <h2 className="artboard-community__title" id="artboard-community-title">
              <span>Zajednica umjetnika</span>
              koja svakodnevno raste.
            </h2>
            <p className="artboard-community__intro">
              Istraži autore i otkrij radove koji oblikuju umjetničku scenu Crne Gore i regiona.
            </p>
          </div>
          <div className="artboard-why__logo artboard-community__logo" data-active={dotColors[activeDot]}>
            <ArtBoardLogo showWordmark={false} />
          </div>
        </div>

        <label
          className={`artboard-community__search${isSearchInviting ? " is-inviting" : ""}`}
          ref={searchBoxRef}
        >
          <Search size={20} strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">Pretraži umjetnike po imenu, disciplini ili lokaciji</span>
          <input
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pretraži umjetnike po imenu, disciplini ili lokaciji"
            type="search"
            value={searchTerm}
          />
        </label>

        {filteredArtists.length > 0 ? (
          <div className="artboard-community__gallery-shell">
            <div className="artboard-community__gallery-viewport" ref={galleryViewportRef}>
              <div className="artboard-community__gallery-track" ref={galleryTrackRef}>
                {loopedColumns.map((column) => (
                  <div
                    className={`artboard-community__gallery-column artboard-community__gallery-column--${column.kind}`}
                    key={`${column.copy}-${column.key}`}
                  >
                    {column.artists.map((artist, artistIndex) => (
                      <CommunityArtistCard
                        artist={artist}
                        key={`${column.copy}-${column.key}-${artist.id}-${artistIndex}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <button
              className="artboard-community__gallery-arrow artboard-community__gallery-arrow--previous"
              type="button"
              aria-label="Prikaži prethodne umjetnike"
              disabled={!hasScrollableGallery}
              onClick={() => shiftArtists(-1)}
            >
              <ChevronLeft size={25} strokeWidth={2.1} aria-hidden="true" />
            </button>
            <button
              className="artboard-community__gallery-arrow artboard-community__gallery-arrow--next"
              type="button"
              aria-label="Prikaži sljedeće umjetnike"
              disabled={!hasScrollableGallery}
              onClick={() => shiftArtists(1)}
            >
              <ChevronRight size={25} strokeWidth={2.1} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <p className="artboard-community__empty">
            {searchTerm.trim() ? "Nema umjetnika za ovu pretragu." : "Radovi umjetnika trenutno nisu dostupni."}
          </p>
        )}

        <div className="artboard-community__actions">
          <Link className="artboard-community__button artboard-community__button--primary" href={siteRoutes.artists}>
            Istraži umjetnike
          </Link>
          <Link className="artboard-community__button artboard-community__button--secondary" href={siteRoutes.artistApplication}>
            Postani dio ArtBoard zajednice
          </Link>
        </div>
      </div>
    </section>
  );
}
