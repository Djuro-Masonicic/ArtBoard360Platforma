"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteRoutes } from "@/lib/site-routes";

export function SiteFooter() {
  const pathname = usePathname();
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

  if (!isArtBoardArea) {
    return <ArtStudioFooter />;
  }

  return <ArtBoardFooter />;
}

function ArtStudioFooter() {
  return (
    <footer className="studio-footer">
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
            <Link href={siteRoutes.artboard}>
              ArtBoard <span aria-hidden="true">↗</span>
            </Link>
            <Link href={siteRoutes.contact}>Kontakt</Link>
          </FooterColumn>

          <FooterColumn title="Pratite nas">
            <a href="https://www.instagram.com/" rel="noreferrer" target="_blank">Instagram</a>
            <a href="https://www.behance.net/" rel="noreferrer" target="_blank">Behance</a>
            <a href="mailto:hello@artstudio360.me">Email</a>
          </FooterColumn>

          <div className="studio-footer__artboard">
            <p className="studio-footer__column-title">ArtBoard</p>
            <Link className="studio-footer__cta" href={siteRoutes.artistApplication}>
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
    <footer className="site-footer">
      <div className="site-footer__stars" aria-hidden="true" />
      <div className="site-footer__inner">
        <div className="site-footer__grid">
          <div className="site-footer__identity">
            <Link className="site-footer__brand" href={siteRoutes.artboard}>ArtBoard</Link>
            <p className="site-footer__tagline">Tvoj prostor za umjetnost.</p>
            <p className="site-footer__credit">Created by Art Studio 360</p>
            <a className="site-footer__email" href="mailto:artboardproject2025@gmail.com">artboardproject2025@gmail.com</a>
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
          <p>Podgorica, Montenegro</p>
        </div>
      </div>
    </footer>
  );
}
