"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import { siteRoutes } from "@/lib/site-routes";

const freeFeatures = [
  "Besplatna prijava i profil",
  "Uređivanje profila jednom mjesečno",
  "Jedan Portfolio Builder export besplatan",
  "Ograničen broj promotivnih materijala",
  "Prisustvo u pretraživaču umjetnika",
  "Pregled oglasne table",
];

const premiumFeatures = [
  "Neograničeno uređivanje profila i radova",
  "Neograničeni portfolio i CV exporti",
  "Neograničeni promotivni materijali",
  "Digitalna vizit karta sa QR kodom",
  "Prijavljivanje na oglase jednim klikom",
  "Automatsko povezivanje profila i portfolija",
  "Pristup ArtBoard Edu sadržajima",
  "Mogućnost kreiranja i prodaje Edu sadržaja",
];

export function ArtBoardPricingSection({ standalone = false }: { standalone?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const Heading = standalone ? "h1" : "h2";

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (typeof IntersectionObserver === "undefined") {
      section.classList.add("artboard-pricing--visible");
      return;
    }

    const pauseObserver = new IntersectionObserver(
      ([entry]) => section.classList.toggle("artboard-pricing--paused", !entry?.isIntersecting),
      { rootMargin: "240px 0px" },
    );
    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        section.classList.add("artboard-pricing--visible");
        revealObserver.disconnect();
      },
      { threshold: 0.22 },
    );

    pauseObserver.observe(section);
    revealObserver.observe(section);
    return () => {
      pauseObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`artboard-pricing ${standalone ? "artboard-pricing--page artboard-pricing--visible" : ""}`}
      id="paketi"
      aria-labelledby="artboard-pricing-title"
    >
      <div className="artboard-pricing__inner">
        <p
          className="artboard-pricing__eyebrow"
          data-pricing-reveal
          style={{ "--pricing-delay": "180ms" } as CSSProperties}
        ><span aria-hidden="true" /> {standalone ? "ArtBoard paketi" : "Paketi i cijene"}</p>
        <Heading
          className="artboard-pricing__title"
          id="artboard-pricing-title"
          data-pricing-reveal
          style={{ "--pricing-delay": "340ms" } as CSSProperties}
        >
          Počni <span data-text="besplatno">besplatno</span>. Izaberi<br className="artboard-pricing__desktop-break" /> više kada ti bude potrebno.
        </Heading>
        <p
          className="artboard-pricing__intro"
          data-pricing-reveal
          style={{ "--pricing-delay": "500ms" } as CSSProperties}
        >
          Kreiraj profil i koristi osnovne ArtBoard servise besplatno ili otključaj puni pristup alatima kroz Premium članstvo.
        </p>

        <div className="artboard-pricing__plans">
          <article
            className="artboard-pricing__plan artboard-pricing__plan--free"
            data-pricing-reveal
            style={{ "--pricing-delay": "680ms" } as CSSProperties}
          >
            <div className="artboard-pricing__plan-head">
              <h3>Besplatno</h3>
              <strong>0€</strong>
            </div>
            <p className="artboard-pricing__description">Za umjetnike koji žele da predstave svoj rad i istraže ArtBoard mogućnosti.</p>
            <p className="artboard-pricing__included">Uključeno</p>
            <ul>
              {freeFeatures.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <Link className="artboard-pricing__action" href={siteRoutes.artistApplication}>Prijavi se besplatno</Link>
          </article>

          <article
            className="artboard-pricing__plan artboard-pricing__plan--premium"
            data-pricing-reveal
            style={{ "--pricing-delay": "860ms" } as CSSProperties}
          >
            <div className="artboard-pricing__plan-head">
              <h3>Premium</h3>
              <strong>od 5€</strong>
            </div>
            <p className="artboard-pricing__description">Isti Premium pristup. Ti biraš iznos koji ti trenutno odgovara.</p>
            <p className="artboard-pricing__included">Uključeno</p>
            <ul>
              {premiumFeatures.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <Link
              className="artboard-pricing__action"
              href={standalone ? "/artist/subscribe" : siteRoutes.subscription}
            >
              Izaberi svoj iznos
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
