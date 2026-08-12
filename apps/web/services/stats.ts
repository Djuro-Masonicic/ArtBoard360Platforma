import { apiFetch } from "./api";

export type ArtBoardStats = {
  artists: number;
  artworks: number;
  disciplines: number;
};

/**
 * Reads public ArtBoard counters from the backend.
 * These values are counted directly in Postgres, so they stay accurate even
 * when the page only loads a small preview list of artists.
 */
export function getArtBoardStats() {
  return apiFetch<ArtBoardStats>("/stats/artboard");
}
