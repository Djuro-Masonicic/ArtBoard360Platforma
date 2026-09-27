"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import { siteRoutes } from "@/lib/site-routes";

const groups = [
  {
    label: "Profil",
    tone: "blue",
    items: [
      {
        title: "Besplatan umjetnički profil",
        text: "Predstavi svoju biografiju, iskustvo, radove, izložbe i kontakt informacije na jednom mjestu.",
        href: siteRoutes.artistApplication,
        icon: "profile",
      },
      {
        title: "Upravljanje profilom",
        text: "Dodaj nove radove i ažuriraj podatke bez ponovnog slanja cijele prijave.",
        href: siteRoutes.account,
        icon: "sliders",
      },
      {
        title: "Pretraživač umjetnika",
        text: "Postani dio kataloga kroz koji publika, kustosi, galerije i poslodavci mogu pronaći tvoj rad.",
        href: siteRoutes.artists,
        icon: "search",
      },
    ],
  },
  {
    label: "Alati",
    tone: "red",
    items: [
      {
        title: "Portfolio i CV Builder",
        text: "Pretvori podatke i radove sa svog profila u profesionalno dizajniran portfolio i CV.",
        href: siteRoutes.portfolioBuilder,
        icon: "tool-search",
      },
      {
        title: "Generator promotivnih materijala",
        text: "Kreiraj vizuale za društvene mreže i promociju koristeći svoje podatke i radove.",
        href: siteRoutes.account,
        icon: "instagram",
      },
      {
        title: "Digitalna vizit karta",
        text: "Podijeli profil, portfolio i kontakt putem personalizovane kartice sa QR kodom.",
        href: siteRoutes.account,
        icon: "contact-card",
      },
    ],
  },
  {
    label: "Prilike",
    tone: "yellow",
    items: [
      {
        title: "Oglasna tabla",
        text: "Pronađi pozive, poslove, konkurse, rezidencije i druge profesionalne prilike.",
        href: siteRoutes.opportunities,
        icon: "briefcase",
      },
      {
        title: "ArtBoard Edu",
        text: "Uči kroz praktične kurseve na svom jeziku ili kreiraj svoje, podijeli znanje i zaradi.",
        soon: true,
        icon: "graduation",
      },
      {
        title: "Fleksibilno članstvo",
        text: "Otključaj neograničen pristup alatima i naprednim funkcionalnostima uz iznos članstva koji biraš.",
        href: siteRoutes.pricing,
        icon: "star",
      },
    ],
  },
] as const;

type ToolIconName = (typeof groups)[number]["items"][number]["icon"];

function ArtBoardToolIcon({
  gradientId,
  name,
}: {
  gradientId: string;
  name: ToolIconName;
}) {
  let paths;

  switch (name) {
    case "profile":
      paths = (
        <>
          <circle cx="12" cy="8.2" r="3.4" />
          <path d="M4.8 20c1.1-3.6 3.9-5.4 7.2-5.4S18.1 16.4 19.2 20" />
        </>
      );
      break;
    case "sliders":
      paths = (
        <>
          <path d="M4 6.6h9.4" />
          <path d="M17.8 6.6H20" />
          <path d="M4 12h2.6" />
          <path d="M11 12h9" />
          <path d="M4 17.4h9.4" />
          <path d="M17.8 17.4H20" />
          <circle cx="15.6" cy="6.6" r="2.2" />
          <circle cx="8.8" cy="12" r="2.2" />
          <circle cx="15.6" cy="17.4" r="2.2" />
        </>
      );
      break;
    case "search":
    case "tool-search":
      paths = (
        <>
          <circle cx="10.6" cy="10.6" r="6.2" />
          <line x1="15.3" y1="15.3" x2="20.5" y2="20.5" />
        </>
      );
      break;
    case "instagram":
      paths = (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r=".6" fill={`url(#${gradientId})`} />
        </>
      );
      break;
    case "contact-card":
      paths = (
        <>
          <rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.6" />
          <circle cx="8.4" cy="10.6" r="2.1" />
          <path d="M5.4 15.8c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2" />
          <line x1="14.2" y1="10" x2="18" y2="10" />
          <line x1="14.2" y1="13.4" x2="16.6" y2="13.4" />
        </>
      );
      break;
    case "briefcase":
      paths = (
        <>
          <rect x="2.8" y="7" width="18.4" height="13" rx="2.2" />
          <path d="M8.8 7V5.6a2 2 0 012-2h2.4a2 2 0 012 2V7" />
          <path d="M2.8 12.6c3 1.4 6 2.1 9.2 2.1s6.2-.7 9.2-2.1" />
        </>
      );
      break;
    case "graduation":
      paths = (
        <>
          <path d="M12 4.2L21 8.2l-9 4-9-4 9-4z" />
          <path d="M6.6 10.6v4.8c0 1.7 2.4 3 5.4 3s5.4-1.3 5.4-3v-4.8" />
          <line x1="21" y1="8.2" x2="21" y2="14" />
        </>
      );
      break;
    case "star":
      paths = <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.85L12 3.6z" />;
      break;
  }

  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke={`url(#${gradientId})`}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="2"
          y1="2"
          x2="22"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop className="artboard-tools__icon-stop artboard-tools__icon-stop--start" offset="0%" />
          <stop className="artboard-tools__icon-stop artboard-tools__icon-stop--middle" offset="52%" />
          <stop className="artboard-tools__icon-stop artboard-tools__icon-stop--end" offset="100%" />
        </linearGradient>
      </defs>
      {paths}
    </svg>
  );
}

export function ArtBoardToolsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (
      !section ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const elements =
      section.querySelectorAll<HTMLElement>("[data-tool-reveal]");
    section.classList.add("artboard-tools--reveal-ready");

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        section.classList.toggle("artboard-tools--paused", !entry?.isIntersecting);
      },
      { rootMargin: "240px 0px" },
    );
    visibilityObserver.observe(section);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
    );

    const frame = window.requestAnimationFrame(() => {
      elements.forEach((element) => observer.observe(element));
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      visibilityObserver.disconnect();
    };
  }, []);

  return (
    <section className="artboard-tools" id="alati" ref={sectionRef}>
      <div className="artboard-tools__inner">
        <p className="artboard-tools__eyebrow" data-tool-reveal>
          <span aria-hidden="true" /> ArtBoard alati
        </p>
        <h2 className="artboard-tools__title" data-tool-reveal>
          <span>
            Sve što je umjetnicima <br /> potrebno,
          </span>
          <span>na jednom mjestu.</span>
        </h2>
        <p className="artboard-tools__intro" data-tool-reveal>
          ArtBoard alati ti pomažu u različitim fazama razvoja umjetničke
          karijere, bilo da uređuješ profil, kreiraš portfolio ili tražiš nove
          prilike.
        </p>

        <div className="artboard-tools__groups">
          {groups.map((group) => (
            <div
              className={`artboard-tools__group artboard-tools__group--${group.tone}`}
              key={group.label}
            >
              <h3 className="artboard-tools__group-label" data-tool-reveal>
                <span aria-hidden="true" /> {group.label}
              </h3>
              <div className="artboard-tools__items">
                {group.items.map((item, index) => {
                  const iconGradientId = `artboard-tools-icon-${group.tone}-${index}`;
                  const content = (
                    <>
                      <span
                        className="artboard-tools__item-icon"
                        aria-hidden="true"
                      >
                        <ArtBoardToolIcon gradientId={iconGradientId} name={item.icon} />
                      </span>
                      <span className="artboard-tools__item-copy">
                        <strong>
                          {item.title}
                          {"soon" in item && item.soon ? (
                            <span className="artboard-tools__soon">
                              <button
                                className="artboard-tools__soon-trigger"
                                type="button"
                                aria-describedby="artboard-edu-tooltip"
                              >
                                Uskoro <Info size={13} strokeWidth={2} aria-hidden="true" />
                              </button>
                              <span
                                className="artboard-tools__soon-tooltip"
                                id="artboard-edu-tooltip"
                                role="tooltip"
                              >
                                ArtBoard Edu je u pripremi. Ako te zanima kreiranje i prodaja
                                kurseva, radionica ili drugih edukativnih sadržaja na platformi,
                                prijavi svoje interesovanje putem{" "}
                                <Link href={siteRoutes.artboardContact}>kontakt forme</Link>.
                              </span>
                            </span>
                          ) : null}
                        </strong>
                        <span>{item.text}</span>
                      </span>
                    </>
                  );

                  return (
                    <div
                      className="artboard-tools__item-reveal"
                      data-tool-reveal
                      key={item.title}
                      style={
                        { "--reveal-delay": `${index * 75}ms` } as CSSProperties
                      }
                    >
                      {"href" in item ? (
                        <Link className="artboard-tools__item" href={item.href}>
                          {content}
                        </Link>
                      ) : (
                        <article className="artboard-tools__item artboard-tools__item--soon">
                          {content}
                        </article>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div data-tool-reveal>
          <Link
            className="artboard-tools__cta"
            href={siteRoutes.artistApplication}
          >
            Besplatno isprobaj alate
          </Link>
        </div>
      </div>
    </section>
  );
}
