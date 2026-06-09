import { NextResponse } from "next/server";

import { getAdminSessionToken } from "@/lib/admin-session";
import { serverEnv } from "@/lib/env";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Client-side admin editors cannot read the HTTP-only auth cookie directly.
 * This proxy route reads the cookie on the server and forwards the request
 * to the NestJS API with the proper Authorization header.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const token = await getAdminSessionToken();

  if (!token) {
    return NextResponse.json(
      {
        message: "Moras biti prijavljen kao administrator.",
      },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const payload = await request.text();

  const response = await fetch(new URL(`/artist-submissions/${id}`, serverEnv.apiBaseUrl), {
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
