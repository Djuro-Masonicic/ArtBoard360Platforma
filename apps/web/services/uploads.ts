import type { Artwork, SignedUploadResponse } from "@/types/api";

import { apiFetch } from "./api";

export interface RequestUploadPayload {
  artistId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  entityType: "artwork" | "profile";
}

export interface CreateArtworkPayload {
  artistId: string;
  imageUrl: string;
  storagePath: string;
  title?: string;
  description?: string;
  altText?: string;
  mimeType?: string;
  fileSizeBytes?: number;
}

export interface UploadArtworkFilePayload {
  artistId: string;
  file: File;
  title?: string;
  description?: string;
  altText?: string;
  orderIndex?: number;
}

export function requestUploadUrl(payload: RequestUploadPayload) {
  return apiFetch<SignedUploadResponse>(
    "/artworks/upload-url",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "browser",
  );
}

export function createArtwork(payload: CreateArtworkPayload) {
  return apiFetch<Artwork>(
    "/artworks",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "browser",
  );
}

/**
 * The current production flow posts a multipart form to the NestJS backend.
 * The API validates the file, uploads it to R2, and then stores metadata in Postgres.
 */
export function uploadArtworkFile(payload: UploadArtworkFilePayload) {
  const formData = new FormData();
  formData.set("artistId", payload.artistId);
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

  return apiFetch<Artwork>(
    "/artworks/upload",
    {
      method: "POST",
      body: formData,
    },
    "browser",
  );
}
