"use client";

import { useEffect, useRef } from "react";

import { NavigationButton } from "@/components/navigation-button";

const ABOUT_LOTTIE_URL =
  "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68f4f062fc3519b5434effe0_4281a7b7e680ccf7ad6814951320987a_home--about-us.json";

/**
 * About section for the homepage.
 * The right side uses the exported Webflow Lottie JSON, but the layout stays
 * written as normal React/CSS so it remains easy to redesign later.
 */
export function HomeAboutSection() {
  const animationContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animationContainer = animationContainerRef.current;

    if (!animationContainer) {
      return;
    }

    const animationElement = animationContainer;
    let isDisposed = false;
    let removeAnimation = () => {};

    async function setupAnimation() {
      const [{ default: lottie }, animationResponse] = await Promise.all([
        import("lottie-web"),
        fetch(ABOUT_LOTTIE_URL),
      ]);

      if (!animationResponse.ok) {
        throw new Error("O nama animacija nije mogla biti ucitana.");
      }

      const animationData = (await animationResponse.json()) as object;

      if (isDisposed) {
        return;
      }

      const animation = lottie.loadAnimation({
        animationData,
        autoplay: true,
        container: animationElement,
        loop: true,
        renderer: "svg",
        rendererSettings: {
          preserveAspectRatio: "xMidYMid meet",
        },
      });
      animation.setSpeed(0.65);

      removeAnimation = () => {
        animation.destroy();
      };
    }

    setupAnimation().catch((error) => {
      console.error(error);
    });

    return () => {
      isDisposed = true;
      removeAnimation();
    };
  }, []);

  return (
    <section className="relative bg-[#f8fbff] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
      <div className="mx-auto grid min-h-[520px] max-w-[1180px] items-center gap-8 rounded-[46px] bg-[#f8fbff] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative z-10 max-w-[460px] lg:pl-2">
          <h2 className="text-[2.55rem] font-bold leading-[0.96] tracking-[-0.055em] text-[#2f3138] sm:text-[3.25rem] lg:text-[3.8rem]">
            Jacamo
            <span className="block font-normal text-[#565b64]">
              umjetnicku scenu<span className="text-[#182fc7]">.</span>
            </span>
          </h2>

          <p className="mt-6 max-w-[470px] text-[19px] font-medium leading-[1.18] text-[#242832] sm:text-[21px]">
            Stvaramo zajednicki prostor za umjetnike i publiku, za umrezavanje, podrsku i
            dijeljenje stvaralastva koje mijenja svakodnevicu.
          </p>

          <NavigationButton
            className="mt-9 inline-flex min-h-[52px] items-center gap-3 rounded-full border-2 border-[#182fc7] bg-[#182fc7] px-6 text-[18px] font-bold text-white outline outline-1 outline-offset-2 outline-[#182fc7] transition hover:bg-white hover:text-[#182fc7]"
            href="/about"
          >
            <span className="h-3.5 w-3.5 rounded-full bg-current" aria-hidden="true" />
            Saznaj vise o nama
          </NavigationButton>
        </div>

        <div className="relative min-h-[360px] lg:min-h-[540px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(620px,106vw)] -translate-x-1/2 -translate-y-1/2 sm:w-[min(700px,86vw)] lg:w-[min(760px,48vw)]"
            ref={animationContainerRef}
          />
        </div>
      </div>
    </section>
  );
}
