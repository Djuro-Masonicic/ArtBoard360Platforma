import { NextResponse } from "next/server";

import { getAdminSessionToken } from "@/lib/admin-session";
import { serverEnv } from "@/lib/env";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Admin actions run through a Next route handler because the admin auth token
 * is stored in an HTTP-only cookie. The browser should never receive that token.
 */
export async function POST(_request: Request, context: RouteContext) {
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

  const response = await fetch(
    new URL(`/admin/portfolio-projects/${id}/generate-pdf`, serverEnv.apiBaseUrl),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
