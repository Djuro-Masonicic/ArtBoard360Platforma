import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createHash } from "node:crypto";
import { creditPromotionPurchase } from "../promotions/promotion-purchase.service";
import { Prisma, ArtistSubscription } from "@prisma/client";
import { buildPortfolioDocumentPlan } from "@artboard/portfolio-document-plan";
import { PrismaService } from "../../prisma/prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import { generatePortfolioPdf } from "./portfolio-pdf.generator";
import { portfolioPrices } from "./portfolio-prices";
import { subscriptionQuotaWindow } from "../artist-subscriptions/subscription-access";
import { mockPaymentsEnabled } from '../../config/mock-payments';

export const contentHash = (value: unknown) => {
  // Rendering timestamps are frozen in the manifest but aren't editable content.
  const content = value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([key]) => !["createdAt", "updatedAt"].includes(key))) : value;
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const contentFields = ["id", "artistName", "title", "discipline", "location", "email", "phone", "dateOfBirth", "behanceUrl", "motto", "mottoAuthor", "websiteUrl", "instagramUrl", "artboardProfileUrl", "profileImageUrl", "coverImageUrl", "collectionCoverUrl", "collectionName", "collectionYear", "collectionDescription", "biography", "artistStatement", "cvSections", "template", "language", "pageFormat", "fontStyle", "includeBranding", "includeCv", "includePrices", "designConfig", "collectionSchemaVersion", "revision", "includeUncollectedArtworks"];
export function frozenPortfolio(project: any) {
  const snapshot: any = Object.fromEntries(contentFields.filter(key => project[key] !== undefined).map(key => [key, project[key]]));
  snapshot.artworks = (project.artworks ?? []).map(({ createdAt, updatedAt, sourceBaseline, ...item }: any) => item);
  snapshot.collections = (project.collections ?? []).map(({ createdAt, updatedAt, sourceBaseline, ...item }: any) => item);
  snapshot.createdAt = project.createdAt; snapshot.updatedAt = project.updatedAt;
  return JSON.parse(JSON.stringify(snapshot));
}

// Monthly allowance windows use the subscription's server-side anchor, with
// end-of-month clamping (31 Jan -> 28 Feb -> 31 Mar), including annual plans.
export function quotaWindow(subscription: ArtistSubscription | null, now = new Date()) {
  return subscriptionQuotaWindow(subscription, now);
}

@Injectable()
export class PortfolioCommerceService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  constructor(private readonly prisma: PrismaService, private readonly storage: R2StorageService) {}
  onModuleInit() {
    // Expired workers cannot finalize. Recovery releases only expired reservations.
    this.timer = setInterval(() => { void this.recover().catch(error => console.error("Portfolio reservation recovery failed", error)); }, 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { clearInterval(this.timer); }
  private async lock(tx: Prisma.TransactionClient, owner: string) {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`portfolio-quota:${owner}`},0))`;
  }
  async lockForFinalization(tx: Prisma.TransactionClient, owner: string) { await this.lock(tx, owner); }
  private async releaseExpired(tx: Prisma.TransactionClient, owner: string) {
    const expired = await tx.portfolioExportUsage.findMany({ where: { artistAccountId: owner, status: "RESERVED", expiresAt: { lte: new Date() } } });
    for (const usage of expired) {
      await tx.portfolioExportUsage.update({ where: { id: usage.id }, data: { status: "RELEASED" } });
      if (usage.quotaPeriodId) await tx.portfolioQuotaPeriod.update({ where: { id: usage.quotaPeriodId }, data: { reserved: { decrement: 1 } } });
    }
  }
  async recover() {
    const owners = await this.prisma.portfolioExportUsage.findMany({ where: { status: "RESERVED", expiresAt: { lte: new Date() } }, select: { artistAccountId: true }, distinct: ["artistAccountId"], take: 100 });
    for (const { artistAccountId } of owners) await this.prisma.$transaction(async tx => { await this.lock(tx, artistAccountId); await this.releaseExpired(tx, artistAccountId); });
  }
  async entitlement(owner: string, reader: Prisma.TransactionClient = this.prisma, now = new Date()) {
    const subscription = await reader.artistSubscription.findUnique({ where: { artistAccountId: owner } });
    const window = quotaWindow(subscription, now);
    if (window) {
      const period = await reader.portfolioQuotaPeriod.findUnique({ where: { artistAccountId_periodStart_periodEnd: { artistAccountId: owner, periodStart: window.start, periodEnd: window.end } } });
      const used = period?.committed ?? 0, reserved = period?.reserved ?? 0;
      return { plan: "PREMIUM" as const, limit: 5, used, reserved, remaining: Math.max(0, 5 - used - reserved), periodEnd: window.end.toISOString(), extraExportCents: 490, checkoutAvailable: mockPaymentsEnabled() };
    }
    const used = await reader.portfolioExportUsage.count({ where: { artistAccountId: owner, kind: "FREE", status: "COMMITTED" } });
    const reserved = await reader.portfolioExportUsage.count({ where: { artistAccountId: owner, kind: "FREE", status: "RESERVED" } });
    return { plan: "FREE" as const, limit: 1, used, reserved, remaining: Math.max(0, 1 - used - reserved), periodEnd: null, extraExportCents: 490, checkoutAvailable: mockPaymentsEnabled() };
  }
  async reserve(owner: string, projectId: string, operationKey: string, hash: string) {
    if (!uuid.test(operationKey)) throw new BadRequestException("Nedostaje ispravan identifikator izvoza.");
    return this.prisma.$transaction(async tx => {
      await this.lock(tx, owner); await this.releaseExpired(tx, owner);
      const project = await tx.portfolioProject.findFirst({ where: { id: projectId, artistAccountId: owner } });
      if (!project) throw new NotFoundException("Portfolio nije pronađen.");
      const previous = await tx.portfolioExportUsage.findUnique({ where: { operationKey } });
      if (previous) {
        if (previous.artistAccountId !== owner || previous.portfolioId !== projectId || previous.contentHash !== hash) throw new ConflictException("Identifikator izvoza već je upotrijebljen za drugi sadržaj.");
        if (previous.status === "COMMITTED") return previous;
        throw new ConflictException(previous.status === "RESERVED" ? "Izvoz je već u toku." : "Prethodni pokušaj je istekao. Pokreni novi izvoz.");
      }
      const window = quotaWindow(await tx.artistSubscription.findUnique({ where: { artistAccountId: owner } }));
      let periodId: string | null = null;
      if (window) {
        const period = await tx.portfolioQuotaPeriod.upsert({ where: { artistAccountId_periodStart_periodEnd: { artistAccountId: owner, periodStart: window.start, periodEnd: window.end } }, create: { artistAccountId: owner, periodStart: window.start, periodEnd: window.end }, update: {} });
        const changed = await tx.$executeRaw`UPDATE "PortfolioQuotaPeriod" SET reserved=reserved+1 WHERE id=${period.id}::uuid AND reserved+committed < "limit"`;
        if (!changed) throw new ForbiddenException("Iskorišćeno je pet izvoza za ovaj mjesečni period. Dodatni izvoz košta 4,90 €; plaćanje još nije dostupno.");
        periodId = period.id;
      } else if (await tx.portfolioExportUsage.count({ where: { artistAccountId: owner, kind: "FREE", status: { in: ["RESERVED", "COMMITTED"] } } })) throw new ForbiddenException("Besplatan izvoz je iskorišćen ili u toku. Dodatni izvoz košta 4,90 €; plaćanje još nije dostupno.");
      return tx.portfolioExportUsage.create({ data: { artistAccountId: owner, portfolioId: projectId, operationKey, contentHash: hash, kind: window ? "PREMIUM" : "FREE", quotaPeriodId: periodId, expiresAt: new Date(Date.now() + 15 * 60_000) } });
    });
  }
  async finish(tx: Prisma.TransactionClient, usageId: string, versionId: string) {
    const usage = await tx.portfolioExportUsage.findUniqueOrThrow({ where: { id: usageId } });
    await this.lock(tx, usage.artistAccountId);
    const changed = await tx.portfolioExportUsage.updateMany({ where: { id: usageId, status: "RESERVED", expiresAt: { gt: new Date() } }, data: { status: "COMMITTED", versionId } });
    if (!changed.count) throw new ConflictException("Rezervacija izvoza je istekla.");
    if (usage.quotaPeriodId) await tx.portfolioQuotaPeriod.update({ where: { id: usage.quotaPeriodId }, data: { reserved: { decrement: 1 }, committed: { increment: 1 } } });
  }
  async release(usageId: string) {
    await this.prisma.$transaction(async tx => {
      const usage = await tx.portfolioExportUsage.findUniqueOrThrow({ where: { id: usageId } }); await this.lock(tx, usage.artistAccountId);
      const changed = await tx.portfolioExportUsage.updateMany({ where: { id: usageId, status: "RESERVED" }, data: { status: "RELEASED" } });
      if (changed.count && usage.quotaPeriodId) await tx.portfolioQuotaPeriod.update({ where: { id: usage.quotaPeriodId }, data: { reserved: { decrement: 1 } } });
    });
  }

  async createGuestPurchase(snapshot: unknown, operationKey: string, secret: string) {
    return this.createPurchase(snapshot, operationKey, secret, portfolioPrices.guestExportCents);
  }
  async createOwnerPurchase(owner: string, projectId: string, operationKey: string, secret: string) {
    if (!uuid.test(operationKey) || !/^[a-f0-9]{64}$/.test(secret)) throw new BadRequestException("Neispravan identifikator kupovine.");
    const project = await this.prisma.portfolioProject.findFirst({ where: { id: projectId, artistAccountId: owner }, include: { artworks: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] }, collections: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] } } });
    if (!project) throw new NotFoundException("Portfolio nije pronađen.");
    const quota = await this.entitlement(owner);
    if (quota.remaining > 0 || quota.reserved > 0) throw new ConflictException("Prvo iskoristi raspoloživo pravo izvoza ili sačekaj izvoz koji je u toku.");
    if (!buildPortfolioDocumentPlan(project).pages.length) throw new BadRequestException("Izaberi sadržaj za PDF.");
    if (await this.prisma.portfolioExportUsage.findUnique({ where: { operationKey } })) throw new ConflictException("Identifikator je već upotrijebljen za izvoz.");
    return this.createPurchase(frozenPortfolio(project), operationKey, secret, portfolioPrices.extraExportCents, owner, projectId);
  }
  private async createPurchase(snapshot: unknown, operationKey: string, secret: string, amountCents: number, artistAccountId?: string, portfolioId?: string) {
    if (!uuid.test(operationKey) || !/^[a-f0-9]{64}$/.test(secret)) throw new BadRequestException("Neispravan identifikator kupovine.");
    // Reject content that cannot be delivered before any future charge. These
    // clean bytes stay server-side and are discarded, never returned as preview.
    const preflight = await generatePortfolioPdf(snapshot as any);
    this.storage.validateUpload(preflight.length, "application/pdf", "portfolio-pdf");
    const hash = contentHash(snapshot), tokenHash = contentHash(secret);
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`portfolio-purchase:${operationKey}`},0))`;
      const existing = await tx.portfolioPurchase.findUnique({ where: { id: operationKey } });
      if (existing) {
        const grant = await tx.portfolioDeliveryGrant.findFirst({ where: { purchaseId: existing.id, tokenHash, revokedAt: null, expiresAt: { gt: new Date() } } });
        if (existing.snapshotHash !== hash || existing.artistAccountId !== (artistAccountId ?? null) || existing.portfolioId !== (portfolioId ?? null) || !grant) throw new ConflictException("Zahtjev za kupovinu je već upotrijebljen.");
        return this.purchaseStatus(existing);
      }
      const project = snapshot as any;
      const purchase = await tx.portfolioPurchase.create({ data: { id: operationKey, artistAccountId, portfolioId, product: buildPortfolioDocumentPlan(project).documentSelection.scope, amountCents, snapshot: snapshot as Prisma.InputJsonValue, snapshotHash: hash, buyerEmail: project.email, provider: "allsecure-pending", providerOrderRef: operationKey } });
      await tx.portfolioDeliveryGrant.create({ data: { purchaseId: purchase.id, tokenHash, expiresAt: new Date(Date.now() + 7 * 86400_000) } });
      return this.purchaseStatus(purchase);
    });
  }
  private purchaseStatus(purchase: { id: string; status: string; amountCents: number; currency: string; product: string }) {
    return { id: purchase.id, status: purchase.status, amountCents: purchase.amountCents, currency: purchase.currency, product: purchase.product, checkoutAvailable: mockPaymentsEnabled(), message: mockPaymentsEnabled() ? "Sadržaj narudžbine je sačuvan. Dostupno je lokalno testno plaćanje bez banke i stvarne naplate." : "Sadržaj narudžbine je sačuvan. AllSecure plaćanje još nije dostupno; ništa nije naplaćeno." };
  }
  private async grant(tx: Prisma.TransactionClient, id: string, token: string, paid = false) {
    if (!uuid.test(id) || !/^[a-f0-9]{64}$/.test(token)) throw new NotFoundException("Narudžbina nije pronađena.");
    const grant = await tx.portfolioDeliveryGrant.findFirst({ where: { purchaseId: id, tokenHash: contentHash(token), revokedAt: null, expiresAt: { gt: new Date() } }, include: { purchase: true } });
    if (!grant) throw new NotFoundException("Narudžbina nije pronađena.");
    if (paid && grant.purchase.status !== "PAID") throw new ForbiddenException("Plaćanje nije potvrđeno.");
    return grant;
  }
  async status(id: string, token: string) { return this.purchaseStatus((await this.grant(this.prisma, id, token)).purchase); }
  async checkoutSnapshot(id: string, token: string) {
    const p = (await this.grant(this.prisma, id, token)).purchase;
    const account = p.artistAccountId ? await this.prisma.artistAccount.findUnique({ where: { id: p.artistAccountId }, select: { id: true, name: true, email: true } }) : null;
    return { purchase: this.purchaseStatus(p), snapshot: p.snapshot as any, account, portfolioId: p.portfolioId };
  }
  async download(id: string, token: string) {
    // Keep the grant locked across read/render so revocation and limits are
    // authoritative. Failed storage/render rolls back the download counter.
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "PortfolioPurchase" WHERE id=${uuid.test(id) ? id : "00000000-0000-0000-0000-000000000000"}::uuid FOR UPDATE`;
      const grant = await this.grant(tx, id, token, true);
      if (grant.downloads >= grant.maximumDownloads) throw new ForbiddenException("Broj preuzimanja je iskorišćen.");
      const purchase = grant.purchase, snapshot = purchase.snapshot as any;
      let pageCount: number | null = null;
      const buffer = await this.storage.getOrCreatePurchasePdf(id, async () => generatePortfolioPdf(snapshot, { onPageCount: count => { pageCount = count; } }), purchase.portfolioId ?? undefined);
      if (purchase.portfolioId && purchase.artistAccountId) {
        await tx.$queryRaw`SELECT id FROM "PortfolioProject" WHERE id=${purchase.portfolioId}::uuid FOR UPDATE`;
        const existing = await tx.portfolioVersion.findUnique({ where: { purchaseId: id } });
        if (!existing) {
          const current = await tx.portfolioProject.findUnique({ where: { id: purchase.portfolioId }, include: { artworks: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] }, collections: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] } } });
          if (!current || current.artistAccountId !== purchase.artistAccountId) throw new ConflictException("Vlasništvo projekta je promijenjeno.");
          const latest = await tx.portfolioVersion.findFirst({ where: { portfolioId: current.id }, orderBy: { versionNumber: "desc" } });
          const storagePath = `portfolio-projects/${current.id}/pdf/purchase-${id}.pdf`, plan = buildPortfolioDocumentPlan(snapshot);
          const version = await tx.portfolioVersion.create({ data: { portfolioId: current.id, purchaseId: id, versionNumber: (latest?.versionNumber ?? 0) + 1, pdfUrl: `r2-private:${storagePath}`, storagePath, template: snapshot.template, language: snapshot.language, includeBranding: snapshot.includeBranding,
            documentScope: plan.documentSelection.scope, manifest: purchase.snapshot as Prisma.InputJsonValue, contentHash: purchase.snapshotHash, pageCount, artworkCount: plan.documentSelection.scope === "CV" ? 0 : plan.artworkCount, sourceRevision: snapshot.revision } });
          await tx.portfolioExportUsage.create({ data: { artistAccountId: purchase.artistAccountId, portfolioId: current.id, operationKey: id, contentHash: purchase.snapshotHash, kind: "PAID", status: "COMMITTED", purchaseId: id, versionId: version.id, expiresAt: new Date(Date.now() + 15 * 60_000) } });
          if (contentHash(frozenPortfolio(current)) === purchase.snapshotHash) await tx.portfolioProject.update({ where: { id: current.id }, data: { latestPdfUrl: `r2-private:${storagePath}`, latestPdfStoragePath: storagePath, status: "GENERATED" } });
        }
      }
      await tx.portfolioDeliveryGrant.update({ where: { id: grant.id }, data: { downloads: { increment: 1 } } });
      return buffer;
    }, { timeout: 120_000, maxWait: 10_000 });
  }
  async list(page = 1) {
    const [items, total] = await Promise.all([this.prisma.portfolioPurchase.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 24, take: 24, select: { id: true, buyerEmail: true, amountCents: true, currency: true, product: true, status: true, provider: true, createdAt: true, paidAt: true } }), this.prisma.portfolioPurchase.count()]);
    return { items, total, page };
  }
  async detail(id: string) {
    const purchase = await this.prisma.portfolioPurchase.findUnique({ where: { id }, include: { paymentEvents: { orderBy: { receivedAt: "desc" } }, deliveryGrants: { select: { id: true, createdAt: true, expiresAt: true, revokedAt: true, downloads: true, maximumDownloads: true } } } });
    if (!purchase) throw new NotFoundException("Narudžbina nije pronađena."); return purchase;
  }
  async revoke(id: string) {
    return this.prisma.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM "PortfolioPurchase" WHERE id=${id}::uuid FOR UPDATE`; const exists = await tx.portfolioPurchase.findUnique({ where: { id } }); if (!exists) throw new NotFoundException(); await tx.portfolioDeliveryGrant.updateMany({ where: { purchaseId: id, revokedAt: null }, data: { revokedAt: new Date() } }); return { revoked: true }; });
  }
  async adminPreview(id: string) { const p=await this.detail(id);if(p.product==='GENERATOR_PACK')throw new BadRequestException('Dopuna Generatora nema PDF portfolio.');return generatePortfolioPdf(p.snapshot as any, { watermark: true }); }
  // Trusted provider adapters and the explicitly enabled local simulator share
  // the same settlement transaction. Production cannot accept mock proofs.
  async confirmVerifiedPayment(input: { purchaseId: string; provider: string; eventId: string; paymentRef: string; amountCents: number; currency: string; payloadHash: string }) {
    return this.recordVerifiedPayment(input, true);
  }
  async recordVerifiedPaymentFailure(input: { purchaseId: string; provider: string; eventId: string; paymentRef: string; amountCents: number; currency: string; payloadHash: string }) {
    return this.recordVerifiedPayment(input, false);
  }
  private async recordVerifiedPayment(input: { purchaseId: string; provider: string; eventId: string; paymentRef: string; amountCents: number; currency: string; payloadHash: string }, paid: boolean) {
    const mock = input.provider === 'mock' && mockPaymentsEnabled();
    if (!input.eventId || input.eventId.length > 200 || !input.paymentRef || input.paymentRef.length > 200 || !/^[a-f0-9]{64}$/.test(input.payloadHash) || (input.provider !== "allsecure" && !mock)) throw new BadRequestException("Neispravna potvrda procesora.");
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "PortfolioPurchase" WHERE id=${input.purchaseId}::uuid FOR UPDATE`;
      const p = await tx.portfolioPurchase.findUnique({ where: { id: input.purchaseId } }); if (!p) throw new NotFoundException();
      if (mock && p.provider && !['mock','allsecure-pending'].includes(p.provider)) throw new ConflictException('Narudžbina nije testna.');
      if (p.amountCents !== input.amountCents || p.currency !== input.currency) throw new BadRequestException("Iznos ili valuta ne odgovaraju narudžbini.");
      const event = await tx.portfolioPaymentEvent.findUnique({ where: { provider_deduplicationKey: { provider: input.provider, deduplicationKey: input.eventId } } });
      if (event) { if (event.purchaseId !== p.id || event.payloadHash !== input.payloadHash) throw new ConflictException("Neusklađen ponovljeni događaj."); return { id: p.id, status: p.status }; }
      if (!["PENDING", "PAID", ...(mock ? ['FAILED'] : [])].includes(p.status) || (p.providerPaymentRef && p.providerPaymentRef !== input.paymentRef)) throw new ConflictException("Narudžbina ne prihvata ovu potvrdu.");
      await tx.portfolioPaymentEvent.create({ data: { purchaseId: p.id, provider: input.provider, deduplicationKey: input.eventId, payloadHash: input.payloadHash, status: "VERIFIED", verifiedAt: new Date() } });
      // A late failed event must never roll a verified paid transaction back.
      const status = paid || p.status === "PAID" ? "PAID" : "FAILED";
      await tx.portfolioPurchase.update({ where: { id: p.id }, data: { status, ...(status === "PAID" ? { paidAt: p.paidAt ?? new Date() } : {}), provider: input.provider, providerPaymentRef: input.paymentRef } });
      if(status==='PAID'&&p.product==='GENERATOR_PACK')await creditPromotionPurchase(tx,p.id);
      return { id: p.id, status };
    });
  }
}
