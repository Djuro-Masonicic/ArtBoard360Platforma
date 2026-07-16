"use client";

import { useState } from "react";

import { NavigationButton } from "@/components/navigation-button";
import type { FaqQuestion } from "@/types/api";

interface FaqItem {
  answer: string;
  question: string;
}

const fallbackFaqItems: FaqItem[] = [
  {
    question: "Da li je ArtBoard platforma u potpunosti besplatna?",
    answer:
      "Prijava je besplatna. Nakon selekcije, umjetnik dobija osnovni ArtBoard profil, a dodatne premium opcije mogu biti dostupne kasnije.",
  },
  {
    question: "Da li postoji starosno ogranicenje za prijavu?",
    answer:
      "Ne postoji strogo starosno ogranicenje, ali prijava mora biti ozbiljna i portfolio mora jasno pokazati kontinuitet u radu.",
  },
  {
    question: "Koje vrste umjetnosti su prihvacene na ArtBoard-u?",
    answer:
      "Platforma je otvorena za razlicite discipline: slikarstvo, fotografiju, ilustraciju, graficki dizajn, skulpturu, digitalnu umjetnost i druge savremene prakse.",
  },
  {
    question: "Da li moram biti akademski obrazovan/a da bih bio/bila dio platforme?",
    answer:
      "Ne. Vazniji su kvalitet, kontinuitet i jasna prezentacija rada nego formalno obrazovanje.",
  },
  {
    question: "Da li mogu da se prijave umjetnici koji nisu iz Crne Gore?",
    answer:
      "Primarni fokus je crnogorska umjetnicka scena, ali se pojedinacne prijave mogu razmatrati ako imaju jasnu vezu sa lokalnom scenom.",
  },
  {
    question: "Kako mogu da postanem dio ArtBoard platforme?",
    answer:
      "Popuni prijavni formular, dodaj portfolio i reprezentativne radove. Tim zatim pregleda prijavu i javlja rezultat.",
  },
  {
    question: "Kako mogu da podijelim svoj rad na ArtBoard-u?",
    answer:
      "Nakon odobrene prijave dobija se profil umjetnika, a radovi se prikazuju kroz portfolio i javnu stranicu umjetnika.",
  },
  {
    question: "Kako mogu da kontaktiram druge umjetnike na platformi?",
    answer:
      "Na profilima umjetnika mogu biti prikazani kontakt podaci, portfolio linkovi i drustvene mreze, u skladu sa informacijama koje umjetnik zeli javno prikazati.",
  },
  {
    question: "Kako mogu da se umrezim sa drugim umjetnicima?",
    answer:
      "ArtBoard je zamisljen kao prostor za vidljivost, saradnju i povezivanje. Dodatne opcije umrezavanja ce se razvijati kroz platformu.",
  },
  {
    question: "Sta ako imam dodatna pitanja?",
    answer: "Mozes nas kontaktirati direktno preko kontakt forme ili putem navedenih email adresa.",
  },
];

type HomeFaqSectionProps = {
  faqs?: Pick<FaqQuestion, "answer" | "question">[];
};

export function HomeFaqSection({ faqs = [] }: HomeFaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqItems = faqs.length ? faqs : fallbackFaqItems;

  return (
    <section className="bg-[#f8fbff] px-5 py-[4.5rem] sm:px-8 sm:py-[5.5rem] lg:px-10 lg:py-24">
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:pt-2">
          <h2 className="max-w-[430px] text-[2.7rem] font-normal leading-[0.98] tracking-[-0.055em] text-[#555b64] sm:text-[3.35rem] lg:text-[3.75rem]">
            Odgovori na
            <strong className="block font-bold text-[#252933]">
              najcesca pitanja<span className="text-[#ffc41d]">.</span>
            </strong>
          </h2>

          <p className="mt-5 max-w-[320px] text-[1.25rem] font-medium leading-[1.12] text-[#252933]">
            Imas dodatna pitanja? Tu smo da na njih odgovorimo.
          </p>

          <div className="mt-7">
            <NavigationButton
              className="inline-flex min-h-[46px] items-center gap-3 rounded-full border-2 border-[#ffc41d] bg-[#ffc41d] px-5 text-[0.95rem] font-bold text-[#252933] outline outline-1 outline-offset-2 outline-[#ffc41d] transition hover:bg-white"
              href="/kontakt"
            >
              <span className="h-3 w-3 rounded-full bg-white" aria-hidden="true" />
              Kontaktiraj nas
            </NavigationButton>
          </div>
        </div>

        <div className="space-y-2.5">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <article
                className="rounded-[12px] border border-[#dfe5ee] bg-white shadow-[0_10px_26px_rgba(37,51,73,0.045)] transition-shadow duration-300 hover:shadow-[0_18px_38px_rgba(37,51,73,0.07)] font-extrabold"
                key={item.question}
              >
                <button
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-5 px-6 py-4 text-left text-[1.03rem] font-extrabold leading-tight text-[#252933] transition hover:text-[#dc1735]"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  type="button"
                >
                  <span>{item.question}</span>
                  <span
                    aria-hidden="true"
                    className={`grid h-8 w-8 flex-none place-items-center rounded-full bg-[#ffc41d] text-[1.45rem] font-bold leading-none text-white transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>

                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-5 pr-16 text-[0.98rem] font-medium leading-[1.45] text-[#5b6470]">
                      {item.answer}
                    </div>
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
