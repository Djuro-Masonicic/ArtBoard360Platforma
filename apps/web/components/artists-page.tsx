import { NavigationButton } from "@/components/navigation-button";
import type { Artist } from "@/types/api";

import { ArtistsBrowser } from "./artists-browser";
import { SiteCtaButton } from "./site-cta-button";

interface ArtistsPageProps {
  artists: Artist[];
  totalArtists: number;
}

/**
 * This page component keeps the public artists page structure easy to follow:
 * hero first, moving showcase second, searchable browser last.
 */
export function ArtistsPage({ artists, totalArtists }: ArtistsPageProps) {
  const featuredArtists = pickRandomArtists(artists, 3);

  return (
    <section className="artists-page-frame -mx-5 -mt-8 pb-20 sm:-mx-8 sm:-mt-10 lg:-mx-10 lg:-mt-12">
      <div className="px-5 pb-12 pt-[26vh] sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[980px] flex-col items-center text-center">
          <h1 className="max-w-[980px] text-[3.1rem] font-bold leading-[0.95] text-[#2f3138] sm:text-[3.9rem] lg:text-[4.35rem]">
            Upoznaj umjetnike
          </h1>
          <p className="max-w-[980px] text-[3.1rem] font-normal leading-[0.96] text-[#4b505a] sm:text-[3.9rem] lg:text-[4.35rem]">
            nase platforme<span className="text-[#dc1735]">.</span>
          </p>

          <p className="mt-8 max-w-[980px] text-[22px] font-medium leading-[1.2] text-[#333333] sm:text-[24px]">
            Oni stvaraju, a mi im pomazemo da budu videni. Upoznaj crnogorske umjetnike koji su
            nam ukazali povjerenje i otkrij njihove umjetnicke price predstavljene kroz ArtBoard
            profile.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-7">
            <SiteCtaButton href="/prijava" label="Prijavi se" />

            <NavigationButton className="hero-more-link" href="#artists-browser">
              <svg
                aria-hidden="true"
                className="hero-more-link__icon h-5 w-5 text-[#2440d8]"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10.2632 4.26844C11.5965 5.03824 11.5965 6.96274 10.2632 7.73254L3.83765 11.4423C2.50431 12.2121 0.837646 11.2499 0.837646 9.71027L0.837646 2.2907C0.837646 0.751101 2.50431 -0.211149 3.83765 0.558652L10.2632 4.26844Z"
                  fill="currentColor"
                />
              </svg>
              <span className="hero-more-link__label">Saznaj vise</span>
            </NavigationButton>
          </div>

          <div className="mt-14 flex items-center gap-4 rounded-full px-4 py-3">
            <div className="flex -space-x-3">
              {featuredArtists.map((artist, index) => {
                const avatarUrl =
                  artist.profileThumbnailUrl || artist.profileImageUrl || artist.thumbnailUrl;

                return (
                  <NavigationButton
                    className="group relative flex h-[66px] w-[66px] items-center justify-center overflow-visible rounded-full border-[3px] border-[#f8fbff] bg-[#d7d7d7] transition duration-300 hover:z-10 hover:scale-110"
                    href={`/artists/${artist.slug}`}
                    key={`${artist.id}-${index}`}
                  >
                    {avatarUrl ? (
                      <span className="block h-full w-full overflow-hidden rounded-full">
                        <img
                          alt={artist.name}
                          className="h-full w-full rounded-full object-cover"
                          src={avatarUrl}
                        />
                      </span>
                    ) : (
                      <span className="text-[24px] font-medium text-white">
                        {artist.name.slice(0, 1)}
                      </span>
                    )}

                    <span className="pointer-events-none absolute -top-11 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#20242d] px-3 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-[0_10px_22px_rgba(0,0,0,0.18)] transition duration-200 group-hover:-translate-y-1 group-hover:opacity-100">
                      {artist.name}
                    </span>
                  </NavigationButton>
                );
              })}
            </div>

            <div className="text-left">
              <div className="text-[36px] font-bold leading-none text-[#2f3138]">{totalArtists}</div>
              <div className="text-[18px] leading-[1.1] text-[#8b94a3] sm:text-[22px]">
                Aktivnih ArtBoard umjetnika
              </div>
            </div>
          </div>
        </div>
      </div>

      <ArtistsBrowser artists={artists} />
    </section>
  );
}

function pickRandomArtists(artists: Artist[], count: number) {
  const shuffled = [...artists];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentArtist = shuffled[index];
    const swapArtist = shuffled[swapIndex];

    if (!currentArtist || !swapArtist) {
      continue;
    }

    shuffled[index] = swapArtist;
    shuffled[swapIndex] = currentArtist;
  }

  return shuffled.slice(0, count);
}
