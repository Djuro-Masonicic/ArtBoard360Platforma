"use client";

import { useEffect, useState } from "react";

import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";
import { useUploadArtwork } from "@/hooks/use-upload-artwork";
import type { Artist } from "@/types/api";

interface UploadFormProps {
  artists: Artist[];
}

export function UploadForm({ artists }: UploadFormProps) {
  const { showAlert } = useUiFeedback();
  const [artistId, setArtistId] = useState(artists[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [altText, setAltText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { status, errorMessage, createdArtwork, uploadArtwork } = useUploadArtwork();

  useUiLoadingState(status === "uploading");

  useEffect(() => {
    if (status === "success" && createdArtwork) {
      showAlert({
        kind: "success",
        title: "Rad je uploadovan",
        message: "Artwork je uspješno sačuvan i dodat umjetniku.",
      });
    }
  }, [createdArtwork, showAlert, status]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    showAlert({
      kind: "error",
      title: "Upload nije uspio",
      message: errorMessage,
    });
  }, [errorMessage, showAlert]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || !artistId) {
      return;
    }

    await uploadArtwork({
      artistId,
      title,
      description,
      altText,
      file,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form className="space-y-5 border border-stone-300 bg-white p-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-800" htmlFor="artistId">
            Artist
          </label>
          <select
            className="w-full border border-stone-300 px-3 py-2 text-sm"
            id="artistId"
            onChange={(event) => setArtistId(event.target.value)}
            value={artistId}
          >
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-800" htmlFor="file">
            Image file
          </label>
          <input
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="block w-full text-sm"
            id="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-800" htmlFor="title">
            Title
          </label>
          <input
            className="w-full border border-stone-300 px-3 py-2 text-sm"
            id="title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Optional artwork title"
            value={title}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-800" htmlFor="description">
            Description
          </label>
          <textarea
            className="min-h-32 w-full border border-stone-300 px-3 py-2 text-sm"
            id="description"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description"
            value={description}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-800" htmlFor="altText">
            Alt text
          </label>
          <input
            className="w-full border border-stone-300 px-3 py-2 text-sm"
            id="altText"
            onChange={(event) => setAltText(event.target.value)}
            placeholder="Accessibility-friendly summary"
            value={altText}
          />
        </div>

        <button
          className="inline-flex items-center border border-stone-900 px-4 py-2 text-sm font-medium text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!artistId || !file || status === "uploading"}
          type="submit"
        >
          {status === "uploading" ? "Uploading..." : "Upload artwork"}
        </button>
      </form>

      <aside className="space-y-4 border border-stone-300 bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold">Upload state</h2>
          <p className="mt-2 text-sm leading-7 text-stone-700">
            The form now sends the file to the backend. The NestJS API validates the upload,
            stores the binary file in Cloudflare R2, and saves only metadata in PostgreSQL.
          </p>
        </div>

        <dl className="space-y-2 text-sm text-stone-700">
          <div>
            <dt className="font-medium text-stone-900">Status</dt>
            <dd>{status}</dd>
          </div>

          {errorMessage ? (
            <div>
              <dt className="font-medium text-stone-900">Error</dt>
              <dd className="text-red-700">{errorMessage}</dd>
            </div>
          ) : null}

          {createdArtwork ? (
            <div>
              <dt className="font-medium text-stone-900">Created artwork</dt>
              <dd className="break-all">{createdArtwork.imageUrl}</dd>
            </div>
          ) : null}
        </dl>
      </aside>
    </div>
  );
}
