import { PrijavaForm } from "@/components/prijava-form";
import { getArtists } from "@/services/artists";

export default async function PrijavaPage() {
  const artistsResponse = await getArtists({
    page: 1,
    pageSize: 100,
    includeNsfw: true,
  });

  // We reuse the imported artist data to build a stable discipline list for
  // the registration form until a dedicated disciplines endpoint exists.
  const disciplines = Array.from(
    new Map(
      artistsResponse.items
        .flatMap((artist) => artist.disciplines)
        .map((discipline) => [discipline.slug, discipline]),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name));

  return (
    <div className="space-y-10 pb-14 sm:space-y-12">
      <section className="mx-auto max-w-[1180px] px-4 pt-[18vh] text-center sm:px-6">
        <p className="text-[13px] font-medium uppercase tracking-[0.32em] text-[#7b8391]">
          Prijava za ArtBoard platformu
        </p>
        <h1 className="mt-6 text-[46px] font-bold leading-[0.96] text-[#2f3138] sm:text-[64px]">
          Prijava umjetnika,
          <br />
          korak po korak.
        </h1>
        <p className="mx-auto mt-6 max-w-[880px] text-[20px] leading-[1.45] text-[#4e5560] sm:text-[22px]">
          Forma je sada vodjena i preglednija. Prolazis pitanje po pitanje, uz dovoljno prostora da
          pripremis portfolio, drustvene mreze i materijale za selekciju.
        </p>
      </section>

      <PrijavaForm disciplines={disciplines} />
    </div>
  );
}
