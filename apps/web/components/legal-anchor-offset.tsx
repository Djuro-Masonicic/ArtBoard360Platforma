"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";

/** Read the existing header height; only the legal content's anchor offset changes. */
export function LegalAnchorOffset() {
  const lenis = useLenis();
  useEffect(() => {
    const content = document.querySelector<HTMLElement>("[data-policy-version]");
    const header = content?.previousElementSibling;
    if (!content || !(header instanceof HTMLElement)) return;
    const update = () => content.style.setProperty("--legal-anchor-offset", `${Math.max(96, Math.ceil(header.getBoundingClientRect().height) + 8)}px`);
    update();
    const observer = new ResizeObserver(update); observer.observe(header);
    const scrollTo = (target: HTMLElement) => {
      // Native scrolling (including browser focus/keyboard navigation) can
      // precede Lenis's next frame. Use the actual scroll position rather than
      // its previous animated position when resolving an element destination.
      const destination = target.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
      if (lenis) lenis.scrollTo(destination, { immediate: true, force: true });
      else target.scrollIntoView({ block: "start", behavior: "instant" });
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      if (!link || !content.contains(link)) return;
      try {
        const hash = link.getAttribute("href")!;
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (!target || !content.contains(target)) return;
        // Handle once before the window-level Lenis anchor listener. Native
        // hash scrolling and an in-flight smooth scroll must not race.
        event.preventDefault(); event.stopPropagation();
        scrollTo(target);
        if (location.hash !== hash) history.pushState(history.state, "", hash);
      } catch { /* Malformed fragments leave normal browser navigation intact. */ }
    };
    content.addEventListener("click", click);
    const frame = requestAnimationFrame(() => {
      try {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target && content.contains(target)) scrollTo(target);
      } catch { /* Invalid external fragments do not affect page rendering. */ }
    });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); content.removeEventListener("click", click); };
  }, [lenis]);
  return null;
}
