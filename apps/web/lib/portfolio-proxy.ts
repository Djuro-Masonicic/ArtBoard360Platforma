import { getArtistSessionToken } from "@/lib/artist-session";
import { serverEnv } from "@/lib/env";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export async function proxyPortfolioRequest(request: Request, id: string, operation = "") {
  const method = request.method;
  const ownerOperation = (operation === "share" && ["POST", "DELETE"].includes(method)) || (method === "GET" && (operation === "versions" || operation === "download-pdf" || (/^versions\/[a-f0-9-]{36}\/pdf$/i.test(operation) && uuid.test(operation.split("/")[1]!))));
  const collectionOperation = operation.startsWith("collections/");
  const collectionPath = operation.slice("collections/".length);
  const collectionAllowed = collectionOperation && (
    (["catalog", "source-changes"].includes(collectionPath) && method === "GET") ||
    (["commands", "preview-pdf"].includes(collectionPath) && method === "POST") ||
    (/^[a-f0-9-]{36}\/publish-plan$/i.test(collectionPath) && uuid.test(collectionPath.split("/")[0]!) && method === "GET") ||
    (/^[a-f0-9-]{36}\/cover$/i.test(collectionPath) && uuid.test(collectionPath.split("/")[0]!) && method === "POST")
  );
  const allowed = operation === ""
    ? method === "GET" || method === "PATCH"
    : operation.startsWith("artworks/") && uuid.test(operation.slice(9))
      ? method === "PATCH"
      : ["artworks/upload", "profile-image", "cover-image", "collection-cover", "demo-payment", "generate-pdf", "share"].includes(operation)
        ? method === "POST"
        : operation === "cover-test-pdf" && method === "GET";
  if (!uuid.test(id) || !(allowed || collectionAllowed || ownerOperation)) return Response.json({ message: "Unknown portfolio operation." }, { status: 404 });

  const origin = request.headers.get("origin");
  if (method !== "GET" && origin && origin !== new URL(request.url).origin) {
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  }

  const token = await getArtistSessionToken();
  if ((collectionOperation || ownerOperation) && !token) return Response.json({ message: "Artist authentication is required." }, { status: 401 });
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (operation === "generate-pdf") {
    const key = request.headers.get("idempotency-key"); if (key && uuid.test(key)) headers.set("Idempotency-Key", key);
  }
  const route = collectionOperation || ownerOperation ? `/portfolio-projects/me/${id}/${operation}`
    : `/portfolio-projects/public/${id}${operation ? `/${operation}` : ""}`;
  const url = new URL(route, serverEnv.apiBaseUrl);
  if (operation === "versions") for (const key of ["page", "pageSize"]) {
    const value = new URL(request.url).searchParams.get(key); if (value !== null) url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    method, headers, cache: "no-store",
    ...(method !== "GET" ? { body: await request.arrayBuffer() } : {}),
  });
  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["Content-Type", "Content-Disposition", "X-Portfolio-Page-Count", "X-Content-Type-Options"]) {
    const value = response.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  // Keep PDF delivery streamed: buffering the full file hits Vercel's response limit.
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}
