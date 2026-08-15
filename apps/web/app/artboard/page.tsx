import Link from "next/link";

import { ArtBoardFaqSection } from "@/components/artboard-faq-section";
import { ArtBoardTemplateCarousel } from "@/components/artboard-template-carousel";
import { ArtistCard } from "@/components/artist-card";
import { SiteCtaButton } from "@/components/site-cta-button";
import { siteRoutes } from "@/lib/site-routes";
import { getArtists } from "@/services/artists";
import { getArtBoardStats } from "@/services/stats";
import type { Artist } from "@/types/api";

// This page intentionally uses live API data and random artist previews.
// Forcing dynamic rendering prevents Next from freezing the same random artists
// and old stats into a cached/static page during production builds.
export const dynamic = "force-dynamic";

const benefits = [
  {
    title: "Besplatna prijava",
    text: "Umjetnik može početi bez troška, poslati prijavu i dobiti osnovni javni profil nakon odobrenja.",
    color: "#dc1735",
  },
  {
    title: "Profesionalna digitalna prezentacija",
    text: "Profil, radovi, biografija, discipline i kontakt su organizovani kao ozbiljna digitalna vizit karta.",
    color: "#182fc7",
  },
  {
    title: "Praktični alati za razvoj karijere",
    text: "Portfolio Builder, promo materijali i upravljanje sadržajem pomažu umjetniku da brže pripremi nastup.",
    color: "#ffc41d",
  },
  {
    title: "Zajednica i profesionalne prilike",
    text: "ArtBoard povezuje umjetnike sa publikom, saradnicima, institucijama i oglasima za profesionalni razvoj.",
    color: "#2f3138",
  },
];

const tools = [
  {
    title: "Pretraživač umjetnika",
    text: "Javni katalog sa profilima, disciplinama, radovima i direktnim linkovima ka umjetnicima.",
    href: siteRoutes.artists,
    color: "#182fc7",
  },
  {
    title: "Umjetnički profil",
    text: "Umjetnik sam uređuje bio, moto, radove, linkove, cover i profilnu fotografiju.",
    href: siteRoutes.registration,
    color: "#dc1735",
  },
  {
    title: "Portfolio Builder",
    text: "Vođeni alat za profesionalni PDF portfolio iz profila ili potpuno od nule.",
    href: `${siteRoutes.artboard}#portfolio-builder`,
    color: "#ffc41d",
  },
  {
    title: "Generator promotivnih materijala",
    text: "Priprema za QR vizitku, digitalne linkove i buduće formate za društvene mreže.",
    href: siteRoutes.account,
    color: "#182fc7",
  },
  {
    title: "Premium članstvo i paketi",
    text: "Naprednije opcije za umjetnike kojima treba više vidljivosti, exporta i profesionalnih alata.",
    href: `${siteRoutes.artboard}#paketi`,
    color: "#dc1735",
  },
  {
    title: "Oglasi i profesionalne prilike",
    text: "Mjesto za open calls, konkurse, rezidencije, saradnje, angažmane i druge prilike.",
    href: siteRoutes.opportunities,
    color: "#ffc41d",
  },
];

const portfolioSteps = [
  "Odaberi da li krećeš iz ArtBoard profila ili od nule.",
  "Unesi podatke, bio, statement, kontakt i CV.",
  "Izaberi radove, redosljed i template.",
  "Pregledaj PDF preview i preuzmi čistu verziju nakon plaćanja ili kroz Premium.",
];

const portfolioTemplates: {
  title: string;
  text: string;
  eyebrow: string;
  imageSrc: string;
  variant: "institutional" | "editorial" | "sales";
}[] = [
  {
    title: "Institutional Minimal",
    text: "Mirno, galerijski i cisto. Fokus je na radu, biografiji i jasnom kontaktu.",
    eyebrow: "Template 01",
    imageSrc: "/portfolio-templates/template-basic.png",
    variant: "institutional",
  },
  {
    title: "ArtBoard Editorial",
    text: "Dinamicniji katalog sa vecim vizuelnim ritmom i ArtBoard potpisom.",
    eyebrow: "Template 02",
    imageSrc: "/portfolio-templates/builder-template-selection.png",
    variant: "editorial",
  },
  {
    title: "Sales / Pro",
    text: "Prodajni portfolio za cijene, dostupnost, kolekcije i direktan kontakt.",
    eyebrow: "Template 03",
    imageSrc: "/portfolio-templates/builder-editor.png",
    variant: "sales",
  },
];

const platformSteps = [
  "Kreiraj nalog.",
  "Popuni profil i dodaj radove.",
  "Kreiraj profesionalni portfolio.",
  "Izaberi besplatni ili premium paket.",
  "Podijeli rad putem portfolija, promo materijala i ArtBoard pretraživača.",
];

const packageCards = [
  {
    title: "Basic profil",
    label: "Besplatno",
    text: "Javni profil, osnovni podaci, portfolio radovi i prisustvo u katalogu umjetnika.",
    href: siteRoutes.registration,
  },
  {
    title: "Premium članstvo",
    label: "Napredni paket",
    text: "Čisti PDF export, dodatni alati, bolja priprema materijala i buduće premium funkcije.",
    href: siteRoutes.subscription,
  },
  {
    title: "Jednokratni portfolio",
    label: "Po potrebi",
    text: "Kreiraj i plati jedan profesionalni PDF portfolio bez prelaska na premium članstvo.",
    href: siteRoutes.portfolioBuilder,
  },
];

const opportunityTypes = [
  "poslovi",
  "konkursi",
  "otvoreni pozivi",
  "rezidencije",
  "saradnje",
  "profesionalne prilike",
];

const artBoardFaqs = [
  {
    question: "Da li je registracija na ArtBoard besplatna?",
    answer:
      "Da. Osnovna prijava i Basic profil su besplatni. Premium opcije se biraju samo ako umjetniku trebaju dodatni alati i exporti.",
  },
  {
    question: "Kako se kreira i uređuje profil?",
    answer:
      "Umjetnik prvo šalje prijavu. Nakon odobrenja dobija nalog preko kojeg može uređivati biografiju, moto, kontakt, društvene mreže, profilnu sliku i radove.",
  },
  {
    question: "Koliko radova mogu objaviti?",
    answer:
      "Profil može sadržati više radova, a za Portfolio Builder se bira do 30 radova koji ulaze u profesionalni PDF ili draft link.",
  },
  {
    question: "Koja je razlika između Basic i Premium paketa?",
    answer:
      "Basic pokriva osnovni javni profil. Premium otključava naprednije opcije kao što su čisti PDF export, dodatni alati i bolja priprema profesionalnih materijala.",
  },
  {
    question: "Šta dobijam kroz Portfolio Builder?",
    answer:
      "Dobijaš vođeni alat za unos podataka, izbor radova, redosljed, template i PDF preview, uz mogućnost exporta kada je portfolio plaćen ili uključen u paket.",
  },
  {
    question: "Da li mogu kupiti samo jedan portfolio bez Premium paketa?",
    answer:
      "Da. Portfolio Builder podržava jednokratnu kupovinu čistog PDF-a, dok Premium članovi imaju export uključen u paket.",
  },
  {
    question: "Šta su promo materijali?",
    answer:
      "To su pripremljeni digitalni materijali poput QR vizitke, linkova i budućih formata za društvene mreže koji pomažu umjetniku da lakše dijeli svoj rad.",
  },
  {
    question: "Kako funkcionišu oglasi?",
    answer:
      "Oglasi su javni za pregled, a prijavljeni umjetnici mogu lakše povezati prilike sa svojim profilom i portfolijem.",
  },
  {
    question: "Kako dobijam podršku ako zapnem?",
    answer:
      "Za pitanja oko prijave, profila, Portfolio Buildera, plaćanja ili oglasa korisnik može kontaktirati ArtBoard podršku kroz kontakt stranicu.",
  },
];

async function getArtBoardData() {
  try {
    const [artistData, stats] = await Promise.all([
      getArtists({ page: 1, pageSize: 100 }),
      getArtBoardStats(),
    ]);

    return {
      artistData,
      stats,
    };
  } catch {
    // Marketing pages should still render locally while the API is stopped.
    return null;
  }
}

function getDisciplines(artists: Artist[]) {
  return new Set(artists.flatMap((artist) => artist.disciplines.map((discipline) => discipline.name)));
}

function getRandomArtists(artists: Artist[], count: number) {
  // Marketing preview should feel alive, so we shuffle server-side on each render.
  // This does not change the real catalog order on /umjetnici.
  return [...artists].sort(() => Math.random() - 0.5).slice(0, count);
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
      <span className="h-1.5 w-1.5 rounded-full bg-[#182fc7]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#dc1735]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#ffc41d]" />
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
              <span className="text-[#182fc7]">●</span>
              <span className="text-[#dc1735]">●</span>
              <span className="text-[#ffc41d]">●</span> Portfolio, 2026
            </p>
          </div>
          <TemplateLandscape className="h-16 rounded-[7px]" />
        </div>
        <TemplateLandscape className="mt-5 flex-1 rounded-[8px]" />
      </div>
    );
  }

  return (
    <div className="mx-auto aspect-[0.72/1] max-h-[255px] rounded-[14px] bg-[linear-gradient(135deg,#ffc51d,#dc1735_52%,#1048c6)] p-[5px] shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
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
              <span className="text-[#182fc7]">●</span>
              <span className="text-[#dc1735]">●</span>
              <span className="text-[#ffc41d]">●</span> Portfolio, 2026
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
    <div className="mx-auto aspect-[0.72/1] max-h-[270px] rounded-[14px] bg-[linear-gradient(135deg,#ffc51d,#dc1735_52%,#1048c6)] p-[5px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
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
      color: "#182fc7",
    },
    {
      label: "Portfolio",
      text: "Iz profila nastaje PDF ili link spreman za galerije, konkurse i saradnike.",
      color: "#dc1735",
    },
    {
      label: "Promocija",
      text: "Rad se lakse dijeli kroz pretragu, QR materijale i profesionalne prilike.",
      color: "#ffc41d",
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
                className="inline-flex min-h-[48px] items-center rounded-full bg-[#dc1735] px-5 text-[15px] font-bold text-white transition hover:bg-[#252933]"
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
  const previewArtists = getRandomArtists(artists, 4);
  const disciplines = getDisciplines(artists);
  const artworkCount = artists.reduce(
    (total, artist) => total + (artist.counts?.artworks ?? artist.artworks.length),
    0,
  );

  // Artist count is intentionally taken from the same endpoint as the public
  // catalog first, so the homepage number stays aligned with /umjetnici.
  const artistCount = artistData?.meta.total ?? stats?.artists;
  const proofItems = [
    { label: "Umjetnika", value: artistCount ? `${artistCount}+` : "U rastu" },
    {
      label: "Radova u katalogu",
      value: stats?.artworks ? `${stats.artworks}+` : artworkCount ? `${artworkCount}+` : "U pripremi",
    },
    {
      label: "Disciplina",
      value: stats?.disciplines ? `${stats.disciplines}+` : disciplines.size ? `${disciplines.size}+` : "Više oblasti",
    },
    { label: "Podrška i razvoj", value: "Art Studio 360" },
  ];
  const heroMosaic = getRandomArtists(artists, 8)
    .map((artist) => ({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.artworks[0]?.imageUrl ?? artist.profileImageUrl ?? "",
    }))
    .filter((item) => item.imageUrl);

  return (
    <main className="relative isolate overflow-hidden bg-[#f8fbff] pb-20 pt-[13vh] text-[#252933]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 16% 7%, rgba(24,47,199,0.1), transparent 25%), radial-gradient(circle at 88% 14%, rgba(220,23,53,0.09), transparent 24%), radial-gradient(circle at 52% 52%, rgba(255,196,29,0.12), transparent 26%)",
        }}
      />
      <div className="pointer-events-none absolute left-[-18vw] top-[420px] -z-10 h-[56vw] w-[56vw] rounded-full border border-[#dce5f1]" />
      <div className="pointer-events-none absolute right-[-16vw] top-[860px] -z-10 h-[42vw] w-[42vw] rounded-full border border-[#dce5f1]" />
      <section className="relative z-10 mx-auto max-w-[1320px] px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[50px] border border-[#dce5f1] bg-white/90 p-7 shadow-[0_32px_110px_rgba(38,51,71,0.1)] backdrop-blur sm:p-10 lg:min-h-[620px] lg:p-14">
          <span className="absolute right-[-110px] top-[-120px] h-[360px] w-[360px] rounded-full bg-[#ffc41d]/25" />
          <span className="absolute bottom-[-160px] left-[45%] h-[320px] w-[320px] rounded-full bg-[#182fc7]/10" />
          <div className="relative grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.34em] text-[#7c8798]">
                Created by Art Studio 360
              </p>
              <h1 className="mt-5 max-w-[780px] text-[44px] font-bold leading-[0.94] tracking-[-0.055em] text-[#2f3138] sm:text-[72px]">
                Profesionalni umjetnički profil, portfolio i alati za vidljivost.
              </h1>
              <p className="mt-6 max-w-[680px] text-[20px] leading-[1.5] text-[#4e5560]">
                ArtBoard pomaže umjetnicima da predstave radove, kreiraju portfolio,
                upravljaju promocijom i lakše dođu do publike, saradnika i profesionalnih
                prilika.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <SiteCtaButton href={siteRoutes.registration} label="Kreiraj profil" />
                <Link
                  className="inline-flex min-h-[54px] w-fit items-center justify-center rounded-full border border-[#ccd7e6] bg-white px-6 text-[17px] font-bold text-[#252933] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                  href={siteRoutes.artists}
                >
                  Istraži umjetnike
                </Link>
              </div>
            </div>

            <div className="relative min-h-[430px]">
              <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#dce5f1]" />
              <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#dce5f1]" />
              <span className="absolute left-[10%] top-[20%] h-12 w-12 rounded-full bg-[#182fc7]" />
              <span className="absolute right-[18%] top-[15%] h-16 w-16 rounded-full bg-[#dc1735]" />
              <span className="absolute bottom-[14%] left-[28%] h-14 w-14 rounded-full bg-[#ffc41d]" />

              <div className="relative mx-auto grid max-w-[560px] grid-cols-3 gap-3 pt-10">
                {heroMosaic.slice(0, 6).map((item, index) => (
                  <Link
                    className={[
                      "group overflow-hidden rounded-[28px] border-4 border-white bg-[#e9eef5] shadow-[0_22px_60px_rgba(38,51,71,0.16)] transition duration-300 hover:-translate-y-2",
                      index === 1 ? "translate-y-8 rotate-2" : "",
                      index === 2 ? "-translate-y-3 -rotate-3" : "",
                      index === 3 ? "translate-y-2 -rotate-2" : "",
                      index === 4 ? "-translate-y-6 rotate-3" : "",
                    ].join(" ")}
                    href={siteRoutes.artists}
                    key={item.id}
                    title={item.name}
                  >
                    <img
                      alt=""
                      className="h-40 w-full object-cover transition duration-500 group-hover:scale-110"
                      src={item.imageUrl}
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-[-28px] max-w-[1180px] px-4 sm:px-6">
        <div className="relative z-10 grid gap-3 rounded-[30px] border border-[#dce5f1] bg-white/95 p-4 shadow-[0_18px_60px_rgba(38,51,71,0.08)] sm:grid-cols-2 lg:grid-cols-4">
          {proofItems.map((item, index) => (
            <article
              className="relative overflow-hidden rounded-[24px] bg-[#f8fbff] p-5"
              key={item.label}
            >
              <span
                className="absolute right-4 top-4 h-3 w-3 rounded-full"
                style={{ backgroundColor: ["#182fc7", "#dc1735", "#ffc41d", "#2f3138"][index] }}
              />
              <p className="text-[34px] font-bold tracking-[-0.05em] text-[#182fc7]">{item.value}</p>
              <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.22em] text-[#7c8798]">
                {item.label}
              </p>
            </article>
          ))}
        </div>
      </section>

      <ArtBoardSignalMapSection items={heroMosaic} />

      <section className="relative z-10 mx-auto mt-20 grid max-w-[1240px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#dc1735]">
            Zašto ArtBoard
          </p>
          <h2 className="mt-3 text-[40px] font-bold leading-[1] tracking-[-0.04em] sm:text-[58px]">
            Manje haosa. Više profesionalnog prisustva.
          </h2>
          <p className="mt-5 text-[18px] leading-[1.55] text-[#5d6675]">
            Umjesto da radovi, linkovi, prijave i portfolio žive na deset različitih mjesta,
            ArtBoard ih spaja u jedan čist tok.
          </p>
        </div>
        <div className="space-y-5">
          {benefits.map((benefit, index) => (
            <article
              className={[
                "group relative overflow-hidden rounded-[34px] border border-[#dce5f1] bg-white p-7 shadow-[0_18px_60px_rgba(38,51,71,0.05)] transition hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(38,51,71,0.1)]",
                index % 2 === 1 ? "lg:ml-12" : "lg:mr-12",
              ].join(" ")}
              key={benefit.title}
            >
              <span
                className="absolute right-[-44px] top-[-44px] h-28 w-28 rounded-full opacity-15 transition group-hover:scale-125"
                style={{ backgroundColor: benefit.color }}
                aria-hidden="true"
              />
              <div className="flex gap-5">
                <span
                  className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
                  style={{ backgroundColor: benefit.color }}
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-[26px] font-bold tracking-[-0.03em]">{benefit.title}</h3>
                  <p className="mt-3 text-[16px] leading-[1.55] text-[#5d6675]">{benefit.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-20 max-w-[1240px] scroll-mt-36 px-4 sm:px-6" id="alati">
        <div className="relative overflow-hidden rounded-[44px] border border-[#dce5f1] bg-white p-6 shadow-[0_26px_90px_rgba(38,51,71,0.08)] sm:p-9">
          <span className="absolute right-[-90px] top-[-90px] h-60 w-60 rounded-full bg-[#182fc7]/10" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#182fc7]">
                Alati i servisi
              </p>
              <h2 className="mt-3 max-w-[780px] text-[40px] font-bold leading-[1] tracking-[-0.04em] sm:text-[58px]">
                Digitalni atelje sa praktičnim alatima.
              </h2>
            </div>
          </div>
          <div className="relative mt-8 grid auto-rows-[minmax(210px,auto)] gap-5 md:grid-cols-2 xl:grid-cols-6">
            {tools.map((tool, index) => (
              <Link
                className={[
                  "group flex flex-col rounded-[30px] border bg-[#f8fbff] p-7 transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_24px_80px_rgba(38,51,71,0.11)]",
                  index === 0 || index === 2 ? "xl:col-span-3" : "xl:col-span-2",
                ].join(" ")}
                href={tool.href}
                key={tool.title}
                style={{ borderColor: `${tool.color}33` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[13px] font-bold uppercase tracking-[0.28em] text-[#9aa4b5]">
                    0{index + 1}
                  </p>
                  <span
                    className="h-4 w-4 rounded-full transition group-hover:scale-125"
                    style={{ backgroundColor: tool.color }}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-5 text-[25px] font-bold tracking-[-0.03em]">{tool.title}</h3>
                <p className="mt-3 text-[16px] leading-[1.5] text-[#5d6675]">{tool.text}</p>
                <p className="mt-auto pt-6 text-[15px] font-bold" style={{ color: tool.color }}>
                  Otvori →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative z-10 mx-auto mt-16 max-w-[1240px] scroll-mt-36 px-4 sm:px-6"
        id="portfolio-builder"
      >
        <div className="relative grid gap-5 overflow-hidden rounded-[38px] border border-[#25314a] bg-[#101827] p-5 text-white shadow-[0_28px_90px_rgba(16,24,39,0.2)] sm:p-6 lg:grid-cols-[0.82fr_1.18fr] lg:p-7">
          <span className="absolute left-[-90px] top-[-90px] h-64 w-64 rounded-full bg-[#dc1735]/25 blur-3xl" />
          <span className="absolute bottom-[-100px] right-[-80px] h-72 w-72 rounded-full bg-[#182fc7]/35 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#ffc41d]">
              Portfolio Builder
            </p>
            <h2 className="mt-2.5 text-[31px] font-bold leading-[0.98] tracking-[-0.04em] sm:text-[40px]">
              Profesionalni PDF portfolio bez dizajniranja od nule.
            </h2>
            <p className="mt-3.5 text-[15px] leading-[1.42] text-[#d7deea]">
              Korisnik dobija PDF portfolio spreman za galerije, konkurse, saradnike i kupce.
              Preview ostaje dostupan sa watermarkom, a čisti export je uključen u Premium ili se
              može kupiti jednokratno.
            </p>
            <ol className="mt-4 space-y-2">
              {portfolioSteps.map((step, index) => (
                <li className="flex gap-2.5 text-[13px] leading-snug text-[#d7deea]" key={step}>
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#ffc41d] text-[11px] font-bold text-[#101827]">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="mt-5">
              <SiteCtaButton href={siteRoutes.portfolioBuilder} label="Kreiraj portfolio" />
            </div>
          </div>

          <div className="relative">
            <ArtBoardTemplateCarousel templates={portfolioTemplates} />
            <div className="mt-2.5 rounded-[18px] border border-white/12 bg-white/6 p-3.5 text-[13px] leading-relaxed text-[#d7deea]">
              Cijena može biti jednokratna za jedan PDF ili uključena u Premium članstvo.
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-20 max-w-[1240px] px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#dc1735]">
              Umjetnici
            </p>
            <h2 className="mt-3 text-[40px] font-bold leading-[1] tracking-[-0.04em] sm:text-[58px]">
              Katalog koji se mijenja kao živa galerija.
            </h2>
            <p className="mt-5 text-[18px] leading-[1.55] text-[#5d6675]">
              Svako učitavanje donosi novi presjek umjetnika, radova i disciplina.
            </p>
            <div className="mt-8">
              <SiteCtaButton href={siteRoutes.artists} label="Pogledajte sve umjetnike" />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {previewArtists.length > 0 ? (
              previewArtists.map((artist) => <ArtistCard artist={artist} key={artist.id} />)
            ) : (
              <div className="rounded-[30px] border border-[#dce5f1] bg-white p-8 text-[#5d6675] md:col-span-2">
                Preview umjetnika će se prikazati čim je backend dostupan.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-20 max-w-[1240px] px-4 sm:px-6">
        <div className="relative rounded-[44px] border border-[#dce5f1] bg-white p-7 sm:p-10">
          <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#ffc41d]">
            Kako funkcioniše ArtBoard
          </p>
          <div className="mt-8 grid gap-0 overflow-hidden rounded-[30px] border border-[#dce5f1] md:grid-cols-5">
            {platformSteps.map((step, index) => (
              <article className="border-b border-[#dce5f1] bg-[#f8fbff] p-5 md:border-b-0 md:border-r last:border-r-0" key={step}>
                <p className="text-[28px] font-bold text-[#182fc7]">{index + 1}</p>
                <h3 className="mt-5 text-[18px] font-bold leading-[1.2]">{step}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-20 max-w-[1240px] scroll-mt-36 px-4 sm:px-6" id="paketi">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#182fc7]">
            Paketi i cijene
          </p>
          <h2 className="mt-3 max-w-[760px] text-[40px] font-bold leading-[1] tracking-[-0.04em] sm:text-[58px]">
            Jednostavan izbor za početak i rast.
          </h2>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {packageCards.map((card, index) => (
            <article
              className="grid min-h-[410px] grid-rows-[auto_96px_132px_auto] rounded-[36px] border border-[#dce5f1] bg-white p-8 shadow-[0_18px_60px_rgba(38,51,71,0.05)]"
              key={card.title}
            >
              <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#9aa4b5]">
                {card.label}
              </p>
              <h3 className="mt-4 self-start text-[32px] font-bold leading-[1.05] tracking-[-0.04em]">
                {card.title}
              </h3>
              <p className="mt-4 self-start text-[17px] leading-[1.5] text-[#5d6675]">
                {card.text}
              </p>
              <div className="self-end pt-8">
                <SiteCtaButton
                  href={card.href}
                  label={index === 1 ? "Upravljaj premiumom" : "Pogledaj opciju"}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-20 max-w-[1240px] px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[42px] border border-[#dce5f1] bg-white p-7 sm:p-10">
          <span className="absolute bottom-[-90px] right-[-60px] h-56 w-56 rounded-full bg-[#ffc41d]/35" />
          <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#dc1735]">
                Oglasi i profesionalne prilike
              </p>
              <h2 className="mt-4 text-[40px] font-bold leading-[1] tracking-[-0.04em] sm:text-[56px]">
                Jedno mjesto za konkurse, saradnje i angažmane.
              </h2>
            </div>
            <div className="self-end">
              <p className="text-[19px] leading-[1.55] text-[#4e5560]">
                Umjetnici mogu pratiti relevantne prilike, dok organizacije i poslodavci dobijaju
                jasniji kanal ka kreativnoj zajednici.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {opportunityTypes.map((type) => (
                  <span className="rounded-full border border-[#ccd7e6] bg-[#f8fbff] px-4 py-2 text-[14px]" key={type}>
                    {type}
                  </span>
                ))}
              </div>
              <div className="mt-7">
                <SiteCtaButton href={siteRoutes.opportunities} label="Istražite oglase" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-20 max-w-[1240px] px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[46px] bg-[#182fc7] p-8 text-white sm:p-12">
          <span className="absolute right-[-70px] top-[-70px] h-52 w-52 rounded-full bg-[#ffc41d]" />
          <span className="absolute bottom-[-60px] left-[-60px] h-44 w-44 rounded-full bg-[#dc1735]" />
          <div className="relative">
            <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#ffc41d]">
              Spreman/na za ArtBoard?
            </p>
            <h2 className="mt-4 max-w-[860px] text-[42px] font-bold leading-[1] tracking-[-0.04em] sm:text-[62px]">
              Kreiraj svoj ArtBoard profil i predstavi rad kroz profesionalne alate.
            </h2>
            <div className="mt-8 flex flex-wrap gap-3">
              {["Slikarstvo", "Fotografija", "Dizajn", "Skulptura", "Ilustracija", "Digitalna umjetnost"].map(
                (discipline) => (
                  <span className="rounded-full border border-white/25 px-4 py-2 text-[15px]" key={discipline}>
                    {discipline}
                  </span>
                ),
              )}
            </div>
            <div className="mt-8">
              <SiteCtaButton href={siteRoutes.registration} label="Kreiraj svoj ArtBoard profil" />
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10">
        <ArtBoardFaqSection items={artBoardFaqs} />
      </div>
    </main>
  );
}
