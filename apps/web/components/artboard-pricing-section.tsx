"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { Check } from "lucide-react";

import { siteRoutes } from "@/lib/site-routes";

const freeFeatures = [
  "Besplatna prijava i profil",
  "Uređivanje profila jednom mjesečno",
  "1 besplatna Instagram objava (10 dodatnih za 4,90 €)",
  "1 besplatan Portfolio Builder export",
  "1 besplatna QR vizit karta",
  "Prisustvo u pretraživaču umjetnika",
  "Pregled oglasne table",
];

const premiumFeatures = [
  { label: "Neograničeno uređivanje profila i radova" },
  { label: "Automatsko povezivanje profila i portfolija" },
  { label: "10 Instagram objava mjesečno (10 dodatnih za 4,90 €)" },
  { label: "5 Portfolio Builder exporta mjesečno (dodatni 4,90 €)" },
  { label: "Neograničen export QR vizit kartica" },
  { label: "Pristup ArtBoard Edu sadržajima", comingSoon: true },
  { label: "Mogućnost kreiranja i prodaje Edu sadržaja", comingSoon: true },
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
        >{standalone ? "ArtBoard paketi" : "Paketi i cijene"}</p>
        <Heading
          className="artboard-pricing__title"
          id="artboard-pricing-title"
          data-pricing-reveal
          style={{ "--pricing-delay": "340ms" } as CSSProperties}
        >
          Počni <span data-text="besplatno">besplatno</span>.<br className="artboard-pricing__desktop-break" />Izaberi više kada ti bude potrebno.
        </Heading>
        <p
          className="artboard-pricing__intro"
          data-pricing-reveal
          style={{ "--pricing-delay": "500ms" } as CSSProperties}
        >
          Kreiraj profil i koristi osnovne ArtBoard servise besplatno ili otključaj napredne mogućnosti alata kroz Premium članstvo.
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
              {freeFeatures.map((feature) => (
                <li key={feature}><Check aria-hidden="true" size={16} strokeWidth={2.6} /><span>{feature}</span></li>
              ))}
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
              <strong><span className="artboard-pricing__price-prefix">od</span><span className="artboard-pricing__price">8,90€</span></strong>
            </div>
            <p className="artboard-pricing__description">Isti Premium pristup. Ti biraš iznos koji ti trenutno odgovara.</p>
            <p className="artboard-pricing__included">Uključeno</p>
            <ul>
              {premiumFeatures.map((feature) => (
                <li key={feature.label}>
                  <Check aria-hidden="true" size={16} strokeWidth={2.6} />
                  <span>{feature.label}{feature.comingSoon ? <em>Uskoro</em> : null}</span>
                </li>
              ))}
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
