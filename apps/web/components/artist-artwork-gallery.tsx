"use client";

import { useEffect, useRef, useState } from "react";

import type { Artwork } from "@/types/api";

interface ArtistArtworkGalleryProps {
  artistName: string;
  artworks: Artwork[];
}

/**
 * This gallery keeps the normal portfolio grid visible on the page,
 * then upgrades it with a fullscreen lightbox when a visitor opens a work.
 */
export function ArtistArtworkGallery({ artistName, artworks }: ArtistArtworkGalleryProps) {
  const sortedArtworks = [...artworks].sort((left, right) => left.orderIndex - right.orderIndex);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeArtwork = activeIndex !== null ? sortedArtworks[activeIndex] : null;
  const displayedIndex = activeIndex ?? 0;

  useEffect(() => {
    if (activeIndex === null) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((currentIndex) => {
          if (currentIndex === null) {
            return 0;
          }

          return (currentIndex + 1) % sortedArtworks.length;
        });
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((currentIndex) => {
          if (currentIndex === null) {
            return 0;
          }

          return (currentIndex - 1 + sortedArtworks.length) % sortedArtworks.length;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, sortedArtworks.length]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    thumbnailRefs.current[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeIndex]);

  function showPreviousArtwork() {
    setActiveIndex((currentIndex) => {
      if (currentIndex === null) {
        return 0;
      }

      return (currentIndex - 1 + sortedArtworks.length) % sortedArtworks.length;
    });
  }

  function showNextArtwork() {
    setActiveIndex((currentIndex) => {
      if (currentIndex === null) {
        return 0;
      }

      return (currentIndex + 1) % sortedArtworks.length;
    });
  }

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {sortedArtworks.map((artwork, index) => (
          <article
            className="overflow-hidden rounded-[18px] bg-white shadow-[0_8px_28px_rgba(37,48,71,0.08)]"
            key={artwork.id}
          >
            <button
              aria-label={`Otvori rad ${artwork.title || index + 1}`}
              className="block w-full cursor-pointer text-left"
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <img
                alt={artwork.altText || artwork.title || `${artistName} artwork`}
                className="aspect-[0.92/1] w-full object-cover transition duration-500 hover:scale-[1.03]"
                src={artwork.imageUrl}
              />
            </button>
          </article>
        ))}
      </div>

      {activeArtwork ? (
        <div
          aria-label="Pregled radova"
          aria-modal="true"
          className="fixed inset-0 z-[80] bg-[rgba(12,12,12,0.9)]"
          role="dialog"
        >
          <button
            aria-label="Zatvori galeriju"
            className="absolute right-5 top-5 z-20 inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-white/18 bg-black/20 text-[34px] text-white transition hover:bg-white/10 sm:right-8 sm:top-8"
            onClick={() => setActiveIndex(null)}
            type="button"
          >
            <span aria-hidden="true">&times;</span>
          </button>

          {sortedArtworks.length > 1 ? (
            <>
              <button
                aria-label="Prethodni rad"
                className="absolute left-3 top-1/2 z-20 inline-flex h-16 w-16 cursor-pointer -translate-y-1/2 items-center justify-center text-white transition hover:scale-110 sm:left-6"
                onClick={showPreviousArtwork}
                type="button"
              >
                <span className="text-[72px] leading-none">&lsaquo;</span>
              </button>

              <button
                aria-label="Sljedeci rad"
                className="absolute right-3 top-1/2 z-20 inline-flex h-16 w-16 cursor-pointer -translate-y-1/2 items-center justify-center text-white transition hover:scale-110 sm:right-6"
                onClick={showNextArtwork}
                type="button"
              >
                <span className="text-[72px] leading-none">&rsaquo;</span>
              </button>
            </>
          ) : null}

          <div className="flex h-full flex-col px-4 pb-5 pt-20 sm:px-8 sm:pb-6 sm:pt-8">
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <img
                alt={activeArtwork.altText || activeArtwork.title || `${artistName} artwork`}
                className="max-h-full max-w-full object-contain shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
                src={activeArtwork.imageUrl}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 px-2 text-white/88">
              <div className="min-w-0">
                <div className="truncate text-[18px] font-semibold">
                  {activeArtwork.title || `${artistName} - rad ${displayedIndex + 1}`}
                </div>
                {activeArtwork.description ? (
                  <div className="mt-1 truncate text-[14px] text-white/62">{activeArtwork.description}</div>
                ) : null}
              </div>
              <div className="shrink-0 text-[14px] font-medium text-white/72">
                {displayedIndex + 1} / {sortedArtworks.length}
              </div>
            </div>

            {sortedArtworks.length > 1 ? (
              <div className="mt-4 overflow-x-auto pb-1">
                <div className="flex min-w-max gap-3">
                  {sortedArtworks.map((artwork, index) => (
                    <button
                      aria-label={`Prikazi thumbnail ${index + 1}`}
                      className={`cursor-pointer overflow-hidden rounded-[10px] border transition ${
                        index === displayedIndex
                          ? "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.2)]"
                          : "border-white/12 opacity-75 hover:opacity-100"
                      }`}
                      key={artwork.id}
                      onClick={() => setActiveIndex(index)}
                      ref={(element) => {
                        thumbnailRefs.current[index] = element;
                      }}
                      type="button"
                    >
                      <img
                        alt={artwork.altText || artwork.title || `${artistName} thumbnail`}
                        className="h-[74px] w-[74px] object-cover sm:h-[86px] sm:w-[86px]"
                        src={artwork.imageUrl}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
