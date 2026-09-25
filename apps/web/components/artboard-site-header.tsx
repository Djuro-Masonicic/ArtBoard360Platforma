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
  } | null;
};

export function ArtBoardSiteHeader({ session = null }: ArtBoardSiteHeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <div className={styles.frame}>
      <header className={styles.shell}>
        <Link className={styles.brand} href={siteRoutes.artboard} aria-label="ArtBoard početna stranica">
          <ArtBoardLogo className={styles.logo} tone="dark" wordmark="ArtBoard" />
        </Link>

        <nav className={styles.navigation} aria-label="ArtBoard navigacija">
          {navigationItems.map((item) => (
            <Link
              className={`${styles.navigationLink} ${isCurrentRoute(pathname, item.href) ? styles.active : ""}`}
              data-tone={item.tone}
              href={item.href}
              key={item.label}
              style={{ "--link-color": item.color } as CSSProperties}
            >
              <span className={styles.navigationDot} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          {session ? (
            <Link className={styles.accountLink} href={session.primaryHref}>
              {session.name}
            </Link>
          ) : (
            <>
              <Link className={styles.loginLink} href={siteRoutes.login}>Uloguj se</Link>
              <Link className={styles.signupLink} href={siteRoutes.artistApplication}>Prijavi se</Link>
            </>
          )}
        </div>

        <button
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

      <div className={`${styles.mobileMenu} ${isMenuOpen ? styles.mobileMenuOpen : ""}`} aria-hidden={!isMenuOpen}>
        <nav className={styles.mobileNavigation} aria-label="ArtBoard mobilna navigacija">
          {navigationItems.map((item) => (
            <Link
              className={styles.mobileLink}
              href={item.href}
              key={item.label}
              style={{ "--link-color": item.color } as CSSProperties}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              <span className={styles.navigationDot} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.mobileActions}>
          {session ? (
            <Link className={styles.mobileAccountLink} href={session.primaryHref} tabIndex={isMenuOpen ? 0 : -1}>
              {session.name}
            </Link>
          ) : (
            <>
              <Link className={styles.mobileLoginLink} href={siteRoutes.login} tabIndex={isMenuOpen ? 0 : -1}>Uloguj se</Link>
              <Link className={styles.mobileSignupLink} href={siteRoutes.artistApplication} tabIndex={isMenuOpen ? 0 : -1}>Prijavi se</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function isCurrentRoute(pathname: string, href: string) {
  const route = href.split("#")[0];

  if (route === siteRoutes.artboard) {
    return false;
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}
