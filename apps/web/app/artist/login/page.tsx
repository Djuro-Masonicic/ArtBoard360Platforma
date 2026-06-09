import { redirect } from "next/navigation";

import { ArtistLoginForm } from "@/components/artist-login-form";
import { getAdminSessionUser } from "@/lib/admin-session";
import { getArtistSessionUser } from "@/lib/artist-session";

export default async function ArtistLoginPage() {
  const adminSession = await getAdminSessionUser();
  const artistSession = await getArtistSessionUser();

  if (adminSession) {
    redirect("/admin/admissions");
  }

  if (artistSession) {
    redirect("/artist/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[1180px] items-center px-[4vw] pb-16 pt-[16vh]">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
            Pristup nalogu
          </p>

          <h1 className="max-w-[720px] text-[46px] font-bold leading-[0.95] text-[#2f3138] sm:text-[68px]">
            Prijavi se na ArtBoard.
          </h1>

          <p className="max-w-[620px] text-[19px] leading-[1.5] text-[#4f5762]">
            Unesi email i lozinku. Admin nalog i artist nalog koriste istu prijavnu stranicu.
          </p>
        </section>

        <section className="rounded-[32px] border border-[#dde4ef] bg-white/95 p-7 shadow-[0_18px_56px_rgba(31,46,86,0.08)] sm:p-9">
          <div className="mb-7">
            <h2 className="text-[30px] font-bold text-[#2f3138]">Prijava</h2>
            <p className="mt-3 text-[16px] leading-[1.5] text-[#5f6772]">
              Ako uneses admin email, otvorice se administracija. Svi ostali emailovi koriste artist login.
            </p>
          </div>

          <ArtistLoginForm />
        </section>
      </div>
    </div>
  );
}
