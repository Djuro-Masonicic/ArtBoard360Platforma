"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { logoutAdminAction } from "@/actions/admin-auth";
import { logoutArtistAction } from "@/app/artist/login/actions";
import { SiteCtaButton } from "@/components/site-cta-button";

const MOBILE_MENU_OPEN_SWEEP_MS = 520;
const MOBILE_MENU_CLOSE_CONTENT_MS = 180;
const MOBILE_MENU_CLOSE_SWEEP_MS = 520;

const navigationItems = [
  { href: "#", label: "O nama" },
  { href: "#", label: "ArtBoard" },
  { href: "/artists", label: "Umjetnici", matchPrefix: "/artists" },
  { href: "/portfolio-builder", label: "Portfolio builder", matchPrefix: "/portfolio-builder" },
  { href: "#", label: "Usluge" },
  { href: "/kontakt", label: "Kontakt", matchPrefix: "/kontakt" },
  { href: "#", label: "Blog" },
];

const socialLinks = [
  {
    href: "https://instagram.com",
    label: "Instagram",
    icon: (
      <svg fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "https://behance.net",
    label: "Behance",
    icon: (
      <svg fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 6.2H10.7C13.3 6.2 14.7 7.35 14.7 9.35C14.7 10.8 13.9 11.78 12.55 12.12C14.2 12.38 15.2 13.5 15.2 15.25C15.2 17.7 13.45 19 10.4 19H4V6.2ZM9.95 11.1C11.35 11.1 12.1 10.55 12.1 9.5C12.1 8.45 11.35 7.95 9.95 7.95H6.55V11.1H9.95ZM10.2 17.2C11.85 17.2 12.75 16.55 12.75 15.25C12.75 13.95 11.85 13.25 10.2 13.25H6.55V17.2H10.2Z"
          fill="currentColor"
        />
        <path d="M17.2 6.5H22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M17 14.2C17 11.9 18.5 10.4 20.65 10.4C22.8 10.4 24 11.9 24 14V14.8H19.4C19.55 16.1 20.35 16.8 21.55 16.8C22.4 16.8 22.95 16.5 23.45 15.85L24 16.25C23.3 17.5 22.1 18.1 20.55 18.1C18.45 18.1 17 16.6 17 14.2ZM22.15 13.45C22.05 12.35 21.45 11.75 20.55 11.75C19.55 11.75 18.85 12.4 19.5 13.45H22.15Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    href: "https://linkedin.com",
    label: "LinkedIn",
    icon: (
      <svg fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.2 9.2H4.2V19.2H7.2V9.2Z" fill="currentColor" />
        <path d="M5.7 7.8C6.65 7.8 7.45 7 7.45 6.05C7.45 5.1 6.65 4.3 5.7 4.3C4.75 4.3 3.95 5.1 3.95 6.05C3.95 7 4.75 7.8 5.7 7.8Z" fill="currentColor" />
        <path
          d="M10 9.2H12.9V10.55H12.95C13.35 9.8 14.35 9 15.9 9C19.1 9 19.7 11.05 19.7 13.7V19.2H16.7V14.35C16.7 13.2 16.7 11.75 15.15 11.75C13.55 11.75 13.3 13 13.3 14.25V19.2H10V9.2Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

interface SiteHeaderProps {
  session?: {
    kind: "admin" | "artist";
    email: string;
    name: string;
    avatarUrl: string | null;
    primaryHref: string;
    primaryLabel: string;
  } | null;
}

export function SiteHeader({ session = null }: SiteHeaderProps) {
  const pathname = usePathname();
  const navColors = ["#ffc41d", "#182fc7", "#dc1735"];
  const [mobileMenuState, setMobileMenuState] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const isArtistHeroPage = /^\/artists\/[^/]+$/.test(pathname);
  const [isTransparentHeader, setIsTransparentHeader] = useState(isArtistHeroPage);
  const isAuthenticated = Boolean(session);

  const isMobileMenuVisible = mobileMenuState !== "closed";
  const isMobileMenuOpen = mobileMenuState !== "closed";

  useEffect(() => {
    setMobileMenuState("closed");
  }, [pathname]);

  useEffect(() => {
    if (!isArtistHeroPage) {
      setIsTransparentHeader(false);
      return;
    }

    const updateHeaderMode = () => {
      setIsTransparentHeader(window.scrollY < window.innerHeight * 0.72);
    };

    updateHeaderMode();
    window.addEventListener("scroll", updateHeaderMode, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateHeaderMode);
    };
  }, [isArtistHeroPage]);

  useEffect(() => {
    if (mobileMenuState === "opening") {
      const timeoutId = window.setTimeout(() => {
        setMobileMenuState("open");
      }, MOBILE_MENU_OPEN_SWEEP_MS);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    if (mobileMenuState === "closing") {
      const timeoutId = window.setTimeout(() => {
        setMobileMenuState("closed");
      }, MOBILE_MENU_CLOSE_CONTENT_MS + MOBILE_MENU_CLOSE_SWEEP_MS);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [mobileMenuState]);

  function openMobileMenu() {
    setMobileMenuState("opening");
  }

  function closeMobileMenu() {
    setMobileMenuState("closing");
  }

  function toggleMobileMenu() {
    if (mobileMenuState === "opening" || mobileMenuState === "open") {
      closeMobileMenu();
      return;
    }

    openMobileMenu();
  }

  const desktopNavLinkClass = isTransparentHeader ? "home-nav-link home-nav-link--light" : "home-nav-link";
  const desktopAvatarButtonClass = isTransparentHeader
    ? "flex h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-full border border-white/35 bg-white/10 shadow-none backdrop-blur-sm transition-all duration-500 ease-out hover:scale-[1.02]"
    : "flex h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-full border border-[#dde4ef] bg-[#fbfdff] shadow-[0_10px_24px_rgba(38,51,71,0.08)] transition-all duration-500 ease-out hover:scale-[1.02]";
  const desktopAvatarTextClass = isTransparentHeader
    ? "text-[16px] font-semibold uppercase text-white"
    : "text-[16px] font-semibold uppercase text-[#2f3138]";
  const desktopHeaderClass = isTransparentHeader
    ? "relative z-20 mx-auto grid h-[88px] w-full max-w-[1192px] grid-cols-[minmax(0,160px)_1fr_auto] items-center bg-transparent px-6 transition-[background-color,box-shadow,border-radius,backdrop-filter] duration-500 ease-out sm:px-8 lg:grid-cols-[220px_1fr_220px] lg:px-[40px]"
    : "relative z-20 mx-auto grid h-[88px] w-full max-w-[1192px] grid-cols-[minmax(0,160px)_1fr_auto] items-center rounded-full bg-white px-6 shadow-[0_14px_38px_rgba(38,51,71,0.08)] transition-[background-color,box-shadow,border-radius,backdrop-filter] duration-500 ease-out sm:px-8 lg:grid-cols-[220px_1fr_220px] lg:px-[40px]";
  const logoSrc = isTransparentHeader
    ? "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68c978c51b6638fa49b92f6b_360%20Logo%20White.svg"
    : "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/682344cfd8a98907bbb50f8e_7e491909af25e7cd587505a1141c670a_360%20Logo%20Black.svg";

  return (
    <div className="fixed z-30 w-[100vw] px-[5vw] pt-[5vh]">
      <header className={desktopHeaderClass}>
        <div className="relative z-10 flex min-w-0 items-center justify-start">
          <Link className="inline-flex h-full items-center" href="/" aria-label="Art Studio 360">
            <img
              alt="Art Studio 360 logo"
              className="block w-[78px] translate-y-[1px] transition-opacity duration-300 sm:w-[96px] lg:w-[112px]"
              src={logoSrc}
            />
          </Link>
        </div>

        <nav aria-label="Primary navigation" className="hidden h-full items-center justify-center lg:flex">
          {navigationItems.map((item, index) => (
            <Link
              key={item.label}
              className={`${desktopNavLinkClass} h-full px-2 xl:px-3 ${
                item.matchPrefix && pathname.startsWith(item.matchPrefix) ? "home-nav-link--active" : ""
              }`}
              href={item.href}
              style={{ ["--nav-accent" as string]: navColors[index % navColors.length] }}
            >
              <span className="home-nav-link__label">{item.label}</span>
            </Link>
          ))}
        </nav>

        {!isAuthenticated ? (
          <div className="hidden items-center justify-end lg:flex">
            <SiteCtaButton asLink href="/artist/login" label="Prijavi se" />
          </div>
        ) : (
          <div className="hidden justify-end lg:flex">
            <div className="group relative">
              <button
                aria-label="Otvori korisnicki meni"
                className={desktopAvatarButtonClass}
                type="button"
              >
                {session?.avatarUrl ? (
                  <img
                    alt={session.name}
                    className="h-full w-full object-cover"
                    src={session.avatarUrl}
                  />
                ) : (
                  <span className={desktopAvatarTextClass}>
                    {getInitials(session?.name ?? session?.email ?? "")}
                  </span>
                )}
              </button>

              <div className="pointer-events-none absolute right-0 top-full h-4 w-full" aria-hidden="true" />

              <div className="pointer-events-none absolute right-0 top-full z-40 w-[250px] pt-3 opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <div className="translate-y-2 rounded-[24px] border border-[#dde4ef] bg-white/98 p-4 shadow-[0_24px_60px_rgba(38,51,71,0.14)] transition duration-200 group-hover:translate-y-0 group-focus-within:translate-y-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#e1e7ef] bg-[#f3f6fb]">
                    {session?.avatarUrl ? (
                      <img
                        alt={session.name}
                        className="h-full w-full object-cover"
                        src={session.avatarUrl}
                      />
                    ) : (
                      <span className="text-[14px] font-semibold uppercase text-[#2f3138]">
                        {getInitials(session?.name ?? session?.email ?? "")}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#7f8794]">
                      {session?.kind === "admin" ? "Admin" : "Artist"}
                    </div>
                    <div className="truncate text-[14px] font-medium text-[#2f3138]">{session?.name}</div>
                    <div className="truncate text-[13px] text-[#66707d]">{session?.email}</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-[#edf1f6] pt-4">
                  <Link
                    className="flex items-center justify-between rounded-[16px] px-3 py-3 text-[14px] font-medium text-[#2f3138] transition hover:bg-[#f6f9ff] hover:text-[#182fc7]"
                    href={session?.primaryHref ?? "/"}
                  >
                    <span>{session?.primaryLabel}</span>
                    <span aria-hidden="true">↗</span>
                  </Link>

                  {session?.kind === "artist" ? (
                    <Link
                      className="flex items-center justify-between rounded-[16px] px-3 py-3 text-[14px] font-medium text-[#2f3138] transition hover:bg-[#f6f9ff] hover:text-[#182fc7]"
                      href="/artist/subscription"
                    >
                      <span>Pretplata</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  ) : null}

                  <form action={session?.kind === "admin" ? logoutAdminAction : logoutArtistAction}>
                    <button
                      className="flex w-full items-center justify-between rounded-[16px] px-3 py-3 text-left text-[14px] font-medium text-[#b4132c] transition hover:bg-[#fff1f4]"
                      type="submit"
                    >
                      <span>Logout</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </form>
                </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 flex items-center justify-end lg:hidden">
          <button
            aria-controls="mobile-site-menu"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Zatvori meni" : "Otvori meni"}
            className={`site-header-mobile-toggle ${isTransparentHeader ? "text-white" : ""}`}
            onClick={toggleMobileMenu}
            type="button"
          >
            {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      {isMobileMenuVisible ? (
        <div className="site-mobile-menu" data-state={mobileMenuState} id="mobile-site-menu">
          <div className="site-mobile-menu__sweep" />

          <div className="site-mobile-menu__content">
            <nav aria-label="Mobile navigation" className="site-mobile-menu__nav">
              {navigationItems.map((item, index) => (
                <Link
                  key={item.label}
                  className={`site-mobile-menu__link ${
                    item.matchPrefix && pathname.startsWith(item.matchPrefix) ? "site-mobile-menu__link--active" : ""
                  }`}
                  href={item.href}
                  onClick={closeMobileMenu}
                  style={{ ["--nav-accent" as string]: navColors[index % navColors.length] }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {!isAuthenticated ? (
              <div className="site-mobile-menu__actions">
                <SiteCtaButton asLink href="/artist/login" label="Prijavi se" />
              </div>
            ) : (
              <div className="w-full max-w-[240px] rounded-[24px] border border-[#dde4ef] bg-white/95 px-4 py-4 text-center shadow-[0_14px_38px_rgba(38,51,71,0.08)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#e1e7ef] bg-[#f3f6fb]">
                  {session?.avatarUrl ? (
                    <img
                      alt={session.name}
                      className="h-full w-full object-cover"
                      src={session.avatarUrl}
                    />
                  ) : (
                    <span className="text-[16px] font-semibold uppercase text-[#2f3138]">
                      {getInitials(session?.name ?? session?.email ?? "")}
                    </span>
                  )}
                </div>

                <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.22em] text-[#7f8794]">
                  {session?.kind === "admin" ? "Admin" : "Artist"}
                </div>
                <div className="mt-2 truncate text-[14px] font-medium text-[#2f3138]">{session?.name}</div>
                <div className="mt-1 truncate text-[13px] text-[#66707d]">{session?.email}</div>

                <Link
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-[#d9e1ed] px-4 text-[14px] font-medium text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                  href={session?.primaryHref ?? "/"}
                  onClick={closeMobileMenu}
                >
                  {session?.primaryLabel}
                </Link>

                {session?.kind === "artist" ? (
                  <Link
                    className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-[#d9e1ed] px-4 text-[14px] font-medium text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                    href="/artist/subscription"
                    onClick={closeMobileMenu}
                  >
                    Pretplata
                  </Link>
                ) : null}

                <form
                  action={session?.kind === "admin" ? logoutAdminAction : logoutArtistAction}
                  className="mt-4"
                >
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[#182fc7] px-4 text-[14px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
                    type="submit"
                  >
                    Logout
                  </button>
                </form>
              </div>
            )}

            <div className="site-mobile-menu__socials">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  aria-label={item.label}
                  className="site-mobile-menu__social-link"
                  href={item.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7.5H19" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M5 12H19" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M5 16.5H19" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7L17 17" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M17 7L7 17" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}
