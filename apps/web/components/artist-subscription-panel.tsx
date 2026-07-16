"use client";

import { useState } from "react";

import { DemoCardCheckout } from "@/components/demo-card-checkout";
import { NavigationButton } from "@/components/navigation-button";
import type { ArtistSubscription } from "@/types/api";

interface ArtistSubscriptionPanelProps {
  initialSubscription: ArtistSubscription;
  mode: "manage" | "subscribe";
}

export function ArtistSubscriptionPanel({
  initialSubscription,
  mode,
}: ArtistSubscriptionPanelProps) {
  const [subscription, setSubscription] = useState(initialSubscription);
  const isPlatinum = subscription.plan === "PLATINUM" && subscription.status === "ACTIVE";

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-[16vh] sm:px-8">
      <header className="border-b border-[#dce4ef] pb-7">
        <p className="text-[12px] font-semibold uppercase text-[#7f8794]">Pretplata</p>
        <h1 className="mt-3 text-[40px] font-bold leading-[1.02] text-[#2f3138] sm:text-[52px]">
          {mode === "manage" ? "Upravljanje pretplatom" : "Platinum plan"}
        </h1>
        <p className="mt-4 max-w-[720px] text-[17px] leading-[1.65] text-[#5c6572]">
          {mode === "manage"
            ? "Pregledaj trenutni plan i aktiviraj Platinum kad si spreman."
            : "Aktiviraj Platinum plan kroz testni checkout. Nema admin odobravanja i promjena se vidi odmah."}
        </p>
      </header>

      <section className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          {mode === "subscribe" && !isPlatinum ? (
            <DemoCardCheckout onComplete={setSubscription} />
          ) : null}

          <section>
            <div className="flex flex-col gap-4 border-b border-[#e2e8f0] pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase text-[#7f8794]">Trenutni plan</p>
                <h2 className="mt-2 text-[30px] font-semibold text-[#2f3138]">{subscription.plan}</h2>
              </div>
              <StatusBadge status={subscription.status} />
            </div>

            <dl className="grid gap-x-8 gap-y-5 py-6 sm:grid-cols-2">
              <SubscriptionDetail label="Plan aktivan od" value={formatDate(subscription.currentPeriodStart)} />
              <SubscriptionDetail label="Obracunski period do" value={formatDate(subscription.currentPeriodEnd)} />
              <SubscriptionDetail
                label="Nadogradnja"
                value={isPlatinum ? "Platinum je aktivan" : "Direktna aktivacija kroz checkout"}
              />
              <SubscriptionDetail label="Nacin naplate" value={subscription.provider ?? "Jos nije povezan"} />
            </dl>
          </section>

          <section className="border-t border-[#dce4ef] pt-8">
            <p className="text-[12px] font-semibold uppercase text-[#7f8794]">Dostupni planovi</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <PlanOption
                active={subscription.plan === "BASIC"}
                description="Podrazumijevani plan za sve odobrene ArtBoard umjetnike."
                name="Basic"
                tone="basic"
              />
              <PlanOption
                active={isPlatinum}
                description="Aktivira se odmah nakon checkouta. Pogodnosti cemo prosirivati po fazama."
                name="Platinum"
                tone="platinum"
              />
            </div>
          </section>
        </div>

        <aside className="self-start rounded-[16px] border border-[#dce4ef] bg-white p-5 shadow-[0_14px_34px_rgba(31,46,86,0.06)]">
          <p className="text-[12px] font-semibold uppercase text-[#7f8794]">
            {isPlatinum ? "Platinum je aktivan" : "Nadogradi plan"}
          </p>
          <h2 className="mt-3 text-[24px] font-semibold leading-[1.15] text-[#2f3138]">
            {isPlatinum
              ? "Tvoj nalog koristi Platinum plan."
              : "Aktiviraj Platinum bez cekanja."}
          </h2>
          <p className="mt-3 text-[14px] leading-[1.65] text-[#66707d]">
            BASIC ostaje aktivan dok ne prodjes checkout. Nakon toga se nalog automatski prebacuje na Platinum.
          </p>

          {mode === "manage" && !isPlatinum ? (
            <NavigationButton
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#dc1735] px-5 text-[14px] font-semibold text-white transition hover:bg-[#bd102a] disabled:opacity-60"
              href="/artist/subscribe"
            >
              Aktiviraj Platinum
            </NavigationButton>
          ) : null}

          <NavigationButton
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full border border-[#d7dee9] px-5 text-[14px] font-semibold text-[#4f5967] transition hover:bg-[#f8fbff]"
            href={mode === "manage" ? "/artist/dashboard" : "/artist/subscription"}
          >
            {mode === "manage" ? "Nazad na dashboard" : "Upravljaj pretplatom"}
          </NavigationButton>
        </aside>
      </section>
    </main>
  );
}

function PlanOption({
  active,
  description,
  name,
  tone,
}: {
  active: boolean;
  description: string;
  name: string;
  tone: "basic" | "platinum";
}) {
  const accentClassName = tone === "platinum" ? "border-[#182fc7]" : "border-[#dce4ef]";

  return (
    <article className={`min-h-[180px] rounded-[16px] border bg-white p-5 ${accentClassName}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[24px] font-semibold text-[#2f3138]">{name}</h3>
        {active ? (
          <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[12px] font-semibold text-[#182fc7]">
            Aktivan
          </span>
        ) : null}
      </div>
      <p className="mt-5 text-[15px] leading-[1.65] text-[#66707d]">{description}</p>
    </article>
  );
}

function SubscriptionDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-[#7d8694]">{label}</dt>
      <dd className="mt-1 break-words text-[16px] font-semibold text-[#2f3138]">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: ArtistSubscription["status"] }) {
  const label =
    status === "ACTIVE"
      ? "Aktivna"
      : status === "PAST_DUE"
        ? "Kasni uplata"
        : status === "CANCELED"
          ? "Otkazana"
          : "Istekla";

  return (
    <span className="inline-flex w-fit rounded-full bg-[#eef2ff] px-4 py-2 text-[13px] font-semibold text-[#182fc7]">
      {label}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Nije odredeno";
  }

  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
