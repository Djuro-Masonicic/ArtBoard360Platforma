"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type MouseEvent as ReactMouseEvent,
  useContext,
  useEffect,
  useState,
} from "react";

import { ArtBoardDirectEntry } from "@/components/artboard-transition-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  getSiteSurface,
  shouldOpenArtBoardInNewTab,
  SITE_SURFACE_STORAGE_KEY,
} from "@/lib/site-surface";

type SiteChromeContextValue = {
  isNotFoundPage: boolean;
  setIsNotFoundPage: (isNotFoundPage: boolean) => void;
};

const SiteChromeContext = createContext<SiteChromeContextValue>({
  isNotFoundPage: false,
  setIsNotFoundPage: () => undefined,
});

type SiteChromeProps = {
  children: React.ReactNode;
  session?: {
    kind: "admin" | "artist";
    email: string;
    name: string;
    avatarUrl: string | null;
    primaryHref: string;
    primaryLabel: string;
    publicProfileHref?: string;
  } | null;
};

export function SiteChrome({ children, session = null }: SiteChromeProps) {
  const pathname = usePathname();
  const [isNotFoundPage, setIsNotFoundPage] = useState(false);
  const isNotFoundChrome = isNotFoundPage || getSiteSurface(pathname) === null;
  const isPortfolioBuilder = pathname.startsWith("/portfolio-builder");
  const isArtBoardHome = pathname === "/artboard";
  const isArtStudioSurface = getSiteSurface(pathname) === "studio";

  useEffect(() => {
    const surface = getSiteSurface(pathname);

    if (!surface) {
      return;
    }

    try {
      window.sessionStorage.setItem(SITE_SURFACE_STORAGE_KEY, surface);
    } catch {
      // Storage can be unavailable in hardened browser modes.
    }
  }, [pathname]);

  const content = isPortfolioBuilder && !isNotFoundChrome ? (
    <div className="min-h-screen bg-[#eef2f7] text-[#20242d]">{children}</div>
  ) : (
    <div
      className={`site-chrome min-h-screen bg-[var(--background)] text-[var(--foreground)] ${
        isArtStudioSurface && !isNotFoundChrome ? "art-studio-page-frame" : ""
      } ${isNotFoundChrome ? "site-chrome--not-found" : ""}`}
      onClickCapture={(event) => openArtBoardLinkInNewTab(event, pathname)}
      style={isNotFoundChrome ? { background: "#06070d" } : undefined}
    >
      {isArtBoardHome && !isNotFoundChrome ? <ArtBoardDirectEntry /> : null}
      {!isNotFoundChrome ? <SiteHeader session={session} /> : null}
      <main
        className={
          isNotFoundChrome
            ? "site-chrome__main site-chrome__main--not-found"
            : "mx-auto w-full max-w-[100vw] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12 background-[#f7f7f9]"
        }
      >
        {children}
      </main>
      {!isNotFoundChrome ? <SiteFooter /> : null}
    </div>
  );

  return (
    <SiteChromeContext.Provider value={{ isNotFoundPage, setIsNotFoundPage }}>
      {content}
    </SiteChromeContext.Provider>
  );
}

export function useSiteChrome() {
  return useContext(SiteChromeContext);
}

function openArtBoardLinkInNewTab(event: ReactMouseEvent<HTMLDivElement>, pathname: string) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const anchor = event.target.closest("a[href]");
  const href = anchor?.getAttribute("href");

  if (!(anchor instanceof HTMLAnchorElement) || !href || !shouldOpenArtBoardInNewTab(pathname, href)) {
    return;
  }

  anchor.target = "_blank";
  anchor.rel = Array.from(new Set(`${anchor.rel} noopener noreferrer`.trim().split(/\s+/))).join(" ");
}
