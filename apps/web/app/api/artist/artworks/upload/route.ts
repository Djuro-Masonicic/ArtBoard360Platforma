import { NextResponse } from "next/server";

import { getArtistSessionToken, getArtistSessionUser } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

/**
 * Artwork uploads reuse the existing backend multipart flow,
 * but the artist id is always enforced from the active session.
 */
export async function POST(request: Request) {
  const [token, session] = await Promise.all([getArtistSessionToken(), getArtistSessionUser()]);

  if (!token || !session) {
    return NextResponse.json(
      {
        message: "Moras biti prijavljen kao umjetnik.",
      },
      { status: 401 },
    );
  }

  const incomingFormData = await request.formData();
  const file = incomingFormData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        message: "Rad koji uploadujes mora biti fajl.",
      },
      { status: 400 },
    );
  }

  const formData = new FormData();
  formData.set("artistId", session.user.artistId);
  formData.set("file", file);

  const title = incomingFormData.get("title");
  const description = incomingFormData.get("description");
  const altText = incomingFormData.get("altText");
  const orderIndex = incomingFormData.get("orderIndex");
  const isFeatured = incomingFormData.get("isFeatured");
  const isBackground = incomingFormData.get("isBackground");

  if (typeof title === "string" && title.trim()) {
    formData.set("title", title);
  }

  if (typeof description === "string" && description.trim()) {
    formData.set("description", description);
  }

  if (typeof altText === "string" && altText.trim()) {
    formData.set("altText", altText);
  }

  if (typeof orderIndex === "string" && orderIndex.trim()) {
    formData.set("orderIndex", orderIndex);
  }

  if (typeof isFeatured === "string" && isFeatured.trim()) {
    formData.set("isFeatured", isFeatured);
  }

  if (typeof isBackground === "string" && isBackground.trim()) {
    formData.set("isBackground", isBackground);
  }

  const response = await fetch(new URL("/artworks/upload", serverEnv.apiBaseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    cache: "no-store",
  });

  const responseText = await response.text();

  return new NextResponse(responseText, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
