"use client";

import Link from "next/link";
import { ImageOff, Search } from "lucide-react";
import { useEffect, useState } from "react";

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

function CommunityArtistCard({ artist }: { artist: CommunityArtist }) {
  const [isActive, setIsActive] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [failedImageUrls, setFailedImageUrls] = useState<string[]>([]);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const rotationImages = artist.artworks.filter((artwork) => !failedImageUrls.includes(artwork.url));
  const visibleImageIndex = rotationImages.length > 0 ? activeImageIndex % rotationImages.length : 0;

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
        {rotationImages.length === 0 ? (
          <span className="artboard-community__image-fallback">
            <ImageOff size={22} strokeWidth={1.5} aria-hidden="true" />
            Rad trenutno nije dostupan
          </span>
        ) : (
          rotationImages.map((artwork, index) => (
            <img
              alt={index === visibleImageIndex ? artwork.alt : ""}
              aria-hidden={index !== visibleImageIndex}
              className={`artboard-community__image${index === visibleImageIndex ? " is-visible" : ""}`}
              key={artwork.url}
              loading="lazy"
              onError={() => setFailedImageUrls((current) => current.includes(artwork.url) ? current : [...current, artwork.url])}
              src={artwork.url}
            />
          ))
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

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveDot((index) => (index + 1) % dotColors.length);
    }, 3200);

    return () => window.clearInterval(interval);
  }, []);

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const visibleArtists = artists
    .filter((artist) =>
      normalizedSearch.length === 0 ||
      artist.name.toLocaleLowerCase().includes(normalizedSearch) ||
      artist.disciplines.some((discipline) => discipline.toLocaleLowerCase().includes(normalizedSearch)),
    )
    .slice(0, 8);

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

        <label className="artboard-community__search">
          <Search size={17} strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">Pretraži umjetnike po imenu ili disciplini</span>
          <input
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pretraži umjetnike po imenu ili disciplini"
            type="search"
            value={searchTerm}
          />
        </label>

        {visibleArtists.length > 0 ? (
          <div className="artboard-community__gallery">
            {visibleArtists.map((artist) => <CommunityArtistCard artist={artist} key={artist.id} />)}
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
