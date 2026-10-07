"use client";

import { useEffect, useMemo, useState } from "react";

import { ArtBoardTransitionLink } from "@/components/artboard-transition-link";
import { siteRoutes } from "@/lib/site-routes";
import type { Artist } from "@/types/api";

type ShowcaseArtist = {
  avatarUrl: string | null;
  disciplines: string[];
  id: string;
  imageUrls: string[];
  name: string;
  slug: string;
};

const fallbackArtists: ShowcaseArtist[] = [
  createFallbackArtist("jelena-markovic", "Jelena Marković", "Slikarstvo · Fotografija", [
    "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68cd97ded342a415469018a2_Posteri%20bijela%20pozadina.jpg",
  ]),
  createFallbackArtist("marko-petrovic", "Marko Petrović", "Ilustracija · Grafika", [
    "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68cd96e6de09f2258b4b2e86_compressed_New%20Cover.jpg",
  ]),
  createFallbackArtist("ana-vujovic", "Ana Vujović", "Skulptura · Instalacija", [
    "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/687cc9e8daebd9a75c7256a0_img--services-hero-01.webp",
  ]),
  createFallbackArtist("nikola-djuric", "Nikola Đurić", "Fotografija · Video", [
    "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68cd99d9de2f761450019f76_compressed_8325870%20copy.jpg",
  ]),
  createFallbackArtist("sara-radulovic", "Sara Radulović", "Slikarstvo · Kolaž", [
    "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68cd96e6bd78268dd268e150_compressed_3aa42524-604f-41a4-8ca7-74aa5aa20dd3%20copy.jpg",
  ]),
  createFallbackArtist("luka-kovacevic", "Luka Kovačević", "Grafički dizajn · Print", [
    "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/687cc9e86da8dd5b2a7c9446_img--services-hero-05.webp",
  ]),
  createFallbackArtist("milica-perovic", "Milica Perović", "Keramika · Skulptura", [
    "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68cd97dde8f1a160138d7f0f_Magazin.jpg",
  ]),
  createFallbackArtist("filip-nikolic", "Filip Nikolić", "Digitalna umjetnost · 3D", [
    "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68cd96e6fd4c2925933f075d_poster14.jpg",
  ]),
  createFallbackArtist("teodora-popovic", "Teodora Popović", "Fotografija · Film", [
    "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/687cc9e841cc245f5ce1aaee_img--services-hero-03.webp",
  ]),
  createFallbackArtist("vuk-jovanovic", "Vuk Jovanović", "Dizajn · Ilustracija", [
    "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68cd97dd70c726c01e92fa49_Majica%202.jpg",
  ]),
];

export function HomeArtistsCommunitySection({ artists }: { artists: Artist[] }) {
  const desktopArtists = useMemo(() => getShowcaseArtists(artists, 10), [artists]);
  const initialMobileArtists = useMemo(() => getShowcaseArtists(artists, 8), [artists]);
  const [mobileArtists, setMobileArtists] = useState(initialMobileArtists);

  useEffect(() => {
    const shuffledArtists = [...artists];

    for (let index = shuffledArtists.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const currentArtist = shuffledArtists[index];
      const randomArtist = shuffledArtists[randomIndex];

      if (!currentArtist || !randomArtist) {
        continue;
      }

      shuffledArtists[index] = randomArtist;
      shuffledArtists[randomIndex] = currentArtist;
    }

    setMobileArtists(getShowcaseArtists(shuffledArtists, 8));
  }, [artists]);

  return (
    <section className="home-artists-community" id="zajednica">
      <div className="home-artists-community__surface">
        <div className="home-artists-community__inner">
          <header className="home-artists-community__heading">
            <p>
              <span aria-hidden="true" />
              ArtBoard umjetnici
            </p>
            <h2>
              Upoznaj <span>umjetnike</span>
              <br />
              ArtBoard platforme.
            </h2>
          </header>

          <div className="home-artists-community__grid home-artists-community__grid--desktop">
            {desktopArtists.map((artist) => (
              <CommunityArtistCard artist={artist} key={artist.id} />
            ))}
          </div>

          <div className="home-artists-community__grid home-artists-community__grid--mobile">
            {mobileArtists.map((artist) => (
              <CommunityArtistCard artist={artist} key={artist.id} />
            ))}
          </div>

          <div className="home-artists-community__actions">
            <ArtBoardTransitionLink
              className="home-artists-community__button home-artists-community__button--secondary"
              href={siteRoutes.artists}
            >
              Istraži umjetnike <span aria-hidden="true">↗</span>
            </ArtBoardTransitionLink>
            <ArtBoardTransitionLink
              className="home-artists-community__button home-artists-community__button--primary"
              href={siteRoutes.artistApplication}
            >
              Postani dio ArtBoard zajednice <span aria-hidden="true">↗</span>
            </ArtBoardTransitionLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommunityArtistCard({ artist }: { artist: ShowcaseArtist }) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!isHovered || artist.imageUrls.length < 2) {
      setActiveImageIndex(0);
      return;
    }

    const startTimeout = window.setTimeout(() => {
      setActiveImageIndex(1 % artist.imageUrls.length);
    }, 500);
    const interval = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % artist.imageUrls.length);
    }, 2100);

    return () => {
      window.clearTimeout(startTimeout);
      window.clearInterval(interval);
    };
  }, [artist.imageUrls.length, isHovered]);

  return (
    <ArtBoardTransitionLink
      className="home-community-artist-card"
      href={
        artist.id.startsWith("fallback-")
          ? siteRoutes.artists
          : `${siteRoutes.artistProfileBase}/${artist.slug}`
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="home-community-artist-card__artwork">
        {artist.imageUrls.map((imageUrl, index) => (
          <img
            alt={index === 0 ? `Rad umjetnika ${artist.name}` : ""}
            aria-hidden={index === 0 ? undefined : "true"}
            className={index === activeImageIndex ? "is-active" : ""}
            key={`${artist.id}-${imageUrl}`}
            src={imageUrl}
          />
        ))}
      </span>

      <span className="home-community-artist-card__details">
        <span className="home-community-artist-card__identity">
          <span>
            <strong>{artist.name}</strong>
          </span>
          <span className="home-community-artist-card__avatar" aria-hidden="true">
            {artist.avatarUrl ? <img alt="" src={artist.avatarUrl} /> : artist.name.charAt(0)}
          </span>
        </span>
        <span className="home-community-artist-card__line" aria-hidden="true" />
        <span className="home-community-artist-card__disciplines">
          {artist.disciplines.join(" · ") || "Umjetnost"}
        </span>
      </span>
    </ArtBoardTransitionLink>
  );
}

function getShowcaseArtists(artists: Artist[], limit: number) {
  const mappedArtists = artists
    .map(mapArtist)
    .filter((artist) => artist.imageUrls.length > 0)
    .slice(0, limit);

  if (mappedArtists.length >= limit) {
    return mappedArtists;
  }

  const missingCount = limit - mappedArtists.length;
  return [...mappedArtists, ...fallbackArtists.slice(0, missingCount)];
}

function mapArtist(artist: Artist): ShowcaseArtist {
  const featuredImages = artist.artworks
    .filter((artwork) => artwork.isFeatured)
    .map((artwork) => artwork.imageUrl);
  const otherImages = artist.artworks.map((artwork) => artwork.imageUrl);
  const imageUrls = Array.from(
    new Set(
      [
        ...featuredImages,
        ...otherImages,
        artist.coverImageUrl,
        artist.thumbnailUrl,
        artist.profileImageUrl,
      ].filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
    ),
  );

  return {
    avatarUrl: artist.profileThumbnailUrl ?? artist.profileImageUrl ?? artist.thumbnailUrl ?? null,
    disciplines: artist.disciplines.slice(0, 2).map((discipline) => discipline.name),
    id: artist.id,
    imageUrls,
    name: artist.name,
    slug: artist.slug,
  };
}

function createFallbackArtist(
  slug: string,
  name: string,
  discipline: string,
  imageUrls: string[],
): ShowcaseArtist {
  return {
    avatarUrl: imageUrls[0] ?? null,
    disciplines: discipline.split(" · "),
    id: `fallback-${slug}`,
    imageUrls,
    name,
    slug,
  };
}
