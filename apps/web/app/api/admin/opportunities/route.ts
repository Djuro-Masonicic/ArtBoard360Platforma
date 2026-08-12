import { NextResponse } from "next/server";

import { getAdminSessionToken } from "@/lib/admin-session";
import { serverEnv } from "@/lib/env";

/**
 * Admin proxy for creating opportunities.
 *
 * The client editor sends JSON here. This route reads the secure admin cookie
 * and forwards the request to NestJS with the Authorization header attached.
 */
export async function POST(request: Request) {
  const token = await getAdminSessionToken();

  if (!token) {
    return NextResponse.json(
      {
        message: "Moras biti prijavljen kao administrator.",
      },
      { status: 401 },
    );
  }

  const payload = await request.text();

  const response = await fetch(new URL("/opportunities", serverEnv.apiBaseUrl), {
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
