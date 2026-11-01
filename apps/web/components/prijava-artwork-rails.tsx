import type { CSSProperties } from "react";

import styles from "@/components/prijava-page.module.css";

type ArtworkRailProps = { imageUrls: string[] };

const leftCards = [
  { width: 150, offset: "14%", duration: 30, delay: -3 },
  { width: 104, offset: "48%", duration: 36, delay: -15 },
  { width: 122, offset: "4%", duration: 32, delay: -24 },
  { width: 96, offset: "40%", duration: 40, delay: -33 },
  { width: 132, offset: "18%", duration: 35, delay: -11 },
  { width: 108, offset: "52%", duration: 43, delay: -29 },
] as const;

const rightCards = [
  { width: 140, offset: "12%", duration: 33, delay: -8 },
  { width: 100, offset: "46%", duration: 38, delay: -20 },
  { width: 118, offset: "6%", duration: 31, delay: -27 },
  { width: 92, offset: "42%", duration: 42, delay: -1 },
  { width: 126, offset: "8%", duration: 36, delay: -16 },
  { width: 106, offset: "49%", duration: 45, delay: -35 },
] as const;

export function PrijavaArtworkRails({ imageUrls }: ArtworkRailProps) {
  if (imageUrls.length === 0) return null;

  return (
    <>
      <Rail cards={leftCards} imageUrls={imageUrls} side="left" />
      <Rail cards={rightCards} imageUrls={imageUrls} side="right" />
    </>
  );
}

function Rail({ cards, imageUrls, side }: {
  cards: readonly { width: number; offset: string; duration: number; delay: number }[];
  imageUrls: string[];
  side: "left" | "right";
}) {
  const sideOffset = side === "left" ? 0 : Math.ceil(imageUrls.length / 2);

  return (
    <div aria-hidden="true" className={`${styles.rail} ${side === "left" ? styles.railLeft : styles.railRight}`}>
      {cards.map((card, index) => {
        const imageUrl = imageUrls[(index + sideOffset) % imageUrls.length]!;
        const style = {
          "--artwork-width": `${card.width}px`,
          "--artwork-offset": card.offset,
          "--artwork-duration": `${card.duration}s`,
          "--artwork-delay": `${card.delay}s`,
        } as CSSProperties;

        return (
          <figure className={styles.railArtwork} key={`${side}-${index}-${imageUrl}`} style={style}>
            <img alt="" decoding="async" loading={index < 2 ? "eager" : "lazy"} src={imageUrl} />
          </figure>
        );
      })}
    </div>
  );
}
