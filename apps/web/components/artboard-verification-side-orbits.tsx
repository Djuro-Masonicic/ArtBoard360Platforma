"use client";

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

    const sides = (["left", "right"] as const).map((side) => ({
      side,
      tiles: Array.from(host.querySelectorAll<HTMLElement>(`.artboard-verification__tiles--${side} .artboard-verification__tile`)),
    }));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const duration = 46000;
    let animations: Animation[] = [];

    const getRadii = () => {
      const radius = Math.min(
        295,
        Math.max(210, Math.min(host.clientWidth * 0.15, (host.clientHeight - 86) * 0.5)),
      );
      return { radiusX: radius, radiusY: radius };
    };

    const getTransform = (
      angle: number,
      radiusX: number,
      radiusY: number,
      side: "left" | "right",
      cardHalfSize: number,
    ) => {
      const circleX = Math.cos(angle) * radiusX;
      const circleY = Math.sin(angle) * radiusY;
      const tangentRotation = angle + Math.PI / 2;
      const baseCenterX = side === "left" ? -cardHalfSize : cardHalfSize;
      const x = circleX - baseCenterX + cardHalfSize * Math.sin(tangentRotation);
      const y = circleY - cardHalfSize * Math.cos(tangentRotation);
      const rotationDegrees = (tangentRotation * 180) / Math.PI;

      return `translate3d(${x}px, ${y}px, 0) rotate(${rotationDegrees}deg)`;
    };

    const shouldPlay = () => {
      const bounds = host.getBoundingClientRect();
      return bounds.bottom > 0 && bounds.top < window.innerHeight && !document.hidden && !reducedMotion.matches;
    };

    const syncPlayback = () => {
      animations.forEach((animation) => {
        if (shouldPlay()) animation.play();
        else animation.pause();
      });
    };

    const buildAnimations = () => {
      animations.forEach((animation) => animation.cancel());
      animations = [];
      const { radiusX, radiusY } = getRadii();
      const orbitSamples = Array.from({ length: 121 }, (_, step) => {
        const angle = (step / 120) * Math.PI * 2;
        return {
          angle,
          x: Math.cos(angle) * radiusX,
          y: Math.sin(angle) * radiusY,
        };
      });
      const cumulativeDistances = orbitSamples.map(() => 0);

      for (let index = 1; index < orbitSamples.length; index += 1) {
        const previous = orbitSamples[index - 1]!;
        const current = orbitSamples[index]!;
        cumulativeDistances[index] = cumulativeDistances[index - 1]!
          + Math.hypot(current.x - previous.x, current.y - previous.y);
      }

      const orbitLength = cumulativeDistances.at(-1) ?? 1;

      sides.forEach(({ side, tiles }) => {
        tiles.forEach((tile, index) => {
          const cardHalfSize = tile.offsetWidth * 0.5;
          const phaseOffset = index / tiles.length + (side === "right" ? 0.5 : 0);
          const initialAngle = phaseOffset * Math.PI * 2;
          tile.style.transform = getTransform(initialAngle, radiusX, radiusY, side, cardHalfSize);

          if (reducedMotion.matches) return;

          const keyframes = orbitSamples.map(({ angle }, sampleIndex) => ({
            offset: cumulativeDistances[sampleIndex]! / orbitLength,
            transform: getTransform(angle, radiusX, radiusY, side, cardHalfSize),
          }));
          const animation = tile.animate(keyframes, {
            delay: -phaseOffset * duration,
            duration,
            easing: "linear",
            iterations: Infinity,
          });
          animations.push(animation);
        });
      });

      host.style.visibility = "visible";
      syncPlayback();
    };

    buildAnimations();
    const resizeObserver = new ResizeObserver(buildAnimations);
    resizeObserver.observe(host);
    const visibilityObserver = new IntersectionObserver(syncPlayback);
    visibilityObserver.observe(host);
    document.addEventListener("visibilitychange", syncPlayback);
    reducedMotion.addEventListener("change", buildAnimations);

    return () => {
      animations.forEach((animation) => animation.cancel());
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      reducedMotion.removeEventListener("change", buildAnimations);
    };
  }, []);

  return (
    <div className="artboard-verification__side-orbits" ref={hostRef} aria-hidden="true">
      {(["left", "right"] as const).map((side) => (
        <div className={`artboard-verification__tiles artboard-verification__tiles--${side}`} key={side}>
          {sideTiles[side].map((tone, index) => {
            const artworkOffset = side === "right" ? Math.ceil(artworks.length / 2) : 0;
            const artwork = artworks.length > 0 ? artworks[(index + artworkOffset) % artworks.length] : null;

            return (
              <span
                className={`artboard-why__ribbon artboard-why__ribbon--${tone} artboard-verification__tile${artwork ? " has-artwork" : ""}`}
                key={`${side}-${artwork?.id ?? tone}-${index}`}
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
      ))}
    </div>
  );
}
