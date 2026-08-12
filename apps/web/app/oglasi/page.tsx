import { NavigationButton } from "@/components/navigation-button";
import { getOpportunities, type Opportunity, type OpportunityType } from "@/services/opportunities";

export const dynamic = "force-dynamic";

const opportunityLabels: Record<OpportunityType, string> = {
  OPEN_CALL: "Otvoreni poziv",
  JOB: "Posao",
  RESIDENCY: "Rezidencija",
  EXHIBITION: "Izlozba",
  COLLABORATION: "Saradnja",
  GRANT: "Grant",
  OTHER: "Drugo",
};

function formatDeadline(deadlineAt: string | null) {
  if (!deadlineAt) {
    return "Rok nije naveden";
  }

  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(deadlineAt));
}

/**
 * Public ArtBoard opportunities page.
 *
 * The backend now owns the opportunity records, while this page stays focused
 * on presentation: title, metadata, short description and a clear apply/contact
 * action. If there are no rows yet, we keep a useful empty state.
 */
export default async function OglasiPage() {
  let opportunities: Opportunity[] = [];
  let couldLoadOpportunities = true;

  try {
    const response = await getOpportunities({ page: 1, pageSize: 24 });
    opportunities = response.items;
  } catch (error) {
    couldLoadOpportunities = false;
    console.error("Opportunities could not be loaded.", error);
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-20 pt-[18vh] sm:px-6">
      <section className="rounded-[34px] border border-[#dce5f1] bg-white p-8 shadow-[0_24px_70px_rgba(38,51,71,0.08)] sm:p-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.45fr)] lg:items-end">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.32em] text-[#7b8391]">
              ArtBoard oglasi
            </p>
            <h1 className="mt-5 max-w-[760px] text-[44px] font-bold leading-[0.98] tracking-[-0.04em] text-[#2f3138] sm:text-[64px]">
              Prilike za umjetnike na jednom mjestu.
            </h1>
            <p className="mt-6 max-w-[760px] text-[20px] leading-[1.5] text-[#4e5560]">
              Konkursi, rezidencije, saradnje, izlozbe i placene prilike koje pomazu
              umjetnicima da nastave da grade svoj rad i publiku.
            </p>
          </div>

          <div className="rounded-[28px] border border-[#dce5f1] bg-[#f8fbff] p-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.26em] text-[#7b8391]">
              Trenutno aktivno
            </p>
            <p className="mt-3 text-[46px] font-bold leading-none text-[#182fc7]">
              {opportunities.length}
            </p>
            <p className="mt-2 text-[15px] leading-[1.45] text-[#596272]">
              {couldLoadOpportunities
                ? "Broj javno objavljenih prilika u bazi."
                : "API trenutno nije dostupan, pa prikazujemo sigurni fallback."}
            </p>
          </div>
        </div>

        <div className="mt-9 flex flex-wrap gap-4">
          <NavigationButton
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#182fc7] px-6 text-[16px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#10239b]"
            href="/kontakt"
          >
            Kontaktiraj nas
          </NavigationButton>
          <NavigationButton
            className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#d4deec] px-6 text-[16px] font-bold text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
            href="/portfolio-builder"
          >
            Portfolio builder
          </NavigationButton>
        </div>
      </section>

      <section className="mt-10">
        {opportunities.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {opportunities.map((opportunity) => (
              <article
                className="flex min-h-[320px] flex-col rounded-[28px] border border-[#dce5f1] bg-white p-6 shadow-[0_18px_54px_rgba(38,51,71,0.06)]"
                key={opportunity.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full bg-[#f1f5ff] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#182fc7]">
                    {opportunityLabels[opportunity.type]}
                  </span>
                  {opportunity.isFeatured ? (
                    <span className="rounded-full bg-[#fff4cf] px-3 py-2 text-[12px] font-bold text-[#9b6d00]">
                      Izdvojeno
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-6 text-[27px] font-bold leading-[1.05] tracking-[-0.03em] text-[#2f3138]">
                  {opportunity.title}
                </h2>

                <p className="mt-4 line-clamp-4 text-[16px] leading-[1.5] text-[#596272]">
                  {opportunity.summary ?? opportunity.description}
                </p>

                <div className="mt-6 grid gap-3 text-[14px] text-[#4e5560]">
                  <p>
                    <span className="font-bold text-[#2f3138]">Rok:</span>{" "}
                    {formatDeadline(opportunity.deadlineAt)}
                  </p>
                  {opportunity.organization ? (
                    <p>
                      <span className="font-bold text-[#2f3138]">Organizator:</span>{" "}
                      {opportunity.organization}
                    </p>
                  ) : null}
                  {opportunity.location ? (
                    <p>
                      <span className="font-bold text-[#2f3138]">Lokacija:</span>{" "}
                      {opportunity.location}
                    </p>
                  ) : null}
                </div>

                <div className="mt-auto pt-7">
                  {opportunity.applyUrl ? (
                    <NavigationButton
                      className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#e9153a] px-5 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#c81030]"
                      href={opportunity.applyUrl}
                    >
                      Otvori prijavu
                    </NavigationButton>
                  ) : opportunity.contactEmail ? (
                    <NavigationButton
                      className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#e9153a] px-5 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#c81030]"
                      href={`mailto:${opportunity.contactEmail}`}
                    >
                      Kontakt
                    </NavigationButton>
                  ) : (
                    <NavigationButton
                      className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#d4deec] px-5 text-[15px] font-bold text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                      href="/kontakt"
                    >
                      Pitaj za detalje
                    </NavigationButton>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[34px] border border-dashed border-[#cdd8e8] bg-white/70 p-8 text-center sm:p-12">
            <p className="mx-auto max-w-[620px] text-[26px] font-bold leading-[1.15] text-[#2f3138]">
              Prvi oglasi jos nijesu objavljeni.
            </p>
            <p className="mx-auto mt-4 max-w-[620px] text-[17px] leading-[1.5] text-[#596272]">
              Struktura je spremna. Kada dodamo prve redove u bazu, ova stranica ce ih
              automatski prikazati.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
