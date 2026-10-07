"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { generatePublicPortfolioPdf } from "@/services/portfolio-projects";
import { PortfolioGeneratePdfButton } from "./portfolio-generate-pdf-button";

export function PortfolioPrintToolbar({
  canDownload,
  latestPdfUrl,
  mode,
  projectId,
}: {
  canDownload: boolean;
  latestPdfUrl?: string | null;
  mode: "preview" | "download";
  projectId: string;
}) {
  const router = useRouter();
  const [isGeneratingCleanPdf, setIsGeneratingCleanPdf] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function openCleanPdf() {
    setIsGeneratingCleanPdf(true);
    setGenerateError(null);

    try {
      await generatePublicPortfolioPdf(projectId);
      router.push(`/portfolio-builder/${projectId}/download`);
      router.refresh();
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "PDF nije mogao biti generisan.");
    } finally {
      setIsGeneratingCleanPdf(false);
    }
  }

  return (
    <header className="print:hidden fixed left-0 right-0 top-0 z-50 bg-[#05060b]/80 backdrop-blur-[14px]">
      <div className="flex min-h-[72px] flex-wrap items-center gap-x-[18px] gap-y-3 px-[clamp(16px,2.4vw,32px)] py-3">
        <Link className="flex shrink-0 items-center" href={`/portfolio-builder/${projectId}`}>
          <Image
            alt="ArtBoard"
            className="h-auto w-[143px] max-sm:w-[116px]"
            height={30}
            priority
            src="/artboard-logo/ArtBoard-Horizontal-Gradient-Mark-White-Text.svg"
            width={143}
          />
        </Link>
        <span className="h-[22px] w-px bg-white/15 max-md:hidden" aria-hidden="true" />
        <strong className="text-[12.5px] font-extrabold uppercase text-[#c4c8d4] max-md:hidden">
          {mode === "preview" ? "PDF pregled" : "Čist PDF"}
        </strong>

        <div className="flex-1" />

        <div className="flex flex-wrap items-center justify-end gap-x-[14px] gap-y-2">
          {mode === "download" ? (
            <>
              <p className="hidden text-[12.5px] font-semibold text-[#8d93a5] lg:block">
                Čist PDF je otključan. Pregledaj ga i preuzmi fajl.
              </p>
              <ToolbarBackButton projectId={projectId} />
              {latestPdfUrl ? (
                <button
                  className="inline-flex h-[34px] items-center justify-center rounded-full bg-[linear-gradient(120deg,#1a7cff,#1a7cff_30%,#ff2d55)] px-[18px] text-[12.5px] font-extrabold uppercase text-white transition hover:brightness-110"
                  onClick={() => window.open(latestPdfUrl, "_blank", "noopener,noreferrer")}
                  type="button"
                >
                  Preuzmi PDF
                </button>
              ) : (
                <PortfolioGeneratePdfButton
                  className="inline-flex h-[34px] items-center justify-center rounded-full bg-[linear-gradient(120deg,#1a7cff,#1a7cff_30%,#ff2d55)] px-[18px] text-[12.5px] font-extrabold uppercase text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  mode="public"
                  portfolioId={projectId}
                />
              )}
            </>
          ) : (
            <>
              <p className="hidden text-[12.5px] font-semibold text-[#8d93a5] xl:block">
                Pregled ima ArtBoard vodeni žig i nije za preuzimanje.
              </p>
              <ToolbarBackButton projectId={projectId} />
              {canDownload ? (
                <div className="flex flex-col items-end gap-1">
                  <button
                    className="inline-flex h-[34px] items-center justify-center rounded-full bg-[linear-gradient(120deg,#1a7cff,#1a7cff_30%,#ff2d55)] px-[18px] text-[12.5px] font-extrabold uppercase text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
                    disabled={isGeneratingCleanPdf}
                    onClick={openCleanPdf}
                    type="button"
                  >
                    {isGeneratingCleanPdf ? "Generišem PDF..." : "Otvori čist PDF"}
                  </button>
                  {generateError ? (
                    <span className="max-w-[260px] text-right text-[11px] font-semibold text-[#dc1735]">
                      {generateError}
                    </span>
                  ) : null}
                </div>
              ) : (
                <button
                  className="inline-flex h-[34px] items-center justify-center rounded-full bg-[linear-gradient(120deg,#1a7cff,#1a7cff_30%,#ff2d55)] px-[18px] text-[12.5px] font-extrabold uppercase text-white transition hover:brightness-110"
                  onClick={() => router.push(`/portfolio-builder/${projectId}/payment`)}
                  type="button"
                >
                  Otključaj PDF
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="h-0.5 bg-[linear-gradient(120deg,#1a7cff,#ff2d55,#ffd028)]" />
    </header>
  );
}

function ToolbarBackButton({ projectId }: { projectId: string }) {
  return (
    <Link
      aria-label="Nazad u builder"
      className="inline-flex h-[34px] items-center justify-center gap-1 rounded-full px-4 text-[12.5px] font-extrabold uppercase text-[#f3f4f7] shadow-[inset_0_0_0_1.5px_#f3f4f7] transition hover:bg-[#f3f4f7] hover:text-[#07080d] max-sm:w-[34px] max-sm:px-0"
      href={`/portfolio-builder/${projectId}`}
    >
      <span aria-hidden="true">←</span>
      <span className="max-sm:hidden">Nazad u builder</span>
    </Link>
  );
}
