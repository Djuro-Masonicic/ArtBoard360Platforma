import { ArrowDown, ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtistArtworkGallery } from "@/components/artist-artwork-gallery";
import { ApiError } from "@/services/api";
import { getArtistBySlug } from "@/services/artists";
import type { Artwork, SocialPlatform } from "@/types/api";

interface ArtistDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ArtistDetailPage({ params }: ArtistDetailPageProps) {
  const { slug } = await params;

  try {
    const artist = await getArtistBySlug(slug);
    const orderedArtworks = [...artist.artworks].sort((left, right) => left.orderIndex - right.orderIndex);
    const backgroundArtwork = orderedArtworks.find((artwork) => artwork.isBackground);
    const heroImage =
      backgroundArtwork?.imageUrl ||
      artist.coverImageUrl ||
      orderedArtworks[0]?.imageUrl ||
      artist.profileImageUrl ||
      artist.thumbnailUrl ||
      null;
    const profileImage =
      artist.profileImageUrl || artist.profileThumbnailUrl || artist.thumbnailUrl || heroImage;
    const featuredArtworks = orderFeaturedFirst(orderedArtworks).slice(0, 12);
    const collections = buildCollections(orderedArtworks);
    const quote = parseQuote(artist.quote);
    const circleTextId = `artist-work-circle-${artist.slug.replace(/[^a-z0-9-]/gi, "")}`;

    return (
      <div className="-mx-5 -my-8 bg-[#f7f7f9] pt-[76px] sm:-mx-8 sm:-my-10 lg:-mx-10 lg:-my-12">
        <section className="relative min-h-[720px] overflow-hidden bg-[#17120f] text-white lg:min-h-[calc(100svh-78px)]">
          {heroImage ? (
            <img
              alt={backgroundArtwork?.altText || backgroundArtwork?.title || artist.name}
              className="absolute inset-0 h-full w-full object-cover"
              src={heroImage}
            />
          ) : null}

          <div
            className={`absolute inset-0 ${
              artist.darkenCoverOverlay
                ? "bg-[linear-gradient(180deg,rgba(8,5,4,0.42)_0%,rgba(8,5,4,0.14)_42%,rgba(8,5,4,0.82)_100%)]"
                : "bg-[linear-gradient(180deg,rgba(10,7,6,0.2)_0%,rgba(10,7,6,0.05)_42%,rgba(10,7,6,0.76)_100%)]"
            }`}
          />

          <div className="relative mx-auto flex min-h-[720px] w-full max-w-[1460px] flex-col px-6 pb-10 pt-12 sm:px-10 lg:min-h-[calc(100svh-78px)] lg:px-14 xl:px-0">
            <Link
              className="inline-flex w-fit items-center gap-2 text-[14px] font-bold text-white transition hover:-translate-x-1"
              href="/umjetnici"
            >
              <ArrowLeft aria-hidden="true" size={17} strokeWidth={2} />
              <span className="border-b border-white/75 pb-0.5">Vidi sve umjetnike</span>
            </Link>

            <div className="mt-auto grid gap-6 pb-1 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-end sm:gap-8 lg:grid-cols-[220px_minmax(0,1fr)_180px] lg:gap-12">
              <div className="h-[154px] w-[154px] overflow-hidden rounded-full border-2 border-white bg-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.22)] sm:h-[178px] sm:w-[178px]">
                {profileImage ? (
                  <img
                    alt={artist.name}
                    className="h-full w-full object-cover"
                    src={profileImage}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/12 text-4xl font-bold uppercase text-white">
                    {getInitials(artist.name)}
                  </div>
                )}
              </div>

              <div className="min-w-0 pb-1 sm:pb-0 lg:pb-2">
                <h1 className="text-[40px] font-bold leading-[0.98] text-white sm:text-[52px] lg:text-[58px]">
                  {artist.name}
                </h1>

                <div className="mt-4 flex flex-wrap gap-2">
                  {artist.disciplines.length > 0 ? (
                    artist.disciplines.map((discipline) => (
                      <span
                        className="inline-flex h-8 items-center rounded-full border border-white/55 px-4 text-[13px] font-semibold text-white"
                        key={discipline.id}
                      >
                        {discipline.name}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex h-8 items-center rounded-full border border-white/45 px-4 text-[13px] font-semibold text-white">
                      Umjetnički profil
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] font-bold text-white">
                  {artist.socialLinks.map((link) => (
                    <a
                      className="inline-flex items-center gap-1.5 transition hover:text-white/68"
                      href={link.url}
                      key={link.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {socialLabel(link.platform)}
                      <ArrowUpRight aria-hidden="true" size={13} strokeWidth={2.2} />
                    </a>
                  ))}
                  {artist.email ? (
                    <>
                      {artist.socialLinks.length > 0 ? <span className="h-4 w-px bg-white/45" aria-hidden="true" /> : null}
                      <a className="break-all transition hover:text-white/68" href={`mailto:${artist.email}`}>
                        {artist.email}
                      </a>
                    </>
                  ) : null}
                </div>
              </div>

              <a
                className="group relative hidden h-[146px] w-[146px] place-items-center justify-self-end text-white lg:grid"
                href="#radovi"
                aria-label="Vidi radove"
              >
                <svg
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full animate-[spin_18s_linear_infinite] overflow-visible"
                  viewBox="0 0 146 146"
                >
                  <defs>
                    <path id={circleTextId} d="M 73,73 m -55,0 a 55,55 0 1,1 110,0 a 55,55 0 1,1 -110,0" />
                  </defs>
                  <text fill="currentColor" fontSize="10.5" fontWeight="700" letterSpacing="2.2">
                    <textPath href={`#${circleTextId}`} startOffset="1%">
                      VIDI RADOVE • VIDI RADOVE • VIDI RADOVE •
                    </textPath>
                  </text>
                </svg>
                <span className="grid h-14 w-14 place-items-center rounded-full border border-white/65 transition group-hover:bg-white group-hover:text-black">
                  <ArrowDown aria-hidden="true" size={22} strokeWidth={1.8} />
                </span>
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[#f7f7f9] px-6 py-20 sm:px-10 sm:py-24 lg:px-14 lg:py-28">
          <div className="mx-auto w-full max-w-[1600px]">
            <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,860px)] lg:gap-14">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8c92a2]">Biografija</p>

              <div>
                <div className="space-y-5 text-[18px] leading-[1.62] text-[#343a4b] sm:text-[20px]">
                  {artist.bio ? (
                    splitParagraphs(artist.bio).map((paragraph, index) => (
                      <p key={`${artist.id}-bio-${index}`}>
                        {index === 0 ? <strong className="font-bold text-[#111318]">{artist.name}</strong> : null}
                        {index === 0 ? ` ${removeLeadingName(paragraph, artist.name)}` : paragraph}
                      </p>
                    ))
                  ) : (
                    <p>Biografija umjetnika uskoro će biti dostupna.</p>
                  )}
                </div>

                {quote ? (
                  <blockquote className="mt-12 border-l border-[#8f96a5] pl-7">
                    <p className="font-serif text-[26px] italic leading-[1.3] text-[#17191f] sm:text-[32px]">
                      “{quote.text}”
                    </p>
                    <footer className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#596072]">
                      {quote.author || artist.name}
                    </footer>
                  </blockquote>
                ) : null}
              </div>
            </div>

            <div className="mt-24 scroll-mt-24 sm:mt-28" id="radovi">
              <SectionHeading eyebrow="Portfolio" title="Izdvojeni radovi" />

              <div className="mt-7">
                {featuredArtworks.length > 0 ? (
                  <ArtistArtworkGallery artistName={artist.name} artworks={featuredArtworks} />
                ) : (
                  <div className="border border-dashed border-[#d6d9e1] bg-white px-6 py-10 text-[15px] text-[#666d7c]">
                    Umjetnik još nema javno dostupne radove.
                  </div>
                )}
              </div>
            </div>

            {collections.length > 0 ? (
              <section className="mt-24 sm:mt-28">
                <div className="flex items-end justify-between gap-6">
                  <SectionHeading eyebrow="Kolekcije" title="Serije i projekti" />
                  <a className="hidden border-b border-[#111318] pb-1 text-[12px] font-bold uppercase sm:inline-flex" href="#radovi">
                    Svi radovi <span aria-hidden="true">→</span>
                  </a>
                </div>

                <div className="mt-7 grid gap-8 lg:grid-cols-3">
                  {collections.map((collection, index) => (
                    <a className="group block min-w-0" href="#radovi" key={`${artist.id}-collection-${index}`}>
                      <CollectionMosaic artistName={artist.name} artworks={collection.artworks} />
                      <div className="mt-4 flex items-start justify-between gap-4">
                        <h3 className="text-[18px] font-bold leading-tight text-[#111318]">{collection.title}</h3>
                        <span className="shrink-0 text-[12px] font-semibold text-[#969cad]">
                          {collection.artworks.length} {workCountLabel(collection.artworks.length)}
                        </span>
                      </div>
                      {collection.description ? (
                        <p className="mt-2 line-clamp-2 text-[14px] leading-[1.5] text-[#62697a]">{collection.description}</p>
                      ) : null}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
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
    <div>
      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8c92a2]">{eyebrow}</p>
      <h2 className="mt-2 text-[27px] font-bold leading-tight text-[#111318] sm:text-[32px]">{title}</h2>
    </div>
  );
}

function CollectionMosaic({ artistName, artworks }: { artistName: string; artworks: Artwork[] }) {
  return (
    <div className="grid aspect-[1.38/1] grid-cols-[2fr_1fr] grid-rows-2 gap-1 overflow-hidden bg-[#e7e8ec]">
      {artworks.slice(0, 3).map((artwork, index) => (
        <div className={index === 0 ? "row-span-2 overflow-hidden" : "overflow-hidden"} key={artwork.id}>
          <img
            alt={artwork.altText || artwork.title || `${artistName} rad`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
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

  const normalized = value.trim().replace(/^['“"]+|['”"]+$/g, "");
  const match = normalized.match(/^(.*?)[\s\n]+[-–—]\s*([^\n]+)$/s);

  if (!match) {
    return { author: null, text: normalized };
  }

  return {
    author: match[2]?.trim() || null,
    text: match[1]?.trim().replace(/^['“"]+|['”"]+$/g, "") || normalized,
  };
}

function workCountLabel(count: number) {
  return count === 1 ? "rad" : "rada";
}
