import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ArtistSubmissionStatus, Prisma, SocialPlatform } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { PaginatedResponse } from "../../common/dto/pagination-query.dto";
import { createSlug } from "../../common/utils/text";
import { AuthService } from "../auth/auth.service";
import { env } from "../../config/env";
import { ResendMailService } from "../../mail/resend-mail.service";
import { PrismaService } from "../../prisma/prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import {
  CreateArtistSubmissionDto,
  ListArtistSubmissionsQueryDto,
  UpdateArtistSubmissionDto,
} from "./artist-submissions.dto";

interface ArtistSubmissionFiles {
  portfolioPdf?: Express.Multer.File[];
  profilePhoto?: Express.Multer.File[];
  featuredWorks?: Express.Multer.File[];
}

interface UploadedSubmissionFile {
  path: string;
  publicUrl: string;
}

const artistSubmissionInclude = {
  portfolioLinks: {
    orderBy: {
      createdAt: "asc",
    },
  },
  socialLinks: {
    orderBy: {
      createdAt: "asc",
    },
  },
  disciplines: {
    include: {
      discipline: true,
    },
    orderBy: {
      discipline: {
        name: "asc",
      },
    },
  },
  artworks: {
    orderBy: {
      orderIndex: "asc",
    },
  },
  approvedArtist: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.ArtistSubmissionInclude;

@Injectable()
export class ArtistSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: R2StorageService,
    private readonly resendMailService: ResendMailService,
    private readonly authService: AuthService,
  ) {}

  async listSubmissions(
    query: ListArtistSubmissionsQueryDto,
  ): Promise<PaginatedResponse<ReturnType<ArtistSubmissionsService["serializeSubmission"]>>> {
    const page = query.page;
    const pageSize = query.pageSize;
    const where = this.buildListWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.artistSubmission.findMany({
        where,
        include: artistSubmissionInclude,
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            fullName: "asc",
          },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.artistSubmission.count({ where }),
    ]);

    return {
      items: items.map((item) => this.serializeSubmission(item)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getSubmissionById(id: string) {
    const submission = await this.prisma.artistSubmission.findUnique({
      where: { id },
      include: artistSubmissionInclude,
    });

    if (!submission) {
      throw new NotFoundException(`Submission with id "${id}" was not found.`);
    }

    return this.serializeSubmission(submission);
  }

  async createSubmission(dto: CreateArtistSubmissionDto, files: ArtistSubmissionFiles) {
    const submissionId = randomUUID();
    const uploadedFiles: UploadedSubmissionFile[] = [];
    let persisted = false;

    const trimmedPortfolioLinks = normalizeUniqueStrings(dto.portfolioLinks);
    const trimmedSocialLinks = normalizeUniqueStrings(dto.socialLinks);
    const disciplineSlugs = normalizeUniqueStrings(dto.disciplines);

    this.validateDtoState(dto, trimmedPortfolioLinks, trimmedSocialLinks, disciplineSlugs, files);

    const disciplines = await this.prisma.discipline.findMany({
      where: {
        slug: {
          in: disciplineSlugs,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (disciplines.length !== disciplineSlugs.length) {
      throw new BadRequestException("One or more selected disciplines are not valid.");
    }

    try {
      await sleep(300);

      const uploadedPortfolioPdf = await this.uploadPortfolioPdfIfPresent(
        submissionId,
        files.portfolioPdf?.[0],
        uploadedFiles,
      );
      const uploadedProfilePhoto = await this.uploadRequiredProfilePhoto(
        submissionId,
        files.profilePhoto?.[0],
        uploadedFiles,
      );
      const uploadedArtworks = await this.uploadArtworkFiles(
        submissionId,
        files.featuredWorks ?? [],
        uploadedFiles,
      );
      const now = new Date();

      const submission = await this.prisma.$transaction(async (tx) => {
        const createdSubmission = await tx.artistSubmission.create({
          data: {
            id: submissionId,
            fullName: dto.fullName.trim(),
            email: dto.email.trim(),
            phone: dto.phone?.trim() || null,
            biography: dto.biography.trim(),
            motto: dto.motto?.trim() || null,
            blogUrl: dto.blogUrl?.trim() || null,
            notes: dto.notes?.trim() || null,
            confirmedRules: dto.confirmedRules,
            portfolioPdfUrl: uploadedPortfolioPdf?.publicUrl ?? null,
            portfolioPdfStoragePath: uploadedPortfolioPdf?.path ?? null,
            profilePhotoUrl: uploadedProfilePhoto.publicUrl,
            profilePhotoStoragePath: uploadedProfilePhoto.path,
          },
        });

        if (trimmedPortfolioLinks.length > 0) {
          await tx.artistSubmissionPortfolioLink.createMany({
            data: trimmedPortfolioLinks.map((url) => ({
              submissionId,
              url,
              updatedAt: now,
            })),
          });
        }

        if (trimmedSocialLinks.length > 0) {
          await tx.artistSubmissionSocialLink.createMany({
            data: trimmedSocialLinks.map((url) => ({
              submissionId,
              url,
              updatedAt: now,
            })),
          });
        }

        if (disciplines.length > 0) {
          await tx.artistSubmissionDiscipline.createMany({
            data: disciplines.map((discipline) => ({
              submissionId,
              disciplineId: discipline.id,
            })),
          });
        }

        if (uploadedArtworks.length > 0) {
          await tx.artistSubmissionArtwork.createMany({
            data: uploadedArtworks.map((artwork, index) => ({
              submissionId,
              imageUrl: artwork.publicUrl,
              storagePath: artwork.path,
              originalFileName: artwork.originalFileName,
              mimeType: artwork.mimeType,
              fileSizeBytes: artwork.fileSizeBytes,
              orderIndex: index,
              updatedAt: now,
            })),
          });
        }

        return createdSubmission;
      });

      persisted = true;

      let emailNotificationSent = true;

      try {
        await this.resendMailService.sendArtistSubmissionNotification({
          submissionId: submission.id,
          fullName: submission.fullName,
          email: submission.email,
          phone: submission.phone,
          biography: submission.biography,
          motto: submission.motto,
          blogUrl: submission.blogUrl,
          notes: submission.notes,
          disciplines: disciplines.map((discipline) => discipline.name),
          portfolioLinks: trimmedPortfolioLinks,
          socialLinks: trimmedSocialLinks,
          portfolioPdfUrl: uploadedPortfolioPdf?.publicUrl ?? null,
          profilePhotoUrl: uploadedProfilePhoto.publicUrl,
          artworkUrls: uploadedArtworks.map((artwork) => artwork.publicUrl),
          submittedAt: submission.createdAt,
        });
      } catch (error) {
        emailNotificationSent = false;
        console.error("Artist submission was stored, but the admin notification email failed.", error);
      }

      return {
        success: true,
        submissionId: submission.id,
        status: submission.status,
        emailNotificationSent,
        message: emailNotificationSent
          ? "Prijava je uspjesno poslata."
          : "Prijava je sacuvana, ali email obavjestenje nije poslato.",
      };
    } catch (error) {
      if (!persisted && uploadedFiles.length > 0) {
        await Promise.all(
          uploadedFiles.map(async (file) => {
            try {
              await this.storageService.deleteFile(file.path);
            } catch (cleanupError) {
              console.error("Could not clean up uploaded submission file after a failure.", cleanupError);
            }
          }),
        );
      }

      throw error;
    }
  }

  async updateSubmission(id: string, dto: UpdateArtistSubmissionDto) {
    const existingSubmission = await this.prisma.artistSubmission.findUnique({
      where: { id },
      include: artistSubmissionInclude,
    });

    if (!existingSubmission) {
      throw new NotFoundException(`Submission with id "${id}" was not found.`);
    }

    const trimmedPortfolioLinks = normalizeUniqueStrings(dto.portfolioLinks);
    const trimmedSocialLinks = normalizeUniqueStrings(dto.socialLinks);
    const disciplineSlugs = normalizeUniqueStrings(dto.disciplines);

    if (disciplineSlugs.length === 0 || disciplineSlugs.length > 3) {
      throw new BadRequestException("Select between 1 and 3 disciplines.");
    }

    if (!existingSubmission.portfolioPdfUrl && trimmedPortfolioLinks.length === 0) {
      throw new BadRequestException("Provide at least one portfolio link or keep a PDF portfolio on the submission.");
    }

    if (trimmedSocialLinks.length === 0) {
      throw new BadRequestException("At least one social link is required.");
    }

    const disciplines = await this.prisma.discipline.findMany({
      where: {
        slug: {
          in: disciplineSlugs,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (disciplines.length !== disciplineSlugs.length) {
      throw new BadRequestException("One or more selected disciplines are not valid.");
    }

    let artistSetupInvite:
      | {
          email: string;
          artistName: string;
          setupUrl: string;
        }
      | null = null;

    const updatedSubmission = await this.prisma.$transaction(async (tx) => {
      let approvedArtistId = existingSubmission.approvedArtistId;

      if (dto.status === ArtistSubmissionStatus.APPROVED && !approvedArtistId) {
        const approvalResult = await this.createArtistProfileFromApprovedSubmission(tx, {
          submission: existingSubmission,
          dto,
          disciplines,
          socialLinks: trimmedSocialLinks,
        });

        approvedArtistId = approvalResult.artistId;
        artistSetupInvite = approvalResult.artistSetupInvite;
      }

      const updated = await tx.artistSubmission.update({
        where: { id },
        data: {
          approvedArtistId,
          fullName: dto.fullName.trim(),
          email: dto.email.trim(),
          phone: dto.phone?.trim() || null,
          biography: dto.biography.trim(),
          motto: dto.motto?.trim() || null,
          blogUrl: dto.blogUrl?.trim() || null,
          notes: dto.notes?.trim() || null,
          adminNotes: dto.adminNotes?.trim() || null,
          confirmedRules: dto.confirmedRules,
          status: dto.status,
        },
      });

      await tx.artistSubmissionPortfolioLink.deleteMany({
        where: { submissionId: id },
      });

      if (trimmedPortfolioLinks.length > 0) {
        await tx.artistSubmissionPortfolioLink.createMany({
          data: trimmedPortfolioLinks.map((url) => ({
            submissionId: id,
            url,
          })),
        });
      }

      await tx.artistSubmissionSocialLink.deleteMany({
        where: { submissionId: id },
      });

      await tx.artistSubmissionSocialLink.createMany({
        data: trimmedSocialLinks.map((url) => ({
          submissionId: id,
          url,
        })),
      });

      await tx.artistSubmissionDiscipline.deleteMany({
        where: { submissionId: id },
      });

      await tx.artistSubmissionDiscipline.createMany({
        data: disciplines.map((discipline) => ({
          submissionId: id,
          disciplineId: discipline.id,
        })),
      });

      return updated;
    });

    const hydratedSubmission = await this.prisma.artistSubmission.findUnique({
      where: { id: updatedSubmission.id },
      include: artistSubmissionInclude,
    });

    if (!hydratedSubmission) {
      throw new NotFoundException(`Submission with id "${id}" was not found after update.`);
    }

    if (artistSetupInvite) {
      try {
        await this.resendMailService.sendArtistAccountSetupEmail(artistSetupInvite);
      } catch (error) {
        console.error("Artist profile was created, but the account setup email failed.", error);
      }
    }

    return this.serializeSubmission(hydratedSubmission);
  }

  private validateDtoState(
    dto: CreateArtistSubmissionDto,
    portfolioLinks: string[],
    socialLinks: string[],
    disciplines: string[],
    files: ArtistSubmissionFiles,
  ) {
    if (!dto.confirmedRules) {
      throw new BadRequestException("You must accept the submission rules before sending the form.");
    }

    if (disciplines.length === 0 || disciplines.length > 3) {
      throw new BadRequestException("Select between 1 and 3 disciplines.");
    }

    if (!files.portfolioPdf?.[0] && portfolioLinks.length === 0) {
      throw new BadRequestException("Provide at least one portfolio link or upload a PDF portfolio.");
    }

    if (socialLinks.length === 0) {
      throw new BadRequestException("At least one social link is required.");
    }
  }

  private async uploadPortfolioPdfIfPresent(
    submissionId: string,
    file: Express.Multer.File | undefined,
    uploadedFiles: UploadedSubmissionFile[],
  ): Promise<UploadedSubmissionFile | null> {
    if (!file) {
      return null;
    }

    const uploadedFile = await this.storageService.uploadFile({
      recordId: submissionId,
      entityType: "submission-portfolio-pdf",
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      body: file.buffer,
    });

    uploadedFiles.push(uploadedFile);
    return uploadedFile;
  }

  private async uploadRequiredProfilePhoto(
    submissionId: string,
    file: Express.Multer.File | undefined,
    uploadedFiles: UploadedSubmissionFile[],
  ): Promise<UploadedSubmissionFile> {
    if (!file) {
      throw new BadRequestException("A profile photo is required.");
    }

    const uploadedFile = await this.storageService.uploadFile({
      recordId: submissionId,
      entityType: "submission-profile",
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      body: file.buffer,
    });

    uploadedFiles.push(uploadedFile);
    return uploadedFile;
  }

  private async uploadArtworkFiles(
    submissionId: string,
    files: Express.Multer.File[],
    uploadedFiles: UploadedSubmissionFile[],
  ): Promise<
    Array<
      UploadedSubmissionFile & {
        originalFileName: string;
        mimeType: string;
        fileSizeBytes: number;
      }
    >
  > {
    if (files.length < 6 || files.length > 25) {
      throw new BadRequestException("Submission artworks must include between 6 and 25 JPG files.");
    }

    const uploads: Array<UploadedSubmissionFile & { originalFileName: string; mimeType: string; fileSizeBytes: number }> = [];

    for (const file of files) {
      if (file.mimetype !== "image/jpeg") {
        throw new BadRequestException("Submission artworks must be JPG files.");
      }

      const uploadedFile = await this.storageService.uploadFile({
        recordId: submissionId,
        entityType: "submission-artwork",
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        body: file.buffer,
      });

      uploadedFiles.push(uploadedFile);
      uploads.push({
        ...uploadedFile,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
      });
    }

    return uploads;
  }

  private buildListWhere(query: ListArtistSubmissionsQueryDto): Prisma.ArtistSubmissionWhereInput {
    const andFilters: Prisma.ArtistSubmissionWhereInput[] = [];

    if (query.status) {
      andFilters.push({
        status: query.status,
      });
    }

    if (query.search) {
      andFilters.push({
        OR: [
          {
            fullName: {
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
            phone: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            biography: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            notes: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    return andFilters.length > 0 ? { AND: andFilters } : {};
  }

  private serializeSubmission(
    submission: Prisma.ArtistSubmissionGetPayload<{ include: typeof artistSubmissionInclude }>,
  ) {
    return {
      id: submission.id,
      fullName: submission.fullName,
      email: submission.email,
      phone: submission.phone,
      biography: submission.biography,
      motto: submission.motto,
      blogUrl: submission.blogUrl,
      notes: submission.notes,
      confirmedRules: submission.confirmedRules,
      portfolioPdfUrl: submission.portfolioPdfUrl,
      profilePhotoUrl: submission.profilePhotoUrl,
      status: submission.status,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      adminNotes: submission.adminNotes,
      approvedArtist: submission.approvedArtist
        ? {
            id: submission.approvedArtist.id,
            name: submission.approvedArtist.name,
            slug: submission.approvedArtist.slug,
          }
        : null,
      portfolioLinks: submission.portfolioLinks.map((link) => ({
        id: link.id,
        url: link.url,
      })),
      socialLinks: submission.socialLinks.map((link) => ({
        id: link.id,
        url: link.url,
      })),
      disciplines: submission.disciplines.map((entry) => ({
        id: entry.discipline.id,
        name: entry.discipline.name,
        slug: entry.discipline.slug,
      })),
      artworks: submission.artworks.map((artwork) => ({
        id: artwork.id,
        imageUrl: artwork.imageUrl,
        originalFileName: artwork.originalFileName,
        mimeType: artwork.mimeType,
        fileSizeBytes: artwork.fileSizeBytes,
        orderIndex: artwork.orderIndex,
      })),
      counts: {
        artworks: submission.artworks.length,
        disciplines: submission.disciplines.length,
        portfolioLinks: submission.portfolioLinks.length,
        socialLinks: submission.socialLinks.length,
      },
    };
  }

  private async createArtistProfileFromApprovedSubmission(
    tx: Prisma.TransactionClient,
    input: {
      submission: Prisma.ArtistSubmissionGetPayload<{ include: typeof artistSubmissionInclude }>;
      dto: UpdateArtistSubmissionDto;
      disciplines: Array<{ id: string; name: string; slug: string }>;
      socialLinks: string[];
    },
  ) {
    const normalizedEmail = input.dto.email.trim().toLowerCase();
    const existingArtistAccount = await tx.artistAccount.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
      },
    });

    if (existingArtistAccount) {
      throw new BadRequestException(
        "Vec postoji artist nalog sa ovim emailom. Promijeni email prijave prije odobravanja.",
      );
    }

    const artistSlug = await this.generateUniqueArtistSlug(tx, input.dto.fullName);
    const artist = await tx.artist.create({
      data: {
        name: input.dto.fullName.trim(),
        slug: artistSlug,
        bio: input.dto.biography.trim(),
        quote: input.dto.motto?.trim() || null,
        email: normalizedEmail,
        profileImageUrl: input.submission.profilePhotoUrl ?? null,
        isDraft: false,
        isArchived: false,
      },
    });

    if (input.disciplines.length > 0) {
      await tx.artistDiscipline.createMany({
        data: input.disciplines.map((discipline) => ({
          artistId: artist.id,
          disciplineId: discipline.id,
        })),
      });
    }

    const inferredSocialLinks = inferArtistSocialLinks(input.socialLinks);

    if (inferredSocialLinks.length > 0) {
      await tx.socialLink.createMany({
        data: inferredSocialLinks.map((link) => ({
          artistId: artist.id,
          platform: link.platform,
          url: link.url,
        })),
      });
    }

    if (input.submission.artworks.length > 0) {
      await tx.artwork.createMany({
        data: input.submission.artworks.map((artwork) => ({
          artistId: artist.id,
          imageUrl: artwork.imageUrl,
          storagePath: artwork.storagePath,
          title: null,
          description: null,
          altText: artwork.originalFileName,
          mimeType: artwork.mimeType,
          fileSizeBytes: artwork.fileSizeBytes,
          orderIndex: artwork.orderIndex,
        })),
      });
    }

    const artistAccount = await tx.artistAccount.create({
      data: {
        artistId: artist.id,
        email: normalizedEmail,
        name: input.dto.fullName.trim(),
      },
    });

    const setupToken = await this.authService.issueArtistSetupToken(artistAccount.id, tx);

    return {
      artistId: artist.id,
      artistSetupInvite: {
        email: artistAccount.email,
        artistName: artist.name,
        setupUrl: `${env.siteBaseUrl.replace(/\/+$/, "")}/artist/setup-password?token=${setupToken.token}`,
      },
    };
  }

  private async generateUniqueArtistSlug(tx: Prisma.TransactionClient, sourceName: string) {
    const baseSlug = createSlug(sourceName);
    let candidateSlug = baseSlug;
    let suffix = 2;

    while (await tx.artist.findUnique({ where: { slug: candidateSlug }, select: { id: true } })) {
      candidateSlug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidateSlug;
  }
}

function normalizeUniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function inferArtistSocialLinks(urls: string[]) {
  const deduplicatedLinks = new Map<SocialPlatform, string>();

  for (const url of urls) {
    deduplicatedLinks.set(inferSocialPlatformFromUrl(url), url);
  }

  return Array.from(deduplicatedLinks.entries()).map(([platform, url]) => ({
    platform,
    url,
  }));
}

function inferSocialPlatformFromUrl(url: string): SocialPlatform {
  const normalizedUrl = url.toLowerCase();

  if (normalizedUrl.includes("instagram.com")) return SocialPlatform.INSTAGRAM;
  if (normalizedUrl.includes("behance.net")) return SocialPlatform.BEHANCE;
  if (normalizedUrl.includes("linkedin.com")) return SocialPlatform.LINKEDIN;
  if (normalizedUrl.includes("facebook.com")) return SocialPlatform.FACEBOOK;
  if (normalizedUrl.includes("youtube.com") || normalizedUrl.includes("youtu.be")) return SocialPlatform.YOUTUBE;
  if (normalizedUrl.includes("twitter.com") || normalizedUrl.includes("x.com")) return SocialPlatform.X_TWITTER;
  if (normalizedUrl.includes("vimeo.com")) return SocialPlatform.VIMEO;
  if (normalizedUrl.includes("threads.net")) return SocialPlatform.THREADS;
  if (normalizedUrl.includes("telegram.me") || normalizedUrl.includes("t.me")) return SocialPlatform.TELEGRAM;
  if (normalizedUrl.includes("pinterest.com")) return SocialPlatform.PINTEREST;
  if (normalizedUrl.includes("dribbble.com")) return SocialPlatform.DRIBBBLE;
  if (normalizedUrl.includes("deviantart.com")) return SocialPlatform.DEVIANTART;
  if (normalizedUrl.includes("artstation.com")) return SocialPlatform.ARTSTATION;
  if (normalizedUrl.includes("medium.com")) return SocialPlatform.MEDIUM;

  return SocialPlatform.PERSONAL_WEBSITE;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
