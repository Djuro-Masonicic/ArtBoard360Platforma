"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DemoCardCheckout } from "@/components/demo-card-checkout";
import { NavigationButton } from "@/components/navigation-button";
import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";
import { cancelPlatinumSubscriptionRequest } from "@/services/artist-subscriptions";
import type { ArtistSubscription } from "@/types/api";

interface ArtistSubscriptionPanelProps {
  initialSubscription: ArtistSubscription;
  mode: "manage" | "subscribe";
}

export function ArtistSubscriptionPanel({ initialSubscription, mode }: ArtistSubscriptionPanelProps) {
  const router = useRouter();
  const { showAlert } = useUiFeedback();
  const [subscription, setSubscription] = useState(initialSubscription);
  const [isPending, startTransition] = useTransition();
  const isPlatinum = subscription.plan === "PLATINUM" && subscription.status === "ACTIVE";

  useUiLoadingState(isPending);

  function handleCheckoutComplete(nextSubscription: ArtistSubscription) {
    setSubscription(nextSubscription);
    router.push("/artist/subscription");
    router.refresh();
  }

  function handleCancelMembership() {
    if (!window.confirm("Da li sigurno želiš da otkažeš članstvo na kraju tekućeg obračunskog perioda?")) return;

    startTransition(async () => {
      try {
        const nextSubscription = await cancelPlatinumSubscriptionRequest();
        setSubscription(nextSubscription);
        showAlert({
          kind: "success",
          title: "Otkazivanje je zakazano",
          message: "Premium ostaje aktivan do kraja tekućeg obračunskog perioda.",
        });
      } catch (error) {
        showAlert({
          kind: "error",
          title: "Članstvo nije otkazano",
          message: error instanceof Error ? error.message : "Pokušaj ponovo.",
        });
      }
    });
  }

  if (mode === "subscribe") {
    return (
      <main className="mx-auto w-full max-w-[1290px] px-1 pb-20 pt-[92px] sm:px-4 sm:pt-[110px] lg:pt-[126px]">
        <Link className="mb-8 inline-flex items-center gap-2 text-[12px] font-extrabold uppercase text-[#5b6070] transition hover:text-[#111318]" href="/paketi">
          <ChevronLeft aria-hidden="true" size={17} strokeWidth={2.2} />
          Nazad na pakete
        </Link>
        {isPlatinum ? (
          <div className="rounded-[20px] bg-white p-7 shadow-[0_16px_38px_rgba(17,19,24,0.08)] sm:p-10">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#5b6070]">Premium je aktivan</p>
            <h1 className="mt-4 text-[36px] font-extrabold leading-[1.05] text-[#111318] sm:text-[50px]">Promjena iznosa uskoro.</h1>
            <p className="mt-5 max-w-[660px] text-[16px] leading-[1.65] text-[#5b6070]">
              Trenutni sistem još ne čuva izabrani mjesečni iznos. Tvoja postojeća pretplata ostaje aktivna bez promjene.
            </p>
            <NavigationButton className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-[#111318] px-7 text-[13px] font-extrabold uppercase text-white" href="/artist/subscription">
              Nazad na pretplatu
            </NavigationButton>
          </div>
        ) : (
          <DemoCardCheckout onComplete={handleCheckoutComplete} />
        )}
      </main>
    );
  }

  const planName = isPlatinum ? "Premium" : "Free";

  return (
    <main className="-mx-5 -my-8 min-h-screen bg-[#f7f7f9] px-5 pb-24 pt-[126px] sm:-mx-8 sm:px-8 lg:pt-[142px]">
      <div className="mx-auto w-full max-w-[1280px]">
        <header>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.15em] text-[#697083]">Pretplata</p>
          <h1 className="mt-5 text-[40px] font-extrabold leading-[1.02] tracking-normal text-[#111318] sm:text-[54px] lg:text-[66px]">Upravljanje pretplatom</h1>
          <p className="mt-5 max-w-[760px] text-[16px] leading-[1.6] text-[#5b6070] sm:text-[18px]">
            Pregledaj trenutni plan, promijeni iznos članstva ili ga otkaži kad želiš.
          </p>
        </header>

        <section className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,0.95fr)] lg:gap-10">
          <div className="min-w-0 space-y-8">
            <section className="rounded-[20px] bg-white p-6 shadow-[0_16px_38px_rgba(17,19,24,0.07)] sm:p-9">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.13em] text-[#697083]">Trenutni plan</p>
                  <h2 className={isPlatinum ? "mt-3 bg-gradient-to-r from-[#625bd8] via-[#ed2f6c] to-[#ff6c45] bg-clip-text text-[38px] font-extrabold leading-none text-transparent sm:text-[48px]" : "mt-3 text-[38px] font-extrabold leading-none text-[#111318] sm:text-[48px]"}>
                    {planName}
                  </h2>
                </div>
                <StatusBadge cancelAtPeriodEnd={subscription.cancelAtPeriodEnd} status={subscription.status} />
              </div>

              <div className="my-7 h-px bg-[#eceef3]" />
              <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
                <SubscriptionDetail label="Plan aktivan od" value={formatDate(subscription.currentPeriodStart)} />
                <SubscriptionDetail label="Obračunski period do" value={formatDate(subscription.currentPeriodEnd)} />
                <SubscriptionDetail label="Vrsta članstva" value={isPlatinum ? "Premium" : "Besplatno"} />
                <SubscriptionDetail label="Način plaćanja" value={providerLabel(subscription.provider, isPlatinum)} />
              </dl>
            </section>

            <section>
              <p className="text-[12px] font-extrabold uppercase tracking-[0.13em] text-[#697083]">Dostupni planovi</p>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <PlanOption active={!isPlatinum} description="Osnovni ArtBoard servisi za sve odobrene umjetnike: profil, prisustvo u pretraživaču i prvi Portfolio Builder export." name="Free" price="0€" tone="basic" />
                <PlanOption active={isPlatinum} description="Fleksibilna cijena od 5€ do 30€ mjesečno. Isti Premium pristup, bez obzira na izabrani iznos." name="Premium" tone="premium" />
              </div>
            </section>
          </div>

          <aside className="self-start rounded-[20px] bg-white p-6 shadow-[0_16px_38px_rgba(17,19,24,0.07)] sm:p-8 lg:sticky lg:top-[108px]">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.13em] text-[#697083]">{isPlatinum ? "Premium je aktivan" : "Besplatan plan je aktivan"}</p>
            <h2 className="mt-5 text-[30px] font-extrabold leading-[1.08] tracking-normal text-[#111318]">{isPlatinum ? "Tvoj nalog koristi Premium plan." : "Otključaj Premium mogućnosti."}</h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#5b6070]">
              {isPlatinum
                ? subscription.cancelAtPeriodEnd
                  ? `Premium ostaje aktivan do ${formatDate(subscription.currentPeriodEnd)}, a zatim se nalog vraća na Free plan.`
                  : "Imaš pristup svim Premium funkcionalnostima. Iznos članstva možeš promijeniti, a članstvo otkazati u bilo kom trenutku."
                : "Izaberi mjesečni iznos koji ti odgovara i odmah otključaj sve Premium funkcionalnosti."}
            </p>

            <NavigationButton className="mt-7 inline-flex h-[52px] w-full items-center justify-center rounded-full bg-[#111318] px-6 text-[13px] font-extrabold uppercase text-white transition hover:bg-[#2c313f]" href="/artist/subscribe">
              {isPlatinum ? "Promijeni iznos" : "Aktiviraj Premium"}
            </NavigationButton>
            <NavigationButton className="mt-3 inline-flex h-[52px] w-full items-center justify-center rounded-full border border-[#dfe2e9] px-6 text-[13px] font-extrabold uppercase text-[#343948] transition hover:bg-[#f7f7f9]" href="/artist/dashboard">
              Nazad na dashboard
            </NavigationButton>

            {isPlatinum ? (
              <button className="mx-auto mt-5 block text-[14px] font-bold text-[#dc2546] transition hover:text-[#ae1733] disabled:cursor-not-allowed disabled:opacity-50" disabled={isPending || subscription.cancelAtPeriodEnd} onClick={handleCancelMembership} type="button">
                {subscription.cancelAtPeriodEnd ? "Otkazivanje je zakazano" : "Otkaži članstvo"}
              </button>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

function PlanOption({ active, description, name, price, tone }: { active: boolean; description: string; name: string; price?: string; tone: "basic" | "premium" }) {
  const isPremium = tone === "premium";

  return (
    <article className={isPremium ? "min-h-[212px] rounded-[20px] bg-gradient-to-br from-[#655fd8] via-[#ed2f6c] to-[#ff7442] p-7 text-white shadow-[0_18px_38px_rgba(44,108,220,0.16)]" : "min-h-[212px] rounded-[20px] bg-white p-7 shadow-[0_16px_38px_rgba(17,19,24,0.07)]"}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-[26px] font-extrabold leading-none">{name}</h3>
        {active ? (
          <span className={isPremium ? "rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-extrabold" : "rounded-full bg-[#edf4ff] px-3 py-1.5 text-[12px] font-extrabold text-[#1769df]"}>Aktivan</span>
        ) : price ? (
          <span className="text-[18px] font-extrabold text-[#5b6070]">{price}</span>
        ) : null}
      </div>
      <p className={isPremium ? "mt-6 text-[15px] font-semibold leading-[1.65] text-white/90" : "mt-6 text-[15px] leading-[1.65] text-[#5b6070]"}>{description}</p>
    </article>
  );
}

function SubscriptionDetail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[13px] text-[#747b8c]">{label}</dt><dd className="mt-1.5 break-words text-[17px] font-extrabold text-[#171920]">{value}</dd></div>;
}

function StatusBadge({ cancelAtPeriodEnd, status }: { cancelAtPeriodEnd: boolean; status: ArtistSubscription["status"] }) {
  const label = cancelAtPeriodEnd ? "Otkazivanje zakazano" : status === "ACTIVE" ? "Aktivan" : status === "PAST_DUE" ? "Uplata kasni" : status === "CANCELED" ? "Otkazan" : "Istekao";
  return <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#edf4ff] px-4 py-2 text-[13px] font-extrabold text-[#1769df]"><span className="h-2 w-2 rounded-full bg-[#1a7cff]" />{label}</span>;
}

function providerLabel(provider: string | null | undefined, isPlatinum: boolean) {
  if (!isPlatinum) return "Nije potrebno";
  if (provider === "demo-card") return "Platna kartica";
  return provider ?? "Nije evidentirano";
}

function formatDate(value?: string | null) {
  if (!value) return "Nije određeno";
  return new Intl.DateTimeFormat("sr-Latn-ME", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}
