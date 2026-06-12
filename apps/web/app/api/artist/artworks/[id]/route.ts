import { NextResponse } from "next/server";

import { getArtistSessionToken, getArtistSessionUser } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Deleting artworks is also funneled through the artist session so the client
 * can only act on the current logged-in account.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const [token, session] = await Promise.all([getArtistSessionToken(), getArtistSessionUser()]);

  if (!token || !session) {
    return NextResponse.json(
      {
        message: "Moras biti prijavljen kao umjetnik.",
      },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  const response = await fetch(new URL(`/artworks/${id}`, serverEnv.apiBaseUrl), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      artistId: session.user.artistId,
      deleteFromStorage: true,
    }),
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
