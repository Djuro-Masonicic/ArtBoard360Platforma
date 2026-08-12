/**
 * Placeholder legal page.
 *
 * The footer now points here instead of a dead "#". Final legal copy can be
 * added later without changing navigation again.
 */
export default function UsloviKoriscenjaPage() {
  return (
    <div className="mx-auto max-w-[920px] px-4 pb-20 pt-[18vh] sm:px-6">
      <section className="rounded-[34px] border border-[#dce5f1] bg-white p-8 shadow-[0_24px_70px_rgba(38,51,71,0.08)] sm:p-12">
        <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#7b8391]">
          ArtBoard
        </p>
        <h1 className="mt-5 text-[44px] font-bold leading-[0.98] tracking-[-0.04em] text-[#2f3138] sm:text-[56px]">
          Uslovi koriscenja
        </h1>
        <p className="mt-6 text-[19px] leading-[1.5] text-[#4e5560]">
          Ova stranica je pripremljena kao mjesto za finalne pravne uslove platforme.
          Tekst treba uskladiti prije javnog lansiranja.
        </p>
      </section>
    </div>
  );
}
