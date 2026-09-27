"use client";

import { useEffect, useRef } from "react";

import { ArtBoardAnimatedStat } from "@/components/artboard-animated-stat";
import type { HeroArtworkPreview } from "@/components/artboard-platform-hero";

type ProofMetric = {
  label: string;
  value: number | null;
  suffix?: string;
  tone: "blue" | "pink" | "red";
};

export function ArtBoardProofStrip({
  artworks,
  metrics,
}: {
  artworks: HeroArtworkPreview[];
  metrics: ProofMetric[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const railArtworks = artworks.length > 0
    ? Array.from({ length: Math.max(12, artworks.length) }, (_, index) => artworks[index % artworks.length]!)
    : [];
  const animatedArtworks = [...railArtworks, ...railArtworks];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        section.classList.toggle("artboard-proof-strip--paused", !entry?.isIntersecting);
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="artboard-proof-strip" id="artboard-statistika" aria-label="ArtBoard u brojevima">
      <div className="artboard-proof-strip__artworks-window" aria-hidden="true">
        <div className="artboard-proof-strip__artworks">
          {animatedArtworks.map((artwork, index) => (
            <div className="artboard-proof-strip__artwork" key={`${artwork.id}-${index}`}>
              <img src={artwork.imageUrl} alt="" loading="lazy" decoding="async" />
            </div>
          ))}
        </div>
      </div>

      <div className="artboard-proof-strip__stats">
        <div className="artboard-proof-strip__inner">
          {metrics.map((metric) => (
            <div className={`artboard-proof-strip__metric artboard-proof-strip__metric--${metric.tone}`} key={metric.label}>
              <ArtBoardAnimatedStat value={metric.value} suffix={metric.suffix ?? ""} formatValue />
              <span>{metric.label}</span>
            </div>
          ))}

          <div className="artboard-proof-strip__support">
            <span>Uz podršku</span>
            <div className="artboard-proof-strip__support-lockup">
              <img
                src="/artboard-general/ministarstvo_kulture_i_medija_white.png"
                alt="Ministarstvo kulture i medija Crne Gore"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
