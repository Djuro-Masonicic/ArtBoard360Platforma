export type SubscriptionState = "ACTIVE" | "CANCELED_PENDING_EXPIRY" | "PAYMENT_FAILED" | "EXPIRED" | "FREE";
export interface SubscriptionOverview {
  state: SubscriptionState;
  effectivePlan: "PREMIUM" | "FREE";
  revision: string | null;
  account: { createdAt: string; email: string };
  billing: {
    subscriptionId: string | null; provider: string | null; cancelAtPeriodEnd: boolean;
    activatedAt: string | null; periodStart: string | null; periodEnd: string | null; accessUntil: string | null;
    lastPremiumStart: string | null; lastPremiumEnd: string | null;
    monthlyAmountCents: number | null; pendingAmountCents: number | null; pendingAmountEffectiveAt: string | null;
    paymentMethod: { brand: string; last4: string } | null;
    lastFailedAt: string | null; failedAmountCents: number | null; nextRetryAt: string | null;
  };
  usage: {
    portfolio: { known: boolean; limit: number; used: number; reserved: number; remaining: number; periodEnd: string | null };
    instagram: { known: boolean; limit: number; used: number | null; periodEnd: string | null; reserved?:number; purchased?:number; remaining?:number };
    qr: { known: boolean; available: boolean | null };
  };
  capabilities: { canCancel: boolean; canReactivate: boolean; canChangeAmount: boolean; canUpdatePaymentMethod: boolean; providerConnected: boolean; generatorConnected: boolean };
  prices: { premiumMinimumCents: number; extraExportCents: number; instagramPackCents: number; currency: string };
  limitations: string[];
}
export const subscriptionDate = (value: string | null, short = false) => {
  if (!value || !Number.isFinite(Date.parse(value))) return "Nije evidentirano";
  return new Intl.DateTimeFormat("sr-Latn-ME", { day: "numeric", month: "numeric", ...(short ? {} : { year: "numeric" as const }), timeZone: "Europe/Podgorica" }).format(new Date(value));
};
export const subscriptionMoney = (cents: number) => new Intl.NumberFormat("sr-Latn-ME", { style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
