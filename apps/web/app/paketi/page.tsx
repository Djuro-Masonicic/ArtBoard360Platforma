import Link from "next/link";

import { SiteCtaButton } from "@/components/site-cta-button";
import { siteRoutes } from "@/lib/site-routes";

const plans = [
  {
    name: "Basic",
    price: "Besplatno",
    tone: "blue",
    description: "Osnovni ArtBoard profil za umjetnike koji prodju selekciju.",
    features: [
      "Javni artist profil",
      "Prikaz odabranih radova",
      "Osnovni kontakt i drustvene mreze",
      "Pristup artist dashboard-u",
    ],
  },
  {
    name: "Premium",
    price: "U pripremi",
    tone: "red",
    description: "Napredni alati za profesionalniju prezentaciju i portfolio materijale.",
    features: [
      "Portfolio Builder bez watermarka",
      "Vise PDF templatea",
      "Naprednije upravljanje radovima",
      "Buduce premium pogodnosti i vidljivost",
    ],
  },
];

/**
 * Public package page.
 *
 * This gives the new ArtBoard structure a clear pricing/membership route while
 * the actual subscription logic remains in the existing artist dashboard flow.
 */
export default function PaketiPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-20 pt-[18vh] sm:px-6">
      <section className="text-center">
        <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#7b8391]">
          ArtBoard paketi
        </p>
        <h1 className="mx-auto mt-5 max-w-[880px] text-[44px] font-bold leading-[0.98] tracking-[-0.04em] text-[#2f3138] sm:text-[64px]">
          Izaberi nivo prisustva na platformi.
        </h1>
        <p className="mx-auto mt-6 max-w-[760px] text-[20px] leading-[1.45] text-[#4e5560]">
          Svaki odobreni umjetnik krece sa Basic profilom. Premium otkljucava alate za
          profesionalnije portfolije i napredniju prezentaciju.
        </p>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-2">
        {plans.map((plan) => (
          <article
            className="rounded-[34px] border border-[#dce5f1] bg-white p-8 shadow-[0_24px_70px_rgba(38,51,71,0.08)] sm:p-10"
            key={plan.name}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p
                  className={
                    plan.tone === "red"
                      ? "text-[13px] font-bold uppercase tracking-[0.28em] text-[#dc1735]"
                      : "text-[13px] font-bold uppercase tracking-[0.28em] text-[#182fc7]"
                  }
                >
                  {plan.name}
                </p>
                <h2 className="mt-3 text-[34px] font-bold tracking-[-0.04em] text-[#2f3138]">
                  {plan.price}
                </h2>
              </div>

              {plan.name === "Premium" ? (
                <span className="w-fit rounded-full border border-[#ffe1e7] bg-[#fff4f6] px-4 py-2 text-[14px] font-bold text-[#dc1735]">
                  Za aktivne clanove
                </span>
              ) : (
                <span className="w-fit rounded-full border border-[#dce4ff] bg-[#f2f5ff] px-4 py-2 text-[14px] font-bold text-[#182fc7]">
                  Pocetni paket
                </span>
              )}
            </div>

            <p className="mt-6 text-[18px] leading-[1.45] text-[#4e5560]">{plan.description}</p>

            <ul className="mt-8 space-y-3">
              {plan.features.map((feature) => (
                <li className="flex gap-3 text-[17px] text-[#2f3138]" key={feature}>
                  <span
                    className={
                      plan.tone === "red"
                        ? "mt-1 h-3 w-3 shrink-0 rounded-full bg-[#dc1735]"
                        : "mt-1 h-3 w-3 shrink-0 rounded-full bg-[#182fc7]"
                    }
                    aria-hidden="true"
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <SiteCtaButton href={siteRoutes.artistApplication} label="Prijavi se" />
        <Link
          className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#d4deec] px-6 text-[16px] font-bold text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
          href={siteRoutes.subscription}
        >
          Upravljaj pretplatom
        </Link>
      </div>
    </div>
  );
}
