type Subscription = { plan: string; status: string; currentPeriodStart: Date; currentPeriodEnd: Date | null; cancelAtPeriodEnd?: boolean; canceledAt?: Date | null };
export type SubscriptionState = "ACTIVE" | "CANCELED_PENDING_EXPIRY" | "PAYMENT_FAILED" | "EXPIRED" | "FREE";
export function canManageLocalSubscription(s: { provider: string | null; providerCustomerId: string | null; providerSubscriptionId: string | null } | null) {
  return Boolean(s && !s.providerCustomerId && ((!s.provider || s.provider === "demo-card") && !s.providerSubscriptionId || s.provider === 'mock' && /^mock-[a-f0-9-]{36}$/i.test(s.providerSubscriptionId ?? '')));
}
export function hasPremiumAccess(s: Subscription | null | undefined, now = new Date()) {
  return Boolean(s && s.plan === "PLATINUM" && ["ACTIVE", "PAST_DUE", "CANCELED"].includes(s.status) && s.currentPeriodStart <= now && s.currentPeriodEnd && s.currentPeriodEnd > now);
}
export function subscriptionState(s: Subscription | null | undefined, now = new Date()): SubscriptionState {
  if (hasPremiumAccess(s, now)) {
    if (s!.cancelAtPeriodEnd || s!.status === "CANCELED") return "CANCELED_PENDING_EXPIRY";
    return s!.status === "PAST_DUE" ? "PAYMENT_FAILED" : "ACTIVE";
  }
  return s && (s.plan === "PLATINUM" || s.status === "EXPIRED" || s.canceledAt) ? "EXPIRED" : "FREE";
}
export function subscriptionQuotaWindow(s: Subscription | null, now = new Date()) {
  if (!s || !hasPremiumAccess(s, now)) return null;
  const anchor = s.currentPeriodStart;
  const at = (months: number) => {
    const result = new Date(anchor); result.setUTCDate(1); result.setUTCMonth(anchor.getUTCMonth() + months);
    const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(anchor.getUTCDate(), last)); return result;
  };
  let months = (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + now.getUTCMonth() - anchor.getUTCMonth();
  if (at(months) > now) months--;
  const end = at(months + 1);
  return { start: at(months), end: end < s.currentPeriodEnd! ? end : s.currentPeriodEnd! };
}
