import { BadRequestException, Injectable } from "@nestjs/common";
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

    if (
      currentSubscription.plan === SubscriptionPlan.PLATINUM &&
      currentSubscription.status === SubscriptionStatus.ACTIVE
    ) {
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
    await this.ensureSubscription(artistAccountId);

    const subscription = await this.prisma.artistSubscription.update({
      where: {
        artistAccountId,
      },
      data: {
        requestedPlan: null,
        requestedAt: null,
      },
    });

    return this.serialize(subscription);
  }

  async completeDemoCheckout(
    artistAccountId: string,
    dto: CompleteDemoCheckoutDto,
  ) {
    const currentSubscription = await this.ensureSubscription(artistAccountId);

    if (
      currentSubscription.plan === SubscriptionPlan.PLATINUM &&
      currentSubscription.status === SubscriptionStatus.ACTIVE
    ) {
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

  private ensureSubscription(artistAccountId: string) {
    return this.prisma.artistSubscription.upsert({
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
