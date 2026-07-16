"use client";

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
    <div className="print:hidden fixed left-0 right-0 top-0 z-50 border-b border-[#d8deea] bg-white/92 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <button
          className="rounded-full border border-[#d8deea] px-4 py-2 text-[12px] font-bold text-[#20242d] transition hover:bg-[#f3f6fb]"
          onClick={() => router.push(`/portfolio-builder/${projectId}`)}
          type="button"
        >
          Nazad u builder
        </button>

        <div className="flex items-center gap-2">
          {mode === "download" ? (
            <>
              <p className="hidden text-[12px] font-semibold text-[#667085] sm:block">
                Cisti PDF je otkljucan. Pregledaj ga i preuzmi fajl.
              </p>
              {latestPdfUrl ? (
                <button
                  className="rounded-full bg-[#dc1735] px-5 py-2 text-[12px] font-bold text-white transition hover:bg-[#bd102a]"
                  onClick={() => window.open(latestPdfUrl, "_blank", "noopener,noreferrer")}
                  type="button"
                >
                  Download PDF
                </button>
              ) : (
                <PortfolioGeneratePdfButton
                  className="rounded-full bg-[#dc1735] px-5 py-2 text-[12px] font-bold text-white transition hover:bg-[#bd102a] disabled:cursor-not-allowed disabled:opacity-60"
                  mode="public"
                  portfolioId={projectId}
                />
              )}
            </>
          ) : (
            <>
              <p className="hidden text-[12px] font-semibold text-[#667085] sm:block">
                Preview ima ArtBoard watermark i nije namijenjen za download.
              </p>
              {canDownload ? (
                <div className="flex flex-col items-end gap-1">
                  <button
                    className="rounded-full bg-[#dc1735] px-5 py-2 text-[12px] font-bold text-white transition hover:bg-[#bd102a] disabled:cursor-wait disabled:opacity-60"
                    disabled={isGeneratingCleanPdf}
                    onClick={openCleanPdf}
                    type="button"
                  >
                    {isGeneratingCleanPdf ? "Generisem PDF..." : "Otvori cisti PDF"}
                  </button>
                  {generateError ? (
                    <span className="max-w-[260px] text-right text-[11px] font-semibold text-[#dc1735]">
                      {generateError}
                    </span>
                  ) : null}
                </div>
              ) : (
                <button
                  className="rounded-full bg-[#dc1735] px-5 py-2 text-[12px] font-bold text-white transition hover:bg-[#bd102a]"
                  onClick={() => router.push(`/portfolio-builder/${projectId}/payment`)}
                  type="button"
                >
                  Otkljucaj download
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
