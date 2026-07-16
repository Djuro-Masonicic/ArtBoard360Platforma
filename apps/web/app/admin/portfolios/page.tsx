import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { NavigationButton } from "@/components/navigation-button";
import { getAdminSessionToken } from "@/lib/admin-session";
import { getAdminPortfolioProjects } from "@/services/portfolio-projects";

type AdminPortfoliosPageProps = {
  searchParams?: Promise<{
    page?: string;
    search?: string;
  }>;
};

export default async function AdminPortfoliosPage({ searchParams }: AdminPortfoliosPageProps) {
  const token = await getAdminSessionToken();

  if (!token) {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const page = Number(resolvedSearchParams.page ?? "1");
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const search = resolvedSearchParams.search?.trim() ?? "";
  const response = await getAdminPortfolioProjects(token, {
    page: safePage,
    pageSize: 24,
    search: search || undefined,
  });

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-[2vw] pb-16 pt-[14vh]">
      <section className="rounded-[32px] border border-[#dde4ef] bg-white/90 px-7 py-7 shadow-[0_18px_56px_rgba(31,46,86,0.06)] sm:px-9">
        <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
          Portfolio Builder
        </p>
        <h1 className="mt-4 text-[40px] font-bold leading-[0.95] text-[#2f3138] sm:text-[56px]">
          Generisani portfoliji
        </h1>
        <p className="mt-4 max-w-[760px] text-[19px] leading-[1.45] text-[#4f5762]">
          Admin pregled svih portfolio draftova, placanja i preview linkova. Ovdje mozes brzo
          provjeriti ko ima watermark preview, a ko ima pravo na cisti PDF.
        </p>
      </section>

      <section className="rounded-[28px] border border-[#dde4ef] bg-white/95 px-6 py-6 shadow-[0_16px_44px_rgba(31,46,86,0.05)]">
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]" method="GET">
          <input
            className="h-12 rounded-full border border-[#d7dee9] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
            defaultValue={search}
            name="search"
            placeholder="Pretrazi ime umjetnika, email ili naziv portfolija..."
            type="text"
          />
          <button
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#182fc7] px-6 text-[16px] font-medium text-white transition hover:bg-[#1326a8]"
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
                  Umjetnik
                </th>
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Izvor
                </th>
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Template
                </th>
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Placanje
                </th>
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Radovi
                </th>
                <th className="px-6 py-4 text-right text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Akcija
                </th>
              </tr>
            </thead>
            <tbody>
              {response.items.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-[17px] text-[#5f6772]" colSpan={6}>
                    Nema portfolio projekata za zadate filtere.
                  </td>
                </tr>
              ) : (
                response.items.map((project) => (
                  <tr className="border-b border-[#edf1f6] last:border-b-0" key={project.id}>
                    <td className="px-6 py-4 align-middle">
                      <div className="text-[17px] font-semibold text-[#2f3138]">
                        {project.artistName}
                      </div>
                      <div className="mt-1 text-[14px] text-[#66707d]">
                        {project.email || "Bez emaila"}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle text-[15px] text-[#4f5762]">
                      <AdminBadge tone={project.source === "ARTBOARD_PROFILE" ? "blue" : "neutral"}>
                        {project.source === "ARTBOARD_PROFILE" ? "ArtBoard profil" : "Guest"}
                      </AdminBadge>
                    </td>
                    <td className="px-6 py-4 align-middle text-[15px] text-[#4f5762]">
                      <div className="max-w-[190px] truncate font-semibold text-[#2f3138]">
                        {formatTemplate(project.template)}
                      </div>
                      <div className="mt-1 text-[12px] text-[#7a8390]">
                        {project.language} / {project.pageFormat}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle text-[15px] text-[#4f5762]">
                      <AdminBadge tone={project.access.canDownloadCleanPdf ? "green" : "yellow"}>
                        {project.access.canDownloadCleanPdf ? "Otkljucan PDF" : "Watermark only"}
                      </AdminBadge>
                      <div className="mt-2 text-[12px] text-[#7a8390]">{project.paymentStatus}</div>
                    </td>
                    <td className="px-6 py-4 align-middle text-[15px] text-[#4f5762]">
                      {project.counts.selectedArtworks}/{project.counts.artworks}
                    </td>
                    <td className="px-6 py-4 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        <NavigationButton
                          className="inline-flex h-9 items-center justify-center rounded-full border border-[#d7dee9] px-4 text-[14px] font-medium text-[#4f5762] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                          href={`/portfolio-builder/${project.id}/preview`}
                        >
                          Preview
                        </NavigationButton>
                        <NavigationButton
                          className="inline-flex h-9 items-center justify-center rounded-full border border-[#182fc7] px-4 text-[14px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
                          href={`/admin/portfolios/${project.id}`}
                        >
                          Detalji
                        </NavigationButton>
                      </div>
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

function formatTemplate(template: string) {
  return template
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
