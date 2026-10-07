import type { LucideIcon } from "lucide-react";
import { BookOpen, BriefcaseBusiness, Eye, Pencil } from "lucide-react";

import { ArtBoardTransitionLink } from "@/components/artboard-transition-link";
import { siteRoutes } from "@/lib/site-routes";

type Feature = {
  description: string;
  href: string;
  icon: LucideIcon;
  image: string;
  label: string;
  title: [string, string?];
};

const features: Feature[] = [
  {
    description: "Umjetnički profil, portfolio i prostor za predstavljanje umjetničkog rada.",
    href: siteRoutes.artists,
    icon: Eye,
    image: "/artboard-why/01-bw-optimized.webp",
    label: "Vidljivost",
    title: ["Predstavi", "svoj rad"],
  },
  {
    description: "Digitalni alati za prezentaciju, promociju i profesionalni razvoj karijere.",
    href: siteRoutes.portfolioBuilder,
    icon: Pencil,
    image: "/artboard-why/02-bw-optimized.webp",
    label: "Alati",
    title: ["Koristi", "praktične alate"],
  },
  {
    description: "Edukativni sadržaji, resursi i mjesto za razmjenu znanja i ideja.",
    href: siteRoutes.artboard,
    icon: BookOpen,
    image: "/artboard-opportunities-optimized.webp",
    label: "Edukacija",
    title: ["Uči i razmjenjuj", "znanje"],
  },
  {
    description: "Konkursi, poslovi, saradnje i druge prilike za karijerni razvoj i zaradu.",
    href: siteRoutes.opportunities,
    icon: BriefcaseBusiness,
    image: "/artboard-why/03-bw-optimized.webp",
    label: "Karijera",
    title: ["Pronađi", "nove prilike"],
  },
];

export function HomeArtboardArtistsSection() {
  return (
    <section id="artboard" className="home-artboard-platform">
      <div className="home-artboard-platform__surface">
        <div className="home-artboard-platform__inner">
          <div className="home-artboard-platform__intro">
            <div className="home-artboard-platform__copy">
              <p className="home-artboard-platform__eyebrow">
                <span aria-hidden="true" />
                Created by Art Studio 360
              </p>
              <h2>
                <span>ArtBoard.</span>
                Tvoj prostor
                <br />
                za umjetnost.
              </h2>
              <p className="home-artboard-platform__description">
                ArtBoard je digitalna platforma koja pruža umjetnicima prostor za profesionalno
                predstavljanje, praktične alate, nova znanja i prilike za razvoj umjetničke karijere.
              </p>

              <div className="home-artboard-platform__actions">
                <ArtBoardTransitionLink
                  className="home-artboard-platform__button home-artboard-platform__button--primary"
                  href={siteRoutes.artboard}
                >
                  Istraži ArtBoard platformu
                </ArtBoardTransitionLink>
                <ArtBoardTransitionLink
                  className="home-artboard-platform__button home-artboard-platform__button--secondary"
                  href={siteRoutes.registration}
                >
                  Kreiraj profil besplatno
                </ArtBoardTransitionLink>
              </div>
            </div>

            <div className="home-artboard-platform__logo-stage" aria-hidden="true">
              <span className="home-artboard-platform__logo-halo" />
              <img
                alt=""
                className="home-artboard-platform__logo"
                src="/artboard-logo/ArtBoard-Gradient.svg"
              />
            </div>
          </div>

          <div className="home-artboard-platform__features">
            {features.map((feature) => (
              <FeatureCard feature={feature} key={feature.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <ArtBoardTransitionLink
      className="home-artboard-feature-card"
      href={feature.href}
    >
      <span className="home-artboard-feature-card__photo-wrap" aria-hidden="true">
        <img
          alt=""
          className="home-artboard-feature-card__photo"
          decoding="async"
          loading="lazy"
          src={feature.image}
        />
      </span>

      <span className="home-artboard-feature-card__body">
        <strong>
          {feature.title[0]}
          {feature.title[1] ? <><br />{feature.title[1]}</> : null}
        </strong>
        <span className="home-artboard-feature-card__description">{feature.description}</span>
        <span className="home-artboard-feature-card__tag">
          <span className="home-artboard-feature-card__tag-inner">
            <span className="home-artboard-feature-card__tag-icon" aria-hidden="true">
              <Icon size={14} strokeWidth={2.1} />
            </span>
            {feature.label}
          </span>
        </span>
      </span>
    </ArtBoardTransitionLink>
  );
}
