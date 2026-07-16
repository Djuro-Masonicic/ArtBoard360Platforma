import { NextRequest, NextResponse } from "next/server";

import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const token = await getArtistSessionToken();

  if (!token) {
    return NextResponse.json({ message: "Moras biti prijavljen kao umjetnik." }, { status: 401 });
  }

  const { id } = await context.params;
  const response = await fetch(new URL(`/portfolio-projects/me/${id}`, serverEnv.apiBaseUrl), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: "DELETE",
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
