"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Megaphone } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import { siteRoutes } from "@/lib/site-routes";

export function ArtBoardOpportunitiesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (typeof IntersectionObserver === "undefined") {
      section.classList.add("artboard-opportunities--visible");
      return;
    }

    const pauseObserver = new IntersectionObserver(
      ([entry]) => section.classList.toggle("artboard-opportunities--paused", !entry?.isIntersecting),
      { rootMargin: "240px 0px" },
    );
    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        section.classList.add("artboard-opportunities--visible");
        revealObserver.disconnect();
      },
      { threshold: 0.22 },
    );

    pauseObserver.observe(section);
    revealObserver.observe(section);
    return () => {
      pauseObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className="artboard-opportunities" id="artboard-oglasi" aria-labelledby="artboard-opportunities-title">
      <div className="artboard-opportunities__inner">
        <p
          className="artboard-opportunities__eyebrow"
          data-opportunities-reveal
          style={{ "--opportunities-delay": "180ms" } as CSSProperties}
        ><span aria-hidden="true" /> Oglasna tabla</p>
        <div className="artboard-opportunities__header">
          <h2
            className="artboard-opportunities__title"
            id="artboard-opportunities-title"
            data-opportunities-reveal
            style={{ "--opportunities-delay": "340ms" } as CSSProperties}
          >
            Lakši put od oglasa<br />do <span data-text="nove saradnje">nove saradnje</span>.
          </h2>
          <p
            className="artboard-opportunities__intro"
            data-opportunities-reveal
            style={{ "--opportunities-delay": "500ms" } as CSSProperties}
          >
            ArtBoard oglasna tabla povezuje umjetnike sa kompanijama, kulturnim organizacijama,
            institucijama i drugim akterima koji traže njihov rad, znanje i iskustvo.
          </p>
        </div>

        <div className="artboard-opportunities__grid">
          <div className="artboard-opportunities__choices">
            <article
              className="artboard-opportunities__choice artboard-opportunities__choice--artists"
              data-opportunities-reveal
              style={{ "--opportunities-delay": "680ms" } as CSSProperties}
            >
              <div className="artboard-opportunities__choice-head">
                <span className="artboard-opportunities__icon" aria-hidden="true"><Compass size={20} /></span>
                <div>
                  <span className="artboard-opportunities__tag">Za umjetnike i kreativce</span>
                  <h3>Pronađi priliku. Prijavi se lakše.</h3>
                </div>
              </div>
              <p>Pretraži relevantne oglase, filtriraj prilike i izaberi podatke i materijale koje želiš da uključiš u prijavu. Uz ArtBoard profil, Premium korisnici mogu se prijaviti jednim klikom.</p>
              <Link href={siteRoutes.opportunities}>Pogledaj oglase <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>

            <article
              className="artboard-opportunities__choice artboard-opportunities__choice--partners"
              data-opportunities-reveal
              style={{ "--opportunities-delay": "860ms" } as CSSProperties}
            >
              <div className="artboard-opportunities__choice-head">
                <span className="artboard-opportunities__icon" aria-hidden="true"><Megaphone size={20} /></span>
                <div>
                  <span className="artboard-opportunities__tag">Za poslodavce i organizacije</span>
                  <h3>Pronađi umjetnike za sljedeći projekat.</h3>
                </div>
              </div>
              <p>Objavi poziv, posao, konkurs ili projekat i predstavi priliku umjetnicima čije iskustvo odgovara tvojim potrebama.</p>
              <Link href="mailto:medenica.ivona@yahoo.com?subject=Objava%20oglasa%20na%20ArtBoardu">Objavi oglas besplatno <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
          </div>

          <div
            className="artboard-opportunities__image"
            data-opportunities-reveal
            style={{ "--opportunities-delay": "760ms" } as CSSProperties}
          >
            <Image
              src="/artboard-ad/pexels-bertellifotografia-33714927.jpg"
              alt="Snimanje umjetnice u profesionalnom fotografskom studiju"
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
