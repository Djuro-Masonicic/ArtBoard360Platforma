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

  return (
    <main className="bg-[#f8fbff] pb-20 pt-[15vh] text-[#252933]">
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="rounded-[42px] border border-[#dce5f1] bg-white p-7 shadow-[0_28px_90px_rgba(38,51,71,0.08)] sm:p-10 lg:p-14">
          <p className="text-[12px] font-bold uppercase tracking-[0.34em] text-[#7c8798]">
            Created by Art Studio 360
          </p>
          <h1 className="mt-5 max-w-[980px] text-[44px] font-bold leading-[0.96] tracking-[-0.05em] text-[#2f3138] sm:text-[72px]">
            Profesionalni umjetnički profil, online portfolio i alati za promociju rada.
          </h1>
          <p className="mt-6 max-w-[800px] text-[20px] leading-[1.5] text-[#4e5560]">
            ArtBoard pomaže umjetnicima da predstave radove, kreiraju portfolio, upravljaju
            promocijom i lakše dođu do publike, saradnika i profesionalnih prilika.
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
      </section>

      <section className="mx-auto mt-6 max-w-[1240px] px-4 sm:px-6">
        <div className="grid gap-3 rounded-[30px] border border-[#dce5f1] bg-white p-4 shadow-[0_18px_60px_rgba(38,51,71,0.06)] sm:grid-cols-2 lg:grid-cols-4">
          {proofItems.map((item) => (
            <article className="rounded-[22px] bg-[#f8fbff] p-5" key={item.label}>
              <p className="text-[30px] font-bold tracking-[-0.04em] text-[#182fc7]">{item.value}</p>
              <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.22em] text-[#7c8798]">
                {item.label}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1240px] px-4 sm:px-6">
        <div className="max-w-[760px]">
          <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#dc1735]">
            Zašto ArtBoard
          </p>
          <h2 className="mt-3 text-[40px] font-bold leading-[1] tracking-[-0.04em] sm:text-[58px]">
            Platforma rješava stvarne probleme umjetnika.
          </h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map((benefit) => (
            <article
              className="rounded-[30px] border border-[#dce5f1] bg-white p-7 shadow-[0_18px_60px_rgba(38,51,71,0.05)]"
              key={benefit.title}
            >
              <span
                className="block h-4 w-4 rounded-full"
                style={{ backgroundColor: benefit.color }}
                aria-hidden="true"
              />
              <h3 className="mt-8 text-[24px] font-bold tracking-[-0.03em]">{benefit.title}</h3>
              <p className="mt-3 text-[16px] leading-[1.5] text-[#5d6675]">{benefit.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1240px] scroll-mt-36 px-4 sm:px-6" id="alati">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#182fc7]">
              Alati i servisi
            </p>
            <h2 className="mt-3 max-w-[780px] text-[40px] font-bold leading-[1] tracking-[-0.04em] sm:text-[58px]">
              ArtBoard nije samo katalog, već radni prostor za umjetnike.
            </h2>
          </div>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool, index) => (
            <Link
              className="group rounded-[30px] border bg-white p-7 shadow-[0_18px_60px_rgba(38,51,71,0.05)] transition hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(38,51,71,0.11)]"
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
              <p className="mt-6 text-[15px] font-bold" style={{ color: tool.color }}>
                Otvori →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section
        className="mx-auto mt-10 max-w-[1240px] scroll-mt-36 px-4 sm:px-6"
        id="portfolio-builder"
      >
        <div className="grid gap-5 rounded-[30px] border border-[#ccd7e6] bg-[#101827] p-5 text-white shadow-[0_18px_56px_rgba(16,24,39,0.15)] sm:p-6 lg:grid-cols-[0.82fr_1.18fr] lg:p-7">
          <div>
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

          <div>
            <ArtBoardTemplateCarousel templates={portfolioTemplates} />
            <div className="mt-2.5 rounded-[18px] border border-white/12 bg-white/6 p-3.5 text-[13px] leading-relaxed text-[#d7deea]">
              Cijena može biti jednokratna za jedan PDF ili uključena u Premium članstvo.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1240px] px-4 sm:px-6">
        <div className="text-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#dc1735]">
            Umjetnici
          </p>
          <h2 className="mt-3 text-[40px] font-bold leading-[1] tracking-[-0.04em] sm:text-[58px]">
            Preview ArtBoard kataloga.
          </h2>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {previewArtists.length > 0 ? (
            previewArtists.map((artist) => <ArtistCard artist={artist} key={artist.id} />)
          ) : (
            <div className="rounded-[30px] border border-[#dce5f1] bg-white p-8 text-[#5d6675] md:col-span-2 xl:col-span-4">
              Preview umjetnika će se prikazati čim je backend dostupan.
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <SiteCtaButton href={siteRoutes.artists} label="Pogledajte sve umjetnike" />
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1240px] px-4 sm:px-6">
        <div className="rounded-[42px] border border-[#dce5f1] bg-white p-7 sm:p-10">
          <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#ffc41d]">
            Kako funkcioniše ArtBoard
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-5">
            {platformSteps.map((step, index) => (
              <article className="rounded-[24px] bg-[#f8fbff] p-5" key={step}>
                <p className="text-[28px] font-bold text-[#182fc7]">{index + 1}</p>
                <h3 className="mt-5 text-[18px] font-bold leading-[1.2]">{step}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1240px] scroll-mt-36 px-4 sm:px-6" id="paketi">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#182fc7]">
              Paketi i cijene
            </p>
            <h2 className="mt-3 max-w-[760px] text-[40px] font-bold leading-[1] tracking-[-0.04em] sm:text-[58px]">
              Jednostavan izbor za početak i rast.
            </h2>
          </div>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {packageCards.map((card) => (
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
                <SiteCtaButton href={card.href} label="Pogledaj opciju" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1240px] px-4 sm:px-6">
        <div className="grid gap-8 rounded-[42px] border border-[#dce5f1] bg-white p-7 sm:p-10 lg:grid-cols-[0.9fr_1.1fr]">
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
                <span className="rounded-full border border-[#ccd7e6] px-4 py-2 text-[14px]" key={type}>
                  {type}
                </span>
              ))}
            </div>
            <div className="mt-7">
              <SiteCtaButton href={siteRoutes.opportunities} label="Istražite oglase" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1240px] px-4 sm:px-6">
        <div className="rounded-[42px] bg-[#182fc7] p-8 text-white sm:p-12">
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
      </section>

      <ArtBoardFaqSection items={artBoardFaqs} />
    </main>
  );
}
