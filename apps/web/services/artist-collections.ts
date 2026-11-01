import { ApiError } from "./api";

export interface ArtistCollectionItem {
  id: string;
  title: string;
  description: string | null;
  year: string | null;
  coverImageUrl: string | null;
  coverImageStoragePath: string | null;
  orderIndex: number;
  updatedAt: string;
}

export interface CollectionArtwork {
  id: string;
  title: string | null;
  imageUrl: string;
  storagePath: string | null;
  orderIndex: number;
  artistCollectionId: string | null;
  collectionOrderIndex: number | null;
  updatedAt: string;
}

export interface ArtistCollectionsReady {
  available: true;
  version: string;
  collections: ArtistCollectionItem[];
  artworks: CollectionArtwork[];
}

export type ArtistCollectionsState = ArtistCollectionsReady | { available: false; message: string };
export interface CollectionMetadata {
  title: string;
  description?: string;
  year?: string;
  coverArtworkId?: string | null;
}

export async function requestArtistCollections(operation = "", method = "GET", payload?: unknown) {
  const multipart = payload instanceof FormData;
  const response = await fetch(`/api/artist/collections${operation ? `/${operation}` : ""}`, {
    method, cache: "no-store",
    ...(payload === undefined ? {} : {
      headers: multipart ? undefined : { "Content-Type": "application/json" },
      body: multipart ? payload : JSON.stringify(payload),
    }),
  });
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new ApiError("Servis kolekcija trenutno nije dostupan. Unos nije izgubljen.", response.status >= 400 ? response.status : 502); }
  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data ? String(data.message) : "Kolekcije nijesu dostupne.";
    throw new ApiError(message, response.status, data);
  }
  if (!data || typeof data !== "object" || !("available" in data) || typeof data.available !== "boolean") throw new ApiError("Servis kolekcija trenutno nije dostupan.", 502);
  return data as ArtistCollectionsState;
}

export function uploadArtistCollectionCover(id: string, expectedVersion: string, file: File) {
  const data = new FormData();
  data.set("expectedVersion", expectedVersion);
  data.set("file", file);
  return requestArtistCollections(`${id}/cover`, "POST", data);
}
