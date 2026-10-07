"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ArtBoardLogo } from "@/components/artboard-logo";
import { siteRoutes } from "@/lib/site-routes";

export function SiteFooter() {
  const pathname = usePathname();
  const isLoginPage = pathname === siteRoutes.login || pathname === "/login";
  const isArtBoardArea =
    pathname === siteRoutes.artboard ||
    pathname.startsWith(`${siteRoutes.artboard}/`) ||
    pathname.startsWith(siteRoutes.artists) ||
    pathname.startsWith(siteRoutes.artistProfileBase) ||
    pathname.startsWith(siteRoutes.portfolioBuilder) ||
    pathname.startsWith(siteRoutes.opportunities) ||
    pathname.startsWith(siteRoutes.pricing) ||
    pathname.startsWith(siteRoutes.application) ||
    pathname.startsWith(siteRoutes.artistApplication) ||
    pathname.startsWith(siteRoutes.registration) ||
    pathname.startsWith(siteRoutes.login) ||
    pathname.startsWith(siteRoutes.account) ||
    pathname.startsWith(siteRoutes.subscription) ||
    pathname.startsWith("/admin");

  if (isLoginPage) {
    return <ArtBoardAuthFooter />;
  }

  if (!isArtBoardArea) {
    return <ArtStudioFooter />;
  }

  return <ArtBoardFooter />;
}

function ArtStudioFooter() {
  return (
    <footer className="studio-footer" id="studio-footer">
      <div className="studio-footer__stars" aria-hidden="true" />

      <div className="studio-footer__inner">
        <div className="studio-footer__grid">
          <div className="studio-footer__identity">
            <Link className="studio-footer__brand" href="/" aria-label="Art Studio 360 početna">
              <span className="studio-footer__brand-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <strong>Art Studio 360</strong>
            </Link>

            <p>
              Ivona Medenica
              <br />
              Podgorica, Montenegro
            </p>
          </div>

          <FooterColumn title="Sajt">
            <Link href="/">Studio</Link>
            <Link href={siteRoutes.services}>Usluge</Link>
            <Link href={siteRoutes.artboard} rel="noopener noreferrer" target="_blank">
              ArtBoard <span aria-hidden="true">↗</span>
            </Link>
            <Link href={siteRoutes.contact}>Kontakt</Link>
          </FooterColumn>

          <FooterColumn title="Pratite nas">
            <a href="https://www.instagram.com/artstudio.360" rel="noreferrer" target="_blank">Instagram</a>
            <a href="https://www.behance.net/artstudio360" rel="noreferrer" target="_blank">Behance</a>
            <a href="mailto:info@artstudio360.me">Email</a>
          </FooterColumn>

          <div className="studio-footer__artboard">
            <p className="studio-footer__column-title">ArtBoard</p>
            <Link
              className="studio-footer__cta"
              href={siteRoutes.artistApplication}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>
                <strong>Kreiraj profil</strong>
                <small>
                  Besplatna prijava <i aria-hidden="true">↗</i>
                </small>
              </span>
            </Link>
          </div>
        </div>

        <div className="studio-footer__bottom">
          <p>© Art Studio 360</p>
          <p>Dizajn i razvoj — Art Studio 360</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="studio-footer__column">
      <p className="studio-footer__column-title">{title}</p>
      <nav aria-label={title}>{children}</nav>
    </div>
  );
}

function ArtBoardFooter() {
  return (
    <footer className="site-footer" id="kontakt">
      <span className="site-footer__accent" aria-hidden="true" />
      <span className="site-footer__glow" aria-hidden="true" />
      <span className="site-footer__stars" aria-hidden="true" />

      <div className="site-footer__inner">
        <div className="site-footer__grid">
          <div className="site-footer__identity">
            <Link className="site-footer__brand" href={siteRoutes.artboard} aria-label="ArtBoard početna">
              <ArtBoardLogo tone="light" />
            </Link>
            <p className="site-footer__tagline">Tvoj prostor za umjetnost.</p>
            <p className="site-footer__credit">Created by Art Studio 360</p>
            <a className="site-footer__email" href="mailto:info@artstudio360.me">info@artstudio360.me</a>
          </div>

          <div className="site-footer__column">
            <p className="site-footer__column-title">Linkovi</p>
            <nav aria-label="ArtBoard linkovi">
              <Link href={siteRoutes.artists}>Umjetnici</Link>
              <Link href={siteRoutes.portfolioBuilder}>Portfolio Builder</Link>
              <Link href={siteRoutes.opportunities}>Oglasi</Link>
              <Link href={siteRoutes.pricing}>Paketi</Link>
              <Link href={`${siteRoutes.artboard}#faq`}>FAQ</Link>
            </nav>
          </div>

          <div className="site-footer__column">
            <p className="site-footer__column-title">Korisnički nalog</p>
            <nav aria-label="Korisnički nalog">
              <Link href={siteRoutes.artistApplication}>Prijavi se</Link>
              <Link href={siteRoutes.login}>Uloguj se</Link>
              <Link href={siteRoutes.artboardContact}>Kontakt</Link>
            </nav>
          </div>

          <div className="site-footer__column">
            <p className="site-footer__column-title">Pravne informacije</p>
            <nav aria-label="Pravne informacije">
              <Link href="/uslovi-koriscenja">Uslovi korišćenja</Link>
              <Link href="/uslovi-koriscenja#privatnost">Politika privatnosti</Link>
              <Link href="/uslovi-koriscenja#kolacici">Politika kolačića</Link>
            </nav>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p>© 2026 ArtBoard · Art Studio 360</p>
          <p>Podgorica, Crna Gora</p>
        </div>
      </div>
    </footer>
  );
}

function ArtBoardAuthFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#0b0c12] text-white">
      <span
        className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#1a7cff] via-[#ff2d55] to-[#ffd028]"
        aria-hidden="true"
      />
      <div className="mx-auto flex min-h-[94px] w-full max-w-[1280px] flex-col justify-center gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-14">
        <Link className="inline-flex w-[150px]" href={siteRoutes.artboard} aria-label="ArtBoard početna">
          <ArtBoardLogo className="w-full" tone="light" />
        </Link>
        <p className="m-0 text-[12px] font-medium text-white/60 sm:text-[13px]">
          © 2026 ArtBoard · Art Studio 360 ·{" "}
          <a className="text-white transition hover:text-[#ffd028]" href="mailto:info@artstudio360.me">
            info@artstudio360.me
          </a>
        </p>
      </div>
    </footer>
  );
}
