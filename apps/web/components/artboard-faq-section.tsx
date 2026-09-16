"use client";

import { useState } from "react";

type ArtBoardFaqItem = {
  answer: string;
  question: string;
};

type ArtBoardFaqSectionProps = {
  items: ArtBoardFaqItem[];
};

export function ArtBoardFaqSection({ items }: ArtBoardFaqSectionProps) {
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <section className="artboard-faq" id="faq" aria-labelledby="artboard-faq-title">
      <div className="artboard-faq__inner">
        <div className="artboard-faq__aside">
          <div className="artboard-faq__aside-content">
            <p className="artboard-faq__eyebrow"><span aria-hidden="true" /> Česta pitanja</p>
            <h2 className="artboard-faq__title" id="artboard-faq-title">
              Imaš pitanje?
              <span>Možda je<br /> odgovor<br /> već ovdje.</span>
            </h2>
            <p className="artboard-faq__contact">
              Za sve ostalo piši nam na <a href="mailto:artboardproject2025@gmail.com">artboardproject2025@gmail.com</a>.
            </p>
          </div>
        </div>

        <div className="artboard-faq__list">
          {items.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <article className={`artboard-faq__item ${isOpen ? "artboard-faq__item--open" : ""}`} key={item.question}>
                <button
                  aria-expanded={isOpen}
                  className="artboard-faq__question"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  type="button"
                >
                  <span>{item.question}</span>
                  <span aria-hidden="true" className="artboard-faq__plus">+</span>
                </button>

                <div className="artboard-faq__answer-wrap">
                  <div>
                    <p className="artboard-faq__answer">{item.answer}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
