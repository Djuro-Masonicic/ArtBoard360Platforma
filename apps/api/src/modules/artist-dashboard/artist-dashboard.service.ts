import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import sharp from "sharp";
import { PrismaService } from "../../prisma/prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import { ResendMailService } from "../../mail/resend-mail.service";
import { verifyPassword } from "../auth/auth-crypto";
import { ArtistsService } from "../artists/artists.service";
import { UpdateArtistDto } from "../artists/artists.dto";
import { SubscriptionOverviewService } from "../artist-subscriptions/subscription-overview.service";
import { ReviewArtistDeletionDto } from "./artist-dashboard.dto";

@Injectable()
export class ArtistDashboardService {
  constructor(private readonly prisma: PrismaService, private readonly artists: ArtistsService,
    private readonly subscriptions: SubscriptionOverviewService, private readonly storage: R2StorageService,
    private readonly mail: ResendMailService) {}

  async get(accountId: string, artistId: string) {
    const [artist, preferences, subscription, payments, deletion, disciplines] = await Promise.all([
      this.artists.getOwnedArtist(artistId), this.preferences(accountId), this.subscriptions.get(accountId),
      this.payments(accountId, 1), this.prisma.artistDeletionRequest.findFirst({ where: { artistAccountId: accountId, status: { in: ["PENDING", "IN_REVIEW"] } }, orderBy: { createdAt: "desc" } }),
      this.prisma.discipline.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
    ]);
    return { artist, preferences, subscription, payments, deletionRequest: deletion ? this.publicRequest(deletion) : null, disciplines };
  }

  async preferences(accountId: string) {
    const account = await this.prisma.artistAccount.findUnique({ where: { id: accountId }, select: { uiTheme: true, isActive: true } });
    if (!account?.isActive) throw new UnauthorizedException("Nalog nije dostupan.");
    return { theme: account.uiTheme as "light" | "dark" };
  }
  async setTheme(accountId: string, theme: "light" | "dark") {
    await this.prisma.artistAccount.update({ where: { id: accountId, isActive: true }, data: { uiTheme: theme } });
    return { theme };
  }

  async saveProfile(artistId: string, payload: string, file?: Express.Multer.File) {
    let input: unknown;
    try { input = JSON.parse(payload); } catch { throw new BadRequestException("Neispravni podaci profila."); }
    if (!input || Array.isArray(input) || typeof input !== "object") throw new BadRequestException("Neispravni podaci profila.");
    const dto = plainToInstance(UpdateArtistDto, input);
    if ((await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).length) throw new BadRequestException("Provjeri podatke profila.");
    if (dto.artistStatement && dto.artistStatement.trim().split(/\s+/u).length > 60) throw new BadRequestException("Umjetnički iskaz može imati najviše 60 riječi.");
    if (file) {
      await this.artists.getOwnedArtist(artistId);
      this.storage.validateUpload(file.size, file.mimetype, "profile");
      try { await sharp(file.buffer, { limitInputPixels: 40_000_000 }).metadata(); }
      catch { throw new BadRequestException("Naslovna fotografija nije ispravna ili je prevelika."); }
      const uploaded = await this.storage.uploadFile({ recordId: artistId, entityType: "profile", fileName: file.originalname, mimeType: file.mimetype, fileSizeBytes: file.size, body: file.buffer });
      dto.coverImageUrl = uploaded.publicUrl;
    }
    // Uses the existing profile transaction. No old image is physically deleted.
    return this.artists.updateArtist(artistId, dto, artistId);
  }

  async payments(accountId: string, page: number) {
    const pageSize = 20, where = { artistAccountId: accountId, status: { in: ["PAID", "REFUNDED"] } };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.portfolioPurchase.findMany({ where, orderBy: [{ paidAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, product: true, amountCents: true, currency: true, status: true, paidAt: true, createdAt: true } }),
      this.prisma.portfolioPurchase.count({ where }),
    ]);
    return { items: items.map(p => ({ ...p, receiptUrl: null })), meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  private publicRequest(r: { id: string; status: string; createdAt: Date; dueAt: Date; acknowledgedEmailAt: Date | null }) {
    return { id: r.id, status: r.status, createdAt: r.createdAt, dueAt: r.dueAt, emailConfirmed: Boolean(r.acknowledgedEmailAt) };
  }
  async requestDeletion(accountId: string, currentPassword: string) {
    const account = await this.prisma.artistAccount.findUnique({ where: { id: accountId } });
    if (!account?.isActive || !(await verifyPassword(currentPassword, account.passwordHash))) throw new UnauthorizedException("Trenutna lozinka nije ispravna.");
    const { record, created } = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "ArtistAccount" WHERE "id"=${accountId}::uuid FOR UPDATE`;
      const pending = await tx.artistDeletionRequest.findFirst({ where: { artistAccountId: accountId, status: { in: ["PENDING", "IN_REVIEW"] } } });
      if (pending) return { record: pending, created: false };
      const now = new Date();
      return { record: await tx.artistDeletionRequest.create({ data: { artistAccountId: accountId, dueAt: new Date(now.getTime() + 30 * 86_400_000) } }), created: true };
    });
    if (!created) return this.publicRequest(record);
    // Persistence is the source of truth; a mail outage must not lose the request.
    const outcomes = await Promise.allSettled([
      this.mail.sendArtistDeletionAcknowledgement({ requestId: record.id, email: account.email, name: account.name, dueAt: record.dueAt }),
      this.mail.sendArtistDeletionNotification({ requestId: record.id, email: account.email, name: account.name, dueAt: record.dueAt }),
    ]);
    const saved = await this.prisma.artistDeletionRequest.update({ where: { id: record.id }, data: {
      acknowledgedEmailAt: outcomes[0].status === "fulfilled" ? new Date() : null,
      adminNotifiedAt: outcomes[1].status === "fulfilled" ? new Date() : null,
    } });
    return this.publicRequest(saved);
  }

  async adminRequests(page: number) {
    const pageSize = 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.artistDeletionRequest.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize,
        include: { artistAccount: { select: { email: true, name: true, artist: { select: { slug: true } } } } } }),
      this.prisma.artistDeletionRequest.count(),
    ]);
    return { items, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }
  async review(id: string, dto: ReviewArtistDeletionDto) {
    const request = await this.prisma.artistDeletionRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException("Zahtjev nije pronađen.");
    const result = await this.prisma.artistDeletionRequest.updateMany({ where: { id, status: dto.expectedStatus },
      data: { status: dto.status, adminNotes: dto.adminNotes, reviewedAt: new Date() } });
    if (!result.count) throw new ConflictException("Zahtjev je u međuvremenu promijenjen. Osvježi pregled.");
    return { success: true };
  }
}
