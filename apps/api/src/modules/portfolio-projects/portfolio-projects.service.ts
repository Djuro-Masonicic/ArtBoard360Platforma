import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  PortfolioPaymentStatus,
  PortfolioProjectStatus,
  PortfolioProjectSource,
  SubscriptionPlan,
  SubscriptionStatus,
  Prisma,
} from "@prisma/client";

import { PaginatedResponse } from "../../common/dto/pagination-query.dto";
import { env } from "../../config/env";
import { PrismaService } from "../../prisma/prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import type { UploadEntityType } from "../../storage/storage.types";
import {
  CreateGuestPortfolioProjectDto,
  ListPortfolioProjectsQueryDto,
  UpdatePortfolioArtworkDto,
  UpdatePortfolioProjectDto,
} from "./portfolio-projects.dto";
import {
  generateInstitutionalCoverPdf,
} from "./portfolio-pdf.generator";

const portfolioProjectInclude = Prisma.validator<Prisma.PortfolioProjectInclude>()({
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

@Injectable()
export class PortfolioProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: R2StorageService,
  ) {}

  async createFromArtistProfile(artistAccountId: string) {
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
    const discipline = artist.disciplines.map((item) => item.discipline.name).join(", ") || null;
    const instagramLink = artist.socialLinks.find((link) => link.platform === "INSTAGRAM")?.url ?? null;
    const websiteLink = artist.socialLinks.find((link) => link.platform === "PERSONAL_WEBSITE")?.url ?? null;
    const featuredArtwork = artist.artworks.find((artwork) => artwork.isFeatured) ?? artist.artworks[0];
    const defaultCoverImageUrl =
      artist.coverImageUrl ?? featuredArtwork?.imageUrl ?? artist.thumbnailUrl;
    const hasActivePlatinum =
      artistAccount.subscription?.plan === SubscriptionPlan.PLATINUM &&
      artistAccount.subscription.status === SubscriptionStatus.ACTIVE;

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
        websiteUrl: websiteLink,
        instagramUrl: instagramLink,
        artboardProfileUrl: `${env.siteBaseUrl}/artists/${artist.slug}`,
        profileImageUrl: artist.profileImageUrl ?? artist.profileThumbnailUrl,
        coverImageUrl: defaultCoverImageUrl,
        collectionName: `${artist.name} - izabrani radovi`,
        collectionYear: String(new Date().getFullYear()),
        collectionCoverUrl: defaultCoverImageUrl,
        biography: artist.bio,
        artistStatement: artist.quote,
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

  async completeDemoPayment(id: string) {
    const portfolioProject = await this.prisma.portfolioProject.findUnique({
      where: {
        id,
      },
      include: portfolioProjectInclude,
    });

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    if (this.canDownloadCleanPdf(portfolioProject)) {
      return this.serialize(portfolioProject);
    }

    const paidProject = await this.prisma.$transaction(async (tx) => {
      await tx.portfolioPayment.create({
        data: {
          portfolioId: id,
          status: PortfolioPaymentStatus.PAID,
          amountCents: 1900,
          currency: "EUR",
          provider: "demo-card",
          providerRef: `demo-portfolio-${Date.now()}`,
          paidAt: new Date(),
        },
      });

      return tx.portfolioProject.update({
        where: {
          id,
        },
        data: {
          status: PortfolioProjectStatus.PAID,
          paymentStatus: PortfolioPaymentStatus.PAID,
        },
        include: portfolioProjectInclude,
      });
    });

    return this.serialize(paidProject);
  }

  async createGuestProject(dto: CreateGuestPortfolioProjectDto) {
    const portfolioProject = await this.prisma.portfolioProject.create({
      data: {
        source: PortfolioProjectSource.GUEST,
        paymentStatus: PortfolioPaymentStatus.REQUIRED,
        title: `${dto.artistName} Portfolio`,
        artistName: dto.artistName,
        discipline: dto.discipline ?? null,
        location: dto.location ?? null,
        email: dto.email,
        collectionName: `${dto.artistName} - izabrani radovi`,
        collectionYear: String(new Date().getFullYear()),
      },
      include: portfolioProjectInclude,
    });

    return this.serialize(portfolioProject);
  }

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
    const portfolioProject = await this.prisma.portfolioProject.findUnique({
      where: {
        id,
      },
      include: portfolioProjectInclude,
    });

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    if (portfolioProject.artistAccountId !== artistAccountId) {
      throw new ForbiddenException("You can only open your own portfolio projects.");
    }

    return this.serialize(portfolioProject);
  }

  async deleteDraftForArtist(artistAccountId: string, id: string) {
    const portfolioProject = await this.prisma.portfolioProject.findUnique({
      where: {
        id,
      },
      include: portfolioProjectInclude,
    });

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    if (portfolioProject.artistAccountId !== artistAccountId) {
      throw new ForbiddenException("You can only delete your own portfolio drafts.");
    }

    if (portfolioProject.status !== PortfolioProjectStatus.DRAFT) {
      throw new BadRequestException("Only draft portfolios can be deleted.");
    }

    const storagePaths = [
      portfolioProject.profileImageStoragePath,
      portfolioProject.collectionCoverStoragePath,
      portfolioProject.latestPdfStoragePath,
      ...portfolioProject.artworks.map((artwork) => artwork.storagePath),
      ...portfolioProject.versions.map((version) => version.storagePath),
    ].filter((path): path is string => Boolean(path));

    await this.prisma.portfolioProject.delete({
      where: {
        id,
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
    const portfolioProject = await this.prisma.portfolioProject.findUnique({
      where: {
        id,
      },
      include: portfolioProjectInclude,
    });

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    return this.serialize(portfolioProject);
  }

  async getPublic(id: string) {
    const portfolioProject = await this.prisma.portfolioProject.findUnique({
      where: {
        id,
      },
      include: portfolioProjectInclude,
    });

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    return this.serialize(portfolioProject);
  }

  async updatePublicProject(id: string, dto: UpdatePortfolioProjectDto) {
    await this.ensureProjectExists(id);

    const portfolioProject = await this.prisma.portfolioProject.update({
      where: {
        id,
      },
      data: this.buildProjectUpdateData(dto),
      include: portfolioProjectInclude,
    });

    return this.serialize(portfolioProject);
  }

  async updatePublicArtwork(
    portfolioId: string,
    artworkId: string,
    dto: UpdatePortfolioArtworkDto,
  ) {
    await this.ensureArtworkBelongsToProject(portfolioId, artworkId);

    const portfolioProject = await this.prisma.portfolioProject.update({
      where: {
        id: portfolioId,
      },
      data: {
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

  async uploadPublicArtwork(portfolioId: string, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException("A file is required for portfolio artwork uploads.");
    }

    await this.ensureProjectExists(portfolioId);

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

      const portfolioProject = await this.prisma.portfolioProject.update({
        where: {
          id: portfolioId,
        },
        data: {
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

  async uploadPublicProfileImage(portfolioId: string, file: Express.Multer.File | undefined) {
    return this.uploadPublicProjectImage(portfolioId, file, {
      entityType: "portfolio-profile",
      missingFileMessage: "A file is required for portfolio profile image uploads.",
      updateData: (uploadedFile) => ({
        profileImageUrl: uploadedFile.publicUrl,
        profileImageStoragePath: uploadedFile.path,
      }),
    });
  }

  async uploadPublicCollectionCover(portfolioId: string, file: Express.Multer.File | undefined) {
    return this.uploadPublicProjectImage(portfolioId, file, {
      entityType: "portfolio-collection-cover",
      missingFileMessage: "A file is required for portfolio collection cover uploads.",
      updateData: (uploadedFile) => ({
        collectionCoverUrl: uploadedFile.publicUrl,
        collectionCoverStoragePath: uploadedFile.path,
      }),
    });
  }

  async generatePdf(id: string, options?: { requireCleanAccess?: boolean }) {
    const portfolioProject = await this.prisma.portfolioProject.findUnique({
      where: {
        id,
      },
      include: portfolioProjectInclude,
    });

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    if (options?.requireCleanAccess && !this.canDownloadCleanPdf(portfolioProject)) {
      throw new ForbiddenException("This portfolio must be paid or premium before generating a clean PDF.");
    }

    const pdfBuffer = await generateInstitutionalCoverPdf(portfolioProject);
    const uploadedPdf = await this.storageService.uploadFile({
      recordId: portfolioProject.id,
      entityType: "portfolio-pdf",
      fileName: `${portfolioProject.artistName}-portfolio.pdf`,
      mimeType: "application/pdf",
      fileSizeBytes: pdfBuffer.length,
      body: pdfBuffer,
    });

    try {
      const updatedPortfolioProject = await this.prisma.$transaction(async (tx) => {
        const latestVersion = await tx.portfolioVersion.findFirst({
          where: {
            portfolioId: portfolioProject.id,
          },
          orderBy: {
            versionNumber: "desc",
          },
          select: {
            versionNumber: true,
          },
        });

        const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

        await tx.portfolioVersion.create({
          data: {
            portfolioId: portfolioProject.id,
            versionNumber: nextVersionNumber,
            pdfUrl: uploadedPdf.publicUrl,
            storagePath: uploadedPdf.path,
            template: portfolioProject.template,
            language: portfolioProject.language,
            includeBranding: portfolioProject.includeBranding,
          },
        });

        return tx.portfolioProject.update({
          where: {
            id: portfolioProject.id,
          },
          data: {
            latestPdfUrl: uploadedPdf.publicUrl,
            latestPdfStoragePath: uploadedPdf.path,
            status:
              portfolioProject.status === PortfolioProjectStatus.PAID
                ? PortfolioProjectStatus.PAID
                : PortfolioProjectStatus.GENERATED,
          },
          include: portfolioProjectInclude,
        });
      });

      return this.serialize(updatedPortfolioProject);
    } catch (error) {
      try {
        await this.storageService.deleteFile(uploadedPdf.path);
      } catch (cleanupError) {
        console.error("Could not clean up generated portfolio PDF after DB failure.", cleanupError);
      }

      throw error;
    }
  }

  async generatePreviewPdf(id: string) {
    const portfolioProject = await this.prisma.portfolioProject.findUnique({
      where: {
        id,
      },
      include: portfolioProjectInclude,
    });

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    const pdfBuffer = await generateInstitutionalCoverPdf(portfolioProject, {
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

  async generateCoverTestPdf(id: string) {
    const portfolioProject = await this.prisma.portfolioProject.findUnique({
      where: {
        id,
      },
      include: portfolioProjectInclude,
    });

    if (!portfolioProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }

    const pdfBuffer = await generateInstitutionalCoverPdf(portfolioProject);
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
      items: items.map((item) => this.serialize(item)),
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

  private async ensureProjectExists(id: string) {
    const existingProject = await this.prisma.portfolioProject.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existingProject) {
      throw new NotFoundException("Portfolio project was not found.");
    }
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
  ) {
    if (!file) {
      throw new BadRequestException(options.missingFileMessage);
    }

    await this.ensureProjectExists(portfolioId);

    const uploadedFile = await this.storageService.uploadFile({
      recordId: portfolioId,
      entityType: options.entityType,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      body: file.buffer,
    });

    try {
      const portfolioProject = await this.prisma.portfolioProject.update({
        where: {
          id: portfolioId,
        },
        data: options.updateData(uploadedFile),
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

  private buildProjectUpdateData(dto: UpdatePortfolioProjectDto): Prisma.PortfolioProjectUpdateInput {
    return {
      title: this.optionalRequiredString(dto.title),
      artistName: this.optionalRequiredString(dto.artistName),
      discipline: this.optionalString(dto.discipline),
      location: this.optionalString(dto.location),
      email: this.optionalString(dto.email),
      phone: this.optionalString(dto.phone),
      websiteUrl: this.optionalString(dto.websiteUrl),
      instagramUrl: this.optionalString(dto.instagramUrl),
      profileImageUrl: this.optionalString(dto.profileImageUrl),
      coverImageUrl: this.optionalString(dto.coverImageUrl),
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
      includePrices: dto.includePrices,
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

  private serialize(project: PortfolioProjectWithRelations) {
    if (!project.artistName) {
      throw new BadRequestException("Portfolio project is missing artist name.");
    }

    const canDownloadCleanPdf = this.canDownloadCleanPdf(project);

    return {
      ...project,
      access: {
        canDownloadCleanPdf,
        requiresPayment: !canDownloadCleanPdf,
        reason: canDownloadCleanPdf
          ? this.isActivePlatinumProject(project)
            ? "PREMIUM"
            : "PAID"
          : "PAYMENT_REQUIRED",
      },
      counts: {
        artworks: project.artworks.length,
        selectedArtworks: project.artworks.filter((artwork) => artwork.isSelected).length,
        versions: project.versions.length,
        payments: project.payments.length,
      },
    };
  }

  private canDownloadCleanPdf(project: PortfolioProjectWithRelations) {
    return project.paymentStatus === PortfolioPaymentStatus.PAID || this.isActivePlatinumProject(project);
  }

  private isActivePlatinumProject(project: PortfolioProjectWithRelations) {
    return (
      project.artistAccount?.subscription?.plan === SubscriptionPlan.PLATINUM &&
      project.artistAccount.subscription.status === SubscriptionStatus.ACTIVE
    );
  }
}
