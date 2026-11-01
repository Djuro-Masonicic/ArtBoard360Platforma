import { BadRequestException, Body, CanActivate, Controller, ExecutionContext, Get, Header, Injectable, Param, ParseUUIDPipe, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors, HttpException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { env } from "../../config/env";
import { ArtistAuthGuard, type ArtistRequest } from "../auth/artist-auth.guard";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { DashboardThemeDto, RequestArtistDeletionDto, ReviewArtistDeletionDto } from "./artist-dashboard.dto";
import { ArtistDashboardService } from "./artist-dashboard.service";

const pageNumber = (value?: string) => { const n = value ? Number(value) : 1; if (!Number.isSafeInteger(n) || n < 1 || n > 100000) throw new BadRequestException("Neispravna stranica."); return n; };
@Injectable()
export class ArtistSensitiveActionGuard implements CanActivate {
  private attempts = new Map<string, { count: number; until: number }>();
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<ArtistRequest>(), now = Date.now();
    for (const [key, entry] of this.attempts) if (entry.until <= now) this.attempts.delete(key);
    const id = req.artistUser!.id, entry = this.attempts.get(id) ?? { count: 0, until: now + 15 * 60_000 };
    if (entry.count >= 5 || this.attempts.size >= 10000) throw new HttpException("Previše pokušaja. Pokušaj za 15 minuta.", 429);
    entry.count++; this.attempts.set(id, entry); return true;
  }
}
@Controller("artist/dashboard") @UseGuards(ArtistAuthGuard)
export class ArtistDashboardController {
  constructor(private readonly dashboard: ArtistDashboardService) {}
  @Get() @Header("Cache-Control", "private, no-store") get(@Req() r: ArtistRequest) { return this.dashboard.get(r.artistUser!.id, r.artistUser!.artistId); }
  @Get("preferences") @Header("Cache-Control", "private, no-store") preferences(@Req() r: ArtistRequest) { return this.dashboard.preferences(r.artistUser!.id); }
  @Patch("preferences") theme(@Req() r: ArtistRequest, @Body() d: DashboardThemeDto) { return this.dashboard.setTheme(r.artistUser!.id, d.theme); }
  @Get("payments") @Header("Cache-Control", "private, no-store") payments(@Req() r: ArtistRequest, @Query("page") page?: string) { return this.dashboard.payments(r.artistUser!.id, pageNumber(page)); }
  @Patch("profile")
  @UseInterceptors(FileInterceptor("cover", { storage: memoryStorage(), limits: { fileSize: env.maxUploadFileSizeBytes, fieldSize: 64_000, fields: 1, files: 1 } }))
  profile(@Req() r: ArtistRequest, @Body() body: Record<string, unknown>, @UploadedFile() file?: Express.Multer.File) {
    if (Object.keys(body).some(k => k !== "payload") || typeof body.payload !== "string") throw new BadRequestException("Neispravni podaci profila.");
    return this.dashboard.saveProfile(r.artistUser!.artistId, body.payload, file);
  }
  @Post("deletion-request") @UseGuards(ArtistSensitiveActionGuard)
  deletion(@Req() r: ArtistRequest, @Body() d: RequestArtistDeletionDto) { return this.dashboard.requestDeletion(r.artistUser!.id, d.currentPassword); }
}
@Controller("admin/artist-deletion-requests") @UseGuards(AdminAuthGuard)
export class AdminArtistDeletionController {
  constructor(private readonly dashboard: ArtistDashboardService) {}
  @Get() @Header("Cache-Control", "private, no-store") list(@Query("page") page?: string) { return this.dashboard.adminRequests(pageNumber(page)); }
  @Patch(":id") review(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Body() d: ReviewArtistDeletionDto) { return this.dashboard.review(id, d); }
}
