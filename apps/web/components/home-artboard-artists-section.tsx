import type { LucideIcon } from "lucide-react";
import { BookOpen, Eye, Sparkles, Wrench } from "lucide-react";
import Image from "next/image";

import { ArtBoardLogo } from "@/components/artboard-logo";
import { ArtBoardTransitionLink } from "@/components/artboard-transition-link";
import { siteRoutes } from "@/lib/site-routes";

type Feature = {
  accent: "blue" | "red" | "yellow" | "violet";
  description: string;
  href: string;
  icon: LucideIcon;
  image: string;
  imageClassName?: string;
  label: string;
  title: string;
};

const features: Feature[] = [
  {
    accent: "blue",
    description: "Umjetnički profil, portfolio i prostor za predstavljanje umjetničkog rada.",
    href: siteRoutes.artists,
    icon: Eye,
    image: "/artboard-features/visibility-bust-v2.png",
    imageClassName: "home-artboard-feature-card__object--bust",
    label: "Vidljivost",
    title: "Predstavi svoj rad",
  },
  {
    accent: "red",
    description: "Digitalni alati za prezentaciju, promociju i profesionalni razvoj karijere.",
    href: siteRoutes.portfolioBuilder,
    icon: Wrench,
    image: "/artboard-features/tools-sculpture.png",
    label: "Alati",
    title: "Koristi praktične alate",
  },
  {
    accent: "yellow",
    description: "Edukativni sadržaji, resursi i mjesto za razmjenu znanja i ideja.",
    href: siteRoutes.artboard,
    icon: BookOpen,
    image: "/artboard-features/education-books-v2.png",
    imageClassName: "home-artboard-feature-card__object--books",
    label: "Edukacija",
    title: "Uči i razmjenjuj znanje",
  },
  {
    accent: "violet",
    description: "Konkursi, poslovi, saradnje i druge prilike za karijerni razvoj i zaradu.",
    href: siteRoutes.opportunities,
    icon: Sparkles,
    image: "/artboard-features/opportunities-hand.png",
    imageClassName: "home-artboard-feature-card__object--hand",
    label: "Karijera",
    title: "Pronađi nove prilike",
  },
];

export function HomeArtboardArtistsSection() {
  return (
    <section id="artboard-platforma" className="home-artboard-platform">
      <div className="home-artboard-platform__intro">
        <div className="home-artboard-platform__copy">
          <p className="home-artboard-platform__eyebrow">Created by Art Studio 360</p>
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
        </div>

        <div className="home-artboard-platform__logo-stage" aria-hidden="true">
          <span className="home-artboard-platform__logo-halo" />
          <ArtBoardLogo className="home-artboard-platform__logo" showWordmark={false} />
        </div>
      </div>

      <div className="home-artboard-platform__features">
        {features.map((feature) => (
          <FeatureCard feature={feature} key={feature.title} />
        ))}
      </div>

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
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <ArtBoardTransitionLink
      className={`home-artboard-feature-card home-artboard-feature-card--${feature.accent}`}
      href={feature.href}
    >
      <span className="home-artboard-feature-card__object-wrap" aria-hidden="true">
        <Image
          alt=""
          className={`home-artboard-feature-card__object ${feature.imageClassName ?? ""}`}
          fill
          sizes="(max-width: 640px) 72vw, (max-width: 1024px) 40vw, 22vw"
          src={feature.image}
        />
      </span>

      <span className="home-artboard-feature-card__body">
        <strong>{feature.title}</strong>
        <span className="home-artboard-feature-card__description">{feature.description}</span>
        <span className="home-artboard-feature-card__tag">
          <span className="home-artboard-feature-card__tag-icon" aria-hidden="true">
            <Icon size={14} strokeWidth={2.25} />
          </span>
          {feature.label}
        </span>
      </span>
    </ArtBoardTransitionLink>
  );
}
