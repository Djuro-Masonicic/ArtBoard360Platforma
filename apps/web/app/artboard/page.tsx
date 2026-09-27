import Link from "next/link";

import { ArtBoardFaqSection } from "@/components/artboard-faq-section";
import { ArtBoardCommunitySection } from "@/components/artboard-community-section";
import { ArtBoardDisciplinesSection } from "@/components/artboard-disciplines-section";
import { ArtBoardJourneySection } from "@/components/artboard-journey-section";
import { ArtBoardOpportunitiesSection } from "@/components/artboard-opportunities-section";
import { ArtBoardPricingSection } from "@/components/artboard-pricing-section";
import { ArtBoardPlatformHero, type HeroArtworkPreview } from "@/components/artboard-platform-hero";
import { ArtBoardProofStrip } from "@/components/artboard-proof-strip";
import { ArtBoardPortfolioShowcase } from "@/components/artboard-portfolio-showcase";
import { ArtBoardToolsSection } from "@/components/artboard-tools-section";
import { ArtBoardTestimonialsSection } from "@/components/artboard-testimonials-section";
import { ArtBoardVerificationSection } from "@/components/artboard-verification-section";
import { ArtBoardWhySection, type WhyArtworkPreview } from "@/components/artboard-why-section";
import { siteRoutes } from "@/lib/site-routes";
import { getArtists } from "@/services/artists";
import { getArtBoardStats } from "@/services/stats";
import type { Artist } from "@/types/api";

// This page intentionally uses live API data and random artist previews.
// Forcing dynamic rendering prevents Next from freezing the same random artists
// and old stats into a cached/static page during production builds.
export const dynamic = "force-dynamic";

const artBoardFaqs = [
  {
    question: "Šta uključuje besplatna prijava na ArtBoard?",
    answer:
      "Besplatna prijava uključuje kreiranje profila, prisustvo u ArtBoard pretraživaču, uređivanje profila jednom mjesečno, prvi Portfolio Builder export, ograničen broj promotivnih materijala i pregled oglasne table.",
  },
  {
    question: "Ko može da se prijavi?",
    answer:
      "ArtBoard je namijenjen vizuelnim umjetnicima različitih disciplina i nivoa iskustva. Svaka prijava prolazi kroz pregled prije objavljivanja profila.",
  },
  {
    question: "Koliko često mogu da mijenjam profil?",
    answer:
      "Besplatni korisnici mogu da ažuriraju profil jednom mjesečno, dok Premium korisnici imaju mogućnost neograničenog uređivanja.",
  },
  {
    question: "Mogu li da koristim Portfolio Builder bez ArtBoard profila?",
    answer:
      "Da. Portfolio Builder možeš koristiti i bez objavljenog profila. Potreban ti je samo nalog kako bi sačuvao projekat i nastavio rad kasnije.",
  },
  {
    question: "Da li je Portfolio Builder besplatan?",
    answer:
      "Alat možeš isprobati besplatno, a prvi export je uključen. Nakon toga možeš kupiti pojedinačni export ili koristiti neograničene exporte kroz Premium članstvo.",
  },
  {
    question: "Kako funkcioniše fleksibilna Premium cijena?",
    answer:
      "Sam biraš iznos između 5€ i 50€. Bez obzira na izabrani iznos, dobijaš pristup istim Premium funkcionalnostima.",
  },
  {
    question: "Mogu li da promijenim ili otkažem Premium članstvo?",
    answer:
      "Da. Iznos članstva možeš promijeniti, a članstvo otkazati kroz svoj korisnički nalog.",
  },
  {
    question: "Ko može da objavi oglas?",
    answer:
      "Oglase mogu besplatno objavljivati kompanije, kulturne organizacije, galerije, institucije i drugi pojedinci ili timovi koji traže umjetnike i kreativne saradnike.",
  },
  {
    question: "Kako funkcioniše prijava na oglas jednim klikom?",
    answer:
      "Premium korisnici mogu izabrati podatke sa profila, CV i portfolio koje žele da pošalju, a ArtBoard od tih materijala automatski formira prijavu.",
  },
  {
    question: "Da li zadržavam prava na svoje radove?",
    answer:
      "Da. Umjetnik zadržava autorska prava nad svojim radovima. ArtBoard ih prikazuje i koristi samo u skladu sa dozvolama i uslovima koje korisnik prihvati.",
  },
  {
    question: "Kako mogu da dobijem podršku?",
    answer:
      "Za pitanja u vezi sa prijavom, profilom, alatima ili članstvom možeš nam pisati putem kontakt forme ili na artboardproject2025@gmail.com.",
  },
];

async function getArtBoardData() {
  const [artistResult, statsResult] = await Promise.allSettled([
    getArtists({ page: 1, pageSize: 100 }),
    getArtBoardStats(),
  ]);

  return {
    artistData: artistResult.status === "fulfilled" ? artistResult.value : null,
    stats: statsResult.status === "fulfilled" ? statsResult.value : null,
  };
}

function getDisciplines(artists: Artist[]) {
  return new Set(artists.flatMap((artist) => artist.disciplines.map((discipline) => discipline.name)));
}

function getRandomArtists(artists: Artist[], count: number) {
  // Marketing preview should feel alive, so we shuffle server-side on each render.
  // This does not change the real catalog order on /umjetnici.
  return [...artists].sort(() => Math.random() - 0.5).slice(0, count);
}

function getRandomHeroArtworks(artists: Artist[], count: number): HeroArtworkPreview[] {
  const seenUrls = new Set<string>();
  const artworks = artists.flatMap((artist) =>
    artist.artworks.flatMap((artwork) => {
      if (!artwork.imageUrl || seenUrls.has(artwork.imageUrl)) return [];

      seenUrls.add(artwork.imageUrl);

      return [{
        id: artwork.id,
        imageUrl: artwork.imageUrl,
      }];
    }),
  );

  for (let index = artworks.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentArtwork = artworks[index]!;
    artworks[index] = artworks[randomIndex]!;
    artworks[randomIndex] = currentArtwork;
  }

  return artworks.slice(0, count);
}

function getRandomWhyArtworks(artists: Artist[], count: number): WhyArtworkPreview[] {
  const seenUrls = new Set<string>();
  const artworks = artists.flatMap((artist) =>
    artist.artworks.flatMap((artwork) => {
      if (!artwork.imageUrl || seenUrls.has(artwork.imageUrl)) return [];

      seenUrls.add(artwork.imageUrl);

      return [{
        id: artwork.id,
        imageUrl: artwork.imageUrl,
        artistName: artist.name,
        artistSlug: artist.slug,
        altText: artwork.altText || artwork.title || `Rad umjetnika ${artist.name}`,
      }];
    }),
  );

  for (let index = artworks.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentArtwork = artworks[index]!;
    artworks[index] = artworks[randomIndex]!;
    artworks[randomIndex] = currentArtwork;
  }

  return artworks.slice(0, count);
}

function TemplateLandscape({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#cbefff] ${className}`}>
      <span className="absolute left-[28%] top-[18%] h-6 w-16 rounded-full bg-white" />
      <span className="absolute left-[36%] top-[9%] h-10 w-10 rounded-full bg-white" />
      <span className="absolute left-[47%] top-[20%] h-6 w-12 rounded-full bg-white" />
      <span className="absolute bottom-[18%] left-0 h-[28%] w-[120%] rounded-[50%] bg-[#c7e879]" />
      <span className="absolute bottom-[-10%] left-[-12%] h-[38%] w-[128%] rounded-[50%] bg-[#78a700]" />
    </div>
  );
}

function MiniBrandDots({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full bg-[#0875ff]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#ff151d]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#ffd31a]" />
    </span>
  );
}

function PortfolioTemplatePreview({
  variant,
}: {
  variant: "institutional" | "editorial" | "sales";
}) {
  if (variant === "institutional") {
    return (
      <div className="mx-auto flex aspect-[0.72/1] max-h-[255px] flex-col rounded-[14px] bg-white p-3 text-[#101827] shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
        <TemplateLandscape className="h-[50%] rounded-[7px]" />
        <div className="mt-2 flex items-center justify-between border-t border-[#101827] pt-2 text-[5px] font-bold uppercase">
          <span>Podgorica, 2026</span>
          <span>Portfolio</span>
        </div>
        <div className="mt-auto grid grid-cols-[1fr_34px] items-end gap-2">
          <div>
            <p className="text-[17px] font-black leading-[0.92]">
              IVONA
              <br />
              MEDENICA
            </p>
            <p className="mt-2 text-[5px] font-bold uppercase tracking-[0.32em]">
              Vizuelna umjetnica
            </p>
          </div>
          <div className="h-10 w-10 overflow-hidden rounded-full bg-[#e9eef5]">
            <TemplateLandscape className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "editorial") {
    return (
      <div className="mx-auto flex aspect-[0.72/1] max-h-[255px] flex-col rounded-[14px] bg-white p-4 text-[#101827] shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
        <div className="grid grid-cols-[1fr_54px] gap-3">
          <div>
            <p className="text-[17px] font-black leading-[0.92]">
              IVONA
              <br />
              MEDENICA
            </p>
            <p className="mt-2 text-[5px] uppercase tracking-[0.15em]">Vizuelna umjetnica</p>
            <p className="mt-4 inline-flex items-center gap-1 text-[5px] font-bold uppercase">
              <MiniBrandDots />
              <span>Portfolio, 2026</span>
            </p>
            <p className="hidden">
              <span className="text-[#0875ff]">●</span>
              <span className="text-[#ff151d]">●</span>
              <span className="text-[#ffd31a]">●</span> Portfolio, 2026
            </p>
          </div>
          <TemplateLandscape className="h-16 rounded-[7px]" />
        </div>
        <TemplateLandscape className="mt-5 flex-1 rounded-[8px]" />
      </div>
    );
  }

  return (
    <div className="mx-auto aspect-[0.72/1] max-h-[255px] rounded-[14px] bg-[linear-gradient(135deg,#0875ff,#7d35ff_28%,#ff151d_58%,#ff7a1f_76%,#ffd31a)] p-[5px] shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
      <div className="flex h-full flex-col bg-white p-4 text-[#101827]">
        <div className="grid grid-cols-[54px_1fr] gap-3">
          <TemplateLandscape className="h-14 w-14 rounded-full" />
          <div>
            <p className="text-[17px] font-black leading-[0.92]">
              IVONA
              <br />
              MEDENICA
            </p>
            <p className="mt-2 text-[5px] uppercase tracking-[0.12em]">Vizuelna umjetnica</p>
            <p className="mt-3 inline-flex items-center gap-1 text-[5px] font-bold uppercase">
              <MiniBrandDots />
              <span>Portfolio, 2026</span>
            </p>
            <p className="hidden">
              <span className="text-[#0875ff]">●</span>
              <span className="text-[#ff151d]">●</span>
              <span className="text-[#ffd31a]">●</span> Portfolio, 2026
            </p>
          </div>
        </div>
        <TemplateLandscape className="mt-5 flex-1 rounded-[4px]" />
      </div>
    </div>
  );
}

function PortfolioTemplatePreviewCard({
  variant,
}: {
  variant: "institutional" | "editorial" | "sales";
}) {
  if (variant === "institutional") {
    return (
      <div className="mx-auto flex aspect-[0.72/1] max-h-[270px] flex-col rounded-[14px] bg-white p-3 text-[#101827] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <TemplateLandscape className="h-[55%] rounded-[8px]" />
        <div className="mt-2 flex items-center justify-between border-t border-[#101827] pt-2 text-[5px] font-black uppercase">
          <span>Podgorica, 2026</span>
          <span>Portfolio</span>
        </div>
        <div className="mt-auto grid grid-cols-[1fr_38px] items-end gap-2">
          <div>
            <p className="text-[18px] font-black leading-[0.92] tracking-[-0.04em]">
              IVONA
              <br />
              MEDENICA
            </p>
            <p className="mt-2 text-[5px] font-bold uppercase tracking-[0.32em]">
              Vizuelna umjetnica
            </p>
          </div>
          <div className="h-10 w-10 overflow-hidden rounded-full bg-[#e9eef5]">
            <TemplateLandscape className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "editorial") {
    return (
      <div className="mx-auto flex aspect-[0.72/1] max-h-[270px] flex-col rounded-[14px] bg-white p-4 text-[#101827] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="grid grid-cols-[1fr_60px] gap-3">
          <div>
            <p className="text-[18px] font-black leading-[0.92] tracking-[-0.04em]">
              IVONA
              <br />
              MEDENICA
            </p>
            <p className="mt-2 text-[5px] uppercase tracking-[0.15em]">Vizuelna umjetnica</p>
            <p className="mt-4 inline-flex items-center gap-1 text-[5px] font-black uppercase">
              <MiniBrandDots />
              <span>Portfolio, 2026</span>
            </p>
          </div>
          <TemplateLandscape className="h-16 rounded-[8px]" />
        </div>
        <TemplateLandscape className="mt-5 flex-1 rounded-[8px]" />
      </div>
    );
  }

  return (
    <div className="mx-auto aspect-[0.72/1] max-h-[270px] rounded-[14px] bg-[linear-gradient(135deg,#0875ff,#7d35ff_28%,#ff151d_58%,#ff7a1f_76%,#ffd31a)] p-[5px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      <div className="flex h-full flex-col bg-white p-4 text-[#101827]">
        <div className="grid grid-cols-[56px_1fr] gap-3">
          <TemplateLandscape className="h-14 w-14 rounded-full" />
          <div>
            <p className="text-[18px] font-black leading-[0.92] tracking-[-0.04em]">
              IVONA
              <br />
              MEDENICA
            </p>
            <p className="mt-2 text-[5px] uppercase tracking-[0.12em]">Vizuelna umjetnica</p>
            <p className="mt-3 inline-flex items-center gap-1 text-[5px] font-black uppercase">
              <MiniBrandDots />
              <span>Portfolio, 2026</span>
            </p>
          </div>
        </div>
        <TemplateLandscape className="mt-5 flex-1 rounded-[4px]" />
      </div>
    </div>
  );
}

function ArtBoardSignalMapSection({
  items,
}: {
  items: { id: string; name: string; imageUrl: string }[];
}) {
  const [primaryImage, secondaryImage, tertiaryImage] = items;
  const workflow = [
    {
      label: "Profil",
      text: "Umjetnik dobija jasno mjesto za bio, kontakte, discipline i radove.",
      color: "#0875ff",
    },
    {
      label: "Portfolio",
      text: "Iz profila nastaje PDF ili link spreman za galerije, konkurse i saradnike.",
      color: "#ff151d",
    },
    {
      label: "Promocija",
      text: "Rad se lakse dijeli kroz pretragu, QR materijale i profesionalne prilike.",
      color: "#ffd31a",
    },
  ];
  const previewImages = [secondaryImage, tertiaryImage, primaryImage].filter(
    (item): item is { id: string; name: string; imageUrl: string } => Boolean(item),
  );

  return (
    <section className="relative z-10 mx-auto mt-12 max-w-[1240px] px-4 sm:px-6">
      <div className="artboard-signal-map relative overflow-hidden rounded-[46px] border border-[#dce6f4] bg-white p-5 shadow-[0_34px_120px_rgba(24,47,199,0.12)] sm:p-8 lg:p-10">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
          <div className="rounded-[34px] border border-[#dbe5f2] bg-white/78 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.34em] text-[#182fc7]">
                ArtBoard ekosistem
              </p>
              <h2 className="mt-4 max-w-[560px] text-[40px] font-bold leading-[0.95] tracking-[-0.055em] text-[#2f3138] sm:text-[58px]">
                Od jednog rada do profesionalnog nastupa.
              </h2>
              <p className="mt-5 text-[16px] leading-[1.72] text-[#536072]">
                ArtBoard nije samo katalog. To je tok kroz koji rad dobija kontekst:
                profil, portfolio, promociju, prilike i jasniji put do publike.
              </p>
            </div>

            <div className="mt-8 grid gap-3">
              {workflow.map((step, index) => (
                <div
                  className="grid grid-cols-[42px_1fr] gap-4 rounded-[24px] border border-[#e0e8f4] bg-[#f8fbff] p-4"
                  key={step.label}
                >
                  <span
                    className="grid h-10 w-10 place-items-center rounded-full text-[15px] font-black text-white shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
                    style={{ backgroundColor: step.color }}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[15px] font-bold text-[#252933]">{step.label}</p>
                    <p className="mt-1 text-[14px] leading-[1.5] text-[#667285]">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-[48px] items-center rounded-full border border-[#dc1735] bg-[#dc1735] px-5 text-[15px] font-bold text-white transition hover:bg-white hover:text-[#dc1735]"
                href={siteRoutes.portfolioBuilder}
              >
                Pokreni Portfolio Builder
              </Link>
              <Link
                className="inline-flex min-h-[48px] items-center rounded-full border border-[#cfd9e8] bg-white px-5 text-[15px] font-bold text-[#252933] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                href={siteRoutes.opportunities}
              >
                Pogledaj prilike
              </Link>
            </div>
          </div>

          <div className="relative min-h-[520px]">
            <div className="artboard-signal-orbit absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#dfe8f4]" />
            <div className="artboard-signal-orbit artboard-signal-orbit-slow absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e7edf6]" />

            <div className="artboard-signal-sheet relative z-10 mx-auto max-w-[540px] rounded-[34px] border border-[#d8e3f1] bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.16)]">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8793a7]">
                    Portfolio dokument
                  </p>
                  <h3 className="mt-2 text-[30px] font-bold leading-[0.95] tracking-[-0.04em] text-[#252933]">
                    Rad dobija formu koju mozes poslati dalje.
                  </h3>
                </div>
                <div className="shrink-0 overflow-hidden rounded-full border-4 border-white bg-[#eef4fb] shadow-[0_18px_38px_rgba(15,23,42,0.14)]">
                  {secondaryImage ? (
                    <img
                      alt=""
                      className="h-[84px] w-[84px] object-cover"
                      src={secondaryImage.imageUrl}
                    />
                  ) : (
                    <TemplateLandscape className="h-[84px] w-[84px]" />
                  )}
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[28px] border border-[#e3eaf4] bg-[#eef4fb]">
                {primaryImage ? (
                  <img
                    alt=""
                    className="aspect-[1.45/1] w-full object-cover"
                    src={primaryImage.imageUrl}
                  />
                ) : (
                  <TemplateLandscape className="aspect-[1.45/1] w-full" />
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {previewImages.length > 0
                  ? previewImages.map((item, index) => (
                      <img
                        alt=""
                        className="aspect-[1.1/1] rounded-[18px] border border-[#e1e8f2] object-cover"
                        key={`${item.id}-${index}`}
                        src={item.imageUrl}
                      />
                    ))
                  : [0, 1, 2].map((index) => (
                      <TemplateLandscape
                        className="aspect-[1.1/1] rounded-[18px] border border-[#e1e8f2]"
                        key={index}
                      />
                    ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#e2e9f3] pt-4">
                <span className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#8793a7]">
                  ArtBoard profil
                </span>
                <span className="flex gap-1">
                  <i className="h-2.5 w-2.5 rounded-full bg-[#182fc7]" />
                  <i className="h-2.5 w-2.5 rounded-full bg-[#dc1735]" />
                  <i className="h-2.5 w-2.5 rounded-full bg-[#ffc41d]" />
                </span>
              </div>
            </div>

            <div className="artboard-signal-chip absolute left-0 top-[12%] z-20 max-w-[170px] rounded-[22px] border border-[#dbe5f2] bg-white/92 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur">
              <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#dc1735]">
                Pretraga
              </p>
              <p className="mt-1 text-[14px] leading-[1.35] text-[#4f5c6f]">
                Publika lakse pronalazi umjetnike i discipline.
              </p>
            </div>

            <div className="artboard-signal-chip artboard-signal-chip-delay absolute right-0 top-[18%] z-20 max-w-[178px] rounded-[22px] border border-[#dbe5f2] bg-white/92 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur">
              <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#182fc7]">
                PDF alati
              </p>
              <p className="mt-1 text-[14px] leading-[1.35] text-[#4f5c6f]">
                Portfolio se pretvara u profesionalan dokument.
              </p>
            </div>

            <div className="artboard-signal-chip artboard-signal-chip-late absolute bottom-[6%] left-[10%] z-20 max-w-[190px] rounded-[22px] border border-[#dbe5f2] bg-white/92 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur">
              <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#b28700]">
                Prilike
              </p>
              <p className="mt-1 text-[14px] leading-[1.35] text-[#4f5c6f]">
                Oglasi, saradnje i pozivi se vezuju za rad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function ArtBoardPage() {
  const artBoardData = await getArtBoardData();
  const artistData = artBoardData?.artistData ?? null;
  const stats = artBoardData?.stats ?? null;
  const artists = artistData?.items ?? [];
  const disciplines = getDisciplines(artists);
  const artworkCount = artists.reduce(
    (total, artist) => total + (artist.counts?.artworks ?? artist.artworks.length),
    0,
  );

  // Artist count is intentionally taken from the same endpoint as the public
  // catalog first, so the homepage number stays aligned with /umjetnici.
  const artistCount = stats?.artists ?? artistData?.meta.total;
  const resolvedArtworkCount = stats?.artworks ?? (artworkCount > 0 ? artworkCount : null);
  // const resolvedDisciplineCount = stats?.disciplines ?? (disciplines.size > 0 ? disciplines.size : null);
  const resolvedDisciplineCount = 25;
  const proofItems = [
    { label: "Objavljenih umjetnika", value: artistCount ?? null, suffix: "+", tone: "blue" as const },
    {
      label: "Objavljenih radova",
      value: resolvedArtworkCount,
      suffix: "+",
      tone: "pink" as const,
    },
    {
      label: "Umjetničkih disciplina",
      value: resolvedDisciplineCount,
      suffix: "",
      tone: "red" as const,
    },
  ];
  const communityArtists = getRandomArtists(artists, artists.length).flatMap((artist) => {
    const seenArtworkUrls = new Set<string>();
    const artworks = [...artist.artworks.filter((item) => item.isFeatured), ...artist.artworks]
      .filter((item) => {
        if (!item.imageUrl || seenArtworkUrls.has(item.imageUrl)) return false;
        seenArtworkUrls.add(item.imageUrl);
        return true;
      })
      .slice(0, 6)
      .map((item) => ({
        url: item.imageUrl,
        alt: item.altText || item.title || `Rad umjetnika ${artist.name}`,
      }));

    if (artworks.length === 0) return [];

    return [{
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      artworks,
      avatarUrl: artist.profileThumbnailUrl || artist.profileImageUrl || null,
      disciplines: artist.disciplines.map((discipline) => discipline.name),
    }];
  }).sort((left, right) => Number(right.artworks.length > 1) - Number(left.artworks.length > 1));
  const heroArtworks = getRandomHeroArtworks(artists, 8);
  // Keep the stats rail independent so its loop always has enough artwork variety.
  const proofArtworks = getRandomHeroArtworks(artists, 12);
  const whyArtworks = getRandomWhyArtworks(artists, 9);
  const verificationArtworks = getRandomHeroArtworks(artists, 18);

  return (
    <main className="artboard-platform-page relative isolate -mx-5 -mt-8 overflow-x-clip pb-0 pt-[73px] text-[#252933] sm:-mx-8 sm:-mt-10 lg:-mx-10 lg:-mt-12 xl:pt-[77px]">
      <div
        className="artboard-platform-gradient-bg pointer-events-none absolute inset-0 -z-10 opacity-95"
      />
      <div className="pointer-events-none absolute left-[-18vw] top-[420px] -z-10 h-[56vw] w-[56vw] rounded-full border border-[#dce5f1]" />
      <div className="pointer-events-none absolute right-[-16vw] top-[860px] -z-10 h-[42vw] w-[42vw] rounded-full border border-[#dce5f1]" />
      <div className="artboard-hero-proof-stage">
        <ArtBoardPlatformHero artworks={heroArtworks} />
        <ArtBoardProofStrip artworks={proofArtworks} metrics={proofItems} />
      </div>

      <ArtBoardWhySection artworks={whyArtworks} />

      <ArtBoardToolsSection />

      <ArtBoardPortfolioShowcase />

      <ArtBoardCommunitySection artists={communityArtists} />

      <ArtBoardJourneySection />

      <ArtBoardVerificationSection artworks={verificationArtworks} />

      <ArtBoardTestimonialsSection />

      <ArtBoardOpportunitiesSection />

      <ArtBoardPricingSection />

      <ArtBoardDisciplinesSection />

      <div className="artboard-disciplines-to-faq" aria-hidden="true" />

      <ArtBoardFaqSection items={artBoardFaqs} />

      <div className="relative z-[1] h-20 bg-white" aria-hidden="true" />

    </main>
  );
}
