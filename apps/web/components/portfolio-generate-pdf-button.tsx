"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { generatePublicPortfolioPdf } from "@/services/portfolio-projects";

type PortfolioGeneratePdfButtonProps = {
  className?: string;
  mode: "admin" | "public";
  portfolioId: string;
};

/**
 * Small client action for generating a real backend PDF.
 *
 * Admin mode calls a local Next proxy route so the HTTP-only admin cookie stays
 * private. Public mode calls the Nest API directly and is still protected by
 * the backend payment/premium check.
 */
export function PortfolioGeneratePdfButton({
  className,
  mode,
  portfolioId,
}: PortfolioGeneratePdfButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setMessage(null);

    try {
      if (mode === "admin") {
        const response = await fetch(`/api/admin/portfolios/${portfolioId}/generate-pdf`, {
          method: "POST",
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? "PDF nije mogao biti generisan.");
        }
      } else {
        await generatePublicPortfolioPdf(portfolioId);
      }

      setMessage("PDF je generisan i sacuvan.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF nije mogao biti generisan.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className={
          className ??
          "inline-flex h-10 items-center justify-center rounded-full bg-[#dc1735] px-5 text-[14px] font-bold text-white transition hover:bg-[#bd102a] disabled:cursor-not-allowed disabled:opacity-60"
        }
        disabled={isGenerating}
        onClick={handleGenerate}
        type="button"
      >
        {isGenerating ? "Generisem PDF..." : "Generisi PDF"}
      </button>
      {message ? <p className="text-[12px] font-semibold text-[#5f6772]">{message}</p> : null}
    </div>
  );
}
