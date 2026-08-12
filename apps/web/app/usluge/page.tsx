import Link from "next/link";

import { SiteCtaButton } from "@/components/site-cta-button";
import { siteRoutes } from "@/lib/site-routes";

const services = [
  "Portfolio priprema i profesionalna prezentacija",
  "Kreativna produkcija i vizuelni materijali",
  "Podrska za umjetnike, saradnike i kulturne projekte",
];

/**
 * Public services page.
 *
 * The final service catalogue is not modeled in the database yet, so this is a
 * stable content page that can later become CMS/admin-driven without changing
 * the route or public navigation.
 */
export default function UslugePage() {
  return (
    <main className="mx-auto max-w-[1160px] px-4 pb-20 pt-[18vh] sm:px-6">
      <section className="rounded-[38px] border border-[#dce5f1] bg-white p-8 shadow-[0_24px_70px_rgba(38,51,71,0.08)] sm:p-12">
        <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#ffc41d]">
          Usluge
        </p>
        <h1 className="mt-5 max-w-[780px] text-[44px] font-bold leading-[0.98] tracking-[-0.04em] text-[#2f3138] sm:text-[64px]">
          Art Studio 360 kao kreativni partner.
        </h1>
        <p className="mt-6 max-w-[760px] text-[20px] leading-[1.5] text-[#4e5560]">
          Ovdje ce se nalaziti usluge koje pripadaju Art Studio 360 dijelu sistema:
          produkcija, savjetovanje, portfolio priprema, saradnje i kreativni projekti.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {services.map((service) => (
            <article className="rounded-[26px] border border-[#e1e8f2] bg-[#f8fbff] p-6" key={service}>
              <span className="mb-5 block h-4 w-4 rounded-full bg-[#ffc41d]" aria-hidden="true" />
              <h2 className="text-[22px] font-bold leading-[1.15] tracking-[-0.03em] text-[#2f3138]">
                {service}
              </h2>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <SiteCtaButton href={siteRoutes.contact} label="Kontaktiraj nas" />
          <Link
            className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#d4deec] px-6 text-[16px] font-bold text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
            href={siteRoutes.artboard}
          >
            Saznaj vise o ArtBoardu
          </Link>
        </div>
      </section>
    </main>
  );
}
