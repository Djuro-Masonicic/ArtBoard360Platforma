"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

type ArtBoardFaqItem = {
  answer: string;
  question: string;
};

type ArtBoardFaqSectionProps = {
  items: ArtBoardFaqItem[];
};

export function ArtBoardFaqSection({ items }: ArtBoardFaqSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowAnimationsRef = useRef(new Map<HTMLElement, Animation>());

  const animateFaqReflow = () => {
    const list = listRef.current;
    if (!list || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    rowAnimationsRef.current.forEach((animation) => animation.cancel());
    rowAnimationsRef.current.clear();

    const rows = Array.from(list.querySelectorAll<HTMLElement>(".artboard-faq__item, .artboard-faq__end-line"));
    const previousPositions = new Map(rows.map((row) => [row, row.getBoundingClientRect().top]));

    window.requestAnimationFrame(() => {
      rows.forEach((row) => {
        const previousTop = previousPositions.get(row);
        if (previousTop === undefined) return;

        const deltaY = previousTop - row.getBoundingClientRect().top;
        if (Math.abs(deltaY) < 0.5) return;

        const animation = row.animate(
          [
            { transform: `translate3d(0, ${deltaY}px, 0)` },
            { transform: "translate3d(0, 0, 0)" },
          ],
          { duration: 300, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        );
        rowAnimationsRef.current.set(row, animation);
        animation.onfinish = () => rowAnimationsRef.current.delete(row);
        animation.oncancel = () => rowAnimationsRef.current.delete(row);
      });
    });
  };

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (typeof IntersectionObserver === "undefined") {
      section.classList.add("artboard-faq--visible");
      return;
    }

    const pauseObserver = new IntersectionObserver(
      ([entry]) => section.classList.toggle("artboard-faq--paused", !entry?.isIntersecting),
      { rootMargin: "240px 0px" },
    );
    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        section.classList.add("artboard-faq--visible");
        revealObserver.disconnect();
      },
      { threshold: 0.12 },
    );

    pauseObserver.observe(section);
    revealObserver.observe(section);
    return () => {
      pauseObserver.disconnect();
      revealObserver.disconnect();
      rowAnimationsRef.current.forEach((animation) => animation.cancel());
      rowAnimationsRef.current.clear();
    };
  }, []);

  return (
    <section ref={sectionRef} className="artboard-faq" id="faq" aria-labelledby="artboard-faq-title">
      <div className="artboard-faq__inner">
        <div className="artboard-faq__aside">
          <div className="artboard-faq__aside-content">
            <p
              className="artboard-faq__eyebrow"
              data-faq-reveal
              style={{ "--faq-delay": "180ms" } as CSSProperties}
            ><span aria-hidden="true" /> Česta pitanja</p>
            <h2
              className="artboard-faq__title"
              id="artboard-faq-title"
              data-faq-reveal
              style={{ "--faq-delay": "340ms" } as CSSProperties}
            >
              Imaš pitanje? <span>Možda je odgovor već ovdje.</span>
            </h2>
            <p
              className="artboard-faq__contact"
              data-faq-reveal
              style={{ "--faq-delay": "500ms" } as CSSProperties}
            >
              Za sve ostalo piši nam na <a href="mailto:info@artstudio360.me">info@artstudio360.me</a>.
            </p>
          </div>
        </div>

        <div
          className="artboard-faq__list"
          data-faq-reveal
          ref={listRef}
          style={{ "--faq-delay": "620ms" } as CSSProperties}
        >
          {items.map((item, index) => (
            <details className="artboard-faq__item" key={item.question} open={index === 0 || undefined}>
              <summary className="artboard-faq__question" onClick={animateFaqReflow}>
                <span>{item.question}</span>
                <span aria-hidden="true" className="artboard-faq__plus">+</span>
              </summary>
              <p className="artboard-faq__answer">{item.answer}</p>
            </details>
          ))}
          <div className="artboard-faq__end-line" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
