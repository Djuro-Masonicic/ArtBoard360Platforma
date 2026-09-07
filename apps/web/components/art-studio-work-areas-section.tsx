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
    color: "#2947e8",
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
    color: "#f3311b",
    description:
      "Razvijamo ArtBoard platformu i druge umjetničke projekte koji podržavaju vidljivost, povezivanje i razvoj umjetnika.",
    href: siteRoutes.artboard,
    icon: Layers3,
    imageAlt: "Digitalna ilustracija u nastajanju",
    imageUrl: `${assetRoot}/687cc9e8daebd9a75c7256a0_img--services-hero-01.webp`,
    ink: "#ffffff",
    label: "Istraži ArtBoard",
    title: "Projekti",
  },
  {
    color: "#ffbf2c",
    description:
      "Gradimo praktične digitalne alate koji umjetnicima i kreativcima olakšavaju predstavljanje, promociju i profesionalni razvoj.",
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
          <h2>
            Tri oblasti, jedan studio<span>.</span>
          </h2>
        </header>

        <div className="art-studio-areas__grid">
          {workAreas.map((area, index) => {
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
                    <span className="art-studio-area-card__number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
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
