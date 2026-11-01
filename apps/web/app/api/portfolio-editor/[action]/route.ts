import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";
async function proxy(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!(request.method === "GET" ? action === "from-profile" : ["save", "preview", "test-export"].includes(action))) return new Response(null, { status: 404 });
  const origin = request.headers.get("origin"); if (request.method !== "GET" && origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const token = await getArtistSessionToken(); if (!token) return Response.json({ message: "Prijavi se kao umjetnik." }, { status: 401 });
  const headers = new Headers({ Authorization: `Bearer ${token}` }); const type = request.headers.get("content-type"); if (type) headers.set("Content-Type", type);
  const result = await fetch(`${serverEnv.apiBaseUrl}/portfolio-projects/editor/${action}`, { method: request.method, headers, cache: "no-store", ...(request.method === "POST" ? { body: await request.arrayBuffer() } : {}) });
  const out = new Headers({ "Cache-Control": "no-store" }); for (const key of ["Content-Type", "Content-Disposition", "X-Portfolio-Page-Count", "X-Content-Type-Options"]) { const value = result.headers.get(key); if (value) out.set(key, value); }
  return new Response(await result.arrayBuffer(), { status: result.status, headers: out });
}
export const GET = proxy;
export const POST = proxy;
