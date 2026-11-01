import { Injectable, NotFoundException } from "@nestjs/common";
import { buildPortfolioDocumentPlan, getMinimalDesignLabel } from "@artboard/portfolio-document-plan";
import { PrismaService } from "../../prisma/prisma.service";
import { PortfolioCommerceService } from "./portfolio-commerce.service";
import { portfolioPrices, premiumMonthlyAmounts } from "./portfolio-prices";
import { promotionUsage } from "../promotions/promotion.access";
import { mockPaymentsEnabled } from '../../config/mock-payments';

export type CheckoutProduct = "premium" | "portfolio" | "generator";
@Injectable()
export class PortfolioPaymentContextService {
  constructor(private readonly prisma: PrismaService, private readonly commerce: PortfolioCommerceService) {}
  catalog() {
    return { currency: "EUR", guestExportCents: portfolioPrices.guestExportCents, extraExportCents: portfolioPrices.extraExportCents,
      premiumAmountsCents: premiumMonthlyAmounts, generatorPackCents: 490, generatorPackSize: 10,
      checkoutAvailable: mockPaymentsEnabled(), mockPaymentsEnabled: mockPaymentsEnabled(), generatorAvailable: false };
  }
  private document(p: any) {
    return { id: p.id, title: p.title || `${p.artistName} Portfolio`, style: p.template === "INSTITUTIONAL_MINIMAL" ? getMinimalDesignLabel(p) : p.template === "ARTBOARD_EDITORIAL" ? "Editorial" : "Sales / Pro",
      format: p.pageFormat === "US_LETTER" ? "Letter" : "A4", pageCount: buildPortfolioDocumentPlan(p).pageCount,
      language: p.language === "EN" ? "Engleski" : "Crnogorski" };
  }
  private base(product: CheckoutProduct) {
    return { product, catalog: this.catalog(), account: null as any, quota: null as any, portfolio: null as any,
      purchase: null as any, paymentMethod: null as { brand: string; last4: string } | null,
      checkoutAvailable: false, status: "UNAVAILABLE", variant: product === "premium" ? "PREMIUM" : product === "generator" ? "GENERATOR_FREE" : "PORTFOLIO_GUEST",
      amountCents: product === "premium" ? premiumMonthlyAmounts[0]! : product === "generator" ? 490 : portfolioPrices.guestExportCents };
  }
  publicContext(product: CheckoutProduct) {
    const context = this.base(product);
    if (product !== "premium") context.status = "MISSING_CONTEXT";
    return context;
  }
  async owner(owner: string, product: CheckoutProduct, portfolioId?: string) {
    const account = await this.prisma.artistAccount.findUnique({ where: { id: owner }, select: { name: true, email: true, isActive: true } });
    if (!account?.isActive) throw new NotFoundException("Nalog nije pronađen.");
    const quota = await this.commerce.entitlement(owner), context = this.base(product);
    context.account = { name: account.name, email: account.email }; context.quota = quota;
    if (product === "premium") { if (quota.plan === "PREMIUM") context.status = "ALREADY_PREMIUM"; else context.checkoutAvailable=mockPaymentsEnabled(); return context; }
    if (product === "generator") {
      context.variant = quota.plan === "PREMIUM" ? "GENERATOR_PREMIUM" : "GENERATOR_FREE";
      const ready=(await this.prisma.$queryRaw<Array<{ready:boolean}>>`SELECT to_regclass('public."PromotionGeneration"') IS NOT NULL AS ready`)[0]?.ready;
      if(ready){
        const a=await this.prisma.artistAccount.findUnique({where:{id:owner},include:{subscription:true}});
        context.quota=await promotionUsage(this.prisma,owner,a!.subscription);
        context.catalog.generatorAvailable=true;
        context.checkoutAvailable=mockPaymentsEnabled();
      }
      return context;
    }
    context.variant = quota.plan === "PREMIUM" ? "PORTFOLIO_PREMIUM" : "PORTFOLIO_FREE";
    context.amountCents = portfolioPrices.extraExportCents;
    if (!portfolioId) { context.status = "MISSING_CONTEXT"; return context; }
    const project = await this.prisma.portfolioProject.findFirst({ where: { id: portfolioId, artistAccountId: owner },
      include: { artworks: true, collections: true } });
    if (!project) throw new NotFoundException("Portfolio nije pronađen.");
    context.portfolio = this.document(project);
    if (quota.remaining > 0 || quota.reserved > 0) context.status = "QUOTA_AVAILABLE";
    else context.checkoutAvailable=mockPaymentsEnabled();
    return context;
  }
  async purchase(id: string, token: string) {
    const { purchase, snapshot, account, portfolioId } = await this.commerce.checkoutSnapshot(id, token);
    const context = this.base("portfolio");
    context.checkoutAvailable=mockPaymentsEnabled();
    context.purchase = purchase; context.amountCents = purchase.amountCents;
    context.portfolio = { ...this.document(snapshot), id: portfolioId };
    context.status = purchase.status === "PAID" ? "PAID" : purchase.status === "FAILED" ? "FAILED" : "UNAVAILABLE";
    if (account) {
      context.account = account;
      context.quota = await this.commerce.entitlement(account.id);
      context.variant = context.quota.plan === "PREMIUM" ? "PORTFOLIO_PREMIUM" : "PORTFOLIO_FREE";
    } else context.account = null;
    return { ...context, buyerEmail: snapshot.email ?? "" };
  }
}
