"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { completePortfolioDemoPayment, generatePublicPortfolioPdf } from "@/services/portfolio-projects";
import type { PortfolioProject } from "@/types/api";

export function PortfolioDemoPaymentForm({ project }: { project: PortfolioProject }) {
  const router = useRouter();
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const validationMessage = validatePaymentForm({
      cardholder,
      cardNumber,
      expiry,
      cvc,
    });

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    startTransition(async () => {
      try {
        await completePortfolioDemoPayment(project.id);
        await generatePublicPortfolioPdf(project.id);
        router.push(`/portfolio-builder/${project.id}/download`);
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Placanje nije moglo biti zavrseno. Pokusaj ponovo.",
        );
      }
    });
  }

  return (
    <main className="min-h-screen bg-[#eef2f7] px-5 py-8 text-[#20242d]">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="relative overflow-hidden rounded-[32px] border border-[#d7deea] bg-[#101826] p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#182fc7]/35 blur-2xl" />
          <div className="absolute -bottom-28 left-8 h-72 w-72 rounded-full bg-[#ffc41d]/20 blur-3xl" />

          <div className="relative">
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-white/55">
              ArtBoard Portfolio Builder
            </p>
            <h1 className="mt-5 max-w-2xl text-[50px] font-black leading-[0.95] tracking-[-0.06em]">
              Otkljucaj PDF bez watermarka.
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-7 text-white/72">
              Preview ostaje zasticen velikim ArtBoard watermarkom. Nakon
              jednokratnog placanja dobijas cistu verziju portfolija spremnu za
              slanje i stampu.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <PaymentStat label="Radovi" value={String(project.counts.selectedArtworks)} />
              <PaymentStat label="Template" value="A4" />
              <PaymentStat label="Download" value="PDF" />
            </div>

            <div className="mt-8 rounded-[24px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white/48">
                Portfolio
              </p>
              <h2 className="mt-3 text-[28px] font-black tracking-[-0.05em]">
                {project.artistName}
              </h2>
              <p className="mt-2 text-[14px] text-white/62">
                {project.counts.selectedArtworks} odabranih radova / {project.template}
              </p>
            </div>
          </div>
        </section>

        <form
          className="overflow-hidden rounded-[32px] border border-[#d7deea] bg-white shadow-[0_24px_80px_rgba(31,46,86,0.1)]"
          onSubmit={handleSubmit}
        >
          <div className="bg-[#f8fbff] px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.24em] text-[#dc1735]">
                  Jednokratno placanje
                </p>
                <h2 className="mt-2 text-[34px] font-black tracking-[-0.05em]">
                  19 EUR
                </h2>
              </div>
              <span className="rounded-full border border-[#ffc41d] bg-[#fff7d6] px-3 py-1 text-[12px] font-black text-[#8a6500]">
                TEST MODE
              </span>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="rounded-[24px] bg-[#182fc7] p-5 text-white shadow-[0_20px_44px_rgba(24,47,199,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/58">
                    ArtBoard card
                  </p>
                  <p className="mt-6 font-mono text-[18px] tracking-[0.12em]">
                    {cardNumber || "4242 4242 4242 4242"}
                  </p>
                </div>
                <CardChip />
              </div>
              <div className="mt-7 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/48">
                    Vlasnik
                  </p>
                  <p className="mt-1 truncate text-[13px] font-black uppercase">
                    {cardholder || "IME PREZIME"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/48">
                    Vazi do
                  </p>
                  <p className="mt-1 text-[13px] font-black">{expiry || "12/30"}</p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-[13px] leading-6 text-[#667085]">
              Ovo je lazna forma za placanje. Kartica se ne naplacuje i podaci se
              ne cuvaju. Za test koristi karticu 4242 4242 4242 4242.
            </p>

            <div className="mt-6 space-y-4">
              <PaymentField label="Ime na kartici">
                <input
                  autoComplete="cc-name"
                  className={paymentInputClassName}
                  maxLength={70}
                  onChange={(event) => setCardholder(event.target.value)}
                  placeholder="Ime Prezime"
                  required
                  value={cardholder}
                />
              </PaymentField>

              <PaymentField label="Broj kartice">
                <input
                  autoComplete="cc-number"
                  className={`${paymentInputClassName} font-mono tracking-[0.08em]`}
                  inputMode="numeric"
                  maxLength={19}
                  onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                  placeholder="4242 4242 4242 4242"
                  required
                  value={cardNumber}
                />
              </PaymentField>

              <div className="grid grid-cols-2 gap-3">
                <PaymentField label="Datum">
                  <input
                    autoComplete="cc-exp"
                    className={paymentInputClassName}
                    inputMode="numeric"
                    maxLength={5}
                    onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                    placeholder="12/30"
                    required
                    value={expiry}
                  />
                </PaymentField>
                <PaymentField label="CVC">
                  <input
                    autoComplete="cc-csc"
                    className={paymentInputClassName}
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(event) => setCvc(event.target.value.replace(/\D/g, ""))}
                    placeholder="123"
                    required
                    type="password"
                    value={cvc}
                  />
                </PaymentField>
              </div>
            </div>

            {errorMessage ? (
              <p className="mt-4 rounded-2xl bg-[#fff1f3] px-4 py-3 text-[13px] font-semibold text-[#dc1735]">
                {errorMessage}
              </p>
            ) : null}

            <button
              className="mt-6 h-12 w-full rounded-full bg-[#dc1735] text-[14px] font-black text-white transition hover:bg-[#bd102a] disabled:cursor-wait disabled:bg-[#f0a4b0] disabled:text-white"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Generisem PDF..." : "Plati i otkljucaj PDF"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

const paymentInputClassName =
  "mt-2 h-12 w-full rounded-2xl border border-[#cfd8e6] bg-white px-4 text-[14px] text-[#20242d] outline-none transition placeholder:text-[#98a2b3] focus:border-[#182fc7] focus:ring-4 focus:ring-[#182fc7]/10";

function PaymentField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-[#667085]">{label}</span>
      {children}
    </label>
  );
}

function PaymentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
      <p className="text-[18px] font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.22em] text-white/42">
        {label}
      </p>
    </div>
  );
}

function CardChip() {
  return (
    <span className="grid h-9 w-11 grid-cols-2 overflow-hidden rounded-[9px] border border-[#9b7910] bg-[#ffc41d]">
      <span className="border-b border-r border-[#9b7910]" />
      <span className="border-b border-[#9b7910]" />
      <span className="border-r border-[#9b7910]" />
      <span />
    </span>
  );
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function validatePaymentForm(input: {
  cardholder: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}) {
  if (input.cardholder.trim().length < 3) {
    return "Unesi ime vlasnika kartice.";
  }

  if (input.cardNumber.replace(/\s/g, "") !== "4242424242424242") {
    return "Za ovu simulaciju koristi testnu karticu 4242 4242 4242 4242.";
  }

  const [monthText, yearText] = input.expiry.split("/");
  const month = Number(monthText);
  const year = Number(yearText);
  const now = new Date();
  const currentShortYear = now.getFullYear() % 100;

  if (
    !monthText ||
    !yearText ||
    month < 1 ||
    month > 12 ||
    year < currentShortYear ||
    (year === currentShortYear && month < now.getMonth() + 1)
  ) {
    return "Unesi vazeci buduci datum isteka u formatu MM/GG.";
  }

  if (!/^\d{3,4}$/.test(input.cvc)) {
    return "CVC mora imati 3 ili 4 cifre.";
  }

  return null;
}
