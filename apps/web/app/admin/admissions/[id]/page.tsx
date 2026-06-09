import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminAdmissionEditor } from "@/components/admin-admission-editor";
import { getAdminSessionToken } from "@/lib/admin-session";
import { getArtistSubmissionById } from "@/services/artist-submissions";
import { getArtists } from "@/services/artists";

interface AdmissionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdmissionDetailPage({ params }: AdmissionDetailPageProps) {
  const token = await getAdminSessionToken();

  if (!token) {
    redirect("/login");
  }

  const { id } = await params;

  try {
    const [submission, artistsResponse] = await Promise.all([
      getArtistSubmissionById(id, token),
      getArtists({
        page: 1,
        pageSize: 100,
        includeNsfw: true,
      }),
    ]);

    const disciplines = Array.from(
      new Map(
        artistsResponse.items
          .flatMap((artist) => artist.disciplines)
          .map((discipline) => [discipline.slug, discipline]),
      ).values(),
    ).sort((left, right) => left.name.localeCompare(right.name));

    return (
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-[2vw] pb-16 pt-[14vh]">
        <section className="rounded-[30px] border border-[#dde4ef] bg-white/90 px-7 py-7 shadow-[0_18px_56px_rgba(31,46,86,0.06)] sm:px-9">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
                Pregled prijave
              </p>
              <h1 className="mt-4 text-[38px] font-bold leading-[0.95] text-[#2f3138] sm:text-[52px]">
                {submission.fullName}
              </h1>
              <p className="mt-4 max-w-[740px] text-[19px] leading-[1.45] text-[#4f5762]">
                Ovdje administrator moze promijeniti podatke prijave, dodati interne napomene i
                zatim odobriti ili odbiti prijavu.
              </p>
            </div>

            <Link
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#182fc7] px-5 text-[15px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
              href="/admin/admissions"
            >
              Nazad na tabelu
            </Link>
          </div>
        </section>

        <AdminAdmissionEditor disciplines={disciplines} submission={submission} />
      </div>
    );
  } catch {
    notFound();
  }
}
