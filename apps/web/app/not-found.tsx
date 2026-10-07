"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ArtBoardLogo } from "@/components/artboard-logo";
import { useSiteChrome } from "@/components/site-chrome";
import {
  getSiteSurface,
  SITE_SURFACE_STORAGE_KEY,
  type SiteSurface,
} from "@/lib/site-surface";

import styles from "./not-found.module.css";

export default function NotFound() {
  const pathname = usePathname();
  const { setIsNotFoundPage } = useSiteChrome();
  const [backHref, setBackHref] = useState(() => getFallbackHref(pathname));

  useEffect(() => {
    setIsNotFoundPage(true);

    let surface: SiteSurface | null = null;

    try {
      const storedSurface = window.sessionStorage.getItem(SITE_SURFACE_STORAGE_KEY);

      if (storedSurface === "artboard" || storedSurface === "studio") {
        surface = storedSurface;
      }
    } catch {
      // Storage can be unavailable in hardened browser modes.
    }

    if (!surface && document.referrer) {
      try {
        const referrer = new URL(document.referrer);

        if (referrer.origin === window.location.origin) {
          surface = getSiteSurface(referrer.pathname);
        }
      } catch {
        // Ignore malformed or blocked referrers and use the URL fallback.
      }
    }

    setBackHref(surface === "artboard" ? "/artboard" : surface === "studio" ? "/" : getFallbackHref(pathname));

    return () => setIsNotFoundPage(false);
  }, [pathname, setIsNotFoundPage]);

  return (
    <section className={`not-found-page ${styles.page}`} aria-labelledby="not-found-title">
      <span className={styles.stars} aria-hidden="true" />
      <span className={styles.line} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.brands} aria-label="ArtBoard i Art Studio 360">
          <ArtBoardLogo className={styles.artboardLogo} tone="light" />
          <span className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.studioBrand}>
            <span className={styles.studioDots} aria-hidden="true"><i /><i /><i /></span>
            Art Studio 360
          </span>
        </div>

        <p className={styles.code}><i aria-hidden="true" />404</p>
        <h1 id="not-found-title">Ovdje nema ničega.</h1>
        <p className={styles.copy}>
          Stranica koju tražiš je premještena, obrisana ili adresa nije pravilno unesena.
        </p>

        <Link
          aria-label={backHref === "/artboard" ? "Nazad na ArtBoard" : "Nazad u Art Studio 360"}
          className={styles.back}
          href={backHref}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Nazad
        </Link>
      </div>

      <div className={styles.geometry} aria-hidden="true">
        <span /><span /><span />
      </div>
    </section>
  );
}

function getFallbackHref(pathname: string) {
  return pathname.startsWith("/artboard") || getSiteSurface(pathname) === "artboard" ? "/artboard" : "/";
}
