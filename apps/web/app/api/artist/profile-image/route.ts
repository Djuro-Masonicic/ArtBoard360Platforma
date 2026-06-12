import { NextResponse } from "next/server";

import { getArtistSessionToken, getArtistSessionUser } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

/**
 * Profile image uploads are forwarded through Next so the current artist
 * session can authorize the request without exposing cookies to the browser.
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
        message: "Profilna slika je obavezna.",
      },
      { status: 400 },
    );
  }

  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch(
    new URL(`/artists/${session.user.artistId}/profile-image`, serverEnv.apiBaseUrl),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      cache: "no-store",
    },
  );

  const responseText = await response.text();

  return new NextResponse(responseText, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
