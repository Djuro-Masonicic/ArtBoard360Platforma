import { HomeAboutSection } from "@/components/home-about-section";
import { HomeArtboardArtistsSection } from "@/components/home-artboard-artists-section";
import { HomeBenefitsSection } from "@/components/home-benefits-section";
import { HomeCosmosSection } from "@/components/home-cosmos-section";
import { HomeFaqSection } from "@/components/home-faq-section";
import { HomeFinalCtaSection } from "@/components/home-final-cta-section";
import { HomeJoinSection } from "@/components/home-join-section";
import { NavigationButton } from "@/components/navigation-button";
import { SiteCtaButton } from "@/components/site-cta-button";
import { getArtists } from "@/services/artists";
import { getFaqs } from "@/services/faqs";

/**
 * Homepage hero and first media block.
 * We are building this page section-by-section so the structure stays easy to
 * adjust against the supplied design references.
 */
export async function HomePage() {
  const [artists, faqs] = await Promise.all([getHomepageArtists(), getHomepageFaqs()]);

  return (
    <>
      <section className="home-page-frame relative min-h-screen -mx-5 -mt-8 sm:-mx-8 sm:-mt-10 lg:-mx-10 lg:-mt-12">
        <div aria-hidden="true" className="home-hero-background" />

        <div className="relative z-10 min-h-screen px-5 pb-16 pt-[27vh] sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[880px] flex-col items-center text-center">
          <h1 className="max-w-[980px] text-[3.25rem] font-bold leading-[0.95] text-[#2f3138] sm:text-[3.25rem] lg:text-[3.25rem]">
            Digitalni dom
          </h1>
          <p className="max-w-[980px] text-[3.25rem] font-normal leading-[0.98] text-[#4b505a] sm:text-[3.25rem] lg:text-[3.25rem]">
            crnogorske umjetnosti<span className="text-[#dc1735]">.</span>
          </p>

          <p className="mt-8 max-w-[1180px] text-[24px] font-medium leading-[1.18] text-[#333333]">
            Dobro dosli na prvu crnogorsku platformu posvecenu umjetnicima.
            <br className="hidden sm:block" />
            Ovo je prostor za promociju, inspiraciju i zajednicki rast lokalne umjetnicke scene.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-7">
            <SiteCtaButton href="/prijava" label="Postani dio ArtBoarda" />

            <NavigationButton className="hero-more-link" href="#home-cosmos">
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
          </div>

          <div className="mx-auto mt-20 max-w-[1072px] overflow-hidden rounded-[18px] border border-black/10 bg-black shadow-[0_24px_70px_rgba(26,35,56,0.14)]">
            <div className="relative aspect-[1072/552]">
            <video
              autoPlay
              className="h-full w-full object-cover"
              loop
              muted
              playsInline
              preload="auto"
              src="https://s3.amazonaws.com/webflow-prod-assets/681b5dac4415aa941af374fe/68bf091edbeee75ce6022c5c_Loop%20Web%20Final.mp4"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/16 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 px-7 py-6 sm:px-10 sm:py-8">
              <div className="text-white">
                <p className="text-[24px] font-bold leading-none sm:text-[26px]">Upoznaj ArtStudio360</p>
                <p className="mt-2 text-[16px] font-medium leading-none text-white/92 sm:text-[18px]">
                  Klikni na video i otkrij nasu pricu
                </p>
              </div>

              <button aria-label="Play video" className="hero-video-play" type="button">
                <span className="hero-video-play__ring" />
                <span className="hero-video-play__fill" />
                <svg
                  aria-hidden="true"
                  className="hero-video-play__icon"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10.2632 4.26844C11.5965 5.03824 11.5965 6.96274 10.2632 7.73254L3.83765 11.4423C2.50431 12.2121 0.837646 11.2499 0.837646 9.71027L0.837646 2.2907C0.837646 0.751101 2.50431 -0.211149 3.83765 0.558652L10.2632 4.26844Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
            </div>
          </div>
        </div>
      </section>

      <HomeCosmosSection />
      <HomeArtboardArtistsSection artists={artists} />
      <HomeAboutSection />
      <HomeBenefitsSection />
      <HomeJoinSection />
      <HomeFaqSection faqs={faqs} />
      <HomeFinalCtaSection />
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

async function getHomepageFaqs() {
  try {
    const faqsResponse = await getFaqs({ page: 1, pageSize: 20 });
    return faqsResponse.items;
  } catch (error) {
    console.error("Homepage FAQs could not be loaded.", error);
    return [];
  }
}
