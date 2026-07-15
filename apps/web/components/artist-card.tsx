"use client";
import type { Artist } from "@/types/api";
import { useState, useEffect, useMemo } from "react";

interface ArtistCardProps {
  artist: Artist;
  compact?: boolean;
}

const ROTATION_START_DELAY_MS = 450;
const ROTATION_INTERVAL_MS = 1800;
const FADE_DURATION_MS = 900;

/**
 * The artists listing card is intentionally visual-first:
 * large artwork, discipline chips on top of the image, then a simple footer
 * with the artist name and profile thumbnail.
 */
export function ArtistCard({ artist, compact = false }: ArtistCardProps) {
  const featuredArtworkImages = useMemo(
    () =>
      Array.from(
        new Set(
          artist.artworks
            .filter((artwork) => artwork.isFeatured)
            .map((artwork) => artwork.imageUrl)
            .filter(Boolean),
        ),
      ),
    [artist.artworks],
  );

  const artworkImages = useMemo(
    () =>
      Array.from(
        new Set(
          artist.artworks.map((artwork) => artwork.imageUrl).filter(Boolean),
        ),
      ),
    [artist.artworks],
  );

  const fallbackImageUrl =
    artist.thumbnailUrl ||
    artist.coverImageUrl ||
    artist.profileImageUrl ||
    null;

  const rotationImages =
    featuredArtworkImages.length > 0
      ? featuredArtworkImages
      : artworkImages.length > 0
      ? artworkImages
      : fallbackImageUrl
        ? [fallbackImageUrl]
        : [];

  const avatarUrl =
    artist.profileThumbnailUrl || artist.profileImageUrl || artist.thumbnailUrl;
  const visibleDisciplines = artist.disciplines.slice(0, compact ? 1 : 2);
  const nameClassName = compact
    ? "text-[28px] sm:text-[32px]"
    : "text-[24px] leading-[1.05] sm:text-[28px]";

  const [isHovered, setIsHovered] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!isHovered || compact || rotationImages.length <= 1) {
      setActiveImageIndex(0);
      return;
    }

    const startTimeout = setTimeout(() => {
      setActiveImageIndex((currentIndex) =>
        (currentIndex + 1) % rotationImages.length,
      );
    }, ROTATION_START_DELAY_MS);

    const intervalId = setInterval(() => {
      setActiveImageIndex((currentIndex) =>
        (currentIndex + 1) % rotationImages.length,
      );
    }, ROTATION_INTERVAL_MS);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(intervalId);
    };
  }, [compact, isHovered, rotationImages.length]);

  function handleMouseEnter() {
    setIsHovered(true);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    setActiveImageIndex(0);
  }

  return (
    <article
      className={`group flex h-full flex-col rounded-[28px] border border-[#dbe1ea] bg-white p-6 shadow-[0_14px_34px_rgba(37,51,73,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_46px_rgba(37,51,73,0.12)] ${
        compact ? "w-full min-w-[520px] max-w-[560px]" : "overflow-hidden"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a className="flex h-full flex-col" href={`/artists/${artist.slug}`}>
        <div
          className={`relative overflow-hidden rounded-[22px] bg-[#edf1f7] ${
            compact ? "aspect-[1.16/1]" : "aspect-[1.04/1]"
          }`}
        >
          {rotationImages.length > 0 ? (
            <>
              {rotationImages.map((imageUrl, index) => (
                <img
                  alt={index === 0 ? artist.name : `${artist.name} artwork ${index + 1}`}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out ${
                    index === activeImageIndex ? "opacity-100" : "opacity-0"
                  }`}
                  key={`${artist.id}-${imageUrl}-${index}`}
                  src={imageUrl}
                  style={{ transitionDuration: `${FADE_DURATION_MS}ms` }}
                />
              ))}
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-[#e8edf5] text-sm text-[#8a93a1]">
              Fotografija uskoro
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(17,24,39,0.68)] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 px-4 pb-4">
            {visibleDisciplines.length > 0 ? (
              visibleDisciplines.map((discipline) => (
                <span
                  className="inline-flex rounded-full border border-[rgba(255,255,255,0.5)] bg-[rgba(34,34,34,0.3)] px-4 py-2 text-[14px] leading-none text-white backdrop-blur-[4px]"
                  key={discipline.id}
                >
                  {formatDisciplineLabel(discipline.name)}
                </span>
              ))
            ) : (
              <span className="inline-flex rounded-full border border-[rgba(255,255,255,0.5)] bg-[rgba(34,34,34,0.3)] px-4 py-2 text-[14px] leading-none text-white backdrop-blur-[4px]">
                Umjetnost
              </span>
            )}
          </div>
        </div>

        <div className="grid min-h-[124px] grid-cols-[minmax(0,1fr)_68px] items-end gap-4 pt-5">
          <h3
            className={`min-h-[2.45em] overflow-hidden font-medium tracking-[-0.04em] text-[#2f3138] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${nameClassName}`}
          >
            {artist.name}
          </h3>

          <div className="flex h-[64px] w-[64px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e9edf4] sm:h-[68px] sm:w-[68px]">
            {avatarUrl ? (
              <img
                alt={artist.name}
                className="h-full w-full object-cover"
                src={avatarUrl}
              />
            ) : (
              <span className="text-[26px] font-medium text-[#7d8793]">
                {artist.name.slice(0, 1)}
              </span>
            )}
          </div>
        </div>
      </a>
    </article>
  );
}

function formatDisciplineLabel(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
