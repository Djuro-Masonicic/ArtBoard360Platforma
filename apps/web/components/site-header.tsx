"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SiteCtaButton } from "@/components/site-cta-button";

const navigationItems = [
  { href: "#", label: "O nama" },
  { href: "#", label: "ArtBoard" },
  { href: "/artists", label: "Umjetnici", matchPrefix: "/artists" },
  { href: "#", label: "Usluge" },
  { href: "#", label: "Kontakt" },
  { href: "#", label: "Blog" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const navColors = ["#ffc41d", "#182fc7", "#dc1735"];

  return (
    <div className="fixed z-20 w-[100vw] px-[5vw] pt-[5vh]">
      <header className="mx-auto flex h-[88px] w-full max-w-[1192px] items-center justify-between rounded-full bg-white px-10 shadow-[0_14px_38px_rgba(38,51,71,0.08)] sm:px-[64px]">
        <div className="flex min-w-0  items-center">
          <Link className="inline-flex items-center" href="/" aria-label="Art Studio 360">
            <img
              alt="Art Studio 360 logo"
              className=" w-[100px] sm:w-[112px]"
              src="https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/682344cfd8a98907bbb50f8e_7e491909af25e7cd587505a1141c670a_360%20Logo%20Black.svg"
            />
          </Link>
        </div>

        <nav
          aria-label="Primary navigation"
          className="hidden flex-[1.35] items-center justify-center lg:flex h-full"
        >
          {navigationItems.map((item, index) => (
            <Link
              key={item.label}
              className={`home-nav-link px-4 h-full ${
                item.matchPrefix && pathname.startsWith(item.matchPrefix) ? "home-nav-link--active" : ""
              }`}
              href={item.href}
              style={{ ["--nav-accent" as string]: navColors[index % navColors.length] }}
            >
              <span className="home-nav-link__label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-4">
          <Link className="site-header-login-link" href="/artist/login">
            Login
          </Link>
          <SiteCtaButton href="/prijava" label="Prijavi se" />
        </div>
      </header>
    </div>
  );
}
