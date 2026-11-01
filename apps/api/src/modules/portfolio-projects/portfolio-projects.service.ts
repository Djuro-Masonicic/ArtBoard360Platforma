import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional, UnauthorizedException } from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";
import { PortfolioCommerceService, contentHash, frozenPortfolio } from "./portfolio-commerce.service";
import { hasPremiumAccess } from "../artist-subscriptions/subscription-access";
import {
  PortfolioPaymentStatus,
  PortfolioProjectStatus,
  PortfolioProjectSource,
  PortfolioTemplate,
  Prisma,
} from "@prisma/client";

import { PaginatedResponse } from "../../common/dto/pagination-query.dto";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { env } from "../../config/env";
import { PrismaService } from "../../prisma/prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import type { UploadEntityType } from "../../storage/storage.types";
import { normalizeBehanceUrl } from "../../common/validators/portfolio-profile-fields";
import { PortfolioCollectionsService } from "./portfolio-collections.service";
import { buildPortfolioDocumentPlan, parsePortfolioCv, parseDocumentSelection, getDocumentSelection, parseMinimalDesign } from "@artboard/portfolio-document-plan";
import {
  CreateGuestPortfolioProjectDto,
  ListPortfolioProjectsQueryDto,
  UpdatePortfolioArtworkDto,
  UpdatePortfolioProjectDto,
} from "./portfolio-projects.dto";
import {
  generatePortfolioPdf,
  generateSelectedTemplateTestPdf,
} from "./portfolio-pdf.generator";

const portfolioProjectInclude = Prisma.validator<Prisma.PortfolioProjectInclude>()({
  _count: { select: { versions: true } },
  collections: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] },
  artworks: {
    orderBy: {
      orderIndex: "asc",
    },
  },
  versions: {
    orderBy: {
      createdAt: "desc",
    },
    take: 3,
  },
  payments: {
    orderBy: {
      createdAt: "desc",
    },
    take: 3,
  },
  sourceArtist: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  artistAccount: {
    select: {
      id: true,
      email: true,
      subscription: true,
    },
  },
});

type PortfolioProjectWithRelations = Prisma.PortfolioProjectGetPayload<{
  include: typeof portfolioProjectInclude;
}>;

const portfolioDesignPageKeys = ["cover", "profile", "collection", "artwork", "contact"] as const;
const portfolioTemplateValues: PortfolioTemplate[] = [
  PortfolioTemplate.INSTITUTIONAL_MINIMAL,
  PortfolioTemplate.ARTBOARD_EDITORIAL,
  PortfolioTemplate.SALES_PRO,
];
const portfolioFooterValues = ["MINIMAL", "ARTBOARD", "SALES"] as const;

@Injectable()
export class PortfolioProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: R2StorageService,
    @Optional() private readonly collections?: PortfolioCollectionsService,
    @Optional() private readonly commerce?: PortfolioCommerceService,
  ) {}

  async createFromArtistProfile(artistAccountId: string) {
    if (env.portfolioCollectionsEnabled && this.collections) {
      const id = await this.collections.createFromProfile(artistAccountId);
      return this.getForArtist(artistAccountId, id);
    }
    const artistAccount = await this.prisma.artistAccount.findUnique({
      where: {
        id: artistAccountId,
      },
      include: {
        subscription: true,
        artist: {
          include: {
            artworks: {
              orderBy: {
                orderIndex: "asc",
              },
              take: 30,
            },
            disciplines: {
              include: {
                discipline: true,
              },
            },
            socialLinks: true,
          },
        },
      },
    });

    if (!artistAccount) {
      throw new NotFoundException("Artist account was not found.");
    }

    const artist = artistAccount.artist;

    if (!artist) {
      throw new BadRequestException(
        "Artist account is not connected to an artist profile, so a portfolio cannot be created from profile data.",
      );
    }

    const discipline = artist.disciplines.map((item) => item.discipline.name).join(", ") || null;
    const instagramLink = artist.socialLinks.find((link) => link.platform === "INSTAGRAM")?.url ?? null;
    const websiteLink = artist.socialLinks.find((link) => link.platform === "PERSONAL_WEBSITE")?.url ?? null;
    const featuredArtwork = artist.artworks.find((artwork) => artwork.isFeatured) ?? artist.artworks[0];
    const defaultCoverImageUrl =
      artist.coverImageUrl ?? featuredArtwork?.imageUrl ?? artist.thumbnailUrl;
    const hasActivePlatinum = hasPremiumAccess(artistAccount.subscription);

    const portfolioProject = await this.prisma.portfolioProject.create({
      data: {
        artistAccountId,
        sourceArtistId: artist.id,
        source: PortfolioProjectSource.ARTBOARD_PROFILE,
        paymentStatus: hasActivePlatinum
          ? PortfolioPaymentStatus.NOT_REQUIRED
          : PortfolioPaymentStatus.REQUIRED,
        title: `${artist.name} Portfolio`,
        artistName: artist.name,
        discipline,
        email: artist.email ?? artistAccount.email,
        dateOfBirth: artist.dateOfBirth,
        behanceUrl: normalizeBehanceUrl(artist.socialLinks.find((link) => link.platform === "BEHANCE")?.url ?? "") || null,
        websiteUrl: websiteLink,
        instagramUrl: instagramLink,
        artboardProfileUrl: `${env.siteBaseUrl}/artists/${artist.slug}`,
        profileImageUrl: artist.profileImageUrl ?? artist.profileThumbnailUrl,
        coverImageUrl: defaultCoverImageUrl,
        collectionName: `${artist.name} - izabrani radovi`,
        collectionYear: String(new Date().getFullYear()),
        collectionCoverUrl: defaultCoverImageUrl,
        biography: artist.bio,
        artistStatement: artist.artistStatement,
        motto: artist.quote,
        artworks: {
          create: artist.artworks.map((artwork, index) => ({
            sourceArtworkId: artwork.id,
            imageUrl: artwork.imageUrl,
            storagePath: artwork.storagePath,
            title: artwork.title,
            description: artwork.description,
            orderIndex: index,
            isSelected: index < 10,
          })),
        },
      },
      include: portfolioProjectInclude,
    });

    return this.serialize(portfolioProject);
  }

  async completeDemoPayment(id: string, artistAccountId?: string) {
    const project = await this.readProject(id);
    if (!project) throw new NotFoundException();
    this.assertDraftAccess(project, artistAccountId);
    throw new ForbiddenException("Demo payments cannot confirm a purchase.");
  }

  async createGuestProject(dto: CreateGuestPortfolioProjectDto) { throw new ForbiddenException("Guest drafts are disabled. Use the temporary editor."); }

  async listForArtist(artistAccountId: string, query: ListPortfolioProjectsQueryDto) {
    return this.listProjects(
      {
        artistAccountId,
      },
      query,
    );
  }

  async listForAdmin(query: ListPortfolioProjectsQueryDto) {
    return this.listProjects({}, query);
  }

  async getForArtist(artistAccountId: string, id: string) {
    const portfolioProject = await this.readProject(id);

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    if (portfolioProject.artistAccountId !== artistAccountId) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    return this.serialize(portfolioProject);
  }

  async deleteDraftForArtist(artistAccountId: string, id: string) {
    const portfolioProject = await this.readProject(id);

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    if (portfolioProject.artistAccountId !== artistAccountId) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    if (portfolioProject.status !== PortfolioProjectStatus.DRAFT) {
      throw new BadRequestException("Only draft portfolios can be deleted.");
    }
    if (await this.prisma.portfolioExportUsage.count({ where: { portfolioId: id } })) throw new ConflictException("Portfolio sa evidencijom izvoza se zadržava radi istorije i obračuna.");

    const storagePaths = [
      portfolioProject.profileImageStoragePath,
      portfolioProject.coverImageStoragePath,
      portfolioProject.collectionCoverStoragePath,
      portfolioProject.latestPdfStoragePath,
      ...portfolioProject.artworks.map((artwork) => artwork.storagePath),
      ...portfolioProject.versions.map((version) => version.storagePath),
    ].filter((path): path is string => Boolean(path));

    await this.prisma.portfolioProject.delete({
      where: {
        id,
        artistAccountId,
      },
    });

    await Promise.allSettled(
      storagePaths.map((storagePath) => this.storageService.deleteFile(storagePath)),
    );

    return {
      id,
      deleted: true,
    };
  }

  async getForAdmin(id: string) {
    const portfolioProject = await this.readProject(id);

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    return this.serialize(portfolioProject);
  }

  async getPublic(id: string, artistAccountId?: string) {
    const portfolioProject = await this.readProject(id);

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    this.assertDraftAccess(portfolioProject, artistAccountId);
    return this.serialize(portfolioProject);
  }

  async createShareLink(artistAccountId: string, id: string) {
    await this.getForArtist(artistAccountId, id);
    await this.prisma.portfolioProject.updateMany({
      where: { id, artistAccountId, publicShareToken: null },
      data: { publicShareToken: randomBytes(32).toString("hex") },
    });
    const project = await this.prisma.portfolioProject.findUnique({
      where: { id, artistAccountId },
      select: { publicShareToken: true },
    });
    if (!project?.publicShareToken) throw new NotFoundException("Portfolio project was not found.");
    return { token: project.publicShareToken };
  }

  async revokeShareLink(artistAccountId: string, id: string) {
    await this.getForArtist(artistAccountId, id);
    await this.prisma.portfolioProject.updateMany({ where: { id, artistAccountId }, data: { publicShareToken: null } });
    return { revoked: true };
  }

  private versionUrl(portfolioId: string, versionId?: string) {
    return `/api/portfolio-projects/${portfolioId}/actions/${versionId ? `versions/${versionId}/pdf` : "download-pdf"}`;
  }

  async listVersions(artistAccountId: string, id: string, query: PaginationQueryDto) {
    await this.getForArtist(artistAccountId, id);
    const where = { portfolioId: id };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.portfolioVersion.findMany({ where, orderBy: [{ versionNumber: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.portfolioVersion.count({ where }),
    ]);
    return { items: rows.map(version => ({ ...version, pdfUrl: this.versionUrl(id, version.id) })),
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async downloadVersion(artistAccountId: string, id: string, versionId?: string) {
    const project = await this.readProject(id);
    if (!project || project.artistAccountId !== artistAccountId) throw new NotFoundException("Portfolio nije pronađen.");
    if (versionId && !/^[a-f0-9-]{36}$/i.test(versionId)) throw new NotFoundException("PDF verzija nije pronađena.");
    const version = versionId ? await this.prisma.portfolioVersion.findFirst({ where: { id: versionId, portfolioId: id } }) : null;
    if (versionId && !version) throw new NotFoundException("PDF verzija nije pronađena.");
    const path = version?.storagePath ?? (!versionId ? project.latestPdfStoragePath : null);
    const url = version?.pdfUrl ?? (!versionId ? project.latestPdfUrl : null);
    if (!path || !url) throw new NotFoundException("PDF još nije generisan.");
    const buffer = await this.storageService.readPortfolioPdf({ portfolioId: id, storagePath: path, privateObject: url === `r2-private:${path}` });
    return { buffer, filename: `portfolio-${id}${version ? `-v${version.versionNumber}` : ""}.pdf` };
  }

  async generateSharedPreviewPdf(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new NotFoundException("Shared portfolio was not found.");
    const project = await this.prisma.$transaction(tx => tx.portfolioProject.findUnique({
      where: { publicShareToken: token },
      include: portfolioProjectInclude,
    }), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    if (!project?.artistAccountId) throw new NotFoundException("Shared portfolio was not found.");
    return this.renderPreviewPdf(project);
  }

  async generateAdminPreviewPdf(id: string) {
    const project = await this.readProject(id);
    if (!project) throw new NotFoundException("Portfolio project was not found.");
    return this.renderPreviewPdf(project);
  }

  async updatePublicProject(id: string, dto: UpdatePortfolioProjectDto, artistAccountId?: string) {
    const existingPortfolioProject = await this.readProject(id);

    if (!existingPortfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    this.assertDraftAccess(existingPortfolioProject, artistAccountId);

    this.assertRevision(existingPortfolioProject, dto.expectedRevision);

    const portfolioProject = await this.writeProject({
      where: {
        id,
        artistAccountId: existingPortfolioProject.artistAccountId,
        ...(existingPortfolioProject.collectionSchemaVersion === 2 ? { revision: dto.expectedRevision } : {}),
      },
      data: { ...this.buildProjectUpdateData(dto, existingPortfolioProject),
        ...((dto.documentSelection !== undefined || dto.cvSections !== undefined || dto.designConfig?.minimal !== undefined || (dto.includeCv !== undefined && dto.includeCv !== existingPortfolioProject.includeCv)) ? { latestPdfUrl: null, latestPdfStoragePath: null } : {}),
        ...(existingPortfolioProject.collectionSchemaVersion === 2 ? { revision: { increment: 1 }, latestPdfUrl: null, latestPdfStoragePath: null } : {}) },
      include: portfolioProjectInclude,
    });

    return this.serialize(portfolioProject);
  }

  async updatePublicArtwork(
    portfolioId: string,
    artworkId: string,
    dto: UpdatePortfolioArtworkDto,
    artistAccountId?: string,
  ) {
    const authorizedProject = await this.ensureProjectExists(portfolioId, artistAccountId);
    await this.ensureArtworkBelongsToProject(portfolioId, artworkId);
    this.assertRevision(authorizedProject, dto.expectedRevision);

    const portfolioProject = await this.writeProject({
      where: {
        id: portfolioId,
        artistAccountId: authorizedProject.artistAccountId,
        ...(authorizedProject.collectionSchemaVersion === 2 ? { revision: dto.expectedRevision } : {}),
      },
      data: {
        ...(authorizedProject.collectionSchemaVersion === 2 ? { revision: { increment: 1 }, latestPdfUrl: null, latestPdfStoragePath: null } : {}),
        artworks: {
          update: {
            where: {
              id: artworkId,
            },
            data: this.buildArtworkUpdateData(dto),
          },
        },
      },
      include: portfolioProjectInclude,
    });

    return this.serialize(portfolioProject);
  }

  async uploadPublicArtwork(portfolioId: string, file: Express.Multer.File | undefined, artistAccountId?: string, expectedRevision?: number) {
    const authorizedProject = await this.ensureProjectExists(portfolioId, artistAccountId);
    this.assertRevision(authorizedProject, expectedRevision);
    if (!file) {
      throw new BadRequestException("A file is required for portfolio artwork uploads.");
    }

    const artworkCount = await this.prisma.portfolioArtwork.count({
      where: {
        portfolioId,
      },
    });

    if (artworkCount >= 30) {
      throw new BadRequestException("A portfolio can contain up to 30 artworks in the MVP builder.");
    }

    const uploadedFile = await this.storageService.uploadFile({
      recordId: portfolioId,
      entityType: "portfolio-artwork",
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      body: file.buffer,
    });

    try {
      const nextOrderIndex = await this.getNextArtworkOrderIndex(portfolioId);

      const portfolioProject = await this.writeProject({
        where: {
          id: portfolioId,
          artistAccountId: authorizedProject.artistAccountId,
          ...(authorizedProject.collectionSchemaVersion === 2 ? { revision: expectedRevision } : {}),
        },
        data: {
          ...(authorizedProject.collectionSchemaVersion === 2 ? { revision: { increment: 1 }, latestPdfUrl: null, latestPdfStoragePath: null } : {}),
          artworks: {
            create: {
              imageUrl: uploadedFile.publicUrl,
              storagePath: uploadedFile.path,
              title: this.fileNameToTitle(file.originalname),
              isSelected: true,
              orderIndex: nextOrderIndex,
            },
          },
        },
        include: portfolioProjectInclude,
      });

      return this.serialize(portfolioProject);
    } catch (error) {
      // Upload happened first, so on a DB failure we remove the file from R2
      // to avoid leaving unused objects behind.
      try {
        await this.storageService.deleteFile(uploadedFile.path);
      } catch (cleanupError) {
        console.error("Could not clean up orphaned portfolio artwork object.", cleanupError);
      }

      throw error;
    }
  }

  async uploadPublicProfileImage(portfolioId: string, file: Express.Multer.File | undefined, artistAccountId?: string, expectedRevision?: number) {
    return this.uploadPublicProjectImage(portfolioId, file, {
      entityType: "portfolio-profile",
      missingFileMessage: "A file is required for portfolio profile image uploads.",
      updateData: (uploadedFile) => ({
        profileImageUrl: uploadedFile.publicUrl,
        profileImageStoragePath: uploadedFile.path,
      }),
    }, artistAccountId, expectedRevision);
  }

  async uploadPublicCollectionCover(portfolioId: string, file: Express.Multer.File | undefined, artistAccountId?: string, expectedRevision?: number) {
    return this.uploadPublicProjectImage(portfolioId, file, {
      entityType: "portfolio-collection-cover",
      missingFileMessage: "A file is required for portfolio collection cover uploads.",
      updateData: (uploadedFile) => ({
        collectionCoverUrl: uploadedFile.publicUrl,
        collectionCoverStoragePath: uploadedFile.path,
      }),
    }, artistAccountId, expectedRevision);
  }

  async uploadPublicCoverImage(portfolioId: string, file: Express.Multer.File | undefined, artistAccountId?: string, expectedRevision?: number) {
    return this.uploadPublicProjectImage(portfolioId, file, {
      entityType: "portfolio-cover",
      missingFileMessage: "A file is required for portfolio cover image uploads.",
      updateData: (uploadedFile) => ({
        coverImageUrl: uploadedFile.publicUrl,
        coverImageStoragePath: uploadedFile.path,
      }),
    }, artistAccountId, expectedRevision);
  }

  async generatePublicPdf(id: string, artistAccountId?: string, operationKey?: string) {
    return this.generatePdf(id, { requireCleanAccess: true, artistAccountId, operationKey });
  }

  async generatePdf(id: string, options?: { requireCleanAccess?: boolean; artistAccountId?: string; operationKey?: string }) {
    const project = await this.readProject(id);
    if (!project) throw new NotFoundException("Portfolio nije pronađen.");
    // Admin review uses watermarked preview; it cannot spend another account's quota.
    this.assertDraftAccess(project, options?.artistAccountId);
    if (!project.artistAccountId || !this.commerce) throw new ForbiddenException("PDF izvoz zahtijeva prijavljenog vlasnika.");
    const snapshot = frozenPortfolio(project), hash = contentHash(snapshot), plan = buildPortfolioDocumentPlan(project);
    if (!plan.pages.length) throw new BadRequestException("Izaberi sadržaj za PDF.");
    const usage = await this.commerce.reserve(project.artistAccountId, id, options?.operationKey ?? randomUUID(), hash);
    if (usage.status === "COMMITTED") return this.serialize(project);
    try {
      let pageCount = 0;
      const buffer = await generatePortfolioPdf(project, { onPageCount: count => { pageCount = count; } });
      const uploaded = await this.storageService.uploadFile({ visibility: "private", recordId: id, entityType: "portfolio-pdf", fileName: `${project.artistName}-${plan.documentSelection.scope.toLowerCase()}.pdf`, mimeType: "application/pdf", fileSizeBytes: buffer.length, body: buffer });
      const updated = await this.prisma.$transaction(async tx => {
        // Same lock order as reservation: account before project. A new usage
        // acquires a project FK lock, so reversing these can deadlock in parallel.
        await this.commerce!.lockForFinalization(tx, project.artistAccountId!);
        await tx.$queryRaw`SELECT id FROM "PortfolioProject" WHERE id=${id}::uuid FOR UPDATE`;
        const current = await tx.portfolioProject.findUnique({ where: { id }, include: portfolioProjectInclude });
        if (!current || current.artistAccountId !== project.artistAccountId || contentHash(frozenPortfolio(current)) !== hash) throw new ConflictException("Portfolio je promijenjen tokom izvoza. Pokušaj ponovo.");
        const latest = await tx.portfolioVersion.findFirst({ where: { portfolioId: id }, orderBy: { versionNumber: "desc" } });
        const version = await tx.portfolioVersion.create({ data: { portfolioId: id, versionNumber: (latest?.versionNumber ?? 0) + 1, pdfUrl: uploaded.publicUrl, storagePath: uploaded.path, template: project.template, language: project.language, includeBranding: project.includeBranding,
          documentScope: plan.documentSelection.scope, manifest: snapshot, contentHash: hash, pageCount, artworkCount: plan.artworkCount, sourceRevision: project.revision } });
        await this.commerce!.finish(tx, usage.id, version.id);
        return tx.portfolioProject.update({ where: { id }, data: { latestPdfUrl: uploaded.publicUrl, latestPdfStoragePath: uploaded.path, status: PortfolioProjectStatus.GENERATED }, include: portfolioProjectInclude });
      });
      return this.serialize(updated);
    } catch (error) { await this.commerce.release(usage.id); throw error; }
  }

  async generatePreviewPdf(id: string, artistAccountId?: string) {
    const portfolioProject = await this.readProject(id);

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    this.assertDraftAccess(portfolioProject, artistAccountId);
    return this.renderPreviewPdf(portfolioProject);
  }

  private async renderPreviewPdf(portfolioProject: PortfolioProjectWithRelations) {

    const pdfBuffer = await generatePortfolioPdf(portfolioProject, {
      watermark: true,
    });
    const safeArtistName = portfolioProject.artistName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return {
      buffer: pdfBuffer,
      filename: `${safeArtistName || "portfolio"}-preview.pdf`,
    };
  }

  async generateTransientPreview(id: string, accountId: string, dto: UpdatePortfolioProjectDto) {
    const project = await this.prisma.$transaction(tx => tx.portfolioProject.findFirst({ where: { id, artistAccountId: accountId }, include: portfolioProjectInclude }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    if (!project) throw new NotFoundException("Portfolio nije pronađen.");
    this.assertRevision(project, dto.expectedRevision);
    const data = this.buildProjectUpdateData(dto, project);
    let pageCount = buildPortfolioDocumentPlan(project).pageCount;
    const preview = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    const buffer = await generatePortfolioPdf({ ...project, ...preview } as PortfolioProjectWithRelations, { watermark: true, onPageCount: count => { pageCount = count; } });
    return { buffer, pageCount };
  }

  private async readProject(id: string) {
    return this.prisma.$transaction(tx => tx.portfolioProject.findUnique({ where: { id }, include: portfolioProjectInclude }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private async writeProject(args: Prisma.PortfolioProjectUpdateArgs) {
    try { return await this.prisma.portfolioProject.update({ ...args, include: portfolioProjectInclude }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new ConflictException("Portfolio je promijenjen. Osvježi editor.");
      throw error;
    }
  }

  private assertRevision(project: { collectionSchemaVersion?: number; revision?: number }, expectedRevision?: number) {
    if (project.collectionSchemaVersion === 2 && (expectedRevision === undefined || project.revision !== expectedRevision)) {
      throw new ConflictException("Portfolio je promijenjen. Osvježi editor i ponovo potvrdi izmjenu.");
    }
  }

  async generateCoverTestPdf(id: string, artistAccountId?: string) {
    const portfolioProject = await this.readProject(id);

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    this.assertDraftAccess(portfolioProject, artistAccountId);

    const pdfBuffer = await generateSelectedTemplateTestPdf(portfolioProject, { watermark: true });
    const safeArtistName = portfolioProject.artistName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return {
      buffer: pdfBuffer,
      filename: `${safeArtistName || "portfolio"}-cover-test.pdf`,
    };
  }

  private async listProjects(
    whereBase: Prisma.PortfolioProjectWhereInput,
    query: ListPortfolioProjectsQueryDto,
  ): Promise<PaginatedResponse<unknown>> {
    const where = this.buildWhere(whereBase, query);
    const page = query.page;
    const pageSize = query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.portfolioProject.findMany({
        where,
        include: portfolioProjectInclude,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.portfolioProject.count({ where }),
    ]);

    return {
      items: await Promise.all(items.map((item) => this.serialize(item))),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  private buildWhere(
    whereBase: Prisma.PortfolioProjectWhereInput,
    query: ListPortfolioProjectsQueryDto,
  ): Prisma.PortfolioProjectWhereInput {
    const andFilters: Prisma.PortfolioProjectWhereInput[] = [whereBase];

    if (query.search) {
      andFilters.push({
        OR: [
          {
            artistName: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            title: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    return {
      AND: andFilters,
    };
  }

  private async ensureProjectExists(id: string, artistAccountId?: string) {
    const existingProject = await this.prisma.portfolioProject.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        artistAccountId: true,
        source: true,
        collectionSchemaVersion: true,
        revision: true,
      },
    });

    if (!existingProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }
    this.assertDraftAccess(existingProject, artistAccountId);
    return existingProject;
  }

  private assertDraftAccess(
    project: { artistAccountId: string | null; source: PortfolioProjectSource },
    artistAccountId?: string,
  ) {
    if (project.artistAccountId) {
      if (!artistAccountId) throw new UnauthorizedException("Artist authentication is required.");
      if (project.artistAccountId !== artistAccountId) {
        throw new NotFoundException("Portfolio project was not found.");
      }
      return;
    }
    throw new NotFoundException("Portfolio project was not found.");
  }

  private async ensureArtworkBelongsToProject(portfolioId: string, artworkId: string) {
    const existingArtwork = await this.prisma.portfolioArtwork.findFirst({
      where: {
        id: artworkId,
        portfolioId,
      },
      select: {
        id: true,
      },
    });

    if (!existingArtwork) {
      throw new NotFoundException("Portfolio artwork was not found.");
    }
  }

  private async getNextArtworkOrderIndex(portfolioId: string) {
    const latestArtwork = await this.prisma.portfolioArtwork.findFirst({
      where: {
        portfolioId,
      },
      orderBy: {
        orderIndex: "desc",
      },
      select: {
        orderIndex: true,
      },
    });

    return latestArtwork ? latestArtwork.orderIndex + 1 : 0;
  }

  private fileNameToTitle(fileName: string) {
    const withoutExtension = fileName.replace(/\.[^.]+$/, "");
    const normalizedTitle = withoutExtension.replace(/[-_]+/g, " ").trim();
    return normalizedTitle || "Novi rad";
  }

  private async uploadPublicProjectImage(
    portfolioId: string,
    file: Express.Multer.File | undefined,
    options: {
      entityType: UploadEntityType;
      missingFileMessage: string;
      updateData: (uploadedFile: { publicUrl: string; path: string }) => Prisma.PortfolioProjectUpdateInput;
    },
    artistAccountId?: string,
    expectedRevision?: number,
  ) {
    const authorizedProject = await this.ensureProjectExists(portfolioId, artistAccountId);
    this.assertRevision(authorizedProject, expectedRevision);
    if (!file) {
      throw new BadRequestException(options.missingFileMessage);
    }

    const uploadedFile = await this.storageService.uploadFile({
      recordId: portfolioId,
      entityType: options.entityType,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      body: file.buffer,
    });

    try {
      const portfolioProject = await this.writeProject({
        where: {
          id: portfolioId,
          artistAccountId: authorizedProject.artistAccountId,
          ...(authorizedProject.collectionSchemaVersion === 2 ? { revision: expectedRevision } : {}),
        },
        data: { ...options.updateData(uploadedFile), ...(authorizedProject.collectionSchemaVersion === 2 ? { revision: { increment: 1 }, latestPdfUrl: null, latestPdfStoragePath: null } : {}) },
        include: portfolioProjectInclude,
      });

      return this.serialize(portfolioProject);
    } catch (error) {
      try {
        await this.storageService.deleteFile(uploadedFile.path);
      } catch (cleanupError) {
        console.error("Could not clean up orphaned portfolio media object.", cleanupError);
      }

      throw error;
    }
  }

  private buildProjectUpdateData(
    dto: UpdatePortfolioProjectDto,
    existingProject: PortfolioProjectWithRelations,
  ): Prisma.PortfolioProjectUpdateInput {
    let nextDesignConfig = this.buildDesignConfigUpdateData(dto.designConfig, existingProject);
    if (dto.documentSelection !== undefined) {
      if (!existingProject.artistAccountId) throw new UnauthorizedException("Izbor PDF stranica zahtijeva prijavljenog vlasnika.");
      let selection;
      try { selection = parseDocumentSelection(dto.documentSelection); }
      catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Neispravan izbor PDF-a."); }
      const config = nextDesignConfig ?? existingProject.designConfig ?? {
        mode: "PRESET", pages: Object.fromEntries(portfolioDesignPageKeys.map(key => [key, existingProject.template])),
        footer: existingProject.template === "ARTBOARD_EDITORIAL" ? "ARTBOARD" : existingProject.template === "SALES_PRO" ? "SALES" : "MINIMAL",
      };
      nextDesignConfig = { ...(typeof config === "object" && !Array.isArray(config) ? config : {}), documentSelection: selection };
    }
    if (dto.includeCv === false && dto.documentSelection === undefined && getDocumentSelection(existingProject).scope === "CV") {
      const config = nextDesignConfig ?? existingProject.designConfig;
      if (config && typeof config === "object" && !Array.isArray(config)) nextDesignConfig = { ...config, documentSelection: { ...getDocumentSelection(existingProject), scope: "PORTFOLIO" } };
    }
    let cvSections: Prisma.InputJsonValue | undefined;
    if (dto.cvSections !== undefined) {
      if (!existingProject.artistAccountId) throw new UnauthorizedException("Čuvanje CV-a zahtijeva prijavljenog vlasnika.");
      try { cvSections = parsePortfolioCv(dto.cvSections); }
      catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Neispravan CV."); }
    }
    if (existingProject.collectionSchemaVersion === 2) {
      const prefix = `${env.r2PublicUrl.replace(/\/+$/, "")}/portfolio-projects/${existingProject.id}/`;
      for (const value of [dto.profileImageUrl, dto.coverImageUrl, dto.collectionCoverUrl]) {
        if (value && !value.startsWith(prefix)) throw new BadRequestException("Portfolio slike moraju pripadati ovom projektu.");
      }
    }
    if (nextDesignConfig !== undefined || dto.includeCv !== undefined || cvSections !== undefined) {
      const preview = { ...existingProject, designConfig: nextDesignConfig ?? existingProject.designConfig,
        includeCv: dto.includeCv ?? existingProject.includeCv, cvSections: cvSections ?? existingProject.cvSections };
      if (!buildPortfolioDocumentPlan(preview).pageCount) throw new BadRequestException("Izabrane PDF sekcije nemaju sadržaj.");
    }
    return {
      title: this.optionalRequiredString(dto.title),
      artistName: this.optionalRequiredString(dto.artistName),
      discipline: this.optionalString(dto.discipline),
      location: this.optionalString(dto.location),
      email: this.optionalString(dto.email),
      phone: this.optionalString(dto.phone),
      dateOfBirth: dto.dateOfBirth === undefined ? undefined : dto.dateOfBirth ? new Date(`${dto.dateOfBirth}T00:00:00.000Z`) : null,
      behanceUrl: dto.behanceUrl === undefined ? undefined : normalizeBehanceUrl(dto.behanceUrl) || null,
      motto: this.optionalString(dto.motto),
      mottoAuthor: this.optionalString(dto.mottoAuthor),
      websiteUrl: this.optionalString(dto.websiteUrl),
      instagramUrl: this.optionalString(dto.instagramUrl),
      profileImageUrl: this.optionalString(dto.profileImageUrl),
      profileImageStoragePath: dto.profileImageUrl !== undefined && dto.profileImageUrl.trim() !== existingProject.profileImageUrl
        ? existingProject.artworks.find(w => w.imageUrl === dto.profileImageUrl)?.storagePath ?? existingProject.collections?.find(c => c.coverImageUrl === dto.profileImageUrl)?.coverImageStoragePath ?? null : undefined,
      coverImageUrl: this.optionalString(dto.coverImageUrl),
      coverImageStoragePath: dto.coverImageUrl !== undefined && dto.coverImageUrl.trim() !== existingProject.coverImageUrl
        ? existingProject.artworks.find(w => w.imageUrl === dto.coverImageUrl)?.storagePath ?? existingProject.collections?.find(c => c.coverImageUrl === dto.coverImageUrl)?.coverImageStoragePath ?? null : undefined,
      collectionName: this.optionalString(dto.collectionName),
      collectionYear: this.optionalString(dto.collectionYear),
      collectionDescription: this.optionalString(dto.collectionDescription),
      collectionCoverUrl: this.optionalString(dto.collectionCoverUrl),
      biography: this.optionalString(dto.biography),
      artistStatement: this.optionalString(dto.artistStatement),
      template: dto.template,
      language: dto.language,
      pageFormat: dto.pageFormat,
      fontStyle: dto.fontStyle,
      includeBranding: dto.includeBranding,
      includeCv: dto.includeCv,
      cvSections,
      includePrices: dto.includePrices,
      designConfig: nextDesignConfig,
    };
  }

  /**
   * Custom page-by-page design selection is a premium capability.
   *
   * We validate this on the backend because the public builder endpoint is also
   * used by guest projects. Frontend locks are useful UX, but they are not
   * business rules.
   */
  private buildDesignConfigUpdateData(
    value: Record<string, unknown> | undefined,
    existingProject: PortfolioProjectWithRelations,
  ): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value.mode !== "PRESET" && value.mode !== "CUSTOM") {
      throw new BadRequestException("Portfolio design config mode must be PRESET or CUSTOM.");
    }

    if (value.mode === "CUSTOM" && !this.isActivePlatinumProject(existingProject)) {
      throw new ForbiddenException("Custom portfolio design mixing is available only to Platinum artists.");
    }

    const pages = value.pages;

    if (!pages || typeof pages !== "object" || Array.isArray(pages)) {
      throw new BadRequestException("Portfolio design config must include a pages object.");
    }

    const normalizedPages: Record<string, PortfolioTemplate> = {};

    for (const key of portfolioDesignPageKeys) {
      const selectedTemplate = (pages as Record<string, unknown>)[key];

      if (!portfolioTemplateValues.includes(selectedTemplate as PortfolioTemplate)) {
        throw new BadRequestException(`Portfolio design page "${key}" must use a supported template.`);
      }

      normalizedPages[key] = selectedTemplate as PortfolioTemplate;
    }

    const selectedFooter = value.footer;

    if (!portfolioFooterValues.includes(selectedFooter as (typeof portfolioFooterValues)[number])) {
      throw new BadRequestException("Portfolio design config footer must use a supported footer.");
    }

    const normalizedFooter = selectedFooter as (typeof portfolioFooterValues)[number];
    let minimal: ReturnType<typeof parseMinimalDesign> | undefined;
    const previousMinimal = existingProject.designConfig && typeof existingProject.designConfig === "object" && !Array.isArray(existingProject.designConfig) ? existingProject.designConfig.minimal : undefined;
    if (value.minimal !== undefined || previousMinimal !== undefined) {
      try { minimal = parseMinimalDesign(value.minimal ?? previousMinimal); }
      catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Neispravna naslovnica."); }
    }

    return {
      mode: value.mode,
      pages: normalizedPages,
      footer: normalizedFooter,
      ...(minimal ? { minimal } : {}),
      ...(existingProject.designConfig && typeof existingProject.designConfig === "object" && !Array.isArray(existingProject.designConfig) && existingProject.designConfig.documentSelection
        ? { documentSelection: existingProject.designConfig.documentSelection } : {}),
    };
  }

  private buildArtworkUpdateData(dto: UpdatePortfolioArtworkDto): Prisma.PortfolioArtworkUpdateInput {
    return {
      title: this.optionalString(dto.title),
      collectionName: this.optionalString(dto.collectionName),
      year: this.optionalString(dto.year),
      technique: this.optionalString(dto.technique),
      dimensions: this.optionalString(dto.dimensions),
      description: this.optionalString(dto.description),
      availability: dto.availability,
      price: this.optionalString(dto.price),
      isSelected: dto.isSelected,
      orderIndex: dto.orderIndex,
    };
  }

  private optionalString(value: string | undefined) {
    if (value === undefined) {
      return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  private optionalRequiredString(value: string | undefined) {
    if (value === undefined) {
      return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : undefined;
  }

  async serialize(project: PortfolioProjectWithRelations) {
    if (!project.artistName) {
      throw new BadRequestException("Portfolio project is missing artist name.");
    }

    const quota = project.artistAccountId && this.commerce ? await this.commerce.entitlement(project.artistAccountId) : null;
    const canDownloadCleanPdf = quota ? quota.remaining > 0 : this.canDownloadCleanPdf(project);
    const plan = buildPortfolioDocumentPlan(project);

    return {
      ...project,
      latestPdfUrl: project.artistAccountId && project.latestPdfUrl ? this.versionUrl(project.id) : project.latestPdfUrl,
      versions: project.versions.map(version => ({ ...version, pdfUrl: project.artistAccountId ? this.versionUrl(project.id, version.id) : version.pdfUrl })),
      documentSelection: getDocumentSelection(project),
      collectionsAvailable: env.portfolioCollectionsEnabled && Boolean(project.artistAccountId),
      dateOfBirth: project.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      access: {
        ...(quota ? { quota } : {}),
        canGeneratePdf: canDownloadCleanPdf,
        privatePdfStorageReady: Boolean(env.r2PrivatePdfBucketName && env.r2PrivatePdfBucketName !== env.r2BucketName),
        localTestExportAvailable: env.nodeEnv === "development",
        canDownloadCleanPdf: canDownloadCleanPdf || project.versions.length > 0,
        requiresPayment: !canDownloadCleanPdf,
        reason: quota ? (quota.plan === "PREMIUM" ? "PREMIUM" : quota.remaining > 0 ? "FREE" : "PAYMENT_REQUIRED") : canDownloadCleanPdf
          ? this.isActivePlatinumProject(project)
            ? "PREMIUM"
            : "PAID"
          : "PAYMENT_REQUIRED",
      },
      counts: {
        artworks: project.artworks.length,
        selectedArtworks: plan.artworkCount,
        collections: plan.collectionCount,
        pages: plan.pageCount,
        versions: project._count?.versions ?? project.versions.length,
        payments: project.payments.length,
      },
    };
  }

  private canDownloadCleanPdf(project: PortfolioProjectWithRelations) {
    return project.paymentStatus === PortfolioPaymentStatus.PAID || this.isActivePlatinumProject(project);
  }

  private isActivePlatinumProject(project: PortfolioProjectWithRelations) {
    return hasPremiumAccess(project.artistAccount?.subscription);
  }
}
