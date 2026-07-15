const JOIN_IMAGE_URL =
  "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/681fa929f7ed9d15b27cd530_143482c5a1b73e2de340af2e2872df1e_Homepage--Join-Us.png";

export function HomeJoinSection() {
  return (
    <section className="relative bg-[#f8fbff] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
      <div className="mx-auto grid min-h-[560px] max-w-[1280px] items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="relative z-10 max-w-[560px]">
          <h2 className="text-[3.4rem] font-normal leading-[0.95] tracking-[-0.055em] text-[#565b63] sm:text-[4.4rem] lg:text-[5rem]">
            Pridruži nam se na
            <strong className="block font-bold text-[#2f3138]">
              putovanju kreativnosti<span className="text-[#ffc41d]">.</span>
            </strong>
          </h2>

          <p className="mt-7 max-w-[420px] text-[1.45rem] font-medium leading-[1.1] text-[#252933] sm:text-[1.7rem]">
            Pronađi svoje mjesto i ostavi trag u svijetu umjetnosti.
          </p>
        </div>

        <div className="relative min-h-[500px] lg:min-h-[620px]">
          <img
            alt="Umjetnica u pokretu ispred žutog kruga"
            className="absolute bottom-0 left-1/2 w-[min(620px,92vw)] -translate-x-1/2 object-contain lg:w-[min(720px,48vw)]"
            src={JOIN_IMAGE_URL}
          />
        </div>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-16 mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <span className="absolute left-[8%] bottom-2 h-5 w-14 rounded-full bg-[#dfe5ff]" />
        <span className="absolute left-[24%] bottom-9 h-5 w-14 rounded-full bg-[#f1a8b8]" />
        <span className="absolute left-[38%] bottom-0 h-6 w-16 rounded-full bg-[#ffe48c]" />
        <span className="absolute left-[51%] bottom-12 h-6 w-16 rounded-full bg-[#182fc7]/70" />
      </div>
    </section>
  );
}
