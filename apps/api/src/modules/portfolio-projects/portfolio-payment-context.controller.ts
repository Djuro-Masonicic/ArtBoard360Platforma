import { Controller, Get, Header, Param, ParseUUIDPipe, Query, Req, UseGuards } from "@nestjs/common";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import type { Request } from "express";
import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import { PortfolioPaymentContextService, type CheckoutProduct } from "./portfolio-payment-context.service";
class ContextQuery {
  @IsIn(["premium", "portfolio", "generator"]) product: CheckoutProduct = "premium";
  @IsOptional() @IsUUID() portfolioId?: string;
}
@Controller("portfolio-commerce")
export class PortfolioPaymentContextController {
  constructor(private readonly context: PortfolioPaymentContextService) {}
  @Get("checkout-catalog") @Header("Cache-Control", "no-store")
  catalog() { return this.context.catalog(); }
  @Get("checkout-public") @Header("Cache-Control", "no-store")
  publicContext(@Query() query: ContextQuery) { return this.context.publicContext(query.product); }
  @Get("checkout-context") @UseGuards(ArtistAuthGuard) @Header("Cache-Control", "no-store")
  owner(@Req() request: ArtistRequest, @Query() query: ContextQuery) { return this.context.owner(request.artistUser!.id, query.product, query.portfolioId); }
  @Get("purchases/:id/checkout-context") @Header("Cache-Control", "no-store")
  purchase(@Param("id", ParseUUIDPipe) id: string, @Req() req: Request) { return this.context.purchase(id, req.headers["x-portfolio-delivery"] as string ?? ""); }
}
