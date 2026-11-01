import type { Artist, Discipline } from "@/types/api";
import type { SubscriptionOverview } from "./subscription-overview";
export type AccountTheme = "light" | "dark";
export type DeletionRequest = { id: string; status: string; createdAt: string; dueAt: string; emailConfirmed: boolean };
export type DashboardPayment = { id: string; product: string; amountCents: number; currency: string; status: string; paidAt: string | null; createdAt: string; receiptUrl: string | null };
export type PaymentPage = { items: DashboardPayment[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };
export interface ArtistDashboardData {
  artist: Artist;
  preferences: { theme: AccountTheme };
  subscription: SubscriptionOverview;
  payments: PaymentPage;
  deletionRequest: DeletionRequest | null;
  disciplines: Discipline[];
}
export const dashboardWords = (text: string) => text.trim().split(/\s+/u).filter(Boolean).length;
export const artworkFileTitle = (fileName: string) => fileName.replace(/\.[^.]+$/u, "").trim().slice(0, 180) || "Bez naziva";
export function dashboardCompletion(artist: Artist) {
  const checks = [Boolean(artist.profileImageUrl || artist.profileThumbnailUrl), Boolean(artist.bio?.trim()), artist.socialLinks.length > 0,
    artist.artworks.some(w => w.isFeatured), Boolean(artist.coverImageUrl || artist.artworks.some(w => w.isBackground)), artist.disciplines.length > 0 && artist.disciplines.length <= 3];
  return { checks, percent: Math.round(checks.filter(Boolean).length / checks.length * 100), ready: checks.every(Boolean) && !artist.isDraft && !artist.isArchived };
}
