import { NextResponse } from "next/server";

import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

/**
 * This proxy keeps password changes behind the current HTTP-only artist
 * session, just like the other artist self-service routes.
 */
export async function POST(request: Request) {
  const token = await getArtistSessionToken();

  if (!token) {
    return NextResponse.json(
      {
        message: "Moras biti prijavljen kao umjetnik.",
      },
      { status: 401 },
    );
  }

  const payload = await request.text();

  const response = await fetch(new URL("/auth/artist/change-password", serverEnv.apiBaseUrl), {
    method: "POST",
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
