"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, UserRound } from "lucide-react";

import { sharedTestimonials } from "@/components/services-testimonial-rail";

const artBoardTestimonialOrder = [
  "Anita Grgurević",
  "Petar Đurišić",
  "Jovana Berkuljan",
  "Nina Sekulović",
  "Sofija Drakulović",
  "Janja Ćetković",
  "Nadežda Bojana Babović",
  "Hana Hurić",
] as const;

const artBoardTestimonials = artBoardTestimonialOrder.flatMap((author) => {
  const testimonial = sharedTestimonials.find((item) => item.author === author);
  return testimonial ? [testimonial] : [];
});

export type TestimonialArtistAvatar = {
  name: string;
  avatarUrl: string;
};

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function TestimonialAvatar({ imageSrc, tone }: { imageSrc?: string; tone: number }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [imageSrc]);

  return (
    <span className="artboard-testimonials__avatar" data-tone={tone} aria-hidden="true">
      {imageSrc && !imageFailed ? (
        <img alt="" decoding="async" loading="lazy" onError={() => setImageFailed(true)} src={imageSrc} />
      ) : (
        <UserRound size={22} strokeWidth={1.8} />
      )}
    </span>
  );
}

export function ArtBoardTestimonialsSection({ artistAvatars }: { artistAvatars: TestimonialArtistAvatar[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const avatarByAuthor = useMemo(
    () => new Map(artistAvatars.map((artist) => [normalizeName(artist.name), artist.avatarUrl])),
    [artistAvatars],
  );

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

  function scroll(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;

    const card = rail.querySelector<HTMLElement>("figure");
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 20;
    const step = card ? card.offsetWidth + gap : rail.clientWidth;
    const max = rail.scrollWidth - rail.clientWidth;

    if (direction > 0 && rail.scrollLeft >= max - 4) rail.scrollTo({ left: 0, behavior: "smooth" });
    else if (direction < 0 && rail.scrollLeft <= 4) rail.scrollTo({ left: max, behavior: "smooth" });
    else rail.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <section ref={sectionRef} className="artboard-testimonials" id="utisci" aria-labelledby="artboard-testimonials-title">
      <header className="artboard-testimonials__header">
        <p
          className="artboard-testimonials__eyebrow"
          data-testimonials-reveal
          style={{ "--testimonials-delay": "140ms" } as CSSProperties}
        >Utisci</p>
        <h2
          className="artboard-testimonials__title"
          id="artboard-testimonials-title"
          data-testimonials-reveal
          style={{ "--testimonials-delay": "280ms" } as CSSProperties}
        >
          <span className="artboard-testimonials__title-line">Klijenti, umjetnici i saradnici.</span>
          <span className="artboard-testimonials__title-gradient">Njihova iskustva sa nama.</span>
        </h2>
      </header>

      <div className="artboard-testimonials__stage">
        <div className="artboard-testimonials__rail-wrap">
          <button className="artboard-testimonials__previous" type="button" aria-label="Prethodni utisci" onClick={() => scroll(-1)}>
            <ArrowLeft size={20} strokeWidth={2.2} />
          </button>
          <button className="artboard-testimonials__next" type="button" aria-label="Sljedeći utisci" onClick={() => scroll(1)}>
            <ArrowRight size={20} strokeWidth={2.2} />
          </button>
          <div className="artboard-testimonials__rail" data-testi="" ref={railRef}>
            {artBoardTestimonials.map((testimonial, index) => (
              <figure className="artboard-testimonials__card" data-testi-card="" key={testimonial.author}>
                <span className="artboard-testimonials__quote" aria-hidden="true">“</span>
                <blockquote>{testimonial.content}</blockquote>
                <figcaption>
                  <TestimonialAvatar
                    imageSrc={avatarByAuthor.get(normalizeName(testimonial.author)) || testimonial.image}
                    tone={index % 3}
                  />
                  <span className="artboard-testimonials__identity">
                    <strong>{testimonial.author}</strong>
                    <span>{testimonial.company}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
