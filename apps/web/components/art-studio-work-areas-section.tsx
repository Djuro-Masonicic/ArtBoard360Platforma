import type { CSSProperties } from "react";

import { Layers3, Palette, PenTool, type LucideIcon } from "lucide-react";

import { NavigationButton } from "@/components/navigation-button";
import { siteRoutes } from "@/lib/site-routes";

const assetRoot = "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe";

type WorkArea = {
  color: string;
  description: string;
  href: string;
  icon: LucideIcon;
  imageAlt: string;
  imageUrl: string;
  ink: string;
  label: string;
  title: string;
};

const workAreas: WorkArea[] = [
  {
    color: "#2242e0",
    description:
      "Kreiramo dizajnerska rješenja, pružamo usluge digitalnog marketinga i stvaramo multimedijalni sadržaj za kompanije i pojedince.",
    href: siteRoutes.services,
    icon: Palette,
    imageAlt: "Radni sto za grafički dizajn",
    imageUrl: `${assetRoot}/68ac86c0503ee2cb8b45c150_30647fcaa8b2a8367a314d5e5aa53ad2_graficki%20dizajn%201.webp`,
    ink: "#ffffff",
    label: "Pogledaj usluge",
    title: "Usluge",
  },
  {
    color: "#ec3013",
    description:
      "Razvijamo ArtBoard platformu i umjetničke projekte koji povezuju umjetnike sa publikom, znanjem i novim profesionalnim prilikama.",
    href: siteRoutes.artboard,
    icon: Layers3,
    imageAlt: "Umjetnički projekat i okupljanje publike",
    imageUrl: `${assetRoot}/68ac86c07fd60116019b3eba_c4fcf2e315ab2b40a93bcf8434f21ed6_snimanje.webp`,
    ink: "#ffffff",
    label: "Istraži ArtBoard",
    title: "Projekti",
  },
  {
    color: "#ffc531",
    description:
      "Gradimo praktične alate koji olakšavaju promociju rada, kako bi umjetnici manje vremena trošili na prezentaciju, a više na stvaranje.",
    href: siteRoutes.portfolioBuilder,
    icon: PenTool,
    imageAlt: "Korišćenje digitalnih alata na telefonu",
    imageUrl: `${assetRoot}/687cc9e86da8dd5b2a7c9446_img--services-hero-05.webp`,
    ink: "#171717",
    label: "Isprobaj alate",
    title: "Digitalni alati",
  },
];

export function ArtStudioWorkAreasSection() {
  return (
    <section className="art-studio-areas" id="work-areas">
      <div className="art-studio-areas__inner">
        <header className="art-studio-areas__heading">
          <span aria-hidden="true" className="art-studio-areas__dots">
            <span />
            <span />
            <span />
          </span>
          <h2>Tri oblasti, jedan studio.</h2>
        </header>

        <div className="art-studio-areas__grid">
          {workAreas.map((area) => {
            const Icon = area.icon;
            const areaStyle = {
              "--area-color": area.color,
              "--area-ink": area.ink,
            } as CSSProperties;

            return (
              <article className="art-studio-area-card" key={area.title} style={areaStyle}>
                <div className="art-studio-area-card__body">
                  <div className="art-studio-area-card__body-fill" aria-hidden="true" />
                  <div className="art-studio-area-card__header">
                    <span className="art-studio-area-card__icon" aria-hidden="true">
                      <Icon strokeWidth={1.9} />
                    </span>
                    <h3>{area.title}</h3>
                  </div>
                  <p>{area.description}</p>
                </div>

                <figure className="art-studio-area-card__image">
                  <img alt={area.imageAlt} src={area.imageUrl} />
                </figure>

                <NavigationButton
                  className="art-studio-area-card__action"
                  href={area.href}
                  title={area.label}
                  withArtBoardTransition={area.href === siteRoutes.artboard}
                >
                  <span aria-hidden="true" />
                  {area.label}
                </NavigationButton>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
