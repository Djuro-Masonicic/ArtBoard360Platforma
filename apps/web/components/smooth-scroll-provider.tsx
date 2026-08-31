"use client";

import type { LenisOptions } from "lenis";
import { ReactLenis } from "lenis/react";
import { usePathname } from "next/navigation";

const smoothScrollOptions: LenisOptions = {
  anchors: true,
  autoRaf: true,
  lerp: 0.1,
  prevent: (node) => node.hasAttribute("data-lenis-prevent"),
  respectReducedMotion: true,
  smoothWheel: true,
  stopInertiaOnNavigate: true,
  syncTouch: false,
};

const smoothScrollRoutes = new Set([
  "/",
  "/artboard",
  "/artboard/kontakt",
  "/artists",
  "/kontakt",
  "/oglasi",
  "/paketi",
  "/umjetnici",
  "/usluge",
  "/uslovi-koriscenja",
]);

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicArtistPage = pathname.startsWith("/umjetnik/") || pathname.startsWith("/artists/");
  const shouldSmoothScroll = smoothScrollRoutes.has(pathname) || isPublicArtistPage;

  if (!shouldSmoothScroll) {
    return children;
  }

  return (
    <ReactLenis options={smoothScrollOptions} root>
      {children}
    </ReactLenis>
  );
}
