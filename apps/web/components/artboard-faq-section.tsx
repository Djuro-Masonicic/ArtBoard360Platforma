"use client";

import { useState } from "react";

import { NavigationButton } from "@/components/navigation-button";
import { siteRoutes } from "@/lib/site-routes";

type ArtBoardFaqItem = {
  answer: string;
  question: string;
};

type ArtBoardFaqSectionProps = {
  items: ArtBoardFaqItem[];
};

/**
 * FAQ is interactive, so it stays as a client component.
 * We keep the structure simple: one open item, smooth height animation,
 * and large readable question cards like the original ArtBoard style.
 */
export function ArtBoardFaqSection({ items }: ArtBoardFaqSectionProps) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="mx-auto mt-16 max-w-[1240px] px-4 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
        <div className="lg:pt-2">
          <h2 className="max-w-[430px] text-[42px] font-normal leading-[0.98] tracking-[-0.055em] text-[#555b64] sm:text-[58px]">
            Odgovori na
            <strong className="block font-bold text-[#252933]">
              najčešća pitanja<span className="text-[#ffc41d]">.</span>
            </strong>
          </h2>

          <p className="mt-5 max-w-[350px] text-[21px] font-medium leading-[1.15] text-[#252933]">
            Imaš dodatna pitanja? Tu smo da na njih odgovorimo.
          </p>

          <NavigationButton
            className="group mt-7 inline-flex min-h-[46px] items-center gap-3 rounded-full border-2 border-[#ffc41d] bg-[#ffc41d] px-5 text-[15px] font-bold text-[#252933] outline outline-1 outline-offset-2 outline-[#ffc41d] transition hover:bg-white hover:text-[#b88700]"
            href={siteRoutes.contact}
          >
            <span
              className="h-3 w-3 rounded-full bg-white transition group-hover:bg-[#ffc41d]"
              aria-hidden="true"
            />
            Kontaktiraj nas
          </NavigationButton>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <article
                className="rounded-[18px] border border-[#dfe5ee] bg-white shadow-[0_10px_26px_rgba(37,51,73,0.045)] transition-shadow duration-300 hover:shadow-[0_18px_38px_rgba(37,51,73,0.07)]"
                key={item.question}
              >
                <button
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center justify-between gap-5 px-6 py-5 text-left text-[18px] font-extrabold leading-tight text-[#252933] transition hover:text-[#dc1735]"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  type="button"
                >
                  <span>{item.question}</span>
                  <span
                    aria-hidden="true"
                    className={`grid h-10 w-10 flex-none place-items-center rounded-full bg-[#ffc41d] text-[28px] font-bold leading-none text-white transition-transform duration-300 ${
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
                    <p className="px-6 pb-6 pr-20 text-[17px] font-medium leading-[1.45] text-[#252933]">
                      {item.answer}
                    </p>
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
