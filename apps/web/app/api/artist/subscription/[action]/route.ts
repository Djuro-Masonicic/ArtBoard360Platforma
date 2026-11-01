import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!["cancel", "reactivate"].includes(action)) return Response.json({ message: "Nepoznata operacija." }, { status: 404 });
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ message: "Nedozvoljeno porijeklo zahtjeva." }, { status: 403 });
  const token = await getArtistSessionToken();
  if (!token) return Response.json({ message: "Prijavi se kao umjetnik." }, { status: 401 });
  const raw = await request.text();
  if (raw && raw.trim() !== "{}") return Response.json({ message: "Operacija ne prihvata podatke vlasnika ili pretplate." }, { status: 400 });
  try {
    const response = await fetch(new URL(`/artist-subscriptions/${action}`, serverEnv.apiBaseUrl), { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}", cache: "no-store" });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ message: "Servis trenutno nije dostupan. Pokušaj ponovo." }, { status: 503 });
  }
}
