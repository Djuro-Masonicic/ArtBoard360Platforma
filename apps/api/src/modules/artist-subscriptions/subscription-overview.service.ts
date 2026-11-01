import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PortfolioCommerceService } from "../portfolio-projects/portfolio-commerce.service";
import { portfolioPrices, premiumMonthlyAmounts } from "../portfolio-projects/portfolio-prices";
import { canManageLocalSubscription, hasPremiumAccess, subscriptionState, subscriptionQuotaWindow } from "./subscription-access";
import { qrEntitlement } from "../qr-cards/qr-card.access";
import { promotionUsage } from "../promotions/promotion.access";
@Injectable()
export class SubscriptionOverviewService {
  constructor(private readonly prisma: PrismaService, private readonly commerce: PortfolioCommerceService) {}
  async get(owner: string) {
    return this.prisma.$transaction(async tx => {
    const now = new Date();
    const account = await tx.artistAccount.findUnique({ where: { id: owner }, include: { subscription: true } });
    if (!account?.isActive) throw new NotFoundException("Nalog nije pronađen.");
    const s = account.subscription, state = subscriptionState(s, now), premium = hasPremiumAccess(s, now), quota = await this.commerce.entitlement(owner, tx, now);
    const local = canManageLocalSubscription(s);
    const window = subscriptionQuotaWindow(s, now);
    const qr = await qrEntitlement(tx, owner, s);
    const generatorReady = (await tx.$queryRaw<Array<{ready:boolean}>>`SELECT to_regclass('public."PromotionGeneration"') IS NOT NULL AS ready`)[0]?.ready;
    const instagram = generatorReady ? { known:true,...await promotionUsage(tx,owner,s,now) } : { known:false,limit:premium?10:1,used:null,periodEnd:null };
    return {
      state, effectivePlan: premium ? "PREMIUM" : "FREE", revision: s?.updatedAt.toISOString() ?? null,
      account: { createdAt: account.createdAt, email: account.email },
      billing: { subscriptionId: s?.id ?? null, provider: s?.provider ?? null, cancelAtPeriodEnd: s?.cancelAtPeriodEnd ?? false,
        activatedAt: null, periodStart: window?.start ?? s?.currentPeriodStart ?? null, periodEnd: window?.end ?? s?.currentPeriodEnd ?? null,
        accessUntil: premium ? s?.currentPeriodEnd : null, lastPremiumStart: state === "EXPIRED" && s?.plan === "PLATINUM" ? s.currentPeriodStart : null,
        lastPremiumEnd: state === "EXPIRED" ? s?.currentPeriodEnd ?? null : null,
        monthlyAmountCents: null, pendingAmountCents: null, pendingAmountEffectiveAt: null,
        paymentMethod: null, lastFailedAt: null, failedAmountCents: null, nextRetryAt: null },
      usage: { portfolio: { known: true, limit: quota.limit, used: quota.used, reserved: quota.reserved, remaining: quota.remaining, periodEnd: quota.periodEnd },
        instagram, qr: { known: true, available: qr.available } },
      capabilities: { canCancel: premium && state !== "CANCELED_PENDING_EXPIRY" && local,
        canReactivate: premium && state === "CANCELED_PENDING_EXPIRY" && local,
        canChangeAmount: false, canUpdatePaymentMethod: false, providerConnected: false, generatorConnected: Boolean(generatorReady) },
      prices: { premiumMinimumCents: premiumMonthlyAmounts[0], extraExportCents: portfolioPrices.extraExportCents, instagramPackCents: 490, currency: "EUR" },
      limitations: ["Promjena iznosa i kartice biće dostupna kada se aktivira kartično plaćanje.", "Podaci o iznosu članstva i načinu plaćanja trenutno nijesu dostupni.", ...(!generatorReady?["Instagram potrošnja trenutno nije dostupna."]:[])],
    };
    }, { isolationLevel: "RepeatableRead" });
  }
}
