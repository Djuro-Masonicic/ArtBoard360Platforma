import { NextResponse } from "next/server";

import { getArtistSessionToken, getArtistSessionUser } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

/**
 * This proxy keeps artist profile updates tied to the logged-in artist session.
 * The browser never needs direct access to the HTTP-only artist token.
 */
export async function PATCH(request: Request) {
  const [token, session] = await Promise.all([getArtistSessionToken(), getArtistSessionUser()]);

  if (!token || !session) {
    return NextResponse.json(
      {
        message: "Moras biti prijavljen kao umjetnik.",
      },
      { status: 401 },
    );
  }

  const payload = await request.text();

  const response = await fetch(new URL(`/artists/${session.user.artistId}`, serverEnv.apiBaseUrl), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: payload,
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
