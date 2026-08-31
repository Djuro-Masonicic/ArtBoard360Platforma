import { NextResponse } from "next/server";

import { getArtistSessionToken, getArtistSessionUser } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

/**
 * Browser-safe proxy for applying to an opportunity.
 *
 * The public `/oglasi` page can call this route from the browser. This route
 * then reads the artist session from the secure HTTP-only cookie and forwards
 * the authenticated request to the Nest API. That keeps auth details out of
 * client-side JavaScript.
 */
export async function POST(_request: Request, context: RouteContext) {
  const [{ id }, token, session] = await Promise.all([
    Promise.resolve(context.params),
    getArtistSessionToken(),
    getArtistSessionUser(),
  ]);

  if (!token || !session) {
    return NextResponse.json(
      {
        message:
          "Moras biti prijavljen/a kao umjetnik da bi se prijavio/la na oglas.",
      },
      { status: 401 },
    );
  }

  const response = await fetch(new URL(`/opportunities/${id}/apply`, serverEnv.apiBaseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
