import { redirect } from "next/navigation";

import { ArtistLoginForm } from "@/components/artist-login-form";
import { getAdminSessionUser } from "@/lib/admin-session";
import { getArtistSessionUser } from "@/lib/artist-session";

type ArtistLoginPageProps = {
  searchParams?: Promise<{ returnTo?: string | string[] }> | { returnTo?: string | string[] };
};

function readSafeReturnTo(value: string | string[] | undefined): string | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const returnTo = rawValue?.trim();

  if (!returnTo) {
    return null;
  }

  // Only internal paths are allowed here, so nobody can abuse login as an open redirect.
  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.includes("://")) {
    return null;
  }

  return returnTo;
}

export default async function ArtistLoginPage({ searchParams }: ArtistLoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const returnTo = readSafeReturnTo(resolvedSearchParams?.returnTo);
  const adminSession = await getAdminSessionUser();
  const artistSession = await getArtistSessionUser();

  if (adminSession) {
    redirect("/admin");
  }

  if (artistSession) {
    redirect(returnTo ?? "/artist/dashboard");
  }

  return (
    <div className="-mx-5 -my-8 flex min-h-[calc(100vh-96px)] items-center bg-[#f7f7f9] px-5 pb-16 pt-[118px] sm:-mx-8 sm:-my-10 sm:px-8 sm:pb-20 sm:pt-[132px] lg:-mx-10 lg:-my-12 lg:px-14 lg:pb-24 lg:pt-[142px]">
      <div className="mx-auto grid w-full max-w-[1280px] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(380px,480px)] lg:items-center lg:gap-20 xl:gap-24">
        <section className="min-w-0">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.24em] text-[#6b7080]">
            Pristup nalogu
          </p>

          <h1 className="mt-5 max-w-[720px] text-[48px] font-extrabold leading-none tracking-normal text-[#111318] sm:text-[68px] xl:text-[82px]">
            Prijavi se na{" "}
            <span className="bg-gradient-to-r from-[#1a7cff] via-[#ff2d55] to-[#ffad2b] bg-clip-text text-transparent">
              ArtBoard.
            </span>
          </h1>

          <p className="mt-7 max-w-[520px] text-[17px] font-medium leading-[1.6] text-[#3b4050] sm:text-[19px]">
            Unesi e-mail adresu i lozinku kako bi pristupio/la svom ArtBoard profilu.
          </p>
        </section>

        <section className="min-w-0 rounded-[28px] bg-white p-7 shadow-[0_24px_60px_rgba(17,19,24,0.08)] sm:p-10 lg:p-11">
          <div className="mb-7">
            <h2 className="text-[32px] font-extrabold tracking-normal text-[#111318] sm:text-[36px]">
              Prijava
            </h2>
            <p className="mt-3 text-[15px] font-medium leading-[1.6] text-[#555a69]">
              Ako uneseš admin email, otvoriće se administracija. Svi ostali emailovi koriste artist login.
            </p>
          </div>

          <ArtistLoginForm returnTo={returnTo} />
        </section>
      </div>
    </div>
  );
}
