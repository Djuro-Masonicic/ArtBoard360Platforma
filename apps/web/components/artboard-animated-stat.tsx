"use client";

import { useEffect, useRef, useState } from "react";

const ANIMATION_DURATION_MS = 1500;

export function ArtBoardAnimatedStat({ value }: { value: number | null }) {
  const elementRef = useRef<HTMLElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === null) return;

    const element = elementRef.current;
    if (!element) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDisplayValue(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        observer.disconnect();
        const startedAt = performance.now();

        const updateValue = (timestamp: number) => {
          const progress = Math.min((timestamp - startedAt) / ANIMATION_DURATION_MS, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          setDisplayValue(Math.round(value * easedProgress));

          if (progress < 1) {
            animationFrameRef.current = window.requestAnimationFrame(updateValue);
          }
        };

        animationFrameRef.current = window.requestAnimationFrame(updateValue);
      },
      { threshold: 0.35 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value]);

  return <strong ref={elementRef}>{value === null ? "—" : `${displayValue}+`}</strong>;
}
