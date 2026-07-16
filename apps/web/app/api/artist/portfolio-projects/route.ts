import { NextRequest, NextResponse } from "next/server";

import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const token = await getArtistSessionToken();

  if (!token) {
    return NextResponse.json({ message: "Moras biti prijavljen kao umjetnik." }, { status: 401 });
  }

  const backendUrl = new URL("/portfolio-projects/me", serverEnv.apiBaseUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });

  const response = await fetch(backendUrl, {
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
