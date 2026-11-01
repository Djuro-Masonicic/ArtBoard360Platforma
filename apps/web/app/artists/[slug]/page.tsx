import { ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtistArtworkGallery } from "@/components/artist-artwork-gallery";
import { NsfwProfileGate } from "@/components/nsfw-profile-gate";
import { ApiError } from "@/services/api";
import { getArtistBySlug } from "@/services/artists";
import type { Artwork, SocialPlatform } from "@/types/api";

import styles from "./artist-profile-page.module.css";

interface ArtistDetailPageProps {
  searchParams?: Promise<{ collection?: string }>;
  params: Promise<{
    slug: string;
  }>;
}

export default async function ArtistDetailPage({ params, searchParams }: ArtistDetailPageProps) {
  const { slug } = await params;
  const selectedCollectionId = (await searchParams)?.collection;

  try {
    const artist = await getArtistBySlug(slug);
    const orderedArtworks = [...artist.artworks].sort((left, right) => left.orderIndex - right.orderIndex);
    const backgroundArtwork = orderedArtworks.find((artwork) => artwork.isBackground);
    const heroImage =
      artist.coverImageUrl ||
      backgroundArtwork?.imageUrl ||
      orderedArtworks[0]?.imageUrl ||
      artist.profileImageUrl ||
      artist.thumbnailUrl ||
      null;
    const profileImage =
      artist.profileImageUrl || artist.profileThumbnailUrl || artist.thumbnailUrl || heroImage;
    const realCollections = (artist.collections ?? []).map(c => ({ ...c,
      artworks: orderedArtworks.filter(w => w.artistCollectionId === c.id).sort((a, b) => (a.collectionOrderIndex ?? a.orderIndex) - (b.collectionOrderIndex ?? b.orderIndex)) }));
    const activeCollection = realCollections.find(c => c.id === selectedCollectionId);
    const featuredArtworks = activeCollection ? activeCollection.artworks : orderFeaturedFirst(orderedArtworks).slice(0, 12);
    const collections = realCollections.length ? realCollections : buildCollections(orderedArtworks).map(c => ({ ...c, id: null, year: null, coverImageUrl: null }));
    const quote = parseQuote(artist.quote);
    const artistStatement = artist.artistStatement?.trim() || null;
    const circleTextId = `artist-work-circle-${artist.slug.replace(/[^a-z0-9-]/gi, "")}`;
    const nsfwPreviewImages = Array.from(
      new Set(
        [...orderedArtworks.map((artwork) => artwork.imageUrl), heroImage, profileImage].filter(
          (imageUrl): imageUrl is string => Boolean(imageUrl),
        ),
      ),
    ).slice(0, 3);

    const profilePage = (
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.cover}>
            {heroImage ? (
              <img
                alt={backgroundArtwork?.altText || backgroundArtwork?.title || `${artist.name} naslovna slika`}
                className={styles.coverImage}
                src={heroImage}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={`${styles.coverOverlay} ${artist.darkenCoverOverlay ? styles.coverOverlayStrong : ""}`}
            />
            <div className={styles.coverInner}>
              <Link className={styles.backLink} href="/umjetnici">
                <ArrowLeft aria-hidden="true" size={15} strokeWidth={2.2} />
                Vidi sve umjetnike
              </Link>
            </div>
          </div>

          <div className={styles.profileInner}>
            <div className={styles.avatar}>
              {profileImage ? (
                <img alt={artist.name} src={profileImage} />
              ) : (
                <span>{getInitials(artist.name)}</span>
              )}
            </div>

            <div className={styles.profileInfo}>
              <h1>{artist.name}</h1>
              <div className={styles.disciplines}>
                {artist.disciplines.length > 0 ? (
                  artist.disciplines.map((discipline) => (
                    <span key={discipline.id}>{discipline.name}</span>
                  ))
                ) : (
                  <span>Umjetnički profil</span>
                )}
              </div>

              {(artist.socialLinks.length > 0 || artist.email) && (
                <div className={styles.contacts}>
                  {artist.socialLinks.map((link) => (
                    <a href={link.url} key={link.id} rel="noreferrer" target="_blank">
                      {socialLabel(link.platform)}
                    </a>
                  ))}
                  {artist.email ? (
                    <>
                      {artist.socialLinks.length > 0 ? <span aria-hidden="true" className={styles.contactDivider} /> : null}
                      <a className={styles.email} href={`mailto:${artist.email}`}>
                        {artist.email}
                      </a>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <a className={styles.worksRing} href="#radovi" aria-label="Vidi radove">
              <svg aria-hidden="true" viewBox="0 0 140 140">
                <defs>
                  <path id={circleTextId} d="M70,70 m-52,0 a52,52 0 1,1 104,0 a52,52 0 1,1 -104,0" />
                </defs>
                <text textLength="326" lengthAdjust="spacing">
                  <textPath href={`#${circleTextId}`} startOffset="0">
                    VIDI RADOVE • VIDI RADOVE • VIDI RADOVE •
                  </textPath>
                </text>
              </svg>
              <span>
                <ArrowDown aria-hidden="true" size={23} strokeWidth={1.8} />
              </span>
            </a>
          </div>

          <div className={styles.biographyRow}>
            <p className={styles.sectionLabel}>Biografija</p>
            <div className={styles.biographyContent}>
              <div className={styles.biographyText}>
                {artist.bio ? (
                  splitParagraphs(artist.bio).map((paragraph, index) => (
                    <p key={`${artist.id}-bio-${index}`}>
                      {index === 0 ? <strong>{artist.name}</strong> : null}
                      {index === 0 ? ` ${removeLeadingName(paragraph, artist.name)}` : paragraph}
                    </p>
                  ))
                ) : (
                  <p>Biografija umjetnika uskoro će biti dostupna.</p>
                )}
              </div>

              {quote ? (
                <blockquote className={styles.quote}>
                  <p>“{quote.text}”</p>
                  <footer>
                    <span aria-hidden="true" />
                    {quote.author || artist.name}
                  </footer>
                </blockquote>
              ) : null}
            </div>
          </div>
        </section>

        <section className={styles.portfolioSection} id="radovi">
          <SectionHeading eyebrow="Portfolio" title={activeCollection?.title ?? "Izdvojeni radovi"} />
          {activeCollection ? <a href="?collection=#radovi">Vidi sve izdvojene radove →</a> : null}
          <div className={styles.galleryWrap}>
            {featuredArtworks.length > 0 ? (
              <ArtistArtworkGallery artistName={artist.name} artworks={featuredArtworks} />
            ) : (
              <div className={styles.emptyState}>{activeCollection ? "Kolekcija još nema radove." : "Umjetnik još nema javno dostupne radove."}</div>
            )}
          </div>
        </section>

        {artistStatement ? (
          <section className={styles.statementSection} id="iskaz">
            <p className={styles.sectionLabel}>Umjetnički iskaz</p>
            <div className={styles.statementText}>
              {splitParagraphs(artistStatement).map((paragraph, index) => (
                <p key={`${artist.id}-statement-${index}`}>{paragraph}</p>
              ))}
            </div>
          </section>
        ) : null}

        {collections.length > 0 ? (
          <section className={styles.collectionsSection} id="kolekcije">
            <div className={styles.collectionsHeader}>
              <SectionHeading eyebrow="Kolekcije" title="Serije i projekti" />
              <a href="#radovi">
                Sve kolekcije <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
              </a>
            </div>

            <div className={styles.collectionsGrid}>
              {collections.map((collection, index) => (
                <a className={styles.collection} href={collection.id ? `?collection=${collection.id}#radovi` : "#radovi"} key={collection.id ?? `${artist.id}-collection-${index}`}>
                  <CollectionMosaic artistName={artist.name} artworks={collection.artworks} coverImageUrl={collection.coverImageUrl} />
                  <div className={styles.collectionTitleRow}>
                    <h3>{collection.title}</h3>
                    <span>
                      {collection.artworks.length} {workCountLabel(collection.artworks.length)}
                    </span>
                  </div>
                  {collection.description ? <p>{collection.description}</p> : null}
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );

    if (!artist.isNsfw) {
      return profilePage;
    }

    return (
      <NsfwProfileGate
        artistName={artist.name}
        previewImageUrls={nsfwPreviewImages}
        slug={artist.slug}
      >
        {profilePage}
      </NsfwProfileGate>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className={styles.sectionHeading}>
      <p>{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}

function CollectionMosaic({ artistName, artworks, coverImageUrl }: { artistName: string; artworks: Artwork[]; coverImageUrl?: string | null }) {
  return (
    <div className={styles.collectionMosaic}>
      {(coverImageUrl ? [{ id: "collection-cover", imageUrl: coverImageUrl, title: "Naslovna slika kolekcije", altText: "" }, ...artworks.filter(w => w.imageUrl !== coverImageUrl).slice(0, 2)] : artworks.slice(0, 3)).map((artwork, index) => (
        <div className={index === 0 ? styles.collectionLead : ""} key={artwork.id}>
          <img
            alt={artwork.altText || artwork.title || `${artistName} rad`}
            src={artwork.imageUrl}
          />
        </div>
      ))}
    </div>
  );
}

function orderFeaturedFirst(artworks: Artwork[]) {
  return [...artworks].sort((left, right) => {
    if (left.isFeatured !== right.isFeatured) {
      return Number(right.isFeatured) - Number(left.isFeatured);
    }

    return left.orderIndex - right.orderIndex;
  });
}

function buildCollections(artworks: Artwork[]) {
  if (artworks.length < 4) {
    return [];
  }

  const collectionCount = Math.min(3, Math.max(1, Math.floor(artworks.length / 3)));
  const collections = Array.from({ length: collectionCount }, () => [] as Artwork[]);

  artworks.forEach((artwork, index) => {
    collections[index % collectionCount]?.push(artwork);
  });

  return collections.map((collection, index) => {
    const leadArtwork = collection[0];

    return {
      artworks: collection,
      title: leadArtwork?.title?.trim() || `Izbor radova ${String(index + 1).padStart(2, "0")}`,
      description: leadArtwork?.description?.trim() || null,
    };
  });
}

function socialLabel(platform: SocialPlatform) {
  const labels: Record<SocialPlatform, string> = {
    ARTSTATION: "ArtStation",
    BEHANCE: "Behance",
    DEVIANTART: "DeviantArt",
    DRIBBBLE: "Dribbble",
    FACEBOOK: "Facebook",
    INSTAGRAM: "Instagram",
    LINKEDIN: "LinkedIn",
    MEDIUM: "Medium",
    PERSONAL_WEBSITE: "Web sajt",
    PDF: "Portfolio PDF",
    PINTEREST: "Pinterest",
    TELEGRAM: "Telegram",
    THREADS: "Threads",
    VIMEO: "Vimeo",
    X_TWITTER: "X",
    YOUTUBE: "YouTube",
  };

  return labels[platform];
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function removeLeadingName(paragraph: string, artistName: string) {
  const trimmedParagraph = paragraph.trim();
  const lowerParagraph = trimmedParagraph.toLocaleLowerCase();
  const lowerName = artistName.trim().toLocaleLowerCase();

  if (lowerParagraph.startsWith(lowerName)) {
    return trimmedParagraph.slice(artistName.trim().length).trimStart();
  }

  return trimmedParagraph;
}

function splitParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function parseQuote(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const normalized = value.trim().replace(/^[‘’“”'"]+|[‘’“”'"]+$/g, "");
  const match = normalized.match(/^(.*?)[\s\n]+[-–—]\s*([^\n]+)$/s);

  if (!match) {
    return { author: null, text: normalized };
  }

  return {
    author: match[2]?.trim() || null,
    text: match[1]?.trim().replace(/^[‘’“”'"]+|[‘’“”'"]+$/g, "") || normalized,
  };
}

function workCountLabel(count: number) {
  return count === 1 ? "rad" : "rada";
}
