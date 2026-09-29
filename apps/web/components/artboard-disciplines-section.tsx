"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import { siteRoutes } from "@/lib/site-routes";

type DisciplineIconName = "palette" | "pencil" | "layers" | "cube" | "camera" | "image" | "brush" | "sparkle" | "film" | "globe";

const disciplines: ReadonlyArray<{ label: string; icon: DisciplineIconName; tone: "blue" | "red" | "gold" }> = [
  { label: "Slikarstvo", icon: "palette", tone: "blue" },
  { label: "Crtež", icon: "pencil", tone: "red" },
  { label: "Grafika", icon: "layers", tone: "gold" },
  { label: "Skulptura", icon: "cube", tone: "blue" },
  { label: "Fotografija", icon: "camera", tone: "red" },
  { label: "Ilustracija", icon: "pencil", tone: "gold" },
  { label: "Kolaž", icon: "layers", tone: "blue" },
  { label: "Mješoviti mediji", icon: "layers", tone: "red" },
  { label: "Mozaik", icon: "image", tone: "gold" },
  { label: "Tekstilna umjetnost", icon: "brush", tone: "blue" },
  { label: "Umjetnički nakit", icon: "sparkle", tone: "red" },
  { label: "Digitalna umjetnost", icon: "sparkle", tone: "gold" },
  { label: "3D umjetnost", icon: "cube", tone: "blue" },
  { label: "Animacija", icon: "film", tone: "red" },
  { label: "Video umjetnost", icon: "film", tone: "gold" },
  { label: "Instalacija", icon: "image", tone: "blue" },
  { label: "Performans", icon: "globe", tone: "red" },
  { label: "Konceptualna umjetnost", icon: "sparkle", tone: "gold" },
  { label: "Multimedijalna umjetnost", icon: "film", tone: "blue" },
  { label: "Generativna umjetnost", icon: "globe", tone: "red" },
  { label: "Street art", icon: "brush", tone: "gold" },
  { label: "Strip", icon: "image", tone: "red" },
  { label: "Kaligrafija", icon: "pencil", tone: "gold" },
  { label: "Grafički dizajn", icon: "palette", tone: "blue" },
  { label: "Scenografija", icon: "image", tone: "red" },
];

// A stable shuffled order prevents hydration shifts while keeping the reveal visually random.
const disciplineRevealOrder = [14, 2, 21, 7, 18, 0, 11, 23, 5, 16, 9, 3, 20, 13, 24, 6, 17, 1, 22, 10, 4, 19, 8, 15, 12];

export type DisciplineArtworkPreview = {
  id: string;
  imageUrl: string;
};

const decorations = [
  ["blue", "top-left"],
  ["coral", "upper-left"],
  ["gold", "top-right"],
  ["violet", "middle-left"],
  ["orchid", "middle-right"],
  ["aqua", "bottom-left"],
  ["blue", "bottom-middle"],
  ["coral", "bottom-right"],
] as const;

function DisciplineIcon({ name }: { name: DisciplineIconName }) {
  const commonProps = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "palette":
      return <svg {...commonProps}><circle cx="12" cy="12" r="8.4" /><circle cx="9" cy="9.4" r="1.1" fill="currentColor" stroke="none" /><circle cx="14.6" cy="9.6" r="1.1" fill="currentColor" stroke="none" /><circle cx="9.6" cy="14.8" r="1.1" fill="currentColor" stroke="none" /></svg>;
    case "pencil":
      return <svg {...commonProps}><path d="M4.6 19.4l1-3.4L15.8 5.8a1.9 1.9 0 012.7 2.7L8.2 18.6z" /><path d="M14.4 7.2l2.4 2.4" /></svg>;
    case "layers":
      return <svg {...commonProps}><path d="M12 3.8l8 4.2-8 4.2-8-4.2z" /><path d="M4 13l8 4.2 8-4.2" /></svg>;
    case "cube":
      return <svg {...commonProps}><path d="M12 3.8l7.6 4.2v8L12 20.2 4.4 16V8z" /><path d="M4.4 8l7.6 4.2L19.6 8" /><path d="M12 12.2v8" /></svg>;
    case "camera":
      return <svg {...commonProps}><rect x="3.4" y="7" width="17.2" height="13" rx="2.6" /><circle cx="12" cy="13.4" r="3.6" /><path d="M8.6 7l1.4-2.4h4L15.4 7" /></svg>;
    case "image":
      return <svg {...commonProps}><rect x="4" y="4" width="16" height="16" rx="2.4" /><path d="M4 15.4l4.4-4.2 3.6 3.4 3-2.6 5 3.6" /></svg>;
    case "brush":
      return <svg {...commonProps}><path d="M4 20.2c2.6.6 4.6-.6 5.4-2.6" /><path d="M8.4 15.4l8.8-9.6a2 2 0 013 2.7l-9.2 8.8z" /></svg>;
    case "sparkle":
      return <svg {...commonProps}><path d="M12 4l1.9 4.4L18.4 10l-4.5 1.6L12 16l-1.9-4.4L5.6 10l4.5-1.6z" /></svg>;
    case "film":
      return <svg {...commonProps}><rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.2" /><line x1="8" y1="5.4" x2="8" y2="18.6" /><line x1="16" y1="5.4" x2="16" y2="18.6" /></svg>;
    case "globe":
      return <svg {...commonProps}><circle cx="12" cy="12" r="8.4" /><path d="M3.6 12h16.8" /><path d="M12 3.6c2.4 2.4 3.4 5.4 3.4 8.4s-1 6-3.4 8.4c-2.4-2.4-3.4-5.4-3.4-8.4s1-6 3.4-8.4z" /></svg>;
  }
}

export function ArtBoardDisciplinesSection({ artworks }: { artworks: DisciplineArtworkPreview[] }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (typeof IntersectionObserver === "undefined") {
      section.classList.add("artboard-disciplines--visible");
      return;
    }

    const pauseObserver = new IntersectionObserver(
      ([entry]) => section.classList.toggle("artboard-disciplines--paused", !entry?.isIntersecting),
      { rootMargin: "240px 0px" },
    );
    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        section.classList.add("artboard-disciplines--visible");
        revealObserver.disconnect();
      },
      { threshold: 0.16 },
    );

    pauseObserver.observe(section);
    revealObserver.observe(section);
    return () => {
      pauseObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className="artboard-disciplines" aria-labelledby="artboard-disciplines-title">
      <div className="artboard-disciplines__decorations" aria-hidden="true">
        {artworks.length > 0
          ? decorations.map(([, position], index) => {
              const artwork = artworks[index % artworks.length];
              if (!artwork) return null;

              return (
                <span
                  className={`artboard-why__ribbon artboard-disciplines__decoration artboard-disciplines__decoration--${position}`}
                  key={`${position}-${artwork.id}`}
                >
                  <img alt="" decoding="async" loading="lazy" src={artwork.imageUrl} />
                </span>
              );
            })
          : null}
      </div>

      <div className="artboard-disciplines__inner">
        <p
          className="artboard-disciplines__eyebrow"
          data-disciplines-reveal
          style={{ "--disciplines-delay": "180ms" } as CSSProperties}
        ><span aria-hidden="true" /> Umjetničke discipline</p>
        <h2
          className="artboard-disciplines__title"
          id="artboard-disciplines-title"
          data-disciplines-reveal
          style={{ "--disciplines-delay": "340ms" } as CSSProperties}
        >
          Različiti izrazi. <span>Zajednički<br /> prostor za umjetnost.</span>
        </h2>
        <p
          className="artboard-disciplines__intro"
          data-disciplines-reveal
          style={{ "--disciplines-delay": "500ms" } as CSSProperties}
        >
          Bez obzira na medij, tehniku ili fazu karijere, ArtBoard ti pruža prostor da predstaviš svoj rad i postaneš dio zajednice koja raste.
        </p>

        <ul className="artboard-disciplines__list">
          {disciplines.map(({ label, icon, tone }, index) => (
            <li
              className={`artboard-disciplines__item artboard-disciplines__item--${tone}`}
              data-discipline-item
              key={label}
              style={{ "--discipline-delay": `${550 + (disciplineRevealOrder[index] ?? index) * 135}ms` } as CSSProperties}
            >
              <DisciplineIcon name={icon} />
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <Link
          className="artboard-disciplines__action"
          data-disciplines-reveal
          href={siteRoutes.artistApplication}
          style={{ "--disciplines-delay": "4050ms" } as CSSProperties}
        >Prijavi se besplatno</Link>
      </div>
    </section>
  );
}
