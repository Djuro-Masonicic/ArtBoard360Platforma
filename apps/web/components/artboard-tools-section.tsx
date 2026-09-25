"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  ImageIcon,
  Info,
  QrCode,
  Search,
  SlidersHorizontal,
  Star,
  UserRound,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import { siteRoutes } from "@/lib/site-routes";

const groups = [
  {
    label: "Vidljivost",
    tone: "blue",
    items: [
      {
        title: "Besplatan umjetnički profil",
        text: "Predstavi svoju biografiju, iskustvo, radove, izložbe i kontakt informacije na jednom mjestu.",
        href: siteRoutes.artistApplication,
        icon: UserRound,
      },
      {
        title: "Upravljanje profilom",
        text: "Dodaj nove radove i ažuriraj podatke bez ponovnog slanja cijele prijave.",
        href: siteRoutes.account,
        icon: SlidersHorizontal,
      },
      {
        title: "Pretraživač umjetnika",
        text: "Postani dio kataloga kroz koji publika, kustosi, galerije i poslodavci mogu pronaći tvoj rad.",
        href: siteRoutes.artists,
        icon: Search,
      },
    ],
  },
  {
    label: "Razvoj",
    tone: "red",
    items: [
      {
        title: "Portfolio i CV Builder",
        text: "Pretvori podatke i radove sa svog profila u profesionalno dizajniran portfolio i CV.",
        href: siteRoutes.portfolioBuilder,
        icon: FileText,
      },
      {
        title: "Generator promotivnih materijala",
        text: "Kreiraj vizuale za društvene mreže i promociju koristeći svoje podatke i radove.",
        href: siteRoutes.account,
        icon: ImageIcon,
      },
      {
        title: "Digitalna vizit karta",
        text: "Podijeli profil, portfolio i kontakt putem personalizovane kartice sa QR kodom.",
        href: siteRoutes.account,
        icon: QrCode,
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
        icon: BriefcaseBusiness,
      },
      {
        title: "ArtBoard Edu",
        text: "Uči kroz praktične kurseve na svom jeziku ili kreiraj svoje, podijeli znanje i zaradi.",
        soon: true,
        icon: GraduationCap,
      },
      {
        title: "Fleksibilno članstvo",
        text: "Otključaj neograničen pristup alatima i naprednim funkcionalnostima uz iznos članstva koji biraš.",
        href: siteRoutes.pricing,
        icon: Star,
      },
    ],
  },
] as const;

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
            Sve što je umjetnicima <br></br> potrebno,
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
                  const Icon = item.icon;
                  const content = (
                    <>
                      <span
                        className="artboard-tools__item-icon"
                        aria-hidden="true"
                      >
                        <Icon size={20} strokeWidth={1.8} />
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
