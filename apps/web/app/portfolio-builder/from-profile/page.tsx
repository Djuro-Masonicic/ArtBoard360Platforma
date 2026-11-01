import { redirect } from "next/navigation";
import { getArtistSessionToken } from "@/lib/artist-session";
import { apiFetch } from "@/services/api";
import { PortfolioProfileEditor } from "@/components/portfolio-profile-editor";
import type { ProfileEditorSeed } from "@/lib/portfolio-profile-memory";
export default async function Page() {
  const token = await getArtistSessionToken(); if (!token) redirect("/artist/login?returnTo=%2Fportfolio-builder%2Ffrom-profile");
  const seed = await apiFetch<ProfileEditorSeed>("/portfolio-projects/editor/from-profile", { headers: { Authorization: `Bearer ${token}` } });
  return <PortfolioProfileEditor seed={seed} />;
}
