"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { publicNavigationItems, siteRoutes } from "@/lib/site-routes";

const socialLinks = [
  { href: "https://www.instagram.com/", label: "Instagram" },
  { href: "https://www.behance.net/", label: "Behance" },
  { href: "https://www.linkedin.com/", label: "Linkedin" },
];

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

  const footerNavigationItems = publicNavigationItems.map((item) =>
    item.label === "Kontakt" ? { ...item, href: siteRoutes.artboardContact } : item,
  );

  return <ArtBoardFooter navigationItems={footerNavigationItems} />;
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

type FooterNavigationItem = (typeof publicNavigationItems)[number] | {
  href: string;
  label: string;
  activePrefixes: readonly string[];
};

function ArtBoardFooter({ navigationItems }: { navigationItems: FooterNavigationItem[] }) {
  return (
    <footer className="site-footer relative mt-24 overflow-hidden text-[#4a4f59]">
      <div className="site-footer__shape" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-[1280px] px-[5vw] pb-20 pt-28 sm:pb-24 sm:pt-32">
        <div className="grid gap-14 lg:grid-cols-[1.45fr_0.7fr_0.7fr] lg:gap-10">
          <div className="flex flex-col gap-12">
            <Link className="inline-flex w-fit items-center" href="/" aria-label="Art Studio 360">
              <img
                alt="Art Studio 360 logo"
                className="w-[112px]"
                src="https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/682344cfd8a98907bbb50f8e_7e491909af25e7cd587505a1141c670a_360%20Logo%20Black.svg"
              />
            </Link>

            <div className="space-y-10 text-[18px] leading-[1.2] text-[#9ca3af]">
              <p className="max-w-[240px]">
                &copy; 2025 ArtStudio 360
                <br />
                All Rights Reserved
              </p>

              <Link className="site-footer__muted-link inline-block underline underline-offset-4" href="/uslovi-koriscenja">
                Uslovi koriscenja
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-[18px] font-medium text-[#8d97a6]">Navigacija</p>
            <nav aria-label="Footer navigation" className="flex flex-col gap-4">
              {navigationItems.map((item) => (
                <Link key={item.label} className="site-footer__link" href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-6">
            <p className="text-[18px] font-medium text-[#8d97a6]">Drustvene mreze</p>
            <div className="flex flex-col gap-4">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  className="site-footer__link inline-flex items-center gap-3"
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true" className="site-footer__icon">
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4 12L12 4M6 4H12V10"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
