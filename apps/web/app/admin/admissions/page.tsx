import { redirect } from "next/navigation";

import { NavigationButton } from "@/components/navigation-button";
import { getAdminSessionToken } from "@/lib/admin-session";
import { getArtistSubmissions } from "@/services/artist-submissions";
import type { ArtistSubmissionStatus } from "@/types/api";

interface AdmissionsPageProps {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    status?: ArtistSubmissionStatus | "";
  }>;
}

const statusOptions: Array<{ value: ArtistSubmissionStatus | ""; label: string }> = [
  { value: "", label: "Svi statusi" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default async function AdmissionsPage({ searchParams }: AdmissionsPageProps) {
  const token = await getAdminSessionToken();

  if (!token) {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const page = Number(resolvedSearchParams.page ?? "1");
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const status = normalizeStatus(resolvedSearchParams.status);
  const search = resolvedSearchParams.search?.trim() ?? "";

  const response = await getArtistSubmissions({
    page: safePage,
    pageSize: 24,
    search: search || undefined,
    status,
  }, token);

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-[2vw] pb-16 pt-[14vh]">
      <section className="rounded-[32px] border border-[#dde4ef] bg-white/90 px-7 py-7 shadow-[0_18px_56px_rgba(31,46,86,0.06)] sm:px-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
              Administracija prijava
            </p>
            <h1 className="mt-4 text-[40px] font-bold leading-[0.95] text-[#2f3138] sm:text-[56px]">
              Pristigle prijave
            </h1>
            <p className="mt-4 max-w-[720px] text-[19px] leading-[1.45] text-[#4f5762]">
              Tabelarni pregled svih prijava. Otvori pojedinacnu prijavu da promijenis podatke,
              pregledas materijale i odobris ili odbijes prijavu.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#e5eaf2] bg-[#f8fbff] px-5 py-4 text-sm text-[#5f6772]">
            <div className="text-[26px] font-bold text-[#2f3138]">{response.meta.total}</div>
            <div>ukupno prijava</div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#dde4ef] bg-white/95 px-6 py-6 shadow-[0_16px_44px_rgba(31,46,86,0.05)]">
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_160px]" method="GET">
          <label className="flex flex-col gap-2 text-sm font-medium text-[#39404a]">
            Pretraga
            <input
              className="h-12 rounded-full border border-[#d7dee9] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
              defaultValue={search}
              name="search"
              placeholder="Ime, email ili telefon..."
              type="text"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[#39404a]">
            Status
            <select
              className="h-12 rounded-full border border-[#d7dee9] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
              defaultValue={status}
              name="status"
            >
              {statusOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#182fc7] px-6 text-[16px] font-medium text-white transition hover:bg-[#1326a8]"
            type="submit"
          >
            Primijeni
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#dde4ef] bg-white/96 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[#f8fbff]">
              <tr className="border-b border-[#e8edf4] text-left">
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Profil
                </th>
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Ime
                </th>
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Kontakt
                </th>
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Status
                </th>
                <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#7a8390]">
                  Poslato
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
                  <td className="px-6 py-16 text-center text-[17px] text-[#5f6772]" colSpan={7}>
                    Nema prijava za zadate filtere.
                  </td>
                </tr>
              ) : (
                response.items.map((submission) => (
                  <tr className="border-b border-[#edf1f6] last:border-b-0" key={submission.id}>
                    <td className="px-6 py-4 align-middle">
                      {submission.profilePhotoUrl ? (
                        <img
                          alt={submission.fullName}
                          className="h-14 w-14 rounded-[16px] border border-[#e1e7ef] object-cover"
                          src={submission.profilePhotoUrl}
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-[#e1e7ef] bg-[#f5f8fd] text-[18px] font-bold text-[#9aa5b4]">
                          {submission.fullName.slice(0, 1)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="text-[17px] font-semibold text-[#2f3138]">{submission.fullName}</div>
                      <div className="mt-1 text-[14px] text-[#66707d]">
                        {submission.disciplines.map((discipline) => discipline.name).join(", ")}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="text-[15px] text-[#2f3138]">{submission.email}</div>
                      <div className="mt-1 text-[14px] text-[#66707d]">{submission.phone || "Bez telefona"}</div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <StatusBadge status={submission.status} />
                    </td>
                    <td className="px-6 py-4 align-middle text-[15px] text-[#4f5762]">
                      {formatDate(submission.createdAt)}
                    </td>
                    <td className="px-6 py-4 align-middle text-[15px] text-[#4f5762]">
                      {submission.counts.artworks}
                    </td>
                    <td className="px-6 py-4 align-middle text-right">
                      <NavigationButton
                        className="inline-flex h-10 items-center justify-center rounded-full border border-[#182fc7] px-5 text-[15px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
                        href={`/admin/admissions/${submission.id}`}
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

      <section className="flex items-center justify-between gap-4 rounded-[24px] border border-[#dde4ef] bg-white/85 px-6 py-5">
        <div className="text-[15px] text-[#5f6772]">
          Stranica {response.meta.page} od {response.meta.totalPages}
        </div>

        <div className="flex gap-3">
          <PaginationLink
            disabled={response.meta.page <= 1}
            page={response.meta.page - 1}
            search={search}
            status={status}
          >
            Prethodna
          </PaginationLink>
          <PaginationLink
            disabled={response.meta.page >= response.meta.totalPages}
            page={response.meta.page + 1}
            search={search}
            status={status}
          >
            Sljedeca
          </PaginationLink>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: ArtistSubmissionStatus }) {
  const styles =
    status === "APPROVED"
      ? "border-[#1f9d52] bg-[#ecfbf2] text-[#176f3b]"
      : status === "REJECTED"
        ? "border-[#dc1735] bg-[#fff1f4] text-[#b4132c]"
        : "border-[#ffc41d] bg-[#fff9e7] text-[#8c6900]";

  return (
    <span className={`rounded-full border px-3 py-1 text-[12px] font-medium uppercase tracking-[0.16em] ${styles}`}>
      {status}
    </span>
  );
}

function PaginationLink({
  page,
  search,
  status,
  disabled,
  children,
}: {
  page: number;
  search: string;
  status: ArtistSubmissionStatus | "";
  disabled: boolean;
  children: React.ReactNode;
}) {
  const params = new URLSearchParams();
  params.set("page", String(page));

  if (search) {
    params.set("search", search);
  }

  if (status) {
    params.set("status", status);
  }

  if (disabled) {
    return (
      <span className="inline-flex h-11 items-center rounded-full border border-[#e1e6ee] px-5 text-[15px] text-[#a0a8b4]">
        {children}
      </span>
    );
  }

  return (
    <NavigationButton
      className="inline-flex h-11 items-center rounded-full border border-[#182fc7] px-5 text-[15px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
      href={`/admin/admissions?${params.toString()}`}
    >
      {children}
    </NavigationButton>
  );
}

function normalizeStatus(rawStatus?: string): ArtistSubmissionStatus | "" {
  if (rawStatus === "PENDING" || rawStatus === "APPROVED" || rawStatus === "REJECTED") {
    return rawStatus;
  }

  return "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-ME", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
