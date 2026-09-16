"use client";

import { useEffect, useRef } from "react";

const sideTiles = {
  left: ["aqua", "coral", "violet", "gold", "blue", "orchid", "aqua", "violet", "coral", "gold", "blue", "orchid", "aqua", "violet"],
  right: ["aqua", "gold", "violet", "coral", "blue", "orchid", "gold", "aqua", "coral", "violet", "blue", "orchid", "gold", "aqua"],
} as const;

const tileAngles = [18, 42, -14, 12, -38, -17, 23, -26, 34, -9, 15, -31, 11, 27];

export function ArtBoardVerificationSideOrbits() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const sides = (["left", "right"] as const).map((side) => ({
      side,
      tiles: Array.from(host.querySelectorAll<HTMLElement>(`.artboard-verification__tiles--${side} .artboard-verification__tile`)),
    }));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const panel = host.nextElementSibling as HTMLElement | null;
    let frame = 0;
    let lastTime = 0;
    let phase = 0;

    const render = () => {
      const panelInset = panel ? panel.getBoundingClientRect().left - host.getBoundingClientRect().left : host.clientWidth * 0.25;
      const radiusX = Math.max(0, panelInset + 7);
      const radiusY = Math.min(275, Math.max(0, host.clientHeight - 140) * 0.5);

      sides.forEach(({ side, tiles }) => {
        tiles.forEach((tile, index) => {
          const angle = phase + (index / tiles.length) * Math.PI * 2 + (side === "right" ? Math.PI : 0);
          const x = Math.cos(angle) * radiusX;
          const y = Math.sin(angle) * radiusY;
          const tilt = (tileAngles[index] ?? 0) + Math.sin(angle) * 8;
          tile.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg)`;
        });
      });
      host.style.visibility = "visible";
    };

    const tick = (time: number) => {
      if (lastTime) phase += (Math.min(time - lastTime, 64) / 46000) * Math.PI * 2;
      lastTime = time;
      render();
      frame = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      window.cancelAnimationFrame(frame);
      lastTime = 0;
    };

    render();
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(host);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      stop();
      if (entry?.isIntersecting && !reducedMotion.matches) frame = window.requestAnimationFrame(tick);
    });
    visibilityObserver.observe(host);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, []);

  return (
    <div className="artboard-verification__side-orbits" ref={hostRef} aria-hidden="true">
      {(["left", "right"] as const).map((side) => (
        <div className={`artboard-verification__tiles artboard-verification__tiles--${side}`} key={side}>
          {sideTiles[side].map((tone, index) => (
            <span className={`artboard-why__ribbon artboard-why__ribbon--${tone} artboard-verification__tile`} key={`${tone}-${index}`}>
              <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--one" />
              <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--two" />
              <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--three" />
              <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--four" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
