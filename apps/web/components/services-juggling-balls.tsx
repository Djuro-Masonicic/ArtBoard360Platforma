"use client";

import { useCallback, useEffect, useRef } from "react";

import styles from "@/app/usluge/services-page.module.css";

type Point = {
  x: number;
  y: number;
};

const desktopPaths: readonly (readonly Point[])[] = [
  [
    { x: 100, y: 80 },
    { x: 52, y: 28 },
    { x: 6, y: 70 },
  ],
  [
    { x: -285, y: 410 },
    { x: -245, y: 355 },
    { x: -195, y: 395 },
  ],
  [
    { x: 225, y: 390 },
    { x: 180, y: 325 },
    { x: 132, y: 370 },
  ],
];

const mobilePaths: readonly (readonly Point[])[] = [
  [
    { x: 68, y: 62 },
    { x: 34, y: 26 },
    { x: 2, y: 58 },
  ],
  [
    { x: -164, y: 330 },
    { x: -138, y: 288 },
    { x: -108, y: 320 },
  ],
  [
    { x: 122, y: 315 },
    { x: 96, y: 270 },
    { x: 65, y: 304 },
  ],
];

export function ServicesJugglingBalls() {
  const ballsRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  const updateBalls = useCallback(() => {
    frameRef.current = null;

    const balls = ballsRef.current;
    const section = balls?.parentElement;

    if (!balls || !section) {
      return;
    }

    const sectionRect = section.getBoundingClientRect();
    const travelDistance = window.innerHeight + sectionRect.height;
    const rawProgress = (window.innerHeight - sectionRect.top) / travelDistance;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const progress = reduceMotion ? 0.5 : clamp(rawProgress, 0, 1);
    const paths = window.innerWidth < 700 ? mobilePaths : desktopPaths;
    const ballElements = balls.querySelectorAll<HTMLElement>("[data-juggling-ball]");

    ballElements.forEach((ball, index) => {
      const path = paths[index];

      if (!path || path.length < 3) {
        return;
      }

      const point = interpolatePath(path, progress);
      ball.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
    });
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(updateBalls);
  }, [updateBalls]);

  useEffect(() => {
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [scheduleUpdate]);

  return (
    <div aria-hidden="true" className={styles.jugglingBalls} ref={ballsRef}>
      <span className={`${styles.jugglingBall} ${styles.jugglingBallRed}`} data-juggling-ball />
      <span className={`${styles.jugglingBall} ${styles.jugglingBallBlue}`} data-juggling-ball />
      <span className={`${styles.jugglingBall} ${styles.jugglingBallYellow}`} data-juggling-ball />
    </div>
  );
}

function interpolatePath(path: readonly Point[], progress: number) {
  const first = path[0]!;
  const middle = path[1]!;
  const last = path[2]!;

  if (progress <= 0.5) {
    return interpolatePoint(first, middle, smoothstep(progress * 2));
  }

  return interpolatePoint(middle, last, smoothstep((progress - 0.5) * 2));
}

function interpolatePoint(start: Point, end: Point, progress: number) {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function smoothstep(progress: number) {
  return progress * progress * (3 - 2 * progress);
}
