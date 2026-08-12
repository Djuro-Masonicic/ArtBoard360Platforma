import { NavigationButton } from "@/components/navigation-button";
import { siteRoutes } from "@/lib/site-routes";

export function ArtStudioContactCtaSection() {
  return (
    <section className="bg-[#f8fbff] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
      <div className="mx-auto grid max-w-[1280px] overflow-hidden rounded-[34px] border border-[#dfe7f2] bg-white shadow-[0_24px_70px_rgba(37,51,73,0.08)] lg:grid-cols-2">
        <div className="flex flex-col border-b border-[#e6ecf5] p-8 sm:p-10 lg:min-h-[430px] lg:border-b-0 lg:border-r lg:p-12">
          <p className="text-[13px] font-bold uppercase tracking-[0.28em] text-[#8a94a5]">Kreativne usluge</p>
          <h2 className="mt-4 text-[2.2rem] font-bold leading-[1] tracking-[-0.045em] text-[#2f3138] sm:text-[3rem] lg:min-h-[180px]">
            Treba vam studio za dizajn ili kreativni projekat?
          </h2>
          <p className="mt-5 text-[18px] font-medium leading-[1.4] text-[#566174] lg:min-h-[76px]">
            Pošaljite upit za vizuelni identitet, kampanju, produkciju ili razvoj digitalnog proizvoda.
          </p>
          <NavigationButton
            className="mt-8 inline-flex min-h-[50px] w-fit items-center gap-3 self-end rounded-full border-2 border-[#182fc7] bg-[#182fc7] px-6 text-[16px] font-bold text-white outline outline-1 outline-offset-2 outline-[#182fc7] transition hover:bg-white hover:text-[#182fc7]"
            href={`${siteRoutes.contact}?forma=studio`}
          >
            <span className="h-3 w-3 rounded-full bg-current" aria-hidden="true" />
            Kontakt za usluge
          </NavigationButton>
        </div>

        <div className="flex flex-col p-8 sm:p-10 lg:min-h-[430px] lg:p-12">
          <p className="text-[13px] font-bold uppercase tracking-[0.28em] text-[#8a94a5]">ArtBoard podrška</p>
          <h2 className="mt-4 text-[2.2rem] font-bold leading-[1] tracking-[-0.045em] text-[#2f3138] sm:text-[3rem] lg:min-h-[180px]">
            Želite saradnju ili podršku oko ArtBoarda?
          </h2>
          <p className="mt-5 text-[18px] font-medium leading-[1.4] text-[#566174] lg:min-h-[76px]">
            Za umjetnike, partnere i organizacije: prijave, profili, portfolio alati i profesionalne prilike.
          </p>
          <NavigationButton
            className="mt-8 inline-flex min-h-[50px] w-fit items-center gap-3 self-end rounded-full border-2 border-[#dc1735] bg-[#dc1735] px-6 text-[16px] font-bold text-white outline outline-1 outline-offset-2 outline-[#dc1735] transition hover:bg-white hover:text-[#dc1735]"
            href={`${siteRoutes.contact}?forma=artboard`}
          >
            <span className="h-3 w-3 rounded-full bg-current" aria-hidden="true" />
            Kontakt za ArtBoard
          </NavigationButton>
        </div>
      </div>
    </section>
  );
}
