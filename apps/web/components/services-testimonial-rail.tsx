"use client";

import { useRef } from "react";

import styles from "@/app/usluge/services-page.module.css";

const avatarRoot = "https://cdn.prod.website-files.com/682769f4e1ebd752d0c3e3ec";

const testimonials = [
  {
    author: "Milena Radević",
    company: "Forum mladih pisaca KIC-a",
    content:
      "Učešće u projektu Art Board bilo je istinski inspirativno. Zadovoljstvo mi je što je moja pjesma našla svoje mjesto na vizualu jedne od umjetnica. Razgovor koji smo kasnije obavile dodatno je približio njihovu viziju i izvrsnost platforme.",
    image: `${avatarRoot}/68a620c6718a4ede8ddd2121_7.png`,
    color: "Red",
  },
  {
    author: "Dragan Dubljević",
    company: "Full House",
    content:
      "Saradnja sa djevojkama iz Art Studija 360 uvijek donese dodatnu vrijednost našim događajima. Njihova prisutnost unosi autentičnost, kvalitet i sjajnu energiju. Cijenimo njihovu posvećenost i radujemo se svakom susretu.",
    image: `${avatarRoot}/68a884f52f5d6089869bdb8b_2.png`,
    color: "Blue",
  },
  {
    author: "Lejla Nurković",
    company: "Umjetnica",
    content:
      "Manuela ne fotografiše samo ono što vidi, već bilježi ono što se osjeća. Diskretna i profesionalna, stvara ambijent u kojem zaboravite na kameru. Rezultat su prirodne i lijepe fotografije koje čuvate zauvijek.",
    image: `${avatarRoot}/68a8856bebd0bf731ba6c3b4_10.png`,
    color: "Yellow",
  },
  {
    author: "Ksenija Dragović",
    company: "Umjetnica",
    content:
      "Saradnja sa Teodorom bila je pravo zadovoljstvo. Stvorila je opuštenu atmosferu uz korisne savjete i jasne smjernice, što mi je mnogo značilo jer sam stidljiva pred kamerom. Nastale su i spontane fotografije koje su me obradovale.",
    image: `${avatarRoot}/68a8856278ec02c82971ab9d_8.png`,
    color: "Red",
  },
  {
    author: "Nikola Stojanović",
    company: "Web dizajner",
    content:
      "Rad na ovom sajtu bio je prava kombinacija izazova i inspiracije. Djevojke imaju oko za detalje i jasno prenose viziju, a ostavile su dovoljno slobode da sve pretočim u funkcionalan i lijep sajt.",
    image: `${avatarRoot}/68a88543b65d041864e65ac9_6.png`,
    color: "Blue",
  },
  {
    author: "Anita Grgurević",
    company: "Umjetnica",
    content:
      "Posvećena i organizovana ekipa Art Studija 360 lako stvara prijatnu atmosferu za rad i komunikaciju. Vjerujem da će njihova ideja postati snažna baza za umrežavanje umjetnika i klijenata.",
    image: `${avatarRoot}/68a88537bc9a5bf5bd51300c_4.png`,
    color: "Yellow",
  },
] as const;

export function ServicesTestimonialRail() {
  const railRef = useRef<HTMLDivElement>(null);

  function moveRail(direction: -1 | 1) {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const card = rail.querySelector<HTMLElement>("[data-testimonial-card]");
    const distance = card ? card.offsetWidth + 18 : rail.clientWidth * 0.8;

    rail.scrollBy({ left: distance * direction, behavior: "smooth" });
  }

  return (
    <div className={styles.testimonialRailShell}>
      <div className={styles.testimonialRail} ref={railRef}>
        {testimonials.map((testimonial) => (
          <article
            className={styles.testimonialCard}
            data-testimonial-card
            key={`${testimonial.author}-${testimonial.company}`}
          >
            <span
              aria-hidden="true"
              className={`${styles.testimonialQuote} ${styles[`testimonialQuote${testimonial.color}`]}`}
            >
              “
            </span>
            <p className={styles.testimonialText}>{testimonial.content}</p>

            <div className={styles.testimonialAuthor}>
              <img alt="" aria-hidden="true" src={testimonial.image} />
              <div>
                <strong>{testimonial.author}</strong>
                <span>{testimonial.company}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.testimonialControls}>
        <button aria-label="Prethodni testimonial" onClick={() => moveRail(-1)} type="button">
          <ArrowIcon direction="left" />
        </button>
        <button aria-label="Sljedeći testimonial" onClick={() => moveRail(1)} type="button">
          <ArrowIcon direction="right" />
        </button>
      </div>
    </div>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d={direction === "left" ? "M14.5 6.5 9 12l5.5 5.5" : "M9.5 6.5 15 12l-5.5 5.5"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
