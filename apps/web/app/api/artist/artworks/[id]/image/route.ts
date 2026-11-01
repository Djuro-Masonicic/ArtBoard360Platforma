import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = await getArtistSessionToken(); if (!token) return Response.json({ message: "Prijavi se kao umjetnik." }, { status: 401 });
  const { id } = await context.params; if (!/^[a-f0-9-]{36}$/i.test(id)) return Response.json({ message: "Neispravan rad." }, { status: 400 });
  const response = await fetch(new URL(`/artworks/${id}/image`, serverEnv.apiBaseUrl), { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: await request.formData(), cache: "no-store" });
  return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
}
