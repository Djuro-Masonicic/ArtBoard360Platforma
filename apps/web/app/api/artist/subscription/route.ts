import { NextResponse } from "next/server";

import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

export function GET() {
  return proxySubscriptionRequest("GET", "/artist-subscriptions/me");
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxySubscriptionRequest(
    "POST",
    "/artist-subscriptions/platinum-request",
    body,
  );
}

export function DELETE() {
  return proxySubscriptionRequest("DELETE", "/artist-subscriptions/platinum-request");
}

async function proxySubscriptionRequest(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: string,
) {
  const token = await getArtistSessionToken();

  if (!token) {
    return NextResponse.json(
      {
        message: "Moras biti prijavljen kao umjetnik.",
      },
      { status: 401 },
    );
  }

  const response = await fetch(new URL(path, serverEnv.apiBaseUrl), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body || undefined,
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
