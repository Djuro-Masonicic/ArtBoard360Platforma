"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createPortfolioProjectFromProfile } from "@/services/portfolio-projects";

type PortfolioBuilderLandingProps = {
  isArtistLoggedIn: boolean;
  artistName?: string;
};

export function PortfolioBuilderLanding({
  isArtistLoggedIn,
  artistName,
}: PortfolioBuilderLandingProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCreateFromProfile() {
    if (!isArtistLoggedIn) {
      router.push("/artist/login");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const project = await createPortfolioProjectFromProfile();
      router.push(`/portfolio-builder/${project.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Portfolio nije mogao biti kreiran.");
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef2f7] text-[#20242d]">
      <PortfolioBuilderTopbar />

      <section className="grid min-h-[calc(100vh-56px)] grid-cols-1 gap-0 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col justify-between border-r border-[#d7deea] bg-white px-8 py-8 lg:px-12">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#808999]">
              ArtBoard Portfolio Builder
            </p>
            <h1 className="mt-5 max-w-[620px] text-[44px] font-bold leading-[0.95] tracking-[-0.05em] text-[#20242d] lg:text-[68px]">
              Profesionalni portfolio studio.
            </h1>
            <p className="mt-5 max-w-[540px] text-[15px] leading-7 text-[#667085]">
              Poseban workspace za kreiranje PDF portfolija, draft linkova i
              pripremu materijala za galerije, konkurse, prodaju i saradnike.
            </p>
          </div>

          <div className="mt-10 grid gap-3 text-[13px] text-[#667085] sm:grid-cols-3">
            <InfoMetric label="Templatei" value="3" />
            <InfoMetric label="Radovi" value="30 max" />
            <InfoMetric label="Export" value="PDF/link" />
          </div>
        </div>

        <div className="flex items-center bg-[#f7f9fc] px-6 py-8 lg:px-10">
          <div className="mx-auto w-full max-w-[760px]">
            {errorMessage ? (
              <div className="mb-4 rounded-2xl border border-[#f3bdc7] bg-[#fff6f7] px-4 py-3 text-[13px] font-semibold text-[#b4132c]">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid gap-4">
              <button
                className="group rounded-[28px] border border-[#cfd8e6] bg-white p-6 text-left shadow-[0_18px_50px_rgba(31,46,86,0.06)] transition hover:-translate-y-0.5 hover:border-[#182fc7]"
                disabled={isCreating}
                onClick={handleCreateFromProfile}
                type="button"
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#182fc7]">
                      Postojeci ArtBoard profil
                    </p>
                    <h2 className="mt-3 text-[26px] font-bold tracking-[-0.03em] text-[#20242d]">
                      {isCreating
                        ? "Kreiram draft..."
                        : isArtistLoggedIn
                          ? `Generisi iz profila${artistName ? `: ${artistName}` : ""}`
                          : "Uloguj se i generisi iz profila"}
                    </h2>
                    <p className="mt-3 max-w-[520px] text-[14px] leading-6 text-[#667085]">
                      Povlaci bio, kontakt, discipline, profilnu sliku i postojece
                      radove. Najbrzi put do profesionalnog portfolija.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#182fc7] px-4 py-2 text-[13px] font-bold text-[#182fc7]">
                    Start
                  </span>
                </div>
              </button>

              <Link
                className="group rounded-[28px] border border-[#cfd8e6] bg-white p-6 text-left shadow-[0_18px_50px_rgba(31,46,86,0.06)] transition hover:-translate-y-0.5 hover:border-[#ffc41d]"
                href="/portfolio-builder/new"
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#b18400]">
                      Guest / bez profila
                    </p>
                    <h2 className="mt-3 text-[26px] font-bold tracking-[-0.03em] text-[#20242d]">
                      Kreiraj novi portfolio od nule
                    </h2>
                    <p className="mt-3 max-w-[520px] text-[14px] leading-6 text-[#667085]">
                      Unesi osnovne podatke, zatim dodaj radove, CV, dizajn opcije
                      i export kroz vodjeni builder.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#ffc41d] px-4 py-2 text-[13px] font-bold text-[#8b6500]">
                    New
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PortfolioBuilderTopbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#d7deea] bg-[#101521] px-5 text-white">
      <Link className="inline-flex items-center gap-3" href="/">
        <img
          alt="Art Studio 360"
          className="h-5 w-auto"
          src="https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68c978c51b6638fa49b92f6b_360%20Logo%20White.svg"
        />
        <span className="text-[12px] font-bold uppercase tracking-[0.22em] text-white/65">
          Portfolio Builder
        </span>
      </Link>

      <Link className="text-[12px] font-semibold text-white/70 hover:text-white" href="/">
        Nazad na sajt
      </Link>
    </header>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dbe3ef] bg-[#f8fbff] p-4">
      <div className="text-[22px] font-bold text-[#20242d]">{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8b94a7]">
        {label}
      </div>
    </div>
  );
}
