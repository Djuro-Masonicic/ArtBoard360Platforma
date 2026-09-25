"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

import {
  ARTBOARD_TRANSITION_DURATION_MS,
  ARTBOARD_TRANSITION_SESSION_KEY,
} from "@/components/artboard-transition-link";
import { siteRoutes } from "@/lib/site-routes";

const cardPaths = [
  { className: "artboard-redesign-hero__card--education", label: "Oglasna tabla" },
  { className: "artboard-redesign-hero__card--portfolio", label: "Portfolio Builder" },
  { className: "artboard-redesign-hero__card--profile", label: "Promotivni generator" },
  { className: "artboard-redesign-hero__card--opportunities", label: "ArtBoard Edu" },
  { className: "artboard-redesign-hero__card--promotion", label: "QR vizit karta" },
  { className: "artboard-redesign-hero__card--artists", label: "Pretraživač umjetnika" },
] as const;

export type HeroArtworkPreview = {
  id: string;
  imageUrl: string;
};

export function ArtBoardPlatformHero({ artworks }: { artworks: HeroArtworkPreview[] }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const transitionStartedAt = Number(
      window.sessionStorage.getItem(ARTBOARD_TRANSITION_SESSION_KEY),
    );
    const followedStudioTransition =
      Number.isFinite(transitionStartedAt) &&
      Date.now() - transitionStartedAt < ARTBOARD_TRANSITION_DURATION_MS;
    const revealDelay = followedStudioTransition ? 420 : ARTBOARD_TRANSITION_DURATION_MS - 320;
    const timeoutId = window.setTimeout(() => setIsReady(true), revealDelay);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <section
      className={`artboard-redesign-hero ${isReady ? "artboard-redesign-hero--ready" : ""}`}
    >
      <div className="artboard-redesign-hero__ambient" aria-hidden="true" />

      <div className="artboard-redesign-hero__cards" aria-hidden="true">
        {artworks.map((artwork, index) => {
          const card = cardPaths[index % cardPaths.length]!;
          const style = { "--card-delay": `${index * -0.9}s` } as CSSProperties;

          return (
          <article
            className={`artboard-redesign-hero__card ${card.className}`}
            key={artwork.id}
            style={style}
          >
            <img alt="" decoding="async" loading={index < 4 ? "eager" : "lazy"} src={artwork.imageUrl} />
          </article>
          );
        })}
      </div>

      <div className="artboard-redesign-hero__content">
        <p className="artboard-redesign-hero__eyebrow">
          <span aria-hidden="true" />
          Created by Art Studio 360
        </p>

        <h1>
          <span className="artboard-redesign-hero__wordmark">ArtBoard.</span>
          <strong>
            Digitalna platforma za
            <br />
            vizuelne umjetnike.
          </strong>
        </h1>

        <p className="artboard-redesign-hero__description">
          Kreiraj profesionalni profil, predstavi svoje radove, generiši portfolio i koristi
          praktične alate za promociju, učenje i razvoj umjetničke karijere.
        </p>

        <div className="artboard-redesign-hero__actions">
          <Link className="artboard-redesign-hero__primary" href={siteRoutes.artistApplication}>
            Prijavi se besplatno
          </Link>
          <Link className="artboard-redesign-hero__secondary" href={siteRoutes.artists}>
            Istraži umjetnike
          </Link>
        </div>

        <p className="artboard-redesign-hero__tagline">
          Predstavi svoj rad. Kreiraj portfolio. Pronađi nove prilike.
        </p>
      </div>
    </section>
  );
}
