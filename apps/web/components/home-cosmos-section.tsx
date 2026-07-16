"use client";

import { useEffect, useRef } from "react";

import { NavigationButton } from "@/components/navigation-button";
import { SiteCtaButton } from "@/components/site-cta-button";

/**
 * The Lottie timeline is lightly scrubbed by normal page scroll. We never call
 * play(), so the cosmos remains still when the page is still, but the section
 * also does not pin/trap the scroll while the animation is moving.
 */
export function HomeCosmosSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const animationContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const container = animationContainerRef.current;

    if (!section || !container) {
      return;
    }

    const sectionElement = section;
    const animationContainer = container;
    let isDisposed = false;
    let animationFrameId = 0;
    let removeListeners = () => {};

    async function setupAnimation() {
      const [{ default: lottie }, animationResponse] = await Promise.all([
        import("lottie-web"),
        fetch("/animations/cosmos.json"),
      ]);

      if (!animationResponse.ok) {
        throw new Error("Kosmos animacija nije mogla biti ucitana.");
      }

      const animationData = (await animationResponse.json()) as object;

      if (isDisposed) {
        return;
      }

      const animation = lottie.loadAnimation({
        animationData,
        autoplay: false,
        container: animationContainer,
        loop: false,
        renderer: "svg",
        rendererSettings: {
          preserveAspectRatio: "xMidYMid meet",
        },
      });

      const updateFrame = () => {
        animationFrameId = 0;

        const sectionRect = sectionElement.getBoundingClientRect();
        const progress = Math.min(
          Math.max(
            (window.innerHeight - sectionRect.top) / (window.innerHeight + sectionRect.height),
            0,
          ),
          1,
        );
        const lastFrame = Math.max(animation.totalFrames - 1, 0);
        const slowFrameMultiplier = 0.85;

        animation.goToAndStop(progress * lastFrame * slowFrameMultiplier, true);
      };

      const requestFrameUpdate = () => {
        if (animationFrameId) {
          return;
        }

        animationFrameId = window.requestAnimationFrame(updateFrame);
      };

      animation.addEventListener("DOMLoaded", updateFrame);
      window.addEventListener("scroll", requestFrameUpdate, { passive: true });
      window.addEventListener("resize", requestFrameUpdate);

      removeListeners = () => {
        window.removeEventListener("scroll", requestFrameUpdate);
        window.removeEventListener("resize", requestFrameUpdate);
        animation.removeEventListener("DOMLoaded", updateFrame);
        animation.destroy();
      };
    }

    setupAnimation().catch((error) => {
      console.error(error);
    });

    return () => {
      isDisposed = true;

      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      removeListeners();
    };
  }, []);

  return (
    <section
      className="relative min-h-screen bg-[#f8fbff] py-10 sm:py-14 lg:py-16"
      id="home-cosmos"
      ref={sectionRef}
    >
      <div className="relative flex min-h-[124vh] items-center justify-center overflow-hidden">
        <div
          aria-hidden="true"
          className="home-cosmos-animation pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(1120px,96vw)] -translate-x-1/2 -translate-y-1/2 lg:w-[min(1320px,98vw)]"
          ref={animationContainerRef}
        />

        <div className="relative z-10 mx-auto flex w-full max-w-[640px] flex-col items-center px-6 text-center">
          <h2 className="text-[28px] font-normal leading-[1.04] text-[#555b64] sm:text-[38px] lg:text-[44px]">
            Art Studio 360 tezi da postane
            <strong className="mt-1 block font-bold text-[#2f3138]">
              centralno mjesto za umjetnost<span className="text-[#182fc7]">.</span>
            </strong>
          </h2>

          <div className="mt-7 grid w-full max-w-[540px] gap-7 sm:grid-cols-2 sm:gap-8">
            <div className="flex flex-col items-center">
              <p className="max-w-[230px] text-[15px] leading-[1.4] text-[#555b64]">
                Platforma ArtBoard povezuje umjetnike sa publikom.
              </p>
              <SiteCtaButton
                className="mt-5 scale-[0.88]"
                href="/artists"
                label="Saznaj sve o ArtBoardu"
              />
            </div>

            <div className="flex flex-col items-center">
              <p className="max-w-[230px] text-[15px] leading-[1.4] text-[#555b64]">
                Art Studio 360 nudi sirok spektar kreativnih usluga.
              </p>
              <NavigationButton
                className="mt-5 inline-flex min-h-12 items-center gap-3 rounded-full border-2 border-[#182fc7] bg-[#182fc7] px-5 text-[14px] font-bold text-white outline outline-1 outline-offset-2 outline-[#182fc7] transition hover:bg-white hover:text-[#182fc7]"
                href="/kontakt"
              >
                <span className="h-3 w-3 rounded-full bg-current" aria-hidden="true" />
                Istrazite nase usluge
              </NavigationButton>
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f8fbff] to-transparent"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f8fbff] to-transparent"
        />
      </div>
    </section>
  );
}
