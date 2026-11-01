import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const response = await fetch(new URL("/opportunities/submit", serverEnv.apiBaseUrl), {
    method: "POST",
    body: formData,
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
