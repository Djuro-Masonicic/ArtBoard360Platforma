import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";

export async function POST(request: Request) {
  return proxyAuthRequest(request, "/auth/artist/forgot-password");
}

async function proxyAuthRequest(request: Request, path: string) {
  const response = await fetch(new URL(path, serverEnv.apiBaseUrl), {
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
