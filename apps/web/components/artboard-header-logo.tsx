"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import type Lenis from "lenis";
import { useLenis } from "lenis/react";

import { ArtBoardLogo } from "@/components/artboard-logo";

type ActiveDot = "blue" | "red" | "yellow" | null;

const reactiveSections: { dot: Exclude<ActiveDot, null>; id: string }[] = [
  { dot: "blue", id: "alati" },
  { dot: "red", id: "portfolio-builder" },
  { dot: "yellow", id: "paketi" },
];

export function ArtBoardHeaderLogo({
  reactive,
  tone,
}: {
  reactive: boolean;
  tone: "dark" | "light";
}) {
  const [scrollState, setScrollState] = useState<{
    activeDot: ActiveDot;
    baseOffset: number;
    leftOffset: number;
    rightOffset: number;
  }>({ activeDot: null, baseOffset: 100, leftOffset: 100, rightOffset: 100 });

  const updateLogo = useCallback(
    (scrollY: number) => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = clamp(scrollY / maxScroll);
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const probe = scrollY + window.innerHeight * 0.38;
      let activeDot: ActiveDot = null;

      for (const section of reactiveSections) {
        const element = document.getElementById(section.id);

        if (!element) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        const top = rect.top + scrollY;
        const bottom = rect.bottom + scrollY;

        if (probe >= top && probe <= bottom) {
          activeDot = section.dot;
          break;
        }
      }

      const resolvedProgress = reducedMotion ? 1 : progress;

      const nextState = {
        activeDot,
        baseOffset: offsetForProgress(resolvedProgress * 3 - 2),
        leftOffset: offsetForProgress(resolvedProgress * 3),
        rightOffset: offsetForProgress(resolvedProgress * 3 - 1),
      };

      setScrollState((currentState) =>
        isSameScrollState(currentState, nextState) ? currentState : nextState,
      );
    },
    [],
  );

  const handleLenisScroll = useCallback(
    (lenis: Lenis) => {
      if (reactive) {
        updateLogo(lenis.scroll);
      }
    },
    [reactive, updateLogo],
  );

  useLenis(handleLenisScroll, [handleLenisScroll]);

  useEffect(() => {
    if (!reactive) {
      setScrollState({ activeDot: null, baseOffset: 0, leftOffset: 0, rightOffset: 0 });
      return;
    }

    const updateAfterResize = () => updateLogo(window.scrollY);

    updateAfterResize();
    window.addEventListener("resize", updateAfterResize);

    return () => {
      window.removeEventListener("resize", updateAfterResize);
    };
  }, [reactive, updateLogo]);

  const style = {
    "--artboard-logo-base-offset": scrollState.baseOffset,
    "--artboard-logo-left-offset": scrollState.leftOffset,
    "--artboard-logo-right-offset": scrollState.rightOffset,
  } as CSSProperties;

  return (
    <ArtBoardLogo
      className={`site-header-artboard-logo ${
        scrollState.activeDot ? `artboard-logo--active-${scrollState.activeDot}` : ""
      }`}
      scrollReactive={reactive}
      style={style}
      tone={tone}
    />
  );
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function offsetForProgress(progress: number) {
  return Math.round((100 - clamp(progress) * 100) * 10) / 10;
}

function isSameScrollState(
  currentState: {
    activeDot: ActiveDot;
    baseOffset: number;
    leftOffset: number;
    rightOffset: number;
  },
  nextState: {
    activeDot: ActiveDot;
    baseOffset: number;
    leftOffset: number;
    rightOffset: number;
  },
) {
  return (
    currentState.activeDot === nextState.activeDot &&
    currentState.baseOffset === nextState.baseOffset &&
    currentState.leftOffset === nextState.leftOffset &&
    currentState.rightOffset === nextState.rightOffset
  );
}
