import { serverEnv } from "@/lib/env";

export async function POST(request: Request) {
  const fail = (message: string, status: number) => Response.json({ message }, { status });
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return fail("Nedozvoljeno porijeklo zahtjeva.", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return fail("Zahtjev mora biti JSON.", 415);
  if (Number(request.headers.get("content-length")) > 24_576) return fail("Poruka je prevelika.", 413);
  const key = request.headers.get("idempotency-key") ?? "";
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key)) return fail("Neispravan identifikator poruke.", 400);
  try {
    const reader = request.body?.getReader(); if (!reader) return fail("Poruka je obavezna.", 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 24_576) { await reader.cancel(); return fail("Poruka je prevelika.", 413); } chunks.push(part.value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let body: unknown; try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { return fail("Neispravan zahtjev.", 400); }
    const response = await fetch(new URL("/contact", serverEnv.apiBaseUrl), { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(30_000) });
    const payload = await response.json();
    const headers: Record<string, string> = { "Cache-Control": "no-store" }; const retry = response.headers.get("retry-after"); if (retry) headers["Retry-After"] = retry;
    if (response.ok && payload.accepted === true) return Response.json({ accepted: true }, { headers });
    return Response.json({ message: response.status === 429 ? "Previše poruka. Pokušaj malo kasnije." : response.status === 400 ? "Provjeri unijete podatke." : "Poruka trenutno nije mogla biti poslata. Pokušaj ponovo." }, { status: response.status >= 400 ? response.status : 502, headers });
  } catch { return fail("Poruka trenutno nije mogla biti poslata. Pokušaj ponovo.", 503); }
}
