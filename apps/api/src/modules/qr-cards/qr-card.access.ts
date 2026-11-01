import type { Prisma } from "@prisma/client";
import {
  hasPremiumAccess,
  subscriptionState,
} from "../artist-subscriptions/subscription-access";
export async function qrEntitlement(
  tx: Prisma.TransactionClient,
  owner: string,
  subscription: Parameters<typeof hasPremiumAccess>[0],
) {
  const premium = hasPremiumAccess(subscription);
  const used = await tx.qrCardExport.count({
    where: { artistAccountId: owner, status: "READY", kind: "FREE" },
  });
  const processing = await tx.qrCardExport.count({
    where: {
      artistAccountId: owner,
      status: "PROCESSING",
      expiresAt: { gt: new Date() },
    },
  });
  const wasPremium =
    !premium &&
    (await tx.qrCardExport.count({
      where: { artistAccountId: owner, status: "READY", kind: "PREMIUM" },
    })) > 0;
  const former = subscriptionState(subscription) === "EXPIRED" || wasPremium;
  return {
    state: premium
      ? "PREMIUM"
      : former
        ? "FORMER_PREMIUM"
        : used
          ? "FREE_USED"
          : "FREE_AVAILABLE",
    premium,
    available: premium || (!former && !used),
    processing: processing > 0,
  };
}
