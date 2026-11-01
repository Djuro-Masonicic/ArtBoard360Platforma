import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";
const allowed: Record<string, string[]> = { preferences: ["GET", "PATCH"], payments: ["GET"], profile: ["PATCH"], "deletion-request": ["POST"] };
async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!allowed[path]?.includes(request.method)) return Response.json({ message: "Ruta nije dostupna." }, { status: 404 });
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin && origin !== new URL(request.url).origin) return Response.json({ message: "Nedozvoljen zahtjev." }, { status: 403 });
  const token = await getArtistSessionToken(); if (!token) return Response.json({ message: "Prijavi se kao umjetnik." }, { status: 401 });
  try {
    const multipart = request.headers.get("content-type")?.includes("multipart/form-data"), headers: Record<string,string> = { Authorization: `Bearer ${token}` };
    let body: BodyInit | undefined;
    if (request.method !== "GET") { if (multipart) body = await request.formData(); else { headers["Content-Type"] = "application/json"; body = await request.text(); } }
    const target = new URL(`/artist/dashboard/${path}`, serverEnv.apiBaseUrl); if (path === "payments") target.searchParams.set("page", new URL(request.url).searchParams.get("page") || "1");
    const response = await fetch(target, { method: request.method, headers, body, cache: "no-store" });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ message: "Servis trenutno nije dostupan. Unos je sačuvan u ovoj stranici." }, { status: 503 }); }
}
export const GET = proxy, PATCH = proxy, POST = proxy;
