"use client";

import { useState } from "react";

import { applyToOpportunity } from "@/services/opportunities";

type SubmitState = "idle" | "loading" | "success" | "error";

export function OpportunityApplyButton({ opportunityId }: { opportunityId: string }) {
  const [status, setStatus] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleApply() {
    setStatus("loading");
    setMessage(null);

    try {
      const response = await applyToOpportunity(opportunityId);
      setStatus("success");
      setMessage(response.message);
    } catch (error) {
      const statusCode = (error as Error & { status?: number }).status;
      const errorMessage =
        error instanceof Error ? error.message : "Prijava nije mogla biti poslata.";

      if (statusCode === 401) {
        window.location.href = `/artist/login?returnTo=${encodeURIComponent("/oglasi")}`;
        return;
      }

      setStatus("error");
      setMessage(errorMessage);
    }
  }

  return (
    <div className="space-y-3">
      <button
        className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#e9153a] px-5 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#c81030] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={status === "loading" || status === "success"}
        onClick={handleApply}
        type="button"
      >
        {status === "loading"
          ? "Salje se..."
          : status === "success"
            ? "Prijava poslata"
            : "Prijavi se"}
      </button>

      {message ? (
        <p
          className={`text-[13px] leading-[1.4] ${
            status === "success" ? "text-[#167a45]" : "text-[#c81030]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
