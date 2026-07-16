"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { NavigationButton } from "@/components/navigation-button";
import { createGuestPortfolioProject } from "@/services/portfolio-projects";

export function GuestPortfolioBuilderForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const artistName = String(formData.get("artistName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const discipline = String(formData.get("discipline") ?? "").trim();
    const location = String(formData.get("location") ?? "").trim();

    if (!artistName || !email) {
      setErrorMessage("Ime umjetnika i email su obavezni.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const project = await createGuestPortfolioProject({
        artistName,
        email,
        discipline: discipline || undefined,
        location: location || undefined,
      });

      router.push(`/portfolio-builder/${project.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Portfolio draft nije mogao biti kreiran.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef2f7] text-[#20242d]">
      <header className="flex h-14 items-center justify-between border-b border-[#d7deea] bg-[#101521] px-5 text-white">
        <Link className="inline-flex items-center gap-3" href="/portfolio-builder">
          <img
            alt="Art Studio 360"
            className="h-5 w-auto"
            src="https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68c978c51b6638fa49b92f6b_360%20Logo%20White.svg"
          />
          <span className="text-[12px] font-bold uppercase tracking-[0.22em] text-white/65">
            Novi portfolio
          </span>
        </Link>

        <Link className="text-[12px] font-semibold text-white/70 hover:text-white" href="/portfolio-builder">
          Nazad
        </Link>
      </header>

      <section className="grid min-h-[calc(100vh-56px)] grid-cols-1 lg:grid-cols-[320px_1fr]">
        <aside className="border-r border-[#d7deea] bg-white px-6 py-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#8b94a7]">
            Setup
          </p>
          <h1 className="mt-4 text-[34px] font-bold leading-none tracking-[-0.04em]">
            Prazan portfolio draft.
          </h1>
          <p className="mt-4 text-[13px] leading-6 text-[#667085]">
            Ovdje samo otvaramo projekat. Pravi unos radova, template izbor i PDF
            preview nastavljaju se u builder workspace-u.
          </p>

          <div className="mt-8 space-y-3 text-[12px]">
            <StepBadge active label="01 Osnovni podaci" />
            <StepBadge label="02 Radovi" />
            <StepBadge label="03 Dizajn" />
            <StepBadge label="04 Preview" />
          </div>
        </aside>

        <div className="flex items-center justify-center px-5 py-8">
          <form
            className="w-full max-w-[720px] rounded-[28px] border border-[#d7deea] bg-white p-6 shadow-[0_20px_60px_rgba(31,46,86,0.08)]"
            onSubmit={handleSubmit}
          >
            <div className="flex items-start justify-between gap-5 border-b border-[#edf1f6] pb-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#182fc7]">
                  Guest portfolio
                </p>
                <h2 className="mt-2 text-[24px] font-bold tracking-[-0.03em]">
                  Unesi osnovne podatke umjetnika
                </h2>
              </div>
              <span className="rounded-full bg-[#fff8dd] px-3 py-1 text-[11px] font-bold text-[#9b7200]">
                Draft
              </span>
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-[#f3bdc7] bg-[#fff6f7] px-4 py-3 text-[13px] font-semibold text-[#b4132c]">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4">
              <BuilderField label="Ime umjetnika" name="artistName" placeholder="Mira Kovacevic" required />
              <BuilderField label="Email" name="email" placeholder="name@example.com" required type="email" />

              <div className="grid gap-4 md:grid-cols-2">
                <BuilderField label="Disciplina" name="discipline" placeholder="Vizuelna umjetnost" />
                <BuilderField label="Lokacija" name="location" placeholder="Podgorica, Crna Gora" />
              </div>
            </div>

            <div className="mt-7 flex items-center justify-end gap-3 border-t border-[#edf1f6] pt-5">
              <NavigationButton
                className="rounded-full border border-[#d7deea] px-5 py-2.5 text-[13px] font-bold text-[#4f5967]"
                href="/portfolio-builder"
              >
                Odustani
              </NavigationButton>
              <button
                className="rounded-full bg-[#182fc7] px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#1326a8] disabled:cursor-wait disabled:opacity-70"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Kreiram..." : "Kreiraj draft"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function BuilderField({
  label,
  name,
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-[12px] font-bold text-[#4f5967]">
      {label}
      <input
        className="h-10 rounded-xl border border-[#cfd8e6] bg-white px-3 text-[13px] font-normal text-[#20242d] outline-none transition focus:border-[#182fc7]"
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function StepBadge({ active = false, label }: { active?: boolean; label: string }) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2 font-bold ${
        active
          ? "border-[#182fc7] bg-[#eef2ff] text-[#182fc7]"
          : "border-[#e2e8f2] bg-[#f8fbff] text-[#8b94a7]"
      }`}
    >
      {label}
    </div>
  );
}
