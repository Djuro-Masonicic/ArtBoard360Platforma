import { BadRequestException, Body, CanActivate, Controller, Delete, ExecutionContext, Get, Header, Injectable, Param, ParseUUIDPipe, Post, Query, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { IsString, MaxLength } from "class-validator";
import type { Request, Response } from "express";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { PortfolioCommerceService } from "./portfolio-commerce.service";
import { PortfolioGuestService } from "./portfolio-guest.service";

class GuestDocumentDto {
  @IsString() @MaxLength(128_000) document!: string;
  @IsString() @MaxLength(36) operationKey!: string;
  @IsString() @MaxLength(64) deliverySecret!: string;
}
class PurchaseRequestDto {
  @IsString() @MaxLength(36) operationKey!: string;
  @IsString() @MaxLength(64) deliverySecret!: string;
}
@Injectable()
export class GuestProcessingGuard implements CanActivate {
  private buckets = new Map<string, { count: number; reset: number }>();
  private active = 0;
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>(), response = context.switchToHttp().getResponse<Response>();
    // Per-process bound; deployment ingress must also enforce global rate/body limits.
    const now = Date.now(); for (const [key, value] of this.buckets) if (value.reset <= now) this.buckets.delete(key);
    const key = request.ip ?? "unknown", bucket = this.buckets.get(key) ?? { count: 0, reset: now + 60_000 };
    if (this.active >= 2 || bucket.count >= 10 || this.buckets.size >= 10_000) throw new BadRequestException("Previše zahtjeva. Pokušaj malo kasnije.");
    bucket.count++; this.buckets.set(key, bucket); this.active++;
    let done = false; const finish = () => { if (!done) { done = true; this.active--; } };
    response.once("finish", finish); response.once("close", finish); return true;
  }
}
@Controller("portfolio-commerce")
export class PortfolioCommerceController {
  constructor(private readonly commerce: PortfolioCommerceService, private readonly guest: PortfolioGuestService) {}
  @Post("projects/:id/purchase") @UseGuards(ArtistAuthGuard, GuestProcessingGuard)
  ownerPurchase(@Param("id", ParseUUIDPipe) id: string, @Req() request: ArtistRequest, @Body() dto: PurchaseRequestDto) { return this.commerce.createOwnerPurchase(request.artistUser!.id, id, dto.operationKey, dto.deliverySecret); }
  @Post("guest/:action")
  @UseGuards(GuestProcessingGuard)
  @UseInterceptors(FilesInterceptor("images", 33, { storage: memoryStorage(), limits: { fileSize: 1024 * 1024, files: 33, fields: 3, fieldSize: 128_000, parts: 36 } }))
  async guestAction(@Param("action") action: string, @Body() dto: GuestDocumentDto, @UploadedFiles() files: Express.Multer.File[], @Res() response: Response) {
    if (!["preview", "purchase"].includes(action)) throw new BadRequestException("Nepoznata operacija.");
    const snapshot = await this.guest.snapshot(dto.document, files ?? []);
    response.setHeader("Cache-Control", "no-store");
    if (action === "purchase") { response.status(201).json(await this.commerce.createGuestPurchase(snapshot, dto.operationKey, dto.deliverySecret)); return; }
    const pdf = await this.guest.preview(snapshot);
    response.set({ "Content-Type": "application/pdf", "X-Portfolio-Page-Count": String(pdf.count), "Content-Disposition": 'inline; filename="portfolio-preview.pdf"', "X-Content-Type-Options": "nosniff" }); response.send(pdf.buffer);
  }
  @Get("purchases/:id") @Header("Cache-Control", "no-store")
  status(@Param("id", ParseUUIDPipe) id: string, @Req() request: Request) { return this.commerce.status(id, request.headers["x-portfolio-delivery"] as string ?? ""); }
  @Get("purchases/:id/pdf")
  async download(@Param("id", ParseUUIDPipe) id: string, @Req() request: Request, @Res() response: Response) {
    const buffer = await this.commerce.download(id, request.headers["x-portfolio-delivery"] as string ?? "");
    response.set({ "Content-Type": "application/pdf", "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="portfolio.pdf"', "X-Content-Type-Options": "nosniff" }); response.send(buffer);
  }
}
@UseGuards(AdminAuthGuard)
@Controller("admin/portfolio-purchases")
export class AdminPortfolioPurchasesController {
  constructor(private readonly commerce: PortfolioCommerceService) {}
  @Get() @Header("Cache-Control", "no-store") list(@Query() query: PaginationQueryDto) { return this.commerce.list(query.page); }
  @Get(":id") @Header("Cache-Control", "no-store") detail(@Param("id", ParseUUIDPipe) id: string) { return this.commerce.detail(id); }
  @Delete(":id/delivery") revoke(@Param("id", ParseUUIDPipe) id: string) { return this.commerce.revoke(id); }
  @Get(":id/preview-pdf") async preview(@Param("id", ParseUUIDPipe) id: string, @Res() response: Response) {
    response.set({ "Content-Type": "application/pdf", "Cache-Control": "no-store", "Content-Disposition": 'inline; filename="purchase-preview.pdf"', "X-Content-Type-Options": "nosniff" }); response.send(await this.commerce.adminPreview(id));
  }
}
