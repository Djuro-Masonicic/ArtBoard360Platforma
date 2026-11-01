import { getArtistSessionToken } from "./artist-session";
import { apiFetch } from "@/services/api";
import type { PaymentContext } from "./payment-context";
export async function getPaymentContext(product: PaymentContext["product"], portfolioId?: string) {
  const token = await getArtistSessionToken();
  const query = new URLSearchParams({ product }); if (portfolioId) query.set("portfolioId", portfolioId);
  return apiFetch<PaymentContext>(`/portfolio-commerce/${token ? "checkout-context" : "checkout-public"}?${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
}
