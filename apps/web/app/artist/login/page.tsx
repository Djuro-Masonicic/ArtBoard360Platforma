import { redirect } from "next/navigation";

import { AuthGradientText, AuthPageShell } from "@/components/auth-page-shell";
import { ArtistLoginForm } from "@/components/artist-login-form";
import { getAdminSessionUser } from "@/lib/admin-session";
import { getArtistSessionUser } from "@/lib/artist-session";

type ArtistLoginPageProps = {
  searchParams?: Promise<{ returnTo?: string | string[] }>;
};

function readSafeReturnTo(value: string | string[] | undefined): string | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const returnTo = rawValue?.trim();

  if (!returnTo) {
    return null;
  }

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
    <AuthPageShell
      description="Unesi e-mail adresu i lozinku za pristup svom ArtBoard profilu."
      title={<>Uloguj se na <AuthGradientText>ArtBoard.</AuthGradientText></>}
    >
      <ArtistLoginForm returnTo={returnTo} />
    </AuthPageShell>
  );
}
