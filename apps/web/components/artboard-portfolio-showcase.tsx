import Link from "next/link";
import { FilePlus2, FileText, PenLine, UserRound } from "lucide-react";

import { siteRoutes } from "@/lib/site-routes";

const steps = [
  {
    number: "01",
    title: "Generiši iz profila",
    description: "Automatski izvezi podatke i odabrane radove sa svog ArtBoard profila.",
    icon: UserRound,
    tone: "blue",
  },
  {
    number: "02",
    title: "Odaberi šablon",
    description: "Odaberi gotov dizajnerski šablon i prilagodi izgled svake sekcije.",
    icon: PenLine,
    tone: "violet",
  },
  {
    number: "03",
    title: "Sačuvaj i nastavi kasnije",
    description: "Portfolio mijenjaj i dopunjavaj novim radovima kad god ti zatreba.",
    icon: FileText,
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
              <ol className="artboard-portfolio__timeline">
                {steps.map(({ number, title, description, icon: Icon, tone }) => (
                  <li className={`artboard-portfolio__step artboard-portfolio__step--${tone}`} key={number}>
                    <span className="artboard-portfolio__step-icon" aria-hidden="true">
                      <Icon size={15} strokeWidth={1.8} />
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
                    <FilePlus2 size={15} strokeWidth={1.8} />
                  </span>
                  <span className="artboard-portfolio__step-card">
                    <strong><span>04</span> Kreiraj od nule</strong>
                    <small>Ne moraš imati ArtBoard profil. Portfolio možeš izgraditi ručnim unosom podataka i radova.</small>
                  </span>
                </Link>
              </div>
            </div>

            <div className="artboard-why__ribbon artboard-why__ribbon--gold artboard-portfolio__artwork" aria-hidden="true">
              <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--one" />
              <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--two" />
              <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--three" />
              <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--four" />
              <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--five" />
            </div>
          </div>

          <Link className="artboard-portfolio__cta" href={siteRoutes.portfolioBuilder}>
            <span>Isprobaj besplatno</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
