import { notFound, redirect } from "next/navigation";

import { getArtistSessionToken } from "@/lib/artist-session";
import { getAdminSessionToken } from "@/lib/admin-session";
import { ApiError } from "@/services/api";
import { getAdminPortfolioProject, getPublicPortfolioProject } from "@/services/portfolio-projects";

export async function getPortfolioForPage(id: string, allowAdminPreview = false) {
  const token = await getArtistSessionToken();
  try {
    return await getPublicPortfolioProject(id, token ?? undefined);
  } catch (error) {
    if (error instanceof ApiError) {
      if (allowAdminPreview && (error.status === 401 || error.status === 404)) {
        const adminToken = await getAdminSessionToken();
        if (adminToken) {
          try { return await getAdminPortfolioProject(adminToken, id); }
          catch (adminError) {
            if (!(adminError instanceof ApiError) || ![401, 404].includes(adminError.status)) throw adminError;
          }
        }
      }
      if (error.status === 401) redirect(`/artist/login?returnTo=${encodeURIComponent(`/portfolio-builder/${id}`)}`);
      if (error.status === 404) notFound();
    }
    throw error;
  }
}
