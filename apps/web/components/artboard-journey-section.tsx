"use client";

import Image from "next/image";
import { FileText, Share2, UserRound } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

const steps = [
  {
    number: "01",
    title: "Kreiraj profil",
    description: "Prijavi se besplatno i dodaj biografiju, discipline, radove, kontakt podatke i relevantne linkove.",
    icon: UserRound,
    tone: "blue",
    artwork: "/artboard-how/01.jpg",
    artworkAlt: "Kreiranje i uređivanje umjetničkog profila na računaru",
  },
  {
    number: "02",
    title: "Pripremi prezentaciju",
    description: "Pretvori podatke sa profila u portfolio, digitalnu vizit kartu i sadržaj za društvene mreže.",
    icon: FileText,
    tone: "red",
    artwork: "/artboard-how/02.jpg",
    artworkAlt: "Priprema profesionalne prezentacije umjetničkog rada",
  },
  {
    number: "03",
    title: "Podijeli i poveži se",
    description: "Povećaj vidljivost kroz ArtBoard pretraživač i koristi materijale za konkurse i saradnje.",
    icon: Share2,
    tone: "yellow",
    artwork: "/artboard-how/03.jpg",
    artworkAlt: "Dijeljenje umjetničkog rada i povezivanje sa publikom",
  },
] as const;

export function ArtBoardJourneySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (typeof IntersectionObserver === "undefined") {
      section.classList.add("artboard-journey--visible");
      return;
    }

    const pauseObserver = new IntersectionObserver(
      ([entry]) => section.classList.toggle("artboard-journey--paused", !entry?.isIntersecting),
      { rootMargin: "240px 0px" },
    );
    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        section.classList.add("artboard-journey--visible");
        revealObserver.disconnect();
      },
      { threshold: 0.12 },
    );

    pauseObserver.observe(section);
    revealObserver.observe(section);

    return () => {
      pauseObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className="artboard-journey" id="kako-funkcionise-artboard" aria-labelledby="artboard-journey-title">
      <div className="artboard-journey__inner">
        <p
          className="artboard-journey__eyebrow"
          data-journey-reveal
          style={{ "--journey-delay": "90ms" } as CSSProperties}
        ><span aria-hidden="true" />Kako funkcioniše platforma?</p>
        <h2
          className="artboard-journey__title"
          id="artboard-journey-title"
          data-journey-reveal
          style={{ "--journey-delay": "180ms" } as CSSProperties}
        >
          Tvoj put od prijave do
          <span className="artboard-journey__title-line">
            <span className="artboard-journey__title-gradient" data-text="profesionalne prezentacije.">profesionalne prezentacije.</span>
          </span>
        </h2>

        <ol className="artboard-journey__steps">
          {steps.map(({ number, title, description, icon: Icon, tone, artwork, artworkAlt }, index) => (
            <li
              className={`artboard-journey__step artboard-journey__step--${tone}`}
              data-journey-reveal
              key={number}
              style={{ "--journey-delay": `${300 + index * 120}ms` } as CSSProperties}
            >
              <span className="artboard-journey__icon" aria-hidden="true"><Icon size={24} strokeWidth={1.8} /></span>
              <div className="artboard-journey__copy">
                <h3><span>{number}</span>{title}</h3>
                <p>{description}</p>
              </div>
              <div className="artboard-journey__artwork">
                <Image
                  alt={artworkAlt}
                  fill
                  sizes="(max-width: 700px) 100vw, (max-width: 1050px) 33vw, 400px"
                  src={artwork}
                />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
