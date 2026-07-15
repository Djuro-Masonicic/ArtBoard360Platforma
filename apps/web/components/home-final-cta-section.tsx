const FINAL_CTA_IMAGE_URL =
  "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/687ce08052c5ed751b10deca_Homepage%20Graphic%20Blue%20Card.webp";

export function HomeFinalCtaSection() {
  return (
    <section className="bg-[#f8fbff] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid overflow-hidden rounded-[22px] bg-[#2133d2] shadow-[0_26px_70px_rgba(24,47,199,0.18)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex min-h-[390px] flex-col justify-center px-8 py-14 text-white sm:px-14 lg:min-h-[530px] lg:px-16">
            <h2 className="text-[2.9rem] font-normal leading-[0.98] tracking-[-0.055em] sm:text-[3.7rem] lg:text-[4.1rem]">
              Postani dio
              <strong className="block font-bold">
                ArtBoard platforme<span className="text-[#ffc41d]">.</span>
              </strong>
            </h2>

            <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <a
                className="inline-flex min-h-[50px] items-center gap-3 rounded-full border-2 border-[#ffc41d] bg-[#ffc41d] px-6 text-[1.05rem] font-bold text-[#252933] outline outline-1 outline-offset-2 outline-[#ffc41d] transition hover:bg-white"
                href="/prijava"
              >
                <span className="h-3.5 w-3.5 rounded-full bg-white" aria-hidden="true" />
                Prijavi se
              </a>

              <a
                className="group inline-flex items-center gap-3 text-[1.05rem] font-bold text-white"
                href="/kontakt"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-[#ffc41d] transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 12 12"
                >
                  <path
                    d="M10.2632 4.26844C11.5965 5.03824 11.5965 6.96274 10.2632 7.73254L3.83765 11.4423C2.50431 12.2121 0.837646 11.2499 0.837646 9.71027L0.837646 2.2907C0.837646 0.751101 2.50431 -0.211149 3.83765 0.558652L10.2632 4.26844Z"
                    fill="currentColor"
                  />
                </svg>
                Kontaktiraj nas
              </a>
            </div>
          </div>

          <div className="relative flex min-h-[360px] items-end justify-center px-4 pt-2 sm:min-h-[430px] lg:min-h-[530px] lg:px-8">
            <img
              alt=""
              aria-hidden="true"
              className="h-full max-h-[530px] w-full object-contain object-bottom"
              src={FINAL_CTA_IMAGE_URL}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
