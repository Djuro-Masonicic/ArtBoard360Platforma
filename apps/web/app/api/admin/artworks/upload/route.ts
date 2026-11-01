import { NextResponse } from "next/server";

import { getAdminSessionToken, getAdminSessionUser } from "@/lib/admin-session";
import { serverEnv } from "@/lib/env";

export async function POST(request: Request) {
  const [token, session] = await Promise.all([getAdminSessionToken(), getAdminSessionUser()]);
  if (!token || !session) {
    return NextResponse.json({ message: "Moras biti prijavljen kao administrator." }, { status: 401 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Nedozvoljeno porijeklo zahtjeva." }, { status: 403 });
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Rad koji uploadujes mora biti fajl." }, { status: 400 });
  }
  const formData = new FormData();
  formData.set("file", file);
  for (const field of ["artistId", "title", "description", "altText", "orderIndex", "isFeatured", "isBackground"]) {
    const value = incoming.get(field);
    if (typeof value === "string") formData.set(field, value);
  }
  const response = await fetch(new URL("/admin/artworks/upload", serverEnv.apiBaseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    cache: "no-store",
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}
