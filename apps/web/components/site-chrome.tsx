"use client";

import { usePathname } from "next/navigation";

import { ArtBoardDirectEntry } from "@/components/artboard-transition-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type SiteChromeProps = {
  children: React.ReactNode;
  session?: {
    kind: "admin" | "artist";
    email: string;
    name: string;
    avatarUrl: string | null;
    primaryHref: string;
    primaryLabel: string;
  } | null;
};

export function SiteChrome({ children, session = null }: SiteChromeProps) {
  const pathname = usePathname();
  const isPortfolioBuilder = pathname.startsWith("/portfolio-builder");
  const isArtBoardHome = pathname === "/artboard";

  if (isPortfolioBuilder) {
    return <div className="min-h-screen bg-[#eef2f7] text-[#20242d]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {isArtBoardHome ? <ArtBoardDirectEntry /> : null}
      <SiteHeader session={session} />
      <main className="mx-auto w-full max-w-[100vw] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12 background-[#f7f7f9]">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
