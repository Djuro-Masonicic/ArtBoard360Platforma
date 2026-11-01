"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import {
  ArtBoardVerificationSideOrbits,
  type VerificationArtworkPreview,
} from "@/components/artboard-verification-side-orbits";
const checks = [
  {
    title: "Autorska prava",
    description: "Radovi su tvoji ili imaš pravo da ih objaviš i predstaviš na platformi.",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.6" />
        <path d="M14.8 9.6a3.8 3.8 0 100 4.8" />
      </svg>
    ),
  },
  {
    title: "Ispravnost informacija",
    description: "Ime, discipline, biografija i kontakt podaci su tačni i potpuni.",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.8" y="5" width="18.4" height="14" rx="2.4" />
        <circle cx="8.4" cy="10.6" r="2.1" />
        <path d="M5 15.8c.7-1.6 1.9-2.4 3.4-2.4s2.7.8 3.4 2.4" />
        <line x1="14.6" y1="9.8" x2="18.6" y2="9.8" />
        <line x1="14.6" y1="13.6" x2="18" y2="13.6" />
      </svg>
    ),
  },
  {
    title: "Uslovi korišćenja",
    description: "Radovi zadovoljavaju minimalni broj i kvalitet prikaza i ne krše uslove korišćenja platforme.",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.2 3h8l4 4v14H6.2z" />
        <path d="M14 3v4.2h4.2" />
        <path d="M9 13.6l2 2 4-4.4" />
      </svg>
    ),
  },
] as const;

export function ArtBoardVerificationSection({ artworks }: { artworks: VerificationArtworkPreview[] }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (typeof IntersectionObserver === "undefined") {
      section.classList.add("artboard-verification--visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        section.classList.add("artboard-verification--visible");
        observer.disconnect();
      },
      { threshold: 0.14 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="artboard-verification" id="prijava" aria-labelledby="artboard-verification-title">
      <ArtBoardVerificationSideOrbits artworks={artworks} />

      <div className="artboard-verification__frame" data-reveal="" data-verification-reveal>
        <div className="artboard-verification__panel">
          <span className="artboard-verification__badge" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <defs><linearGradient id="abSeal" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#1877f2" /><stop offset="1" stopColor="#1877f2" /></linearGradient></defs>
              <path d="M12 2.6l2.7 1.6 3.1-.2 1.1 2.9 2.4 2-1.2 2.9 1.2 2.9-2.4 2-1.1 2.9-3.1-.2L12 21.4l-2.7-1.6-3.1.2-1.1-2.9-2.4-2 1.2-2.9L2.7 9.3l2.4-2 1.1-2.9 3.1.2z" fill="url(#abSeal)" />
              <path d="M8.6 12.3l2.4 2.4 4.4-4.9" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="artboard-verification__eyebrow">Verifikacija profila</p>
          <h2 className="artboard-verification__title" id="artboard-verification-title">
            Svaki profil prolazi kroz <span>proces verifikacije</span>.
          </h2>
          <p className="artboard-verification__intro">
            Prije objave provjeravamo osnovne podatke i radove. Na taj način ArtBoard ostaje mjesto kojem umjetnici, publika i organizacije vjeruju.
          </p>

          <div className="artboard-verification__checks">
            {checks.map(({ title, description, icon }) => (
              <div className="artboard-verification__check" key={title}>
                <div className="artboard-verification__check-heading">
                  <span className="artboard-verification__check-icon" aria-hidden="true">{icon}</span>
                  <h3>{title}</h3>
                </div>
                <p>{description}</p>
              </div>
            ))}
          </div>

          <div className="artboard-verification__actions">
            <Link className="artboard-verification__button artboard-verification__button--primary ab-hdr-cta" href="/prijava">
              Prijavi se besplatno
            </Link>
            <Link className="artboard-verification__button artboard-verification__button--secondary ab-cta-s" href="#faq">
              Kako ide pregled
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
