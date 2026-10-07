"use client";

import { Coffee } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";

import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";
import { completeDemoPlatinumCheckout } from "@/services/artist-subscriptions";
import type { ArtistSubscription } from "@/types/api";

interface DemoCardCheckoutProps {
  onComplete: (subscription: ArtistSubscription) => void;
}

const amountStops = [5, 10, 15, 20, 25, 30];

export function DemoCardCheckout({ onComplete }: DemoCardCheckoutProps) {
  const { showAlert } = useUiFeedback();
  const [amount, setAmount] = useState(6);
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [isPending, startTransition] = useTransition();
  const progress = ((amount - 5) / 25) * 100;

  useUiLoadingState(isPending);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errorMessage = validateCardForm({ cardholder, cardNumber, expiry, cvc });

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
          title: "Premium je aktiviran",
          message: `Testna uplata od ${amount} € je uspješna. Stvarna naplata nije izvršena.`,
          durationMs: 6000,
        });
      } catch (error) {
        showAlert({
          kind: "error",
          title: "Uplata nije uspjela",
          message: error instanceof Error ? error.message : "Pokušaj ponovo.",
        });
      }
    });
  }

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:gap-10">
      <section className="min-w-0 pt-1">
        <div className="flex items-center gap-2.5">
          <span className="h-[9px] w-[9px] rounded-full bg-gradient-to-br from-[#1a7cff] via-[#ff2d55] to-[#ffd028]" />
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#5b6070]">
            Premium članstvo
          </p>
        </div>

        <h1 className="mt-5 text-[42px] font-extrabold leading-[1.03] tracking-normal text-[#111318] sm:text-[56px]">
          Izaberi svoj <span className="bg-gradient-to-r from-[#1a7cff] via-[#ff2d55] to-[#ffad2b] bg-clip-text text-transparent">iznos</span>.
        </h1>
        <p className="mt-5 max-w-[560px] text-[15px] leading-[1.65] text-[#4a4f60] sm:text-[17px]">
          Svi iznosi otključavaju iste Premium mogućnosti. Izaberi koliko možeš i želiš da izdvojiš, a svoj iznos možeš kasnije promijeniti.
        </p>

        <div className="mt-8 rounded-[24px] bg-white p-6 shadow-[0_16px_38px_rgba(17,19,24,0.08)] sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-baseline gap-2.5">
              <strong className="bg-gradient-to-r from-[#1a7cff] via-[#ff2d55] to-[#ffad2b] bg-clip-text text-[52px] font-extrabold leading-none tabular-nums text-transparent sm:text-[64px]">
                {amount}€
              </strong>
              <span className="text-[14px] font-bold text-[#8a8f9f]">/ mjesečno</span>
            </div>

            <div className="flex items-center gap-4 sm:max-w-[260px]">
              <p className="flex-1 text-right text-[15px] font-bold leading-5 text-[#2c313f]">
                {amountMessage(amount)}
              </p>
              <span className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1a7cff] via-[#ff2d55] to-[#ffd028] p-[2px]">
                <span className="grid h-full w-full place-items-center rounded-full bg-[#111318]">
                  <Coffee aria-hidden="true" color="white" size={28} strokeWidth={1.7} />
                </span>
              </span>
            </div>
          </div>

          <input
            aria-label="Mjesečni iznos"
            className="premium-amount-range mt-10 w-full"
            max="30"
            min="5"
            onChange={(event) => setAmount(Number(event.target.value))}
            style={{
              background: `linear-gradient(90deg, #1a7cff 0%, #ff2d55 ${Math.max(progress, 1)}%, #eceef3 ${Math.max(progress, 1)}%, #eceef3 100%)`,
            }}
            type="range"
            value={amount}
          />
          <div className="mt-3 flex justify-between">
            {amountStops.map((value) => (
              <span className="text-[11px] font-bold text-[#8a8f9f] sm:text-[12px]" key={value}>
                {value}€
              </span>
            ))}
          </div>
        </div>
      </section>

      <form
        className="relative min-w-0 overflow-hidden rounded-[24px] bg-white p-6 shadow-[0_16px_38px_rgba(17,19,24,0.08)] sm:p-9"
        onSubmit={handleSubmit}
      >
        <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1a7cff] via-[#ff2d55] to-[#ffd028]" />
        <h2 className="text-[26px] font-extrabold leading-tight tracking-normal text-[#111318]">
          Detalji plaćanja
        </h2>

        <div className="mt-5 space-y-3 text-[14px]">
          <div className="flex justify-between gap-4">
            <span className="text-[#4a4f60]">ArtBoard Premium</span>
            <strong>{amount}€ / mj.</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#4a4f60]">Naplata</span>
            <strong>Mjesečno</strong>
          </div>
        </div>

        <div className="my-5 h-px bg-[#eceef3]" />
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[14px] text-[#4a4f60]">Ukupno danas</span>
          <strong className="text-[30px] font-extrabold tabular-nums">{amount}€</strong>
        </div>

        <p className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8a8f9f]">
          Podaci o kartici
        </p>
        <div className="mt-4 space-y-4">
          <CheckoutField label="Ime na kartici">
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
            <input
              autoComplete="cc-number"
              className={`${inputClassName} font-mono`}
              inputMode="numeric"
              maxLength={19}
              onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
              placeholder="1234 5678 9012 3456"
              required
              value={cardNumber}
            />
          </CheckoutField>

          <div className="grid grid-cols-2 gap-3">
            <CheckoutField label="Datum isteka">
              <input
                autoComplete="cc-exp"
                className={inputClassName}
                inputMode="numeric"
                maxLength={5}
                onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                placeholder="MM / GG"
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

        <button
          className="mt-6 inline-flex h-[50px] w-full items-center justify-center rounded-full bg-[#111318] px-6 text-[14px] font-extrabold text-white transition hover:bg-[#2c313f] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Obrada testne uplate..." : `Plati ${amount}€ i postani Premium član`}
        </button>
        <p className="mt-3 text-center text-[12px] leading-5 text-[#8a8f9f]">
          Testni checkout: koristi 4242 4242 4242 4242, budući datum i bilo koji trocifreni CVC. Stvarna naplata se ne izvršava.
        </p>
      </form>
    </div>
  );
}

const inputClassName =
  "h-[50px] w-full min-w-0 rounded-[12px] border border-[#e3e5eb] bg-[#f7f7f9] px-4 text-[15px] text-[#111318] outline-none transition placeholder:text-[#9ca2b1] focus:border-[#1a7cff] focus:bg-white focus:ring-4 focus:ring-[#1a7cff]/10";

function CheckoutField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-[12px] font-bold text-[#4a4f60]">{label}</span>
      {children}
    </label>
  );
}

function amountMessage(amount: number) {
  if (amount <= 7) return "Plati kafu.";
  if (amount <= 12) return "Podrži jedan kreativni dan.";
  if (amount <= 20) return "Pokreni nove mogućnosti.";
  return "Gradi ArtBoard sa nama.";
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
  if (input.cardholder.trim().length < 3) return "Unesi ime vlasnika kartice.";

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
    return "Unesi važeći budući datum isteka u formatu MM/GG.";
  }

  if (!/^\d{3,4}$/.test(input.cvc)) return "CVC mora imati 3 ili 4 cifre.";

  return null;
}
