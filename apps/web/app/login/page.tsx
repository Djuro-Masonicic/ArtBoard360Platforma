import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSessionUser } from "@/lib/admin-session";

export default async function LoginPage() {
  const session = await getAdminSessionUser();

  if (session) {
    redirect("/admin/admissions");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[1180px] items-center px-[4vw] pb-16 pt-[16vh]">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
            Admin login
          </p>

          <h1 className="max-w-[720px] text-[46px] font-bold leading-[0.95] text-[#2f3138] sm:text-[68px]">
            Pristup administraciji prijava.
          </h1>

          <p className="max-w-[620px] text-[19px] leading-[1.5] text-[#4f5762]">
            Ovaj ulaz je namijenjen samo administratorima ArtBoard platforme. Nakon prijave mozes
            pregledati nove prijave, urediti podatke i odobriti ili odbiti umjetnike.
          </p>
        </section>

        <section className="rounded-[32px] border border-[#dde4ef] bg-white/95 p-7 shadow-[0_18px_56px_rgba(31,46,86,0.08)] sm:p-9">
          <div className="mb-7">
            <h2 className="text-[30px] font-bold text-[#2f3138]">Prijava</h2>
            <p className="mt-3 text-[16px] leading-[1.5] text-[#5f6772]">
              Koristi admin nalog koji je povezan sa ovim projektom.
            </p>
          </div>

          <AdminLoginForm />

          <div className="mt-6 rounded-[20px] border border-[#edf1f6] bg-[#f8fbff] px-5 py-4 text-[14px] leading-[1.6] text-[#66707d]">
            U lokalnom development okruzenju podrazumijevani admin nalog moze biti seed-ovan iz
            `.env` vrijednosti `ADMIN_SEED_EMAIL` i `ADMIN_SEED_PASSWORD`.
          </div>
        </section>
      </div>
    </div>
  );
}
