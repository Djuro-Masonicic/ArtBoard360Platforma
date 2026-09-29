"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import { ArtBoardPortfolioTemplatePreview } from "@/components/artboard-portfolio-template-preview";
import { siteRoutes } from "@/lib/site-routes";

const steps = [
  {
    number: "01",
    title: "Generiši iz profila",
    description: "Automatski izvezi podatke i odabrane radove sa svog ArtBoard profila.",
    icon: "profile-export",
    tone: "blue",
  },
  {
    number: "02",
    title: "Odaberi šablon",
    description: "Odaberi gotov dizajnerski šablon i prilagodi izgled svake sekcije.",
    icon: "brush",
    tone: "pink",
  },
  {
    number: "03",
    title: "Sačuvaj i nastavi kasnije",
    description: "Portfolio mijenjaj i dopunjavaj novim radovima kad god ti zatreba.",
    icon: "save",
    tone: "yellow",
  },
] as const;

type PortfolioStepIconName = (typeof steps)[number]["icon"] | "file";

function PortfolioStepIcon({ name }: { name: PortfolioStepIconName }) {
  let paths;

  switch (name) {
    case "profile-export":
      paths = (
        <>
          <circle cx="9.6" cy="8" r="3.2" />
          <path d="M4 19.4c.9-3 3.1-4.6 5.6-4.6 1 0 2 .3 2.8.7" />
          <line x1="13.4" y1="16.6" x2="20" y2="16.6" />
          <polyline points="17.4,13.8 20.4,16.6 17.4,19.4" />
        </>
      );
      break;
    case "brush":
      paths = (
        <>
          <path d="M4 20.2c2.6.6 4.6-.6 5.4-2.6" />
          <path d="M8.4 15.4l8.8-9.6a2 2 0 013 2.7l-9.2 8.8z" />
          <path d="M6.2 17.2a2.6 2.6 0 013 3" />
        </>
      );
      break;
    case "save":
      paths = (
        <>
          <path d="M5 5.4h11l3 3v10.2H5z" />
          <path d="M8.4 5.4v5h6.2v-5" />
          <rect x="8.4" y="13.4" width="6.2" height="5.2" />
        </>
      );
      break;
    case "file":
      paths = (
        <>
          <path d="M6.4 3.6h7.2L18 8v12.4H6.4z" />
          <path d="M13.6 3.6V8H18" />
        </>
      );
      break;
  }

  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {paths}
      </g>
    </svg>
  );
}

export function ArtBoardPortfolioShowcase() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;

    const pauseObserver = new IntersectionObserver(
      ([entry]) => section.classList.toggle("artboard-portfolio--paused", !entry?.isIntersecting),
      { rootMargin: "240px 0px" },
    );
    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        section.classList.add("artboard-portfolio--visible");
        revealObserver.disconnect();
      },
      { threshold: 0.12 },
    );

    pauseObserver.observe(section);
    revealObserver.observe(section);

    return () => {
      pauseObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className="artboard-portfolio" id="portfolio-builder" aria-labelledby="artboard-portfolio-title">
      <div className="artboard-portfolio__frame">
        <div className="artboard-portfolio__content">
          <p className="artboard-portfolio__eyebrow" data-portfolio-reveal>Portfolio Builder</p>
          <h2 className="artboard-portfolio__title" id="artboard-portfolio-title" data-portfolio-reveal style={{ "--portfolio-delay": "70ms" } as CSSProperties}>
            Profesionalni portfolio
            <span>bez komplikovanog dizajniranja.</span>
          </h2>
          <p className="artboard-portfolio__intro" data-portfolio-reveal style={{ "--portfolio-delay": "140ms" } as CSSProperties}>
            Unesi podatke, dodaj radove i odaberi šablon — generiši profesionalno
            dizajniran portfolio spreman za konkurse, galerije i poslodavce.
          </p>

          <div className="artboard-portfolio__grid" data-portfolio-reveal style={{ "--portfolio-delay": "140ms" } as CSSProperties}>
            <div className="artboard-portfolio__steps">
              <ol className="artboard-portfolio__timeline">
                {steps.map(({ number, title, description, icon, tone }) => (
                  <li className={`artboard-portfolio__step artboard-portfolio__step--${tone}`} key={number}>
                    <span className="artboard-portfolio__step-icon" aria-hidden="true">
                      <PortfolioStepIcon name={icon} />
                    </span>
                    <div className="artboard-portfolio__step-card">
                      <h3><span data-number={number}>{number}</span> {title}</h3>
                      <p>{description}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="artboard-portfolio__without-profile">
                <p>Ili bez profila</p>
                <Link className="artboard-portfolio__step artboard-portfolio__step--manual" href={siteRoutes.portfolioBuilder}>
                  <span className="artboard-portfolio__step-icon" aria-hidden="true">
                    <PortfolioStepIcon name="file" />
                  </span>
                  <span className="artboard-portfolio__step-card">
                    <strong><span>04</span> Kreiraj od nule</strong>
                    <small>Ne moraš imati ArtBoard profil. Portfolio možeš izgraditi ručnim unosom podataka i radova.</small>
                  </span>
                </Link>
              </div>
            </div>

            <ArtBoardPortfolioTemplatePreview />
          </div>

          <Link className="artboard-portfolio__cta" href={siteRoutes.portfolioBuilder} data-portfolio-reveal style={{ "--portfolio-delay": "280ms" } as CSSProperties}>
            <span>Isprobaj besplatno</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
