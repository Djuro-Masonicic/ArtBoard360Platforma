"use client";

import { FormEvent, useState, useTransition } from "react";

import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";
import { completeDemoPlatinumCheckout } from "@/services/artist-subscriptions";
import type { ArtistSubscription } from "@/types/api";

interface DemoCardCheckoutProps {
  onComplete: (subscription: ArtistSubscription) => void;
}

export function DemoCardCheckout({ onComplete }: DemoCardCheckoutProps) {
  const { showAlert } = useUiFeedback();
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [isPending, startTransition] = useTransition();

  useUiLoadingState(isPending);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errorMessage = validateCardForm({
      cardholder,
      cardNumber,
      expiry,
      cvc,
    });

    if (errorMessage) {
      showAlert({
        kind: "error",
        title: "Provjeri podatke kartice",
        message: errorMessage,
      });
      return;
    }

    startTransition(async () => {
      try {
        const subscription = await completeDemoPlatinumCheckout();
        onComplete(subscription);
        showAlert({
          kind: "success",
          title: "Platinum je aktiviran",
          message: "Testna uplata je uspjesna. Nije izvrsena stvarna naplata.",
          durationMs: 6000,
        });
      } catch (error) {
        showAlert({
          kind: "error",
          title: "Uplata nije uspjela",
          message: error instanceof Error ? error.message : "Pokusaj ponovo.",
        });
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#d9e0ec] bg-white shadow-[0_24px_70px_rgba(31,46,86,0.09)]">
      <div className="grid lg:grid-cols-[0.88fr_1.12fr]">
        <div className="relative overflow-hidden bg-[#182fc7] p-6 text-white sm:p-8">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border border-white/20" />
          <div className="absolute -bottom-24 -left-14 h-56 w-56 rounded-full border border-white/15" />

          <div className="relative">
            <span className="inline-flex rounded-full bg-[#ffc41d] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#252b38]">
              Demo placanje
            </span>
            <h2 className="mt-6 text-[32px] font-bold leading-[1.05]">
              ArtBoard Platinum
            </h2>
            <p className="mt-3 text-[15px] leading-[1.6] text-white/75">
              Probni checkout za testiranje premium clanstva. Kartica se ne naplacuje i podaci se ne cuvaju.
            </p>

            <div className="mt-10 rounded-[22px] border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                    Mjesecno
                  </p>
                  <p className="mt-2 text-[34px] font-bold">9,99 EUR</p>
                </div>
                <CardChip />
              </div>
              <p className="mt-8 font-mono text-[17px] tracking-[0.12em]">
                {cardNumber || "4242 4242 4242 4242"}
              </p>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/55">
                    Vlasnik kartice
                  </p>
                  <p className="mt-1 truncate text-[13px] font-semibold uppercase">
                    {cardholder || "IME I PREZIME"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/55">
                    Vazi do
                  </p>
                  <p className="mt-1 text-[13px] font-semibold">{expiry || "12/30"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form className="p-6 sm:p-8 lg:p-10" onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#dc1735]">
                Sigurna testna forma
              </p>
              <h3 className="mt-2 text-[28px] font-bold text-[#2f3138]">
                Podaci kartice
              </h3>
            </div>
            <span className="rounded-full bg-[#f2f5f9] px-3 py-1 text-[11px] font-semibold text-[#687180]">
              TEST MODE
            </span>
          </div>

          <div className="mt-8 space-y-5">
            <CheckoutField label="Ime vlasnika kartice">
              <input
                autoComplete="cc-name"
                className={inputClassName}
                maxLength={70}
                onChange={(event) => setCardholder(event.target.value)}
                placeholder="Ime i prezime"
                required
                value={cardholder}
              />
            </CheckoutField>

            <CheckoutField label="Broj kartice">
              <div className="relative">
                <input
                  autoComplete="cc-number"
                  className={`${inputClassName} pr-14 font-mono tracking-[0.06em]`}
                  inputMode="numeric"
                  maxLength={19}
                  onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                  placeholder="4242 4242 4242 4242"
                  required
                  value={cardNumber}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#182fc7]">
                  VISA
                </span>
              </div>
            </CheckoutField>

            <div className="grid grid-cols-2 gap-4">
              <CheckoutField label="Datum isteka">
                <input
                  autoComplete="cc-exp"
                  className={inputClassName}
                  inputMode="numeric"
                  maxLength={5}
                  onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                  placeholder="MM/GG"
                  required
                  value={expiry}
                />
              </CheckoutField>
              <CheckoutField label="CVC">
                <input
                  autoComplete="cc-csc"
                  className={inputClassName}
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) => setCvc(event.target.value.replace(/\D/g, ""))}
                  placeholder="123"
                  required
                  type="password"
                  value={cvc}
                />
              </CheckoutField>
            </div>
          </div>

          <div className="mt-7 rounded-[16px] bg-[#fff8dc] p-4 text-[13px] leading-[1.55] text-[#685516]">
            Za test koristi <strong>4242 4242 4242 4242</strong>, bilo koji buduci datum i bilo koji trocifreni CVC.
          </div>

          <button
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#dc1735] px-6 text-[15px] font-bold text-white transition hover:bg-[#bd102a] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Obrada testne uplate..." : "Aktiviraj Platinum - 9,99 EUR"}
          </button>
          <p className="mt-3 text-center text-[12px] text-[#87909d]">
            Ovo je simulacija. Stvarna finansijska transakcija se ne izvrsava.
          </p>
        </form>
      </div>
    </section>
  );
}

const inputClassName =
  "h-12 w-full rounded-[14px] border border-[#d5ddea] bg-[#fbfcfe] px-4 text-[15px] text-[#2f3138] outline-none transition placeholder:text-[#a2aab7] focus:border-[#182fc7] focus:bg-white focus:ring-4 focus:ring-[#182fc7]/10";

function CheckoutField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold text-[#4d5664]">{label}</span>
      {children}
    </label>
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

function validateCardForm(input: {
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
