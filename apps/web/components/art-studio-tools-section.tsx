import { NavigationButton } from "@/components/navigation-button";
import { siteRoutes } from "@/lib/site-routes";

const tools = [
  {
    description: "Profesionalni javni profili za predstavljanje umjetnika, radova, biografije i kontakta.",
    tone: "blue",
    title: "ArtBoard profili",
  },
  {
    description: "Builder za pripremu PDF portfolija, draftova i linkova za konkurse, galerije i saradnike.",
    tone: "red",
    title: "Portfolio Builder",
  },
  {
    description: "Mjesto za otvorene pozive, izložbe, konkurse, rezidencije i profesionalne prilike.",
    tone: "yellow",
    title: "Oglasi i prilike",
  },
  {
    description: "Alati za uredjivanje radova, označavanje istaknutih radova i organizaciju portfolija.",
    tone: "blue",
    title: "Uredjivanje sadržaja",
  },
  {
    description: "Podrška za prijave, selekciju, pregled materijala i komunikaciju sa umjetnicima.",
    tone: "red",
    title: "Prijave umjetnika",
  },
  {
    description: "Prostor za buduće premium funkcije, pakete, plaćanja i profesionalne alate.",
    tone: "yellow",
    title: "Premium alati",
  },
];

export function ArtStudioToolsSection() {
  return (
    <section className="bg-[#f8fbff] px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[760px]">
            <p className="text-[13px] font-bold uppercase tracking-[0.28em] text-[#8a94a5]">ArtBoard alati</p>
            <h2 className="mt-4 text-[2.4rem] font-bold leading-[0.98] tracking-[-0.05em] text-[#2f3138] sm:text-[3.4rem]">
              Više od kataloga: platforma za profesionalni rad umjetnika<span className="text-[#182fc7]">.</span>
            </h2>
          </div>

          <NavigationButton
            className="inline-flex min-h-[48px] w-fit items-center gap-3 rounded-full border-2 border-[#182fc7] bg-[#182fc7] px-6 text-[16px] font-bold text-white outline outline-1 outline-offset-2 outline-[#182fc7] transition hover:bg-white hover:text-[#182fc7]"
            href={siteRoutes.artboard}
          >
            <span className="h-3 w-3 rounded-full bg-current" aria-hidden="true" />
            Istraži ArtBoard
          </NavigationButton>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <article
              className="rounded-[28px] border border-[#e4eaf3] bg-white p-7 shadow-[0_18px_44px_rgba(37,51,73,0.06)]"
              key={tool.title}
            >
              <div className={`home-benefits-icon home-benefits-icon--${tool.tone}`}>
                <span className="h-4 w-4 rounded-full bg-current" aria-hidden="true" />
              </div>
              <h3 className="mt-6 text-[1.45rem] font-bold leading-[1.08] text-[#252933]">{tool.title}</h3>
              <p className="mt-3 text-[17px] font-medium leading-[1.35] text-[#566174]">{tool.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
