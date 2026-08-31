"use client";

import { useCallback, useEffect, useRef } from "react";

import styles from "@/app/usluge/services-page.module.css";

type ServicesHeroCollageProps = {
  images: string[];
};

const fanTargets = [
  { x: -50, y: -10, rotation: 0 },
  { x: -105, y: 0, rotation: -4 },
  { x: 5, y: 0, rotation: 4 },
  { x: -160, y: 10, rotation: -7 },
  { x: 60, y: 10, rotation: 7 },
  { x: -215, y: 24, rotation: -10 },
  { x: 115, y: 24, rotation: 10 },
  { x: -270, y: 44, rotation: -13 },
  { x: 170, y: 44, rotation: 13 },
] as const;

export function ServicesHeroCollage({ images }: ServicesHeroCollageProps) {
  const collageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  const updateFan = useCallback(() => {
    frameRef.current = null;

    const collage = collageRef.current;

    if (!collage) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealDistance = Math.min(520, Math.max(380, window.innerHeight * 0.58));
    const rawProgress = reduceMotion ? 1 : clamp(window.scrollY / revealDistance, 0, 1);
    const progress = smoothstep(rawProgress);
    const spreadMultiplier = window.innerWidth < 700 ? 0.84 : 1;
    const cards = collage.querySelectorAll<HTMLElement>("[data-services-hero-card]");

    cards.forEach((card, index) => {
      const target = fanTargets[index];

      if (!target) {
        return;
      }

      const expandedX = -50 + (target.x + 50) * spreadMultiplier;
      const x = interpolate(-50, expandedX, progress);
      const y = interpolate(-10, target.y, progress);
      const rotation = interpolate(0, target.rotation, progress);

      card.style.transform = `translateX(${x}%) translateY(${y}px) rotate(${rotation}deg)`;
    });

    collage.style.setProperty("--fan-progress", progress.toFixed(3));
  }, []);

  const scheduleFanUpdate = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(updateFan);
  }, [updateFan]);

  useEffect(() => {
    scheduleFanUpdate();
    window.addEventListener("scroll", scheduleFanUpdate, { passive: true });
    window.addEventListener("resize", scheduleFanUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleFanUpdate);
      window.removeEventListener("resize", scheduleFanUpdate);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [scheduleFanUpdate]);

  return (
    <div
      aria-label="Izbor kreativnih projekata"
      className={styles.heroCollage}
      ref={collageRef}
    >
      {images.map((src, index) => (
        <div className={styles.heroCard} data-services-hero-card key={src}>
          <img alt={`Art Studio 360 projekat ${index + 1}`} src={src} />
        </div>
      ))}
    </div>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function smoothstep(progress: number) {
  return progress * progress * (3 - 2 * progress);
}
