"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArtBoardLogo } from "@/components/artboard-logo";
import { siteRoutes } from "@/lib/site-routes";
import { getSiteSurface } from "@/lib/site-surface";
import profileStyles from "./artist-profile-footer.module.css";

export function SiteFooter() {
  const pathname = usePathname();
  if (getSiteSurface(pathname) === "artboard") {
    // The legal document already has its own #kontakt content section.
    return <ArtBoardFooter id={pathname === "/uslovi-koriscenja" ? "artboard-footer" : "kontakt"} />;
  }
  return <ArtStudioFooter />;
}

function ArtBoardFooter({ id }: { id: string }) {
  return (
    <footer
      data-artboard-footer=""
      className={`${profileStyles.footer} ${profileStyles.artboardFooter}`}
      id={id}
    >
      <div className={profileStyles.inner}>
        <div className={profileStyles.grid}>
          <div className={profileStyles.identity}>
            <Link className={profileStyles.brand} href={siteRoutes.artboard} aria-label="ArtBoard početna">
              <ArtBoardLogo tone="dark" />
            </Link>
            <p>Tvoj prostor za umjetnost.</p>
            <strong>Created by Art Studio 360</strong>
          </div>

          <ProfileFooterColumn title="Platforma">
            <Link href={siteRoutes.artists}>Umjetnici</Link>
            <Link href={siteRoutes.portfolioBuilder}>Portfolio Builder</Link>
            <Link href={siteRoutes.opportunities}>Oglasi</Link>
            <Link href={siteRoutes.pricing}>Paketi</Link>
            <Link href={`${siteRoutes.artboard}#faq`}>FAQ</Link>
          </ProfileFooterColumn>

          <ProfileFooterColumn title="Nalog">
            <Link href={siteRoutes.application}>Prijavi se</Link>
            <Link href="/login">Uloguj se</Link>
            <Link href={siteRoutes.contact}>Kontakt</Link>
          </ProfileFooterColumn>

          <ProfileFooterColumn title="Pravne informacije">
            <Link href="/uslovi-koriscenja">Uslovi korišćenja</Link>
            <Link href="/uslovi-koriscenja#privatnost">Politika privatnosti</Link>
            <Link href="/uslovi-koriscenja#kolacici">Politika kolačića</Link>
          </ProfileFooterColumn>

          <ProfileFooterColumn title="Društvene mreže">
            <a href="https://www.instagram.com/artstudio.360" rel="noreferrer" target="_blank">Instagram</a>
            <a href="https://www.linkedin.com/company/artstudio360" rel="noreferrer" target="_blank">LinkedIn</a>
            <a href="https://www.behance.net/artstudio360" rel="noreferrer" target="_blank">Behance</a>
          </ProfileFooterColumn>
        </div>

        <div className={profileStyles.bottom}>
          <p>© 2026 ArtBoard · Art Studio 360 · Podgorica, Crna Gora</p>
          <a href="mailto:info@artstudio360.me">info@artstudio360.me</a>
        </div>
      </div>
    </footer>
  );
}

function ProfileFooterColumn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className={profileStyles.column}>
      <p>{title}</p>
      <nav aria-label={title}>{children}</nav>
    </div>
  );
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
