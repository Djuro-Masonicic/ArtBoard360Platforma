"use client";

import { useEffect, useRef, useState } from "react";

const templates = [
  {
    id: "institutional",
    name: "Institutional Minimal",
    imageSrc: "/portfolio-templates/template-basic.png",
  },
  {
    id: "editorial",
    name: "ArtBoard Editorial",
    imageSrc: "/portfolio-templates/builder-editor.png",
  },
  {
    id: "sales",
    name: "Sales / Pro",
    imageSrc: "/portfolio-templates/builder-template-selection.png",
  },
] as const;

const AUTO_ROTATE_MS = 2700;

export function ArtBoardPortfolioTemplatePreview() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const activeTemplate = templates[activeIndex] ?? templates[0];

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "240px 0px" },
    );

    observer.observe(preview);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPaused || !isVisible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % templates.length);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(interval);
  }, [isPaused, isVisible]);

  return (
    <div
      ref={previewRef}
      className="artboard-portfolio__preview"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="artboard-portfolio__preview-stage">
        {templates.map((template, index) => (
          <figure
            className={`artboard-portfolio__preview-slide ${
              index === activeIndex ? "is-active" : ""
            }`}
            aria-hidden={index !== activeIndex}
            key={template.id}
          >
            <img
              src={template.imageSrc}
              alt={`${template.name} portfolio šablon`}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </figure>
        ))}
      </div>

      <div className="artboard-portfolio__preview-footer">
        <div aria-live="polite">
          <span>Šablon {String(activeIndex + 1).padStart(2, "0")} / 03</span>
          <strong>{activeTemplate.name}</strong>
        </div>
        <div className="artboard-portfolio__preview-dots" aria-label="Izaberi portfolio šablon">
          {templates.map((template, index) => (
            <button
              className={index === activeIndex ? "is-active" : ""}
              type="button"
              aria-label={`Prikaži ${template.name}`}
              aria-pressed={index === activeIndex}
              key={template.id}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
