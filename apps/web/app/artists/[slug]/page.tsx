import { notFound } from "next/navigation";

import { ArtistArtworkGallery } from "@/components/artist-artwork-gallery";
import { ApiError } from "@/services/api";
import { getArtistBySlug } from "@/services/artists";
import type { SocialPlatform } from "@/types/api";

interface ArtistDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ArtistDetailPage({ params }: ArtistDetailPageProps) {
  const { slug } = await params;

  try {
    const artist = await getArtistBySlug(slug);
    const backgroundArtwork = artist.artworks.find((artwork) => artwork.isBackground);
    const heroImage =
      backgroundArtwork?.imageUrl ||
      artist.coverImageUrl ||
      artist.artworks[0]?.imageUrl ||
      artist.profileImageUrl ||
      artist.thumbnailUrl ||
      null;
    const profileImage =
      artist.profileImageUrl || artist.profileThumbnailUrl || artist.thumbnailUrl || heroImage;

    return (
      <div className="-mx-5 -mt-8 sm:-mx-8 sm:-mt-10 lg:-mx-10 lg:-mt-12">
        <section className="relative min-h-screen overflow-hidden bg-[#120c0b] text-white">
          {heroImage ? (
            <img
              alt={artist.name}
              className="absolute inset-0 h-full w-full object-cover"
              src={heroImage}
            />
          ) : null}

          <div
            className={`absolute inset-0 ${
              artist.darkenCoverOverlay
                ? "bg-[linear-gradient(180deg,rgba(8,5,4,0.76)_0%,rgba(8,5,4,0.54)_34%,rgba(8,5,4,0.9)_100%)]"
                : "bg-[linear-gradient(180deg,rgba(15,9,8,0.62)_0%,rgba(15,9,8,0.42)_35%,rgba(15,9,8,0.86)_100%)]"
            }`}
          />

          <div className="relative mx-auto flex min-h-screen w-full max-w-[1640px] flex-col px-[5vw] pb-10 pt-[18vh] lg:pb-14">
            <a
              className="inline-flex w-fit items-center gap-2 text-[18px] font-semibold text-white transition hover:translate-x-1"
              href="/artists"
            >
              <span aria-hidden="true">&larr;</span>
              <span className="underline underline-offset-4">Vidi sve umjetnike</span>
            </a>

            <div className="mt-auto grid gap-10 pb-4 lg:grid-cols-[230px_minmax(0,620px)_210px] lg:items-end lg:gap-12">
              <div className="space-y-6 lg:pb-3">
                <div className="h-[182px] w-[182px] overflow-hidden rounded-full border border-white/35 bg-white/10 p-[4px] shadow-[0_16px_32px_rgba(0,0,0,0.22)]">
                  {profileImage ? (
                    <img
                      alt={artist.name}
                      className="h-full w-full rounded-full object-cover"
                      src={profileImage}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white/12 text-4xl font-semibold uppercase text-white/88">
                      {getInitials(artist.name)}
                    </div>
                  )}
                </div>

                {artist.quote ? (
                  <blockquote className="max-w-[360px] space-y-3 text-[18px] italic leading-[1.55] text-white/94">
                    <p>"{artist.quote}"</p>
                    <footer className="text-[18px] not-italic text-white/94">- {artist.name}</footer>
                  </blockquote>
                ) : null}
              </div>

              <div className="space-y-6 lg:pb-8">
                <div className="space-y-4">
                  <h1 className="max-w-[580px] text-[42px] font-bold leading-[0.96] tracking-[-0.04em] text-white sm:text-[52px] lg:text-[58px]">
                    {artist.name}
                  </h1>

                  <div className="flex flex-wrap gap-3">
                    {artist.disciplines.length > 0 ? (
                      artist.disciplines.map((discipline) => (
                        <span
                          className="inline-flex items-center rounded-full border border-white/45 px-5 py-2 text-[18px] text-white/96"
                          key={discipline.id}
                        >
                          {discipline.name}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-white/30 px-5 py-2 text-[18px] text-white/80">
                        Umjetnicki profil
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {artist.socialLinks.map((link) => (
                    <a
                      aria-label={link.platform}
                      className="inline-flex h-12 w-12 items-center justify-center text-white transition duration-300 hover:-translate-y-1 hover:scale-110 hover:text-white/72"
                      href={link.url}
                      key={link.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <SocialIcon platform={link.platform} />
                    </a>
                  ))}
                </div>

                {artist.email ? (
                  <a
                    className="inline-flex text-[18px] font-medium text-white transition hover:text-white/72 sm:text-[20px]"
                    href={`mailto:${artist.email}`}
                  >
                    {artist.email}
                  </a>
                ) : null}
              </div>

              <div className="flex items-end justify-start lg:justify-end">
                <a
                  className="group inline-flex flex-col items-center gap-4 text-white transition hover:-translate-y-1"
                  href="#radovi"
                >
                  <div className="flex h-[146px] w-[146px] items-center justify-center rounded-full border border-white/18 bg-black/8">
                    <div className="flex h-[118px] w-[118px] items-center justify-center rounded-full border border-white/10">
                      <svg
                        aria-hidden="true"
                        className="h-14 w-14 transition duration-300 group-hover:translate-y-1"
                        fill="none"
                        viewBox="0 0 64 64"
                      >
                        <path
                          d="M32 12V49"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="4"
                        />
                        <path
                          d="M15 34L32 51L49 34"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="4"
                        />
                      </svg>
                    </div>
                  </div>
                  <span className="text-[16px] font-semibold uppercase tracking-[0.12em] text-white/92">
                    Vidi radove
                  </span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f8fbff] px-[5vw] py-20 sm:py-24">
          <div className="mx-auto w-full max-w-[1520px] space-y-16 sm:space-y-20">
            <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-12">
              <div className="pt-1 text-[18px] text-[#888f99]">Biografija</div>

              <div className="max-w-[980px] space-y-6 text-[26px] leading-[1.48] tracking-[-0.02em] text-[#3d4552] sm:text-[30px]">
                {artist.bio ? (
                  splitParagraphs(artist.bio).map((paragraph, index) => (
                    <p key={`${artist.id}-bio-${index}`}>
                      {index === 0 ? <strong className="font-bold text-[#2c3340]">{artist.name}</strong> : null}
                      {index === 0 ? ` ${paragraph.replace(artist.name, "").trimStart()}` : paragraph}
                    </p>
                  ))
                ) : (
                  <p>Biografija umjetnika uskoro ce biti dostupna.</p>
                )}
              </div>
            </div>

            <div id="radovi" className="space-y-5">
              {artist.artworks.length > 0 ? (
                <ArtistArtworkGallery artistName={artist.name} artworks={artist.artworks} />
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#d6deea] bg-white px-6 py-10 text-[16px] text-[#66707d]">
                  Umjetnik jos nema javno dostupne radove.
                </div>
              )}
            </div>
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

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "INSTAGRAM":
      return (
        <svg fill="none" viewBox="0 0 24 24" className="h-10 w-10">
          <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" />
        </svg>
      );
    case "BEHANCE":
      return (
        <svg fill="none" viewBox="0 0 24 24" className="h-10 w-10">
          <path
            d="M4 6.2H10.7C13.3 6.2 14.7 7.35 14.7 9.35C14.7 10.8 13.9 11.78 12.55 12.12C14.2 12.38 15.2 13.5 15.2 15.25C15.2 17.7 13.45 19 10.4 19H4V6.2ZM9.95 11.1C11.35 11.1 12.1 10.55 12.1 9.5C12.1 8.45 11.35 7.95 9.95 7.95H6.55V11.1H9.95ZM10.2 17.2C11.85 17.2 12.75 16.55 12.75 15.25C12.75 13.95 11.85 13.25 10.2 13.25H6.55V17.2H10.2Z"
            fill="currentColor"
          />
          <path d="M17.2 6.5H22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "LINKEDIN":
      return (
        <svg fill="none" viewBox="0 0 24 24" className="h-10 w-10">
          <path d="M7.2 9.2H4.2V19.2H7.2V9.2Z" fill="currentColor" />
          <path d="M5.7 7.8C6.65 7.8 7.45 7 7.45 6.05C7.45 5.1 6.65 4.3 5.7 4.3C4.75 4.3 3.95 5.1 3.95 6.05C3.95 7 4.75 7.8 5.7 7.8Z" fill="currentColor" />
          <path
            d="M10 9.2H12.9V10.55H12.95C13.35 9.8 14.35 9 15.9 9C19.1 9 19.7 11.05 19.7 13.7V19.2H16.7V14.35C16.7 13.2 16.7 11.75 15.15 11.75C13.55 11.75 13.3 13 13.3 14.25V19.2H10V9.2Z"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return (
        <svg fill="none" viewBox="0 0 24 24" className="h-10 w-10">
          <path
            d="M8.5 15.5L15.5 8.5M9.75 6H18V14.25M6 9.75V18H14.25"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
  }
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

function splitParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
