import { apiFetch } from "./api";
import type { QrCardState } from "@/lib/qr-cards";
export function getQrCards(token: string) {
  return apiFetch<QrCardState>("/artist/qr-cards", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
export async function qrRequest<T>(
  path = "",
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch(`/api/artist/qr-cards${path}`, {
    method,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => null);
  if (!r.ok)
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : "Servis trenutno nije dostupan. Pokušaj ponovo.",
    );
  return data as T;
}
