import Link from "next/link";
import { FilePlus2, Paintbrush, Save, UserRoundArrowLeft } from "lucide-react";

import { ArtBoardPortfolioTemplatePreview } from "@/components/artboard-portfolio-template-preview";
import { siteRoutes } from "@/lib/site-routes";

const steps = [
  {
    number: "01",
    title: "Generiši iz profila",
    description: "Automatski izvezi podatke i odabrane radove sa svog ArtBoard profila.",
    icon: UserRoundArrowLeft,
    tone: "blue",
  },
  {
    number: "02",
    title: "Odaberi šablon",
    description: "Odaberi gotov dizajnerski šablon i prilagodi izgled svake sekcije.",
    icon: Paintbrush,
    tone: "violet",
  },
  {
    number: "03",
    title: "Sačuvaj i nastavi kasnije",
    description: "Portfolio mijenjaj i dopunjavaj novim radovima kad god ti zatreba.",
    icon: Save,
    tone: "coral",
  },
] as const;

export function ArtBoardPortfolioShowcase() {
  return (
    <section className="artboard-portfolio" id="portfolio-builder" aria-labelledby="artboard-portfolio-title">
      <div className="artboard-portfolio__frame">
        <div className="artboard-portfolio__content">
          <p className="artboard-portfolio__eyebrow">Portfolio Builder</p>
          <h2 className="artboard-portfolio__title" id="artboard-portfolio-title">
            Profesionalni portfolio
            <span>bez komplikovanog dizajniranja.</span>
          </h2>
          <p className="artboard-portfolio__intro">
            Unesi podatke. Dodaj radove. Odaberi šablon. Generiši i podijeli
            profesionalno dizajniran portfolio za konkurse, galerije, poslodavce
            i druge profesionalne angažmane.
          </p>

          <div className="artboard-portfolio__grid">
            <div className="artboard-portfolio__steps">
              <svg className="artboard-portfolio__icon-definitions" aria-hidden="true">
                <defs>
                  <linearGradient id="artboard-portfolio-icon-gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#317cf4" />
                    <stop offset="0.48" stopColor="#d72c92" />
                    <stop offset="1" stopColor="#ffbd31" />
                  </linearGradient>
                </defs>
              </svg>
              <ol className="artboard-portfolio__timeline">
                {steps.map(({ number, title, description, icon: Icon, tone }) => (
                  <li className={`artboard-portfolio__step artboard-portfolio__step--${tone}`} key={number}>
                    <span className="artboard-portfolio__step-icon" aria-hidden="true">
                      <Icon size={20} strokeWidth={1.8} />
                    </span>
                    <div className="artboard-portfolio__step-card">
                      <h3><span>{number}</span> {title}</h3>
                      <p>{description}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="artboard-portfolio__without-profile">
                <p>Ili bez profila</p>
                <Link className="artboard-portfolio__step artboard-portfolio__step--manual" href={siteRoutes.portfolioBuilder}>
                  <span className="artboard-portfolio__step-icon" aria-hidden="true">
                    <FilePlus2 size={20} strokeWidth={1.8} />
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

          <Link className="artboard-portfolio__cta" href={siteRoutes.portfolioBuilder}>
            <span>Isprobaj besplatno</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
