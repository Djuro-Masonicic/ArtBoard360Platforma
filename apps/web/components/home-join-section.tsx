"use client";

import { useEffect, useRef, useState } from "react";

const LEFT_HAND_URL =
  "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/686a97e5109db377cda63e90_about-us--left-arm.webp";

const RIGHT_HAND_URL =
  "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/686a97e525c7f81efff49ad5_about-us--right-arm.webp";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Mission section shared by the Art Studio 360 homepage.
 *
 * The movement is intentionally tied to scroll progress, not a standalone
 * animation. That keeps the section feeling alive without hijacking normal
 * page scrolling.
 */
export function HomeJoinSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let animationFrame = 0;

    function updateProgress() {
      const section = sectionRef.current;

      if (!section) {
        return;
      }

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;

      // Progress is 0 before the section enters and 1 once it leaves the viewport.
      const rawProgress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
      setScrollProgress(clamp(rawProgress, 0, 1));
    }

    function onScroll() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateProgress);
    }

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const leftMovement = scrollProgress * 92;
  const rightMovement = scrollProgress * -92;
  const circleScale = 0.72 + scrollProgress * 0.24;
  const accentMovement = scrollProgress * 78;

  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-screen overflow-visible bg-[#f8fbff] px-5 py-20 sm:px-8 lg:px-10"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 m-auto h-[min(74vw,820px)] w-[min(74vw,820px)] rounded-full bg-white/68"
        style={{
          transform: `scale(${circleScale})`,
          transition: "transform 120ms linear",
        }}
      />

      <div
        aria-hidden="true"
        className="absolute left-[17%] top-[48%] z-[2] h-14 w-14 rounded-full bg-[#dc1735] sm:h-20 sm:w-20 lg:left-[19%] lg:top-[25%]"
        style={{
          transform: `translate3d(0, ${accentMovement}px, 0)`,
          transition: "transform 120ms linear",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute right-[13%] top-[22%] z-[2] h-14 w-14 rounded-full bg-[#182fc7] sm:h-20 sm:w-20 lg:right-[16%]"
        style={{
          transform: `translate3d(0, ${-accentMovement}px, 0)`,
          transition: "transform 120ms linear",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute right-[31%] bottom-[23%] z-[2] h-9 w-9 rounded-full bg-[#ffc41d] sm:h-12 sm:w-12"
        style={{
          transform: `translate3d(0, ${-accentMovement * 0.7}px, 0)`,
          transition: "transform 120ms linear",
        }}
      />

      <img
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-8%] left-[-36vw] z-[3] w-[84vw] max-w-none select-none object-contain sm:bottom-[-7%] sm:left-[-27vw] sm:w-[66vw] lg:bottom-[-9%] lg:left-[-18vw] lg:w-[55vw] xl:bottom-[-12%] xl:left-[-27vw] xl:w-[60vw]"
        src={LEFT_HAND_URL}
        style={{
          transition: "transform 120ms linear",
          transform: `rotate(10deg) translate3d(0, ${leftMovement}px, 0)`,
        }}
      />

      <img
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-[-36vw] top-[29%] z-[3] w-[84vw] max-w-none select-none object-contain sm:right-[-27vw] sm:w-[66vw] lg:right-[-18vw] lg:top-[28%] lg:w-[55vw] xl:right-[-27vw] xl:w-[60vw]"
        src={RIGHT_HAND_URL}
        style={{
          transition: "transform 120ms linear",
          transform: `rotate(-10deg) translate3d(0, ${rightMovement}px, 0)`,
        }}
      />

      <div className="relative z-[4] mx-auto flex min-h-[78vh] max-w-[980px] items-center justify-center pt-[8vh] text-center">
        <div className="max-w-[760px]">
          <p className="text-[1.9rem] font-light leading-[1.12] tracking-[-0.04em] text-[#333333] sm:text-[1.5rem] lg:text-[1.9rem]">
            <strong className="font-bold text-[#dc1735]">ArtBoard platforma</strong> je digitalni
            dom crnogorskih umjetnika. Prostor za promociju, umrežavanje i profesionalni rast.
          </p>

          <p className="mt-10 text-[1.9rem] font-light leading-[1.12] tracking-[-0.04em] text-[#333333] sm:text-[1.5rem] lg:text-[1.9rem]">
            <strong className="font-bold text-[#182fc7]">Art Studio 360</strong> je kreativni studio
            koji nudi usluge dizajna, produkcije i inovativnih rješenja za kompanije, pojedince i umjetnike.
          </p>
        </div>
      </div>
    </section>
  );
}
