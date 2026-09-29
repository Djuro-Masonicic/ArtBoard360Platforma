"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import { ServicesTestimonialRail } from "@/components/services-testimonial-rail";

export type TestimonialArtistAvatar = {
  name: string;
  avatarUrl: string;
};

export function ArtBoardTestimonialsSection({ artistAvatars }: { artistAvatars: TestimonialArtistAvatar[] }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (typeof IntersectionObserver === "undefined") {
      section.classList.add("artboard-testimonials--visible");
      return;
    }

    const pauseObserver = new IntersectionObserver(
      ([entry]) => section.classList.toggle("artboard-testimonials--paused", !entry?.isIntersecting),
      { rootMargin: "240px 0px" },
    );
    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        section.classList.add("artboard-testimonials--visible");
        revealObserver.disconnect();
      },
      { threshold: 0.1 },
    );

    pauseObserver.observe(section);
    revealObserver.observe(section);
    return () => {
      pauseObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className="artboard-testimonials" id="utisci" aria-labelledby="artboard-testimonials-title">
      <div className="artboard-testimonials__inner">
        <p
          className="artboard-testimonials__eyebrow"
          data-testimonials-reveal
          style={{ "--testimonials-delay": "140ms" } as CSSProperties}
        ><span aria-hidden="true" /> Utisci</p>
        <h2
          className="artboard-testimonials__title"
          id="artboard-testimonials-title"
          data-testimonials-reveal
          style={{ "--testimonials-delay": "280ms" } as CSSProperties}
        >
          Klijenti, umjetnici i saradnici.
          <span data-text="Njihova iskustva sa nama.">Njihova iskustva sa nama.</span>
        </h2>
        <ServicesTestimonialRail artistAvatars={artistAvatars} variant="artboard" />
      </div>
    </section>
  );
}
