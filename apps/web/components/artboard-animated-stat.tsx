"use client";

import { useEffect, useRef } from "react";

const ANIMATION_DURATION_MS = 1500;

export function ArtBoardAnimatedStat({
  value,
  suffix = "+",
  formatValue = false,
}: {
  value: number | null;
  suffix?: string;
  formatValue?: boolean;
}) {
  const elementRef = useRef<HTMLElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (value === null) {
      element.textContent = "\u2014";
      return;
    }

    const formatter = formatValue ? new Intl.NumberFormat("sr-Latn-ME") : null;
    const renderValue = (currentValue: number) => {
      const displayedValue = formatter ? formatter.format(currentValue) : String(currentValue);
      element.textContent = `${displayedValue}${suffix}`;
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      renderValue(value);
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
          renderValue(Math.round(value * easedProgress));

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
  }, [formatValue, suffix, value]);

  return <strong ref={elementRef}>{value === null ? "\u2014" : `0${suffix}`}</strong>;
}
