"use client";

import { useState } from "react";

import { uploadArtworkFile } from "@/services/uploads";
import type { Artwork } from "@/types/api";

interface UploadArtworkInput {
  artistId: string;
  file: File;
  title?: string;
  description?: string;
  altText?: string;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

/**
 * The hook wraps the multi-step upload flow so the form component can stay readable.
 */
export function useUploadArtwork() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdArtwork, setCreatedArtwork] = useState<Artwork | null>(null);

  async function uploadArtwork(input: UploadArtworkInput) {
    setStatus("uploading");
    setErrorMessage(null);

    try {
      const artwork = await uploadArtworkFile({
        artistId: input.artistId,
        file: input.file,
        title: input.title,
        description: input.description,
        altText: input.altText,
      });

      setCreatedArtwork(artwork);
      setStatus("success");
      return artwork;
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
      throw error;
    }
  }

  return {
    status,
    errorMessage,
    createdArtwork,
    uploadArtwork,
  };
}
