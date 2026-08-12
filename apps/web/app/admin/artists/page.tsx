import { NavigationButton } from "@/components/navigation-button";
import { requireAdminSession } from "@/lib/admin-session";
import { getArtists } from "@/services/artists";

type AdminArtistsPageProps = {
  searchParams?: Promise<{
    page?: string;
    search?: string;
  }>;
};

/**
 * Admin artist index.
 *
 * For now this uses the existing public artists endpoint, because the backend
 * already returns the data the admin needs for a simple overview. If we later
 * need hidden/draft artists, bulk moderation, or private account data, this
 * page can be switched to a dedicated admin-only API.
 */
export default async function AdminArtistsPage({ searchParams }: AdminArtistsPageProps) {
  await requireAdminSession();

  const resolvedSearchParams = (await searchParams) ?? {};
  const page = Number(resolvedSearchParams.page ?? "1");
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const search = resolvedSearchParams.search?.trim() ?? "";

  const response = await getArtists({
    page: safePage,
    pageSize: 30,
    search: search || undefined,
    includeNsfw: true,
  });

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-[2vw] pb-16 pt-[14vh]">
      <section className="rounded-[32px] border border-[#dde4ef] bg-white/90 px-7 py-7 shadow-[0_18px_56px_rgba(31,46,86,0.06)] sm:px-9">
        <p className="text-[13px] font-bold uppercase tracking-[0.28em] text-[#7f8794]">
          Admin
        </p>
        <h1 className="mt-4 text-[42px] font-bold leading-[0.95] text-[#2f3138] sm:text-[62px]">
          Umjetnici
        </h1>
        <p className="mt-4 max-w-[780px] text-[19px] leading-[1.45] text-[#4f5762]">
          Pregled postojecih artist profila. Odavde admin brzo provjerava javni profil,
          discipline, broj radova i osnovne kontakt podatke.
        </p>
      </section>

      <section className="rounded-[28px] border border-[#dde4ef] bg-white/95 px-6 py-6 shadow-[0_16px_44px_rgba(31,46,86,0.05)]">
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]" method="GET">
          <input
            className="h-12 rounded-full border border-[#d7dee9] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
            defaultValue={search}
            name="search"
            placeholder="Pretrazi umjetnike po imenu, emailu ili disciplini..."
            type="text"
          />
          <button
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#182fc7] px-6 text-[16px] font-bold text-white transition hover:bg-[#1326a8]"
            type="submit"
          >
            Pretrazi
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#dde4ef] bg-white shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[#f8fbff]">
              <tr className="border-b border-[#e8edf4] text-left">
                <th className="px-6 py-4 text-[13px] font-bold uppercase tracking-[0.18em] text-[#7a8390]">
                  Umjetnik
                </th>
                <th className="px-6 py-4 text-[13px] font-bold uppercase tracking-[0.18em] text-[#7a8390]">
                  Discipline
                </th>
                <th className="px-6 py-4 text-[13px] font-bold uppercase tracking-[0.18em] text-[#7a8390]">
                  Radovi
                </th>
                <th className="px-6 py-4 text-[13px] font-bold uppercase tracking-[0.18em] text-[#7a8390]">
                  Azurirano
                </th>
                <th className="px-6 py-4 text-right text-[13px] font-bold uppercase tracking-[0.18em] text-[#7a8390]">
                  Akcija
                </th>
              </tr>
            </thead>
            <tbody>
              {response.items.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-[17px] text-[#5f6772]" colSpan={5}>
                    Nema umjetnika za zadate filtere.
                  </td>
                </tr>
              ) : (
                response.items.map((artist) => (
                  <tr className="border-b border-[#edf1f6] last:border-b-0" key={artist.id}>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-4">
                        <img
                          alt=""
                          className="h-14 w-14 rounded-full bg-[#eef2f7] object-cover"
                          src={
                            artist.profileThumbnailUrl ||
                            artist.profileImageUrl ||
                            artist.thumbnailUrl ||
                            "/placeholder-artist.svg"
                          }
                        />
                        <div className="min-w-0">
                          <div className="truncate text-[17px] font-bold text-[#2f3138]">
                            {artist.name}
                          </div>
                          <div className="mt-1 truncate text-[14px] text-[#66707d]">
                            {artist.email || `/${artist.slug}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle text-[15px] text-[#4f5762]">
                      <div className="max-w-[280px]">
                        {artist.disciplines.length > 0
                          ? artist.disciplines.map((discipline) => discipline.name).join(", ")
                          : "Bez disciplina"}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle text-[17px] font-bold text-[#182fc7]">
                      {artist.counts?.artworks ?? artist.artworks.length}
                    </td>
                    <td className="px-6 py-4 align-middle text-[15px] text-[#66707d]">
                      {formatDate(artist.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right align-middle">
                      <NavigationButton
                        className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7dee9] px-5 text-[14px] font-bold text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                        href={`/artists/${artist.slug}`}
                      >
                        Otvori profil
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
