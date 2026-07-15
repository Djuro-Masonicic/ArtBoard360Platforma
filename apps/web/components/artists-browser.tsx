"use client";

import { useState } from "react";

import type { Artist } from "@/types/api";

import { ArtistCard } from "./artist-card";
import { ArtistGrid } from "./artist-grid";

interface ArtistsBrowserProps {
  artists: Artist[];
}

const PAGE_SIZE = 10;

/**
 * The interactive browser keeps all list behavior in one client component:
 * search, discipline chips, sorting, and gradual "show more" expansion.
 */
export function ArtistsBrowser({ artists }: ArtistsBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState("featured");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const disciplineOptions = getDisciplineOptions(artists);
  const showcaseArtists = artists.filter(hasArtistVisuals).slice(0, 12);

  const filteredArtists = artists
    .filter((artist) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        artist.name.toLowerCase().includes(normalizedSearch) ||
        artist.disciplines.some((discipline) =>
          discipline.name.toLowerCase().includes(normalizedSearch),
        );

      if (!matchesSearch) {
        return false;
      }

      if (selectedDisciplines.length === 0) {
        return true;
      }

      const artistDisciplineSlugs = new Set(artist.disciplines.map((discipline) => discipline.slug));
      return selectedDisciplines.every((slug) => artistDisciplineSlugs.has(slug));
    })
    .sort((leftArtist, rightArtist) => compareArtists(leftArtist, rightArtist, sortValue));

  const visibleArtists = filteredArtists.slice(0, visibleCount);
  const hasActiveFilters = normalizedSearch.length > 0 || selectedDisciplines.length > 0 || sortValue !== "featured";
  const canLoadMore = visibleArtists.length < filteredArtists.length;

  function handleDisciplineToggle(slug: string) {
    setVisibleCount(PAGE_SIZE);
    setSelectedDisciplines((currentValue) =>
      currentValue.includes(slug)
        ? currentValue.filter((value) => value !== slug)
        : [...currentValue, slug],
    );
  }

  function handleResetFilters() {
    setSearchTerm("");
    setSelectedDisciplines([]);
    setSortValue("featured");
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div className="space-y-14 pb-8">
      {showcaseArtists.length > 0 ? (
        <section className="overflow-hidden py-4">
          <div className="artists-marquee">
            <div className="artists-marquee__track">
              {[...showcaseArtists, ...showcaseArtists].map((artist, index) => (
                <div className="artists-marquee__item" key={`${artist.id}-${index}`}>
                  <ArtistCard artist={artist} compact />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-10" id="artists-browser">
        <div className="rounded-[42px] bg-transparent py-2 text-center">
          <h2 className="text-[34px] font-medium text-[#2f3138] sm:text-[40px]">Svi umjetnici</h2>

          <div className="mx-auto mt-10 flex max-w-[960px] flex-col gap-4 md:flex-row">
            <input
              className="h-[64px] flex-1 rounded-full border border-[#d7dce4] bg-white px-10 text-[20px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Ime i prezime"
              type="search"
              value={searchTerm}
            />

            <div className="relative md:w-[224px]">
              <select
                className="h-[64px] w-full appearance-none rounded-full border border-[#d7dce4] bg-white px-8 pr-14 text-[20px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
                onChange={(event) => {
                  setSortValue(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                value={sortValue}
              >
                <option value="featured">Sortiraj</option>
                <option value="name-asc">Ime A-Z</option>
                <option value="name-desc">Ime Z-A</option>
                <option value="artworks-desc">Najvise radova</option>
              </select>

              <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[24px] text-[#2f3138]">
                ˅
              </span>
            </div>
          </div>

          <div className="mt-10">
            <p className="text-[22px] font-medium text-[#2f3138]">Discipline:</p>

            <div className="mx-auto mt-7 flex max-w-[1020px] flex-wrap justify-center gap-3">
              {disciplineOptions.map((discipline) => {
                const isActive = selectedDisciplines.includes(discipline.slug);

                return (
                  <button
                    className={`rounded-full border px-5 py-3 text-[18px] leading-none transition ${
                      isActive
                        ? "border-[#182fc7] bg-[#182fc7] text-white"
                        : "border-[#d3d7df] bg-white text-[#334155] hover:border-[#182fc7] hover:text-[#182fc7]"
                    }`}
                    key={discipline.slug}
                    onClick={() => handleDisciplineToggle(discipline.slug)}
                    type="button"
                  >
                    {formatDisciplineLabel(discipline.name)}
                  </button>
                );
              })}
            </div>

            <button
              className="mt-8 text-[20px] font-semibold text-[#344255] underline underline-offset-4 transition hover:text-[#182fc7]"
              onClick={handleResetFilters}
              type="button"
            >
              Poništi filtere
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-10">
        {filteredArtists.length === 0 ? (
          <div className="rounded-[34px] border border-dashed border-[#d6dce5] bg-white px-8 py-12 text-center text-[18px] text-[#7d8793]">
            Nema umjetnika koji odgovaraju izabranim filterima.
          </div>
        ) : (
          <ArtistGrid artists={visibleArtists} />
        )}
      </section>

      {canLoadMore ? (
        <div className="flex justify-center">
          <button
            className="site-cta-button inline-flex items-center justify-center whitespace-nowrap px-9"
            onClick={() => setVisibleCount((currentValue) => currentValue + PAGE_SIZE)}
            type="button"
          >
            <span className="site-cta-button__icon-wrap" aria-hidden="true">
              <span className="site-cta-button__icon-dot" />
              <svg
                className="site-cta-button__icon"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#artists-browser-cta-clip)">
                  <path
                    d="M10.2632 4.26844C11.5965 5.03824 11.5965 6.96274 10.2632 7.73254L3.83765 11.4423C2.50431 12.2121 0.837646 11.2499 0.837646 9.71027L0.837646 2.2907C0.837646 0.751101 2.50431 -0.211149 3.83765 0.558652L10.2632 4.26844Z"
                    fill="currentColor"
                  />
                </g>
                <defs>
                  <clipPath id="artists-browser-cta-clip">
                    <rect width="12" height="12" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </span>
            <span className="site-cta-button__label">Prikaži više</span>
          </button>
        </div>
      ) : null}

      {hasActiveFilters && filteredArtists.length > 0 ? (
        <p className="mx-auto max-w-[1500px] px-5 text-center text-[16px] text-[#7d8793] sm:px-8 lg:px-10">
          Prikazano {visibleArtists.length} od {filteredArtists.length} rezultata.
        </p>
      ) : null}
    </div>
  );
}

function getDisciplineOptions(artists: Artist[]) {
  const disciplineMap = new Map<string, { slug: string; name: string }>();

  for (const artist of artists) {
    for (const discipline of artist.disciplines) {
      disciplineMap.set(discipline.slug, {
        slug: discipline.slug,
        name: discipline.name,
      });
    }
  }

  return Array.from(disciplineMap.values()).sort((leftItem, rightItem) =>
    leftItem.name.localeCompare(rightItem.name, "sr"),
  );
}

function compareArtists(leftArtist: Artist, rightArtist: Artist, sortValue: string) {
  if (sortValue === "name-asc") {
    return leftArtist.name.localeCompare(rightArtist.name, "sr");
  }

  if (sortValue === "name-desc") {
    return rightArtist.name.localeCompare(leftArtist.name, "sr");
  }

  if (sortValue === "artworks-desc") {
    const leftArtworkCount = leftArtist.counts?.artworks ?? leftArtist.artworks.length;
    const rightArtworkCount = rightArtist.counts?.artworks ?? rightArtist.artworks.length;

    if (rightArtworkCount !== leftArtworkCount) {
      return rightArtworkCount - leftArtworkCount;
    }
  }

  const leftFeaturedCount = leftArtist.counts?.artworks ?? leftArtist.artworks.length;
  const rightFeaturedCount = rightArtist.counts?.artworks ?? rightArtist.artworks.length;

  if (rightFeaturedCount !== leftFeaturedCount) {
    return rightFeaturedCount - leftFeaturedCount;
  }

  return leftArtist.name.localeCompare(rightArtist.name, "sr");
}

function formatDisciplineLabel(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hasArtistVisuals(artist: Artist) {
  return Boolean(artist.thumbnailUrl || artist.coverImageUrl || artist.profileImageUrl);
}
