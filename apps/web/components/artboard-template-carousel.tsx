"use client";

import { useEffect, useState } from "react";

type TemplateSlide = {
  title: string;
  text: string;
  eyebrow: string;
  imageSrc: string;
};

type ArtBoardTemplateCarouselProps = {
  templates: TemplateSlide[];
};

const AUTO_ROTATE_MS = 4200;

export function ArtBoardTemplateCarousel({ templates }: ArtBoardTemplateCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTemplate = templates[activeIndex] ?? templates[0];

  useEffect(() => {
    if (templates.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % templates.length);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(intervalId);
  }, [templates.length]);

  if (!activeTemplate) {
    return null;
  }

  return (
    <div className="rounded-[24px] border border-white/14 bg-white/[0.07] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
      <div className="relative min-h-[280px] overflow-hidden rounded-[20px] border border-white/12 bg-[#f8fbff] shadow-inner sm:min-h-[330px] lg:min-h-[380px]">
        {templates.map((template, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              className={`absolute inset-0 flex items-center justify-center p-2.5 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-3.5 ${
                isActive
                  ? "translate-x-0 scale-100 opacity-100"
                  : "pointer-events-none translate-x-5 scale-[0.985] opacity-0"
              }`}
              key={template.title}
            >
              <img
                alt={`${template.title} portfolio template preview`}
                className="max-h-full w-full rounded-[14px] object-contain shadow-[0_12px_36px_rgba(16,24,39,0.16)]"
                src={template.imageSrc}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2.5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#ffc41d]">
            {activeTemplate.eyebrow}
          </p>
          <h3 className="mt-1 text-[19px] font-bold tracking-[-0.03em] text-white">
            {activeTemplate.title}
          </h3>
          <p className="mt-1 max-w-[500px] text-[13px] leading-[1.4] text-[#bac4d4]">
            {activeTemplate.text}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {templates.map((template, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                aria-label={`Prikazi ${template.title}`}
                className={`h-3 rounded-full transition-all duration-300 ${
                  isActive ? "w-8 bg-[#ffc41d]" : "w-3 bg-white/35 hover:bg-white/70"
                }`}
                key={template.title}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
