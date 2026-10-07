import { ArrowRight, BadgeCheck } from "lucide-react";
import Link from "next/link";

import { siteRoutes } from "@/lib/site-routes";
import type { Artist } from "@/types/api";

import styles from "./artists-page.module.css";

interface ArtistCardProps {
  artist: Artist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const imageUrl = getArtistVisual(artist);
  const avatarUrl =
    artist.profileThumbnailUrl || artist.profileImageUrl || artist.thumbnailUrl;
  const artworkCount = artist.counts?.artworks ?? artist.artworks.length;
  const location = getArtistLocation(artist);
  const isNew = isRecentlyAdded(artist.createdAt);

  return (
    <article className={styles.artistCard}>
      <Link
        aria-label={`Otvori profil: ${artist.name}`}
        className={styles.artistCardLink}
        href={`${siteRoutes.artistProfileBase}/${artist.slug}`}
      >
        <div className={styles.artistImageWrap}>
          {imageUrl ? (
            <img
              alt={artist.artworks[0]?.altText || `Rad umjetnika ${artist.name}`}
              className={styles.artistImage}
              loading="lazy"
              src={imageUrl}
            />
          ) : (
            <div className={styles.artistImageFallback} aria-hidden="true">
              {getInitials(artist.name)}
            </div>
          )}

          {isNew ? <span className={styles.newBadge}>Novo</span> : null}
          <span className={styles.workCount}>
            {artworkCount} {artworkCount === 1 ? "rad" : "radova"}
          </span>
        </div>

        <div className={styles.artistInfo}>
          <div className={styles.artistIdentity}>
            <h2>
              {artist.name}
              <BadgeCheck aria-label="Verifikovan profil" size={16} strokeWidth={2.5} />
            </h2>
            <span className={styles.avatar}>
              {avatarUrl ? <img alt="" src={avatarUrl} /> : getInitials(artist.name)}
            </span>
          </div>

          <span className={styles.cardRule} aria-hidden="true" />
          <p className={styles.disciplines}>
            {artist.disciplines.length > 0
              ? artist.disciplines
                  .slice(0, 2)
                  .map((item) => formatDiscipline(item.name))
                  .join(" · ")
              : "Umjetnost"}
          </p>

          <div className={styles.artistMeta}>
            <span>{location}</span>
            <span className={styles.profileLink}>
              Profil <ArrowRight aria-hidden="true" size={15} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function getArtistVisual(artist: Artist) {
  return (
    artist.artworks.find((artwork) => artwork.isFeatured)?.imageUrl ||
    artist.artworks[0]?.imageUrl ||
    artist.thumbnailUrl ||
    artist.coverImageUrl ||
    artist.profileImageUrl ||
    null
  );
}

export function getArtistLocation(artist: Artist) {
  const searchableText = `${artist.bio || ""} ${artist.quote || ""}`;
  const cities = [
    "Podgorica",
    "Cetinje",
    "Nikšić",
    "Kotor",
    "Tivat",
    "Budva",
    "Bar",
    "Ulcinj",
    "Danilovgrad",
    "Herceg Novi",
    "Bijelo Polje",
    "Berane",
  ];

  return (
    cities.find((city) =>
      searchableText.toLocaleLowerCase("sr").includes(city.toLocaleLowerCase("sr")),
    ) || "Crna Gora"
  );
}

export function formatDiscipline(value: string) {
  return value
    .replaceAll("-", " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("sr") + part.slice(1))
    .join(" ");
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("sr"))
    .join("");
}

function isRecentlyAdded(createdAt: string) {
  const created = new Date(createdAt).getTime();
  const age = Date.now() - created;
  return Number.isFinite(created) && age >= 0 && age < 1000 * 60 * 60 * 24 * 120;
}
