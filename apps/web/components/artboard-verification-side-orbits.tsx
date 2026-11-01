"use client";

import type { CSSProperties } from "react";

const flyPositions = {
  left: [
    { offset: "14%", width: 150, duration: 30, delay: -3 },
    { offset: "52%", width: 104, duration: 36, delay: -15 },
    { offset: "4%", width: 122, duration: 32, delay: -24 },
    { offset: "44%", width: 96, duration: 40, delay: -33 },
  ],
  right: [
    { offset: "12%", width: 140, duration: 33, delay: -8 },
    { offset: "48%", width: 100, duration: 38, delay: -20 },
    { offset: "6%", width: 118, duration: 31, delay: -27 },
    { offset: "44%", width: 92, duration: 42, delay: -1 },
  ],
} as const;

export type VerificationArtworkPreview = {
  id: string;
  imageUrl: string;
};

export function ArtBoardVerificationSideOrbits({ artworks }: { artworks: VerificationArtworkPreview[] }) {
  return (
    <>
      {(["left", "right"] as const).map((side) => (
        <div className={`ab-vfly ab-vfly-${side === "left" ? "l" : "r"}`} aria-hidden="true" key={side}>
          <div className="ab-vfly-in">
            {artworks.length > 0 ? flyPositions[side].map((position, index) => {
              const artworkOffset = side === "right" ? 4 : 0;
              const artwork = artworks[(index + artworkOffset) % artworks.length]!;
              const style = {
                [side]: position.offset,
                width: `${position.width}px`,
                animationDuration: `${position.duration}s`,
                animationDelay: `${position.delay}s`,
              } as CSSProperties;

              return <img alt="" decoding="async" key={`${side}-${artwork.id}-${index}`} loading="eager" src={artwork.imageUrl} style={style} />;
            }) : null}
          </div>
        </div>
      ))}
    </>
  );
}
