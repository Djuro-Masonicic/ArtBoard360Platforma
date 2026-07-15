import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";

export async function POST(request: Request) {
  const response = await fetch(new URL("/auth/artist/reset-password", serverEnv.apiBaseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: await request.text(),
    cache: "no-store",
  });

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
