import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";
const uuid =
  "[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}";
async function proxy(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const parts = (await context.params).path || [],
    path = parts.join("/"),
    method = request.method;
  if (!(
    (path === "" && method === "GET") ||
    (path === "draft" && method === "PUT") ||
    (path === "generations" && method === "POST") ||
    (path === "purchases" && method === "POST") ||
    (new RegExp(
      `^generations/${uuid}(/download/(bundle|thumbnail|[0-9]|10))?$`,
      "i",
    ).test(path) &&
      method === "GET")
  ))
    return Response.json({ message: "Ruta nije dostupna." }, { status: 404 });
  const origin = request.headers.get("origin");
  if (
    method !== "GET" &&
    ((origin && origin !== new URL(request.url).origin) ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    return Response.json({ message: "Nedozvoljen zahtjev." }, { status: 403 });
  const token = await getArtistSessionToken();
  if (!token)
    return Response.json(
      { message: "Prijavi se kao umjetnik." },
      { status: 401 },
    );
  try {
    const body = method === "GET" ? undefined : await request.text();
    if (body && body.length > 12000)
      return Response.json(
        { message: "Zahtjev je prevelik." },
        { status: 413 },
      );
    const target = new URL(
      `/artist/promotions${path ? `/${path}` : ""}`,
      serverEnv.apiBaseUrl,
    );
    if (!path)
      target.searchParams.set(
        "page",
        new URL(request.url).searchParams.get("page") || "1",
      );
    const r = await fetch(target, {
        method,
        body,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(115000),
      }),
      headers = new Headers({
        "Content-Type": r.headers.get("content-type") || "application/json",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
    if (r.headers.has("content-disposition"))
      headers.set("Content-Disposition", r.headers.get("content-disposition")!);
    return new Response(r.body, { status: r.status, headers });
  } catch {
    return Response.json(
      {
        message:
          "Servis trenutno nije dostupan. Provjeri istoriju prije ponavljanja izvoza.",
      },
      { status: 503 },
    );
  }
}
export const GET = proxy,
  PUT = proxy,
  POST = proxy;
