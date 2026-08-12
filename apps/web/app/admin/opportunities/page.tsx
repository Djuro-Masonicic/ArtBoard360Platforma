import type { ReactNode } from "react";

import { NavigationButton } from "@/components/navigation-button";
import { requireAdminSession } from "@/lib/admin-session";
import { getAdminOpportunities, OpportunityType } from "@/services/opportunities";

const opportunityTypeLabels: Record<OpportunityType, string> = {
  OPEN_CALL: "Open call",
  JOB: "Posao",
  RESIDENCY: "Rezidencija",
  EXHIBITION: "Izlozba",
  COLLABORATION: "Saradnja",
  GRANT: "Grant",
  OTHER: "Ostalo",
};

type AdminOpportunitiesPageProps = {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    type?: OpportunityType;
  }>;
};

export default async function AdminOpportunitiesPage({ searchParams }: AdminOpportunitiesPageProps) {
  const { token } = await requireAdminSession();

  const resolvedSearchParams = (await searchParams) ?? {};
  const page = Number(resolvedSearchParams.page ?? "1");
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const search = resolvedSearchParams.search?.trim() ?? "";
  const type = resolvedSearchParams.type || undefined;

  const response = await getAdminOpportunities(token, {
    page: safePage,
    pageSize: 24,
    search: search || undefined,
    type,
    includeDrafts: true,
  });

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-[2vw] pb-16 pt-[14vh]">
      <section className="rounded-[32px] border border-[#dde4ef] bg-white/90 px-7 py-7 shadow-[0_18px_56px_rgba(31,46,86,0.06)] sm:px-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
              Admin
            </p>
            <h1 className="mt-4 text-[40px] font-bold leading-[0.95] text-[#2f3138] sm:text-[56px]">
              Oglasi i prilike
            </h1>
            <p className="mt-4 max-w-[760px] text-[19px] leading-[1.45] text-[#4f5762]">
              Upravljaj konkursima, rezidencijama, izlozbama i ostalim prilikama koje se
              prikazuju na javnoj stranici oglasa.
            </p>
          </div>
          <NavigationButton
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#dc1735] px-7 text-[16px] font-bold text-white transition hover:bg-[#b9122b]"
            href="/admin/opportunities/new"
          >
            Novi oglas
          </NavigationButton>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#dde4ef] bg-white/95 px-6 py-6 shadow-[0_16px_44px_rgba(31,46,86,0.05)]">
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_160px]" method="GET">
          <input
            className="h-12 rounded-full border border-[#d7dee9] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
            defaultValue={search}
            name="search"
            placeholder="Pretrazi naslov, organizaciju ili opis..."
            type="text"
          />
          <select
            className="h-12 rounded-full border border-[#d7dee9] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
            defaultValue={type ?? ""}
            name="type"
          >
            <option value="">Svi tipovi</option>
            {Object.entries(opportunityTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#182fc7] px-6 text-[16px] font-bold text-white transition hover:bg-[#1326a8]"
            type="submit"
          >
            Pretrazi
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#dde4ef] bg-white/96 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[#f8fbff]">
              <tr className="border-b border-[#e8edf4] text-left">
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Oglas
                </th>
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Tip
                </th>
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Rok
                </th>
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Akcija
                </th>
              </tr>
            </thead>
            <tbody>
              {response.items.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-[17px] text-[#5f6772]" colSpan={5}>
                    Nema oglasa za zadate filtere.
                  </td>
                </tr>
              ) : (
                response.items.map((opportunity) => (
                  <tr className="border-b border-[#edf1f6] last:border-b-0" key={opportunity.id}>
                    <td className="px-6 py-4 align-middle">
                      <div className="text-[17px] font-semibold text-[#2f3138]">
                        {opportunity.title}
                      </div>
                      <div className="mt-1 max-w-[520px] truncate text-[14px] text-[#66707d]">
                        {opportunity.organization || "Bez organizacije"} · {opportunity.location || "Online / nije navedeno"}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <AdminBadge tone="blue">{opportunityTypeLabels[opportunity.type]}</AdminBadge>
                    </td>
                    <td className="px-6 py-4 align-middle text-[15px] text-[#4f5762]">
                      {opportunity.deadlineAt ? formatDate(opportunity.deadlineAt) : "Nije naveden"}
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex flex-wrap gap-2">
                        {opportunity.isDraft ? <AdminBadge tone="yellow">Draft</AdminBadge> : null}
                        {opportunity.isArchived ? <AdminBadge tone="neutral">Arhiva</AdminBadge> : null}
                        {opportunity.isFeatured ? <AdminBadge tone="green">Istaknuto</AdminBadge> : null}
                        {!opportunity.isDraft && !opportunity.isArchived ? (
                          <AdminBadge tone="green">Objavljeno</AdminBadge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle text-right">
                      <NavigationButton
                        className="inline-flex h-9 items-center justify-center rounded-full border border-[#182fc7] px-4 text-[14px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
                        href={`/admin/opportunities/${opportunity.id}`}
                      >
                        Otvori
                      </NavigationButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function AdminBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "blue" | "green" | "neutral" | "yellow";
}) {
  const toneClassName = {
    blue: "border-[#cbd6ff] bg-[#eef2ff] text-[#182fc7]",
    green: "border-[#bfe7ce] bg-[#f0fff5] text-[#137a3a]",
    neutral: "border-[#d7dee9] bg-[#f8fbff] text-[#5f6772]",
    yellow: "border-[#ffe4a3] bg-[#fff8e6] text-[#9a6a00]",
  }[tone];

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-bold ${toneClassName}`}
    >
      {children}
    </span>
  );
}
