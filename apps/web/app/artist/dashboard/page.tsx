import Link from "next/link";

import { logoutArtistAction } from "@/app/artist/login/actions";
import { requireArtistSession } from "@/lib/artist-session";
import { getArtistBySlug } from "@/services/artists";

export default async function ArtistDashboardPage() {
  const session = await requireArtistSession();
  const artist = await getArtistBySlug(session.user.artistSlug);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-[4vw] pb-16 pt-[16vh]">
      <section className="rounded-[32px] border border-[#dde4ef] bg-white/95 px-7 py-8 shadow-[0_18px_56px_rgba(31,46,86,0.08)] sm:px-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
              Artist dashboard
            </p>
            <h1 className="mt-4 text-[40px] font-bold leading-[0.95] text-[#2f3138] sm:text-[56px]">
              Zdravo, {session.user.artistName}
            </h1>
            <p className="mt-4 max-w-[720px] text-[19px] leading-[1.45] text-[#4f5762]">
              Tvoj nalog je aktivan. Ovo je pocetna verzija artist dashboard-a sa osnovnim
              pregledom profila koji je kreiran nakon odobrene prijave.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#182fc7] px-5 text-[15px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
              href={`/artists/${artist.slug}`}
            >
              Pogledaj javni profil
            </Link>

            <form action={logoutArtistAction}>
              <button
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#d6deea] px-5 text-[15px] font-medium text-[#4f5762] transition hover:border-[#bcc7d6] hover:bg-white"
                type="submit"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="rounded-[30px] border border-[#dde4ef] bg-white/95 p-5 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
          <h2 className="text-[22px] font-semibold text-[#2f3138]">Profilna fotografija</h2>
          {artist.profileImageUrl ? (
            <img
              alt={artist.name}
              className="mt-4 w-full rounded-[24px] border border-[#e1e7ef] object-cover"
              src={artist.profileImageUrl}
            />
          ) : (
            <div className="mt-4 rounded-[24px] border border-[#e1e7ef] bg-[#f8fbff] px-5 py-8 text-[15px] text-[#66707d]">
              Profilna fotografija jos nije dostupna.
            </div>
          )}
        </div>

        <div className="space-y-8">
          <section className="rounded-[30px] border border-[#dde4ef] bg-white/95 p-6 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
            <h2 className="text-[22px] font-semibold text-[#2f3138]">Osnovne informacije</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoCard label="Ime profila" value={artist.name} />
              <InfoCard label="Email naloga" value={session.user.email} />
              <InfoCard label="Slug profila" value={artist.slug} />
              <InfoCard
                label="Broj radova"
                value={String(artist.artworks.length)}
              />
            </div>
          </section>

          <section className="rounded-[30px] border border-[#dde4ef] bg-white/95 p-6 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
            <h2 className="text-[22px] font-semibold text-[#2f3138]">Biografija</h2>
            <p className="mt-4 whitespace-pre-line text-[17px] leading-[1.7] text-[#4f5762]">
              {artist.bio || "Biografija jos nije dostupna."}
            </p>
          </section>

          <section className="rounded-[30px] border border-[#dde4ef] bg-white/95 p-6 shadow-[0_18px_48px_rgba(31,46,86,0.06)]">
            <h2 className="text-[22px] font-semibold text-[#2f3138]">Disciplina i linkovi</h2>

            <div className="mt-5 flex flex-wrap gap-3">
              {artist.disciplines.map((discipline) => (
                <span
                  className="rounded-full border border-[#dce3ed] bg-[#f8fbff] px-4 py-2 text-[14px] text-[#4f5762]"
                  key={discipline.id}
                >
                  {discipline.name}
                </span>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {artist.socialLinks.map((link) => (
                <a
                  className="block rounded-[18px] border border-[#e2e8f0] bg-[#f8fbff] px-4 py-3 text-[15px] text-[#2f3138] transition hover:border-[#c9d4e3]"
                  href={link.url}
                  key={link.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  {link.platform}: {link.url}
                </a>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#e2e8f0] bg-[#f8fbff] px-5 py-4">
      <div className="text-[13px] uppercase tracking-[0.16em] text-[#7f8794]">{label}</div>
      <div className="mt-2 text-[18px] font-medium text-[#2f3138]">{value}</div>
    </div>
  );
}
