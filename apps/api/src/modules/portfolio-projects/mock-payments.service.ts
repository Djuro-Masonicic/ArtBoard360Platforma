import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPaymentsEnabled } from '../../config/mock-payments';
import { hasPremiumAccess } from '../artist-subscriptions/subscription-access';
import { PromotionPurchaseService } from '../promotions/promotion-purchase.service';
import { PortfolioCommerceService } from './portfolio-commerce.service';
import { premiumMonthlyAmounts } from './portfolio-prices';

export type MockOutcome = 'success' | 'failure' | 'cancel';
@Injectable()
export class MockPaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly commerce: PortfolioCommerceService, private readonly promotions: PromotionPurchaseService) {}
  requireEnabled() { if (!mockPaymentsEnabled()) throw new NotFoundException(); }

  private async settle(id: string, outcome: MockOutcome) {
    this.requireEnabled();
    const purchase = await this.prisma.portfolioPurchase.findUnique({ where: { id } });
    if (!purchase || !['PORTFOLIO', 'CV', 'GENERATOR_PACK'].includes(purchase.product)) throw new NotFoundException();
    if (purchase.provider && !['allsecure-pending', 'mock'].includes(purchase.provider)) throw new ConflictException('Ova narudžbina ne pripada testnom plaćanju.');
    const proof = { purchaseId: id, provider: 'mock', eventId: `mock:${id}:${outcome}`, paymentRef: `mock:${id}`, amountCents: purchase.amountCents, currency: purchase.currency,
      payloadHash: createHash('sha256').update(JSON.stringify([id, outcome, purchase.amountCents, purchase.currency])).digest('hex') };
    const result = outcome === 'success' ? await this.commerce.confirmVerifiedPayment(proof) : await this.commerce.recordVerifiedPaymentFailure(proof);
    return { ...result, mock: true, outcome, message: result.status === 'PAID' ? 'Testna uplata je potvrđena. Stvarni novac nije naplaćen.' : outcome === 'cancel' ? 'Testno plaćanje je otkazano. Ništa nije otključano niti naplaćeno.' : 'Testna uplata je odbijena. Ništa nije otključano niti naplaćeno.' };
  }

  async portfolio(id: string, secret: string, outcome: MockOutcome) {
    this.requireEnabled();
    // The UUID alone is insufficient, including in the simulator. Revoked and
    // expired delivery grants must never authorize a mock payment.
    await this.commerce.checkoutSnapshot(id, secret);
    return this.settle(id, outcome);
  }

  async generator(owner: string, operationKey: string, outcome: MockOutcome) {
    this.requireEnabled();
    const purchase = await this.promotions.intent(owner, operationKey);
    return this.settle(purchase.id, outcome);
  }

  async premium(owner: string, operationKey: string, amountCents: number, outcome: MockOutcome) {
    this.requireEnabled();
    if (!premiumMonthlyAmounts.includes(amountCents)) throw new BadRequestException('Izaberi ponuđeni mjesečni iznos.');
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "ArtistAccount" WHERE id=${owner}::uuid FOR UPDATE`;
      const account = await tx.artistAccount.findUnique({ where: { id: owner } });
      if (!account?.isActive) throw new NotFoundException();
      await this.commerce.lockForFinalization(tx, owner);
      const current = await tx.artistSubscription.findUnique({ where: { artistAccountId: owner } });
      // A retry cannot extend or replace an existing subscription period.
      if (hasPremiumAccess(current) || current?.providerSubscriptionId === `mock-${operationKey}`) return { status: hasPremiumAccess(current) ? 'PAID' : 'EXPIRED', mock: true, outcome, message: 'Testni zahtjev je već obrađen; period članstva nije produžen.' };
      if (current?.provider && !['mock','demo-card'].includes(current.provider)) throw new ConflictException('Postojeću evidenciju drugog procesora nije moguće zamijeniti testnom uplatom.');
      if (outcome !== 'success') return { status: 'FAILED', mock: true, outcome, message: outcome === 'cancel' ? 'Testna aktivacija je otkazana. Ništa nije naplaćeno.' : 'Testna uplata je odbijena. Premium nije aktiviran.' };
      const start = new Date(), end = new Date(start);end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1);const last = new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(start.getUTCDate(),last));
      const data = { plan: 'PLATINUM' as const, status: 'ACTIVE' as const, requestedPlan: null, requestedAt: null, currentPeriodStart: start, currentPeriodEnd: end, cancelAtPeriodEnd: false, canceledAt: null, provider: 'mock', providerCustomerId: null, providerSubscriptionId: `mock-${operationKey}` };
      await tx.artistSubscription.upsert({ where: { artistAccountId: owner }, create: { artistAccountId: owner, ...data }, update: data });
      return { status: 'PAID', mock: true, outcome, amountCents, message: 'Testni Premium je aktiviran na mjesec dana. Nema stvarne ni automatske naplate.' };
    });
  }
}
