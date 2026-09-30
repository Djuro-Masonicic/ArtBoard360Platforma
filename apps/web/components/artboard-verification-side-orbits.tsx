"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

const sideTiles = {
  left: ["aqua", "coral", "violet", "gold", "blue", "orchid", "aqua", "violet", "coral", "gold", "blue", "orchid", "aqua", "violet"],
  right: ["aqua", "gold", "violet", "coral", "blue", "orchid", "gold", "aqua", "coral", "violet", "blue", "orchid", "gold", "aqua"],
} as const;

export type VerificationArtworkPreview = {
  id: string;
  imageUrl: string;
};

export function ArtBoardVerificationSideOrbits({ artworks }: { artworks: VerificationArtworkPreview[] }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateRadius = () => {
      const radius = Math.min(
        295,
        Math.max(210, Math.min(host.clientWidth * 0.15, (host.clientHeight - 86) * 0.5)),
      );
      host.style.setProperty("--orbit-radius", `${radius}px`);
      host.style.visibility = "visible";
    };

    const initialBounds = host.getBoundingClientRect();
    let isIntersecting = initialBounds.bottom > 0 && initialBounds.top < window.innerHeight;

    const syncPlayback = () => {
      host.classList.toggle(
        "artboard-verification__side-orbits--paused",
        !isIntersecting || document.hidden || reducedMotion.matches,
      );
    };

    updateRadius();
    syncPlayback();
    const resizeObserver = new ResizeObserver(updateRadius);
    resizeObserver.observe(host);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = Boolean(entry?.isIntersecting);
      syncPlayback();
    });
    visibilityObserver.observe(host);
    document.addEventListener("visibilitychange", syncPlayback);
    reducedMotion.addEventListener("change", syncPlayback);

    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      reducedMotion.removeEventListener("change", syncPlayback);
    };
  }, []);

  return (
    <div className="artboard-verification__side-orbits" ref={hostRef} aria-hidden="true">
      {(["left", "right"] as const).map((side) => (
        <div className={`artboard-verification__tiles artboard-verification__tiles--${side}`} key={side}>
          <div className="artboard-verification__orbit-ring">
            {sideTiles[side].map((tone, index) => {
              const artworkOffset = side === "right" ? Math.ceil(artworks.length / 2) : 0;
              const artwork = artworks.length > 0 ? artworks[(index + artworkOffset) % artworks.length] : null;
              const phase = index / sideTiles[side].length + (side === "right" ? 0.5 : 0);

              return (
                <span
                  className={`artboard-why__ribbon artboard-why__ribbon--${tone} artboard-verification__tile${artwork ? " has-artwork" : ""}`}
                  key={`${side}-${artwork?.id ?? tone}-${index}`}
                  style={{ "--orbit-angle": `${phase * 360}deg` } as CSSProperties}
                >
                  {artwork ? (
                    <img alt="" decoding="async" loading="lazy" src={artwork.imageUrl} />
                  ) : (
                    <>
                      <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--one" />
                      <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--two" />
                      <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--three" />
                      <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--four" />
                    </>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
