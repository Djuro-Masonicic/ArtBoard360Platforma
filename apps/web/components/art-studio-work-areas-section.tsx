import { NavigationButton } from "@/components/navigation-button";
import { siteRoutes } from "@/lib/site-routes";

const workAreas = [
  {
    color: "#182fc7",
    description:
      "Vizuelni identiteti, kampanje, digitalni materijali i kreativna komunikacija za brendove, institucije i projekte.",
    href: siteRoutes.services,
    label: "Pogledaj usluge",
    title: "Dizajn i vizuelni identitet",
  },
  {
    color: "#dc1735",
    description:
      "Koncepti, produkcija i organizacija kulturnih programa koji povezuju umjetnike, publiku i partnere.",
    href: siteRoutes.artboard,
    label: "Istraži ArtBoard",
    title: "Kreativni i kulturni projekti",
  },
  {
    color: "#ffc41d",
    description:
      "Web platforme, digitalni alati i proizvodi za umjetnike, kreativce i organizacije u kulturi.",
    href: siteRoutes.portfolioBuilder,
    label: "Portfolio Builder",
    title: "Web i digitalni proizvodi",
  },
];

export function ArtStudioWorkAreasSection() {
  return (
    <section className="bg-[#f8fbff] px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1280px]">
        <div className="max-w-[760px]">
          <p className="text-[13px] font-bold uppercase tracking-[0.28em] text-[#8a94a5]">
            Oblasti rada
          </p>
          <h2 className="mt-4 text-[2.5rem] font-bold leading-[0.98] tracking-[-0.05em] text-[#2f3138] sm:text-[3.4rem]">
            Studio razvija ideje od vizuelnog identiteta do digitalnog proizvoda
            <span className="text-[#ffc41d]">.</span>
          </h2>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {workAreas.map((area) => (
            <article
              className="group flex min-h-[320px] flex-col justify-between rounded-[32px] border border-[#dde6f2] bg-white p-7 shadow-[0_20px_54px_rgba(37,51,73,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(37,51,73,0.12)]"
              key={area.title}
            >
              <div>
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: area.color }}
                >
                  <span
                    className="h-4 w-4 rounded-full bg-white"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-7 text-[1.85rem] font-bold leading-[1.03] tracking-[-0.04em] text-[#252933]">
                  {area.title}
                </h3>
                <p className="mt-4 text-[18px] font-medium leading-[1.35] text-[#566174]">
                  {area.description}
                </p>
              </div>
              <NavigationButton
                className="relative isolate mt-8 inline-flex min-h-[46px] w-fit items-center gap-3 overflow-hidden rounded-full border bg-[var(--area-color)] px-5 text-[15px] font-bold text-white transition [border-color:var(--area-color)] group-hover:bg-white group-hover:text-[var(--area-color)]"
                style={
                  {
                    "--area-color": area.color,
                  } as React.CSSProperties
                }
                href={area.href}
                title={area.label}
              >
                <span
                  className="relative z-10 h-3 w-3 rounded-full bg-current transition-colors"
                  aria-hidden="true"
                />

                <span className="relative z-10">{area.label}</span>
              </NavigationButton>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
