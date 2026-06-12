import type { Artist, Artwork, SocialPlatform } from "@/types/api";

import { ApiError } from "./api";

export interface UpdateArtistProfilePayload {
  bio?: string;
  quote?: string;
  email?: string;
  coverImageUrl?: string;
  disciplines?: string[];
  socialLinks?: Array<{
    platform: SocialPlatform;
    url: string;
  }>;
}

export async function updateArtistProfile(payload: UpdateArtistProfilePayload) {
  const response = await fetch("/api/artist/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return readRouteResponse<Artist>(response);
}

export async function uploadArtistProfileImage(file: File) {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch("/api/artist/profile-image", {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  return readRouteResponse<Artist>(response);
}

export async function uploadArtistArtwork(payload: {
  file: File;
  title?: string;
  description?: string;
  altText?: string;
  orderIndex?: number;
}) {
  const formData = new FormData();
  formData.set("file", payload.file);

  if (payload.title) {
    formData.set("title", payload.title);
  }

  if (payload.description) {
    formData.set("description", payload.description);
  }

  if (payload.altText) {
    formData.set("altText", payload.altText);
  }

  if (payload.orderIndex !== undefined) {
    formData.set("orderIndex", String(payload.orderIndex));
  }

  const response = await fetch("/api/artist/artworks/upload", {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  return readRouteResponse<Artwork>(response);
}

export async function deleteArtistArtwork(artworkId: string) {
  const response = await fetch(`/api/artist/artworks/${artworkId}`, {
    method: "DELETE",
    cache: "no-store",
  });

  return readRouteResponse<{ success: boolean; deletedArtworkId: string }>(response);
}

async function readRouteResponse<T>(response: Response) {
  if (!response.ok) {
    let payload: unknown = undefined;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message: string }).message)
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, payload);
  }

  return response.json() as Promise<T>;
}
