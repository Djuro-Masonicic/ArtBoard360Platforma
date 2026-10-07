"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";

import { ArtBoardLogo } from "@/components/artboard-logo";
import { siteRoutes } from "@/lib/site-routes";

import styles from "./artboard-site-header.module.css";

const navigationItems = [
  { color: "#2680ff", href: siteRoutes.artists, label: "Umjetnici", tone: "blue" },
  { color: "#ff3860", href: siteRoutes.portfolioBuilder, label: "Portfolio Builder", tone: "red" },
  { color: "#ffc526", href: siteRoutes.opportunities, label: "Oglasi", tone: "yellow" },
  { color: "#2680ff", href: siteRoutes.pricing, label: "Paketi", tone: "blue" },
  { color: "#ff3860", href: `${siteRoutes.artboard}#faq`, label: "FAQ", tone: "red" },
  { color: "#ffc526", href: siteRoutes.artboardContact, label: "Kontakt", tone: "yellow" },
] as const;

type ArtBoardSiteHeaderProps = {
  session?: {
    name: string;
    primaryHref: string;
    publicProfileHref?: string;
  } | null;
};

export function ArtBoardSiteHeader({ session = null }: ArtBoardSiteHeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const isDashboard = pathname === "/artist/dashboard";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function updateCurrentHash() {
      setCurrentHash(window.location.hash);
    }

    updateCurrentHash();
    window.addEventListener("hashchange", updateCurrentHash);

    return () => window.removeEventListener("hashchange", updateCurrentHash);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <div className={`site-header-root ${styles.frame} ${isMenuOpen ? styles.frameMenuOpen : ""}`}>
      <header className={`${styles.shell} ${isDashboard ? "xl:!w-[min(94vw,1660px)] xl:!grid-cols-[360px_minmax(0,1fr)_160px]" : ""}`}>
        <Link className={styles.brand} href={siteRoutes.artboard} aria-label="ArtBoard početna stranica">
          <ArtBoardLogo className={styles.logo} tone="dark" />
        </Link>
        {isDashboard && session ? (
          <div className="pointer-events-none absolute left-[150px] hidden min-w-0 border-l border-[#d9dce4] pl-5 xl:block">
            <p className="truncate text-[16px] font-extrabold leading-tight text-[#111318]">Artist Dashboard</p>
            <p className="mt-1 truncate text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6b7184]">{session.name}</p>
          </div>
        ) : null}

        <nav className={styles.navigation} aria-label="ArtBoard navigacija">
          {navigationItems.map((item) => {
            const isActive = isCurrentRoute(pathname, item.href, currentHash);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`${styles.navigationLink} ${isActive ? styles.active : ""}`}
                data-tone={item.tone}
                href={item.href}
                key={item.label}
                style={{ "--link-color": item.color } as CSSProperties}
              >
                <span className={styles.navigationDot} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.actions}>
          {session ? (
            isDashboard ? (
              <Link className="inline-flex h-[42px] items-center justify-center rounded-full bg-gradient-to-r from-[#1a7cff] to-[#d63273] px-6 text-[12px] font-extrabold uppercase text-white" href={session.publicProfileHref ?? session.primaryHref}>
                Javni profil
              </Link>
            ) : (
              <Link className={styles.accountLink} href={session.primaryHref}>
                {session.name}
              </Link>
            )
          ) : (
            <>
              <Link className={styles.loginLink} href={siteRoutes.login}>Uloguj se</Link>
              <Link className={styles.signupLink} href={siteRoutes.artistApplication}>Prijavi se</Link>
            </>
          )}
        </div>

        <button
          aria-controls="artboard-mobile-menu"
          className={styles.menuButton}
          type="button"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Zatvori navigaciju" : "Otvori navigaciju"}
          title={isMenuOpen ? "Zatvori navigaciju" : "Otvori navigaciju"}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </header>

      <div
        className={`${styles.mobileMenu} ${isMenuOpen ? styles.mobileMenuOpen : ""}`}
        aria-hidden={!isMenuOpen}
        id="artboard-mobile-menu"
      >
        <nav className={styles.mobileNavigation} aria-label="ArtBoard mobilna navigacija">
          {navigationItems.map((item) => {
            const isActive = isCurrentRoute(pathname, item.href, currentHash);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`${styles.mobileLink} ${isActive ? styles.mobileActive : ""}`}
                href={item.href}
                key={item.label}
                onClick={() => setIsMenuOpen(false)}
                style={{ "--link-color": item.color } as CSSProperties}
                tabIndex={isMenuOpen ? 0 : -1}
              >
                <span className={styles.navigationDot} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.mobileActions}>
          {session ? (
            <Link
              className={styles.mobileAccountLink}
              href={session.primaryHref}
              onClick={() => setIsMenuOpen(false)}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              {session.name}
            </Link>
          ) : (
            <>
              <Link className={styles.mobileLoginLink} href={siteRoutes.login} onClick={() => setIsMenuOpen(false)} tabIndex={isMenuOpen ? 0 : -1}>Uloguj se</Link>
              <Link className={styles.mobileSignupLink} href={siteRoutes.artistApplication} onClick={() => setIsMenuOpen(false)} tabIndex={isMenuOpen ? 0 : -1}>Prijavi se</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function isCurrentRoute(pathname: string, href: string, currentHash: string) {
  const [route = "", hash] = href.split("#");

  if (hash) {
    return pathname === route && currentHash === `#${hash}`;
  }

  if (route === siteRoutes.artboard) {
    return false;
  }

  if (
    route === siteRoutes.artists &&
    (pathname.startsWith(siteRoutes.artistProfileBase) || pathname.startsWith("/artists"))
  ) {
    return true;
  }

  if (
    route === siteRoutes.pricing &&
    (pathname.startsWith(siteRoutes.subscription) || pathname.startsWith("/artist/subscription"))
  ) {
    return true;
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}
