import Link from "next/link";
import { Check, FileText, Image as ImageIcon, ShieldCheck } from "lucide-react";

import { ArtBoardVerificationSideOrbits } from "@/components/artboard-verification-side-orbits";
import { siteRoutes } from "@/lib/site-routes";

const checks = [
  {
    title: "Autorstvo",
    description: "Radovi su tvoji ili imaš pravo da ih objaviš i predstaviš na platformi.",
    icon: ShieldCheck,
    tone: "blue",
  },
  {
    title: "Ispravnost informacija",
    description: "Ime, discipline, biografija i kontakt podaci su tačni i potpuni.",
    icon: FileText,
    tone: "red",
  },
  {
    title: "Prikaz radova",
    description: "Radovi zadovoljavaju minimalni broj i kvalitet prikaza i ne krše uslove korišćenja platforme.",
    icon: ImageIcon,
    tone: "yellow",
  },
] as const;

export function ArtBoardVerificationSection() {
  return (
    <section className="artboard-verification" id="verifikacija-profila" aria-labelledby="artboard-verification-title">
      <ArtBoardVerificationSideOrbits />

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
            {checks.map(({ title, description, icon: Icon, tone }) => (
              <div className={`artboard-verification__check artboard-verification__check--${tone}`} key={title}>
                <span className="artboard-verification__check-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.9} /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
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
