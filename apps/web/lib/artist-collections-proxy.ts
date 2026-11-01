import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function proxyArtistCollectionsRequest(request: Request, segments: string[]) {
  const method = request.method;
  const [id] = segments;
  const allowed = segments.length === 0 ? ["GET", "POST"].includes(method)
    : segments.length === 1 && ["order", "membership", "snapshot"].includes(id ?? "") ? method === "PUT"
    : segments.length === 1 && uuid.test(id ?? "") ? ["PATCH", "DELETE"].includes(method)
    : segments.length === 2 && uuid.test(id ?? "") && segments[1] === "cover" ? method === "POST"
    : segments.length === 3 && uuid.test(id ?? "") && segments[1] === "artworks" && segments[2] === "order" && method === "PUT";
  if (!allowed) return Response.json({ message: "Nepoznata operacija." }, { status: 404 });
  const origin = request.headers.get("origin");
  if (method !== "GET" && ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site")) {
    return Response.json({ message: "Nedozvoljen izvor zahtjeva." }, { status: 403 });
  }
  const token = await getArtistSessionToken();
  if (!token) return Response.json({ message: "Moraš biti prijavljen kao umjetnik." }, { status: 401 });
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const body = method === "GET" ? undefined : await request.arrayBuffer();
  if (body && body.byteLength > 11 * 1024 * 1024) return Response.json({ message: "Zahtjev je prevelik." }, { status: 413 });
  try {
    const response = await fetch(new URL(`/artist/collections${segments.length ? `/${segments.join("/")}` : ""}`, serverEnv.apiBaseUrl), {
      method, headers, body, cache: "no-store",
    });
    return new Response(await response.arrayBuffer(), { status: response.status, headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store",
    } });
  } catch {
    return Response.json({ message: "Servis kolekcija trenutno nije dostupan." }, { status: 503 });
  }
}
