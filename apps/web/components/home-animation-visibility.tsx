"use client";

import { useEffect } from "react";

const animationScopeSelector = [
  ".art-studio-page-frame > main > section",
  ".art-studio-page-frame > main > div > section",
].join(", ");

const observerMargin = 320;

export function HomeAnimationVisibility() {
  useEffect(() => {
    const scopes = Array.from(document.querySelectorAll<HTMLElement>(animationScopeSelector));

    if (scopes.length === 0) {
      return;
    }

    const visibility = new Map<HTMLElement, boolean>();

    const syncScope = (scope: HTMLElement) => {
      const shouldRun = !document.hidden && visibility.get(scope) === true;
      scope.dataset.homeAnimationState = shouldRun ? "running" : "paused";
    };

    const syncAll = () => scopes.forEach(syncScope);

    scopes.forEach((scope) => {
      const bounds = scope.getBoundingClientRect();
      visibility.set(
        scope,
        bounds.bottom >= -observerMargin && bounds.top <= window.innerHeight + observerMargin,
      );
      syncScope(scope);
    });

    if (typeof IntersectionObserver === "undefined") {
      document.addEventListener("visibilitychange", syncAll);

      return () => {
        document.removeEventListener("visibilitychange", syncAll);
        scopes.forEach((scope) => delete scope.dataset.homeAnimationState);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const scope = entry.target as HTMLElement;
          visibility.set(scope, entry.isIntersecting);
          syncScope(scope);
        });
      },
      { rootMargin: `${observerMargin}px 0px`, threshold: 0 },
    );

    scopes.forEach((scope) => observer.observe(scope));
    document.addEventListener("visibilitychange", syncAll);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncAll);
      scopes.forEach((scope) => delete scope.dataset.homeAnimationState);
    };
  }, []);

  return null;
}
