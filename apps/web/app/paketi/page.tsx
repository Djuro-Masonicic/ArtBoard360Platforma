import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ArtBoardPricingSection } from "@/components/artboard-pricing-section";
import { siteRoutes } from "@/lib/site-routes";

export default function PaketiPage() {
  return (
    <div className="-mx-5 -my-8 bg-[#f7f7f9] sm:-mx-8 sm:-my-10 lg:-mx-10 lg:-my-12">
      <ArtBoardPricingSection standalone />

      <section className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-14 lg:pb-28">
        <div className="mx-auto max-w-[1350px] space-y-5">
          <div className="relative overflow-hidden rounded-[24px] bg-[#0d0e14] px-7 py-9 text-white shadow-[0_18px_44px_rgba(17,19,24,0.12)] sm:px-10 sm:py-11 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-12">
            <span
              className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#1a7cff] via-[#ff2d55] to-[#ffd028]"
              aria-hidden="true"
            />
            <div>
              <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#ff6380]">
                Izdvojena napomena
              </p>
              <h2 className="mt-3 text-[30px] font-extrabold leading-tight tracking-normal sm:text-[40px]">
                Treba ti samo portfolio?
              </h2>
              <p className="mt-2 text-[15px] leading-6 text-white/70 sm:text-[17px]">
                Portfolio Builder možeš koristiti i bez ArtBoard profila ili članstva.
              </p>
            </div>

            <Link
              className="mt-7 inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-full bg-white px-7 text-[12px] font-extrabold uppercase text-[#171920] transition hover:bg-[#ffd028] lg:mt-0"
              href={siteRoutes.portfolioBuilder}
            >
              Istraži Portfolio Builder
              <ArrowRight aria-hidden="true" size={17} strokeWidth={2.2} />
            </Link>
          </div>

          <div className="flex flex-col gap-6 rounded-[24px] bg-white px-7 py-7 shadow-[0_14px_36px_rgba(17,19,24,0.07)] sm:px-9 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[15px] leading-6 text-[#626879] sm:text-[17px]">
              Već imaš nalog? Paket možeš promijeniti ili otkazati u bilo kom trenutku.
            </p>
            <Link
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-full bg-[#111318] px-7 text-[12px] font-extrabold uppercase text-white transition hover:bg-[#2d313b]"
              href={siteRoutes.subscription}
            >
              Upravljaj pretplatom
              <ArrowRight aria-hidden="true" size={17} strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
