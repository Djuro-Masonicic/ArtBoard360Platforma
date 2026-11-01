import type { ArtistDashboardData, DeletionRequest, PaymentPage, AccountTheme } from "@/lib/artist-dashboard";
import type { Artist } from "@/types/api";
import { apiFetch, ApiError } from "./api";
import type { UpdateArtistProfilePayload } from "./artist-profile";
export const getArtistDashboard = (token: string) => apiFetch<ArtistDashboardData>("/artist/dashboard", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/artist/dashboard/${path}`, { ...init, cache: "no-store" });
  let data: unknown; try { data = await response.json(); } catch { throw new Error("Servis trenutno nije dostupan. Pokušaj ponovo."); }
  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data ? (data as { message: unknown }).message : "Zahtjev nije mogao biti sačuvan.";
    throw new ApiError(Array.isArray(message) ? message.join(" ") : String(message), response.status, data);
  }
  return data as T;
}
export const getAccountTheme = () => request<{ theme: AccountTheme }>("preferences");
export const saveAccountTheme = (theme: AccountTheme) => request<{ theme: AccountTheme }>("preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme }) });
export const requestArtistDeletion = (currentPassword: string) => request<DeletionRequest>("deletion-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword }) });
export const getDashboardPayments = (page: number) => request<PaymentPage>(`payments?page=${page}`);
export function saveDashboardProfile(payload: UpdateArtistProfilePayload, cover?: File | null) {
  const form = new FormData(); form.set("payload", JSON.stringify(payload)); if (cover) form.set("cover", cover);
  return request<Artist>("profile", { method: "PATCH", body: form });
}
