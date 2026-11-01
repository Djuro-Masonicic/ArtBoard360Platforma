import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { canManageLocalSubscription, hasPremiumAccess } from "./subscription-access";
import { env } from "../../config/env";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { CompleteDemoCheckoutDto } from "./artist-subscriptions.dto";

@Injectable()
export class ArtistSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForArtistAccount(artistAccountId: string) {
    const subscription = await this.ensureSubscription(artistAccountId);
    return this.serialize(subscription);
  }

  async requestPlatinum(artistAccountId: string) {
    const currentSubscription = await this.ensureSubscription(artistAccountId);

    if (hasPremiumAccess(currentSubscription)) {
      throw new BadRequestException("Platinum pretplata je vec aktivna.");
    }

    const subscription = await this.prisma.artistSubscription.update({
      where: {
        artistAccountId,
      },
      data: {
        requestedPlan: SubscriptionPlan.PLATINUM,
        requestedAt: currentSubscription.requestedAt ?? new Date(),
      },
    });

    return this.serialize(subscription);
  }

  async cancelPlatinumRequest(artistAccountId: string) {
    return this.setRenewal(artistAccountId, false, true);
  }

  async setRenewal(artistAccountId: string, renew: boolean, allowRequestOnly = false) {
    return this.prisma.$transaction(async tx => {
      // Serialize against exports as well as other membership operations.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`portfolio-quota:${artistAccountId}`},0))`;
      const current = await tx.artistSubscription.findUnique({ where: { artistAccountId } });
      if (!current || !hasPremiumAccess(current)) {
        if (allowRequestOnly && current) return this.serialize(await tx.artistSubscription.update({ where: { artistAccountId }, data: { requestedPlan: null, requestedAt: null } }));
        throw new BadRequestException("Nema aktivnog Premium perioda.");
      }
      // A local flag cannot cancel a remote recurring charge. Fail closed until
      // a verified provider adapter can confirm the operation.
      if (!canManageLocalSubscription(current)) throw new ServiceUnavailableException("Upravljanje naplatom još nije povezano. Obnavljanje nije promijenjeno.");
      const canceled = current.cancelAtPeriodEnd || current.status === SubscriptionStatus.CANCELED;
      if (canceled === !renew) return this.serialize(current);
      return this.serialize(await tx.artistSubscription.update({ where: { artistAccountId }, data: {
        cancelAtPeriodEnd: !renew, canceledAt: renew ? null : new Date(), requestedPlan: null, requestedAt: null,
        ...(renew && current.status === SubscriptionStatus.CANCELED ? { status: SubscriptionStatus.ACTIVE } : {}),
      } }));
    });
  }

  async completeDemoCheckout(
    artistAccountId: string,
    dto: CompleteDemoCheckoutDto,
  ) {
    if (env.nodeEnv === "production") throw new ForbiddenException("Demo pretplata nije dostupna u produkciji.");
    const currentSubscription = await this.ensureSubscription(artistAccountId);

    if (hasPremiumAccess(currentSubscription)) {
      throw new BadRequestException("Platinum pretplata je vec aktivna.");
    }

    // This endpoint deliberately accepts only a demo token. Card numbers and
    // security codes are validated in the UI and are never sent or stored.
    if (dto.paymentToken !== "demo_card_approved") {
      throw new BadRequestException("Testna uplata nije odobrena.");
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await this.prisma.artistSubscription.update({
      where: {
        artistAccountId,
      },
      data: {
        plan: SubscriptionPlan.PLATINUM,
        status: SubscriptionStatus.ACTIVE,
        requestedPlan: null,
        requestedAt: null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        provider: "demo-card",
        providerCustomerId: null,
        providerSubscriptionId: null,
      },
    });

    return this.serialize(subscription);
  }

  private async ensureSubscription(artistAccountId: string) {
    const subscription = await this.prisma.artistSubscription.upsert({
      where: {
        artistAccountId,
      },
      create: {
        artistAccountId,
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      },
      update: {},
    });

    // Expiry changes effective access, not the historical billing record.
    return subscription;
  }

  private serialize(subscription: {
    id: string;
    artistAccountId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    requestedPlan: SubscriptionPlan | null;
    requestedAt: Date | null;
    currentPeriodStart: Date;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
    provider: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: subscription.id,
      artistAccountId: subscription.artistAccountId,
      plan: subscription.plan,
      status: subscription.status,
      requestedPlan: subscription.requestedPlan,
      requestedAt: subscription.requestedAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
      provider: subscription.provider,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}
