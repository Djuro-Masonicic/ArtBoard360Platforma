import { ArtStudioContactCtaSection } from "@/components/art-studio-contact-cta-section";
import { ArtStudioTeamSection } from "@/components/art-studio-team-section";
import { ArtStudioToolsSection } from "@/components/art-studio-tools-section";
import { ArtStudioWorkAreasSection } from "@/components/art-studio-work-areas-section";
import { HomeArtboardArtistsSection } from "@/components/home-artboard-artists-section";
import { HomeCosmosSection } from "@/components/home-cosmos-section";
import { HomeJoinSection } from "@/components/home-join-section";
import { NavigationButton } from "@/components/navigation-button";
import { SiteCtaButton } from "@/components/site-cta-button";
import { siteRoutes } from "@/lib/site-routes";
import { getArtists } from "@/services/artists";

/**
 * Art Studio 360 homepage.
 *
 * The site now has two connected units:
 * - Art Studio 360: creative studio, services and project development.
 * - ArtBoard: platform/product for artists, portfolios and opportunities.
 *
 * This page introduces the studio first, then explains how ArtBoard fits into
 * the broader ecosystem without turning the studio homepage into the full
 * ArtBoard product page.
 */
export async function HomePage() {
  const artists = await getHomepageArtists();

  return (
    <>
      <section className="home-page-frame relative min-h-screen -mx-5 -mt-8 sm:-mx-8 sm:-mt-10 lg:-mx-10 lg:-mt-12">
        <div aria-hidden="true" className="home-hero-background" />

        <div className="relative z-10 flex min-h-screen items-center px-5 pb-20 pt-[22vh] sm:px-8 lg:px-10">
          <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-[760px]">
              <p className="text-[13px] font-bold uppercase tracking-[0.3em] text-[#8a94a5]">Art Studio 360</p>
              <h1 className="mt-5 text-[3.1rem] font-bold leading-[0.95] tracking-[-0.055em] text-[#2f3138] sm:text-[4.4rem] lg:text-[3.4rem]">
                Kreativni studio za dizajn, umjetničke projekte i razvoj kreativne industrije<span className="text-[#dc1735]">.</span>
              </h1>

              <p className="mt-8 max-w-[720px] text-[22px] font-medium leading-[1.28] text-[#333333] sm:text-[25px]">
                Art Studio 360 razvija vizuelne identitete, kreativne kampanje, kulturne projekte i digitalne proizvode.
                Jedan od ključnih proizvoda studija je ArtBoard platforma za umjetnike.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <SiteCtaButton href={siteRoutes.services} label="Pogledajte usluge" />

                <NavigationButton className="hero-more-link" href={siteRoutes.artboard}>
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
                  <span className="hero-more-link__label">Istražite ArtBoard</span>
                </NavigationButton>
              </div>
            </div>

            <div className="relative hidden min-h-[520px] lg:block">
              <div className="absolute right-0 top-8 h-[420px] w-[420px] rounded-full bg-[#ffc41d]" />
              <div className="absolute right-[18%] top-[18%] h-[220px] w-[220px] rounded-full bg-[#182fc7]" />
              <div className="absolute bottom-10 right-[10%] h-[160px] w-[160px] rounded-full bg-[#dc1735]" />
              <div className="absolute right-8 top-20 rounded-[40px] border border-white/70 bg-white/75 p-8 shadow-[0_24px_80px_rgba(37,51,73,0.14)] backdrop-blur">
                <p className="text-[13px] font-bold uppercase tracking-[0.28em] text-[#8a94a5]">Studio</p>
                <p className="mt-4 max-w-[360px] text-[2.1rem] font-bold leading-[1.02] tracking-[-0.045em] text-[#2f3138]">
                  Dizajn, kultura i digitalni alati u jednoj kreativnoj strukturi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeCosmosSection />
      <ArtStudioWorkAreasSection />
      <HomeArtboardArtistsSection artists={artists} />
      <ArtStudioToolsSection />
      <ArtStudioTeamSection />
      <HomeJoinSection />
      <ArtStudioContactCtaSection />
    </>
  );
}

async function getHomepageArtists() {
  try {
    const artistsResponse = await getArtists({ includeNsfw: true, page: 1, pageSize: 30 });
    return artistsResponse.items;
  } catch (error) {
    console.error("Homepage artists could not be loaded.", error);
    return [];
  }
}
