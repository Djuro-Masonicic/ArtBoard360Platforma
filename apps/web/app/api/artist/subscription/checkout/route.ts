import { NextResponse } from "next/server";

import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

export async function POST(request: Request) {
  const token = await getArtistSessionToken();

  if (!token) {
    return NextResponse.json(
      { message: "Moras biti prijavljen kao umjetnik." },
      { status: 401 },
    );
  }

  const response = await fetch(
    new URL("/artist-subscriptions/demo-checkout", serverEnv.apiBaseUrl),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: await request.text(),
      cache: "no-store",
    },
  );

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
