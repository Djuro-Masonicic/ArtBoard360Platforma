"use client";

import { useRef, useState } from "react";

import { NavigationButton } from "@/components/navigation-button";

type BenefitTone = "blue" | "red" | "yellow";

interface Benefit {
  description: string;
  icon: "user" | "eye" | "coins" | "door" | "heart";
  title: string;
  tone: BenefitTone;
}

const benefits: Benefit[] = [
  {
    description:
      "Prijava na Platformu je besplatna, a ako prodjes selekciju, dobijas besplatan ArtBoard profil i priliku da predstavis svoj rad siroj publici.",
    icon: "user",
    title: "Besplatna prijava",
    tone: "blue",
  },
  {
    description:
      "Platforma ce povecati tvoju vidljivost u digitalnom i realnom svijetu i time ti olaksati povezivanje sa publikom i potencijalnim kupcima.",
    icon: "eye",
    title: "Povecana vidljivost",
    tone: "red",
  },
  {
    description:
      "Publika, saradnici i potencijalni klijenti sada te mogu lako pronaci, a to je prvi korak ka profitabilnom angazmanu.",
    icon: "coins",
    title: "Karijerne prilike i angazmani",
    tone: "yellow",
  },
  {
    description:
      "U saradnji sa KC Kruzni tok, omogucavamo prostor za izlaganje, promociju i prodaju radova, za dodatno povecanje njihove vidljivosti.",
    icon: "door",
    title: "Izlozbeni prostor",
    tone: "blue",
  },
  {
    description:
      "Pruzamo kontinuiranu podrsku umjetnicima kroz umrezavanje sa kolegama, savjete i resurse koji doprinose profesionalnom napretku.",
    icon: "heart",
    title: "Podrska i razvoj",
    tone: "red",
  },
];

export function HomeBenefitsSection() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  function handleScroll(direction: "left" | "right") {
    const viewportElement = viewportRef.current;
    const trackElement = trackRef.current;

    if (!viewportElement || !trackElement) {
      return;
    }

    const firstCard = trackElement.querySelector<HTMLElement>("[data-benefit-card]");
    const trackStyles = window.getComputedStyle(trackElement);
    const gap = Number.parseFloat(trackStyles.columnGap || trackStyles.gap || "20") || 20;
    const step = firstCard ? firstCard.offsetWidth + gap : 340;
    // We intentionally allow a little extra travel at the end of the carousel.
    // That keeps the final card away from the right edge instead of making it
    // feel glued to the browser border.
    const rightEndGap = window.innerWidth * 0.1;
    const maxOffset = Math.max(trackElement.scrollWidth - viewportElement.clientWidth + rightEndGap, 0);

    setOffset((currentOffset) => {
      const nextOffset = direction === "left" ? currentOffset - step : currentOffset + step;
      return Math.min(Math.max(nextOffset, 0), maxOffset);
    });
  }

  return (
    <section className="relative bg-[#f8fbff] py-12 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[2.15rem] font-normal leading-[0.96] tracking-[-0.045em] text-[#555b64] sm:text-[3rem] lg:text-[3.65rem]">
            Sta ti nudi
            <strong className="block font-bold text-[#2f3138]">
              ArtBoard platforma<span className="text-[#ffc41d]">?</span>
            </strong>
          </h2>

          <div className="flex gap-4 sm:pb-3">
            <button
              aria-label="Prethodne pogodnosti"
              className="home-benefits-arrow"
              onClick={() => handleScroll("left")}
              type="button"
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              aria-label="Sljedece pogodnosti"
              className="home-benefits-arrow"
              onClick={() => handleScroll("right")}
              type="button"
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>
      </div>

      <div className="home-benefits-bleed mt-10" ref={viewportRef}>
        <div
          className="home-benefits-track flex gap-5 pb-4"
          ref={trackRef}
          style={{ transform: `translate3d(-${offset}px, 0, 0)` }}
        >
          {benefits.map((benefit) => (
            <article
              className="relative flex min-h-[320px] w-[min(350px,82vw)] flex-none flex-col rounded-[22px] border border-[#e5eaf2] bg-white p-7 shadow-[0_18px_44px_rgba(37,51,73,0.07)]"
              data-benefit-card
              key={benefit.title}
            >
              {benefit.title === "Izlozbeni prostor" ? (
                <div
                  aria-hidden="true"
                  className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-2 border-[#9fb1ff] bg-[radial-gradient(circle_at_center,#f9e2df_0_35%,transparent_36%)] opacity-90"
                />
              ) : null}

              <div className={`home-benefits-icon home-benefits-icon--${benefit.tone}`}>
                <BenefitIcon icon={benefit.icon} />
              </div>

              <h3 className="mt-6 text-[22px] font-bold leading-[1.08] text-[#252933]">
                {benefit.title}
              </h3>
              <p className="mt-3 text-[17px] font-medium leading-[1.28] text-[#252933]">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <NavigationButton
          className="mt-8 inline-flex min-h-[46px] items-center gap-3 rounded-full border-2 border-[#ffc41d] bg-[#ffc41d] px-5 text-[16px] font-bold text-[#252933] outline outline-1 outline-offset-2 outline-[#ffc41d] transition hover:bg-white"
          href="/artists"
        >
          <span className="h-3 w-3 rounded-full bg-white" aria-hidden="true" />
          Saznaj sve o ArtBoardu
        </NavigationButton>
      </div>
    </section>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 24 24">
      <path
        d={direction === "left" ? "M15 5L8 12L15 19" : "M9 5L16 12L9 19"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function BenefitIcon({ icon }: { icon: Benefit["icon"] }) {
  if (icon === "user") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M9.8 11.2A3.7 3.7 0 1 0 9.8 3.8a3.7 3.7 0 0 0 0 7.4Z" stroke="currentColor" strokeWidth="2.2" />
        <path d="M3.5 20.2c.7-3.9 3-6.1 6.3-6.1 2 0 3.7.8 4.8 2.2" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
        <path d="M18.2 8v7.4M14.5 11.7h7.4" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  if (icon === "eye") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M3.5 12s3-5.4 8.5-5.4 8.5 5.4 8.5 5.4-3 5.4-8.5 5.4S3.5 12 3.5 12Z" stroke="currentColor" strokeWidth="2.2" />
        <path d="M12 14.7a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z" stroke="currentColor" strokeWidth="2.2" />
      </svg>
    );
  }

  if (icon === "coins") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M12 8.5c4.1 0 7.4-1.2 7.4-2.7S16.1 3.1 12 3.1 4.6 4.3 4.6 5.8 7.9 8.5 12 8.5Z" stroke="currentColor" strokeWidth="2.2" />
        <path d="M4.6 5.8v4.7c0 1.5 3.3 2.7 7.4 2.7s7.4-1.2 7.4-2.7V5.8" stroke="currentColor" strokeWidth="2.2" />
        <path d="M4.6 10.5v4.7c0 1.5 3.3 2.7 7.4 2.7s7.4-1.2 7.4-2.7v-4.7" stroke="currentColor" strokeWidth="2.2" />
      </svg>
    );
  }

  if (icon === "door") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M5.4 20.4V4.2h7.4v16.2H5.4Z" stroke="currentColor" strokeWidth="2.2" />
        <path d="M12.8 6.5 18.6 8v10.2l-5.8 2.2V6.5Z" stroke="currentColor" strokeWidth="2.2" />
        <path d="M15.6 13.1h.1" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M10.5 19.4 5.7 17a3 3 0 0 1-1.7-2.7v-1.2h5.2l2.1-4.1 2.3 7.2 1.6-3.1h4.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      <path d="M12.1 6.3c1-1.7 3.5-2.2 5.1-.7 1.8 1.7 1.7 4.4.2 6.2" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}
