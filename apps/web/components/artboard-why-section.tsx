"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, PenLine, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { ArtBoardLogo } from "@/components/artboard-logo";
import { siteRoutes } from "@/lib/site-routes";

const words = [
  { label: "vidljivosti.", dot: "blue" },
  { label: "alata.", dot: "red" },
  { label: "prilika.", dot: "yellow" },
] as const;

const cards = [
  {
    title: "Umjetnički profil",
    description:
      "Predstavi sebe i svoje radove na umjetničkom profilu i povećaj vidljivost kroz ArtBoard pretraživač.",
    action: "Prijavi se besplatno",
    href: siteRoutes.artistApplication,
    image: "/artboard-why/visibility.webp",
    imageAlt: "Apstraktne sive trake koje se ukrštaju",
    icon: UserRound,
    tone: "blue",
  },
  {
    title: "Praktični alati",
    description:
      "Generiši portfolio, kreiraj digitalnu vizit kartu i sadržaj za promociju, bez komplikovanih programa.",
    action: "Isprobaj Portfolio Builder",
    href: siteRoutes.portfolioBuilder,
    image: "/artboard-why/tools.webp",
    imageAlt: "Složeni listovi papira za umjetnički portfolio",
    icon: PenLine,
    tone: "red",
  },
  {
    title: "Karijerne prilike",
    description:
      "Istraži oglase, pozive, konkurse, rezidencije i saradnje relevantne za tvoj rad i dalji razvoj.",
    action: "Pogledaj oglase",
    href: siteRoutes.opportunities,
    image: "/artboard-why/opportunities.webp",
    imageAlt: "Apstraktna kompozicija sivih geometrijskih oblika",
    icon: BriefcaseBusiness,
    tone: "yellow",
  },
] as const;

const ribbonTones = ["sunset", "violet", "gold", "aqua", "orchid", "blue", "coral"] as const;

export function ArtBoardWhySection() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % words.length);
    }, 3200);

    return () => window.clearInterval(interval);
  }, []);

  const activeWord = words[activeIndex] ?? words[0];

  return (
    <section className="artboard-why" id="zasto-artboard">
      <div className="artboard-why__inner">
        <p className="artboard-why__eyebrow">
          <span aria-hidden="true" />
          Zašto ArtBoard?
        </p>

        <div className="artboard-why__headline-row">
          <div className="artboard-why__logo" data-active={activeWord.dot}>
            <ArtBoardLogo showWordmark={false} />
          </div>
          <h2 className="artboard-why__headline" aria-label="Više vidljivosti, alata i prilika.">
            <span className="artboard-why__more" aria-hidden="true">Više</span>
            <span className="artboard-why__word-slot" aria-hidden="true">
              <span className="artboard-why__word" key={activeWord.label}>
                {activeWord.label}
              </span>
            </span>
          </h2>
        </div>

        <p className="artboard-why__description">
          Stvaranje je samo jedan dio umjetničkog puta. Jednako su važni način na koji
          predstavljaš svoj rad, alati koji ti olakšavaju promociju i prilike koje te
          povezuju sa pravim ljudima. ArtBoard sve to objedinjuje na jednom mjestu.
        </p>

        <div className="artboard-why__cards">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <article className={`artboard-why__card artboard-why__card--${card.tone}`} key={card.title}>
                <Image
                  className="artboard-why__card-image"
                  src={card.image}
                  alt={card.imageAlt}
                  width={960}
                  height={600}
                  sizes="(max-width: 560px) 100vw, (max-width: 850px) 50vw, 33vw"
                />
                <div className="artboard-why__card-body">
                  <div className="artboard-why__card-heading">
                    <span className="artboard-why__card-icon" aria-hidden="true"><Icon size={18} strokeWidth={2} /></span>
                    <h3>{card.title}</h3>
                  </div>
                  <p>{card.description}</p>
                  <Link href={card.href} className="artboard-why__card-link">
                    {card.action} <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="artboard-why__ribbon-marquee" aria-hidden="true">
        <div className="artboard-why__ribbon-track">
          {[0, 1].map((copy) => (
            <div className="artboard-why__ribbon-group" key={copy}>
              {ribbonTones.map((tone, index) => (
                <div className={`artboard-why__ribbon artboard-why__ribbon--${tone}`} key={`${copy}-${index}`}>
                  <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--one" />
                  <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--two" />
                  <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--three" />
                  <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--four" />
                  <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--five" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
