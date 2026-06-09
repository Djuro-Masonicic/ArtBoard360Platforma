import type { Artist, PaginatedResponse } from "@/types/api";

import { apiFetch, buildQueryString } from "./api";

export function getArtists(query?: Record<string, string | number | boolean | undefined>) {
  return apiFetch<PaginatedResponse<Artist>>(`/artists${buildQueryString(query)}`);
}

export function getArtistBySlug(slug: string) {
  return apiFetch<Artist>(`/artists/${slug}`);
}
