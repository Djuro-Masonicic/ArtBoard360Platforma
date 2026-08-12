import { NextResponse } from "next/server";

import { getAdminSessionToken } from "@/lib/admin-session";
import { serverEnv } from "@/lib/env";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Admin proxy for opportunity edits.
 *
 * It mirrors the backend PATCH endpoint, but keeps auth cookie handling inside
 * Next.js where the HTTP-only cookie is available.
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

  const response = await fetch(new URL(`/opportunities/${id}`, serverEnv.apiBaseUrl), {
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

export async function DELETE(_request: Request, context: RouteContext) {
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

  const response = await fetch(new URL(`/opportunities/${id}`, serverEnv.apiBaseUrl), {
    method: "DELETE",
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
