import Link from "next/link";
import { Check } from "lucide-react";

import {
  ArtBoardVerificationSideOrbits,
  type VerificationArtworkPreview,
} from "@/components/artboard-verification-side-orbits";
import { siteRoutes } from "@/lib/site-routes";

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
    tone: "blue",
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
    tone: "purple",
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
    tone: "orange",
  },
] as const;

export function ArtBoardVerificationSection({ artworks }: { artworks: VerificationArtworkPreview[] }) {
  return (
    <section className="artboard-verification" id="verifikacija-profila" aria-labelledby="artboard-verification-title">
      <ArtBoardVerificationSideOrbits artworks={artworks} />

      <div className="artboard-verification__frame">
        <div className="artboard-verification__panel">
          <span className="artboard-verification__badge" aria-hidden="true">
            <Check size={30} strokeWidth={4} />
          </span>
          <p className="artboard-verification__eyebrow">Verifikacija profila</p>
          <h2 className="artboard-verification__title" id="artboard-verification-title">
            Svaki profil prolazi kroz
            <span><span>proces verifikacije</span>.</span>
          </h2>
          <p className="artboard-verification__intro">
            Prije objave provjeravamo osnovne podatke i radove. Na taj način ArtBoard ostaje mjesto kojem umjetnici, publika i organizacije vjeruju.
          </p>

          <div className="artboard-verification__checks">
            {checks.map(({ title, description, icon, tone }) => (
              <div className={`artboard-verification__check artboard-verification__check--${tone}`} key={title}>
                <div className="artboard-verification__check-heading">
                  <span className="artboard-verification__check-icon" aria-hidden="true">{icon}</span>
                  <h3>{title}</h3>
                </div>
                <p>{description}</p>
              </div>
            ))}
          </div>

          <div className="artboard-verification__actions">
            <Link className="artboard-verification__button artboard-verification__button--primary" href={siteRoutes.artistApplication}>
              Pridruži se
            </Link>
            <Link className="artboard-verification__button artboard-verification__button--secondary" href="#faq">
              Kako ide pregled
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
