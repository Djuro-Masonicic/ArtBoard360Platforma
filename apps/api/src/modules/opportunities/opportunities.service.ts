import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  Opportunity,
  OpportunityApplicationMethod,
  OpportunitySubmissionStatus,
  OpportunityType,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "node:crypto";

import { PaginatedResponse } from "../../common/dto/pagination-query.dto";
import { env } from "../../config/env";
import { ResendMailService } from "../../mail/resend-mail.service";
import { PrismaService } from "../../prisma/prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import { OpportunityDetailsDto } from "./opportunity-details.dto";
import {
  CreateOpportunityDto,
  CreatePublicOpportunitySubmissionDto,
  ListOpportunitiesQueryDto,
  UpdateOpportunityDto,
} from "./opportunities.dto";

/**
 * Opportunity service.
 *
 * Public visitors only list published opportunities, while admins can create
 * and maintain rows from the internal dashboard. The service keeps the rules
 * in one place so the controller stays easy to read.
 */
@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: ResendMailService,
    private readonly storageService: R2StorageService,
  ) {}

  async listOpportunities(query: ListOpportunitiesQueryDto): Promise<PaginatedResponse<unknown>> {
    const where = this.buildWhere({
      ...query,
      includeDrafts: false,
    });
    return this.findPaginatedOpportunities(query, where, true);
  }

  async listAdminOpportunities(
    query: ListOpportunitiesQueryDto,
  ): Promise<PaginatedResponse<unknown>> {
    const where = this.buildWhere({
      ...query,
      includeDrafts: true,
    });

    return this.findPaginatedOpportunities(query, where);
  }

  private async findPaginatedOpportunities(
    query: ListOpportunitiesQueryDto,
    where: Prisma.OpportunityWhereInput,
    publicOnly = false,
  ): Promise<PaginatedResponse<unknown>> {
    const page = query.page;
    const pageSize = query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({
        where,
        orderBy: [
          {
            isFeatured: "desc",
          },
          {
            deadlineAt: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return {
      items: publicOnly ? items.map((item) => this.publicOpportunity(item)) : items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getOpportunityById(id: string): Promise<Opportunity> {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: {
        id,
      },
    });

    if (!opportunity) {
      throw new NotFoundException("Opportunity was not found.");
    }

    return opportunity;
  }

  async createPublicSubmission(
    dto: CreatePublicOpportunitySubmissionDto,
    coverImage?: Express.Multer.File,
  ) {
    if (!dto.consent) {
      throw new BadRequestException("Morate prihvatiti uslove korišćenja i politiku privatnosti.");
    }

    if (!dto.isOpenEnded && !dto.deadlineAt) {
      throw new BadRequestException("Rok za prijavu je obavezan za pozive koji nijesu otvoreni.");
    }

    const applyValue = dto.applyValue.trim();
    if (dto.applicationMethod === OpportunityApplicationMethod.EMAIL) {
      if (!/^\S+@\S+\.\S+$/.test(applyValue)) {
        throw new BadRequestException("E-mail za prijave nije ispravan.");
      }
    } else {
      try {
        const url = new URL(applyValue);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Invalid protocol");
      } catch {
        throw new BadRequestException("Link za prijave mora biti ispravna HTTP ili HTTPS adresa.");
      }
    }

    const id = randomUUID();
    let uploadedCover: { path: string; publicUrl: string } | null = null;

    try {
      if (coverImage) {
        uploadedCover = await this.storageService.uploadFile({
          recordId: id,
          entityType: "opportunity-cover",
          fileName: coverImage.originalname,
          mimeType: coverImage.mimetype,
          fileSizeBytes: coverImage.size,
          body: coverImage.buffer,
        });
      }

      const title = dto.title.trim();
      const description = dto.description.trim();
      const compensation = this.nullableString(dto.compensation);
      const opportunity = await this.prisma.opportunity.create({
        data: {
          ...this.detailsData(dto),
          id,
          title,
          slug: await this.makeUniqueSlug(title),
          type: dto.type,
          organization: dto.organizerName.trim(),
          organizerType: dto.organizerType,
          location: this.formatLocation(dto.city, dto.countryCode),
          countryCode: dto.countryCode.trim(),
          city: dto.city.trim(),
          summary: description.slice(0, 220),
          description,
          conditions: dto.conditions.trim(),
          compensation,
          additionalInformation: this.nullableString(dto.additionalInformation),
          applicationMethod: dto.applicationMethod,
          applyEmail:
            dto.applicationMethod === OpportunityApplicationMethod.EMAIL ? applyValue : null,
          applyUrl:
            dto.applicationMethod === OpportunityApplicationMethod.LINK ? applyValue : null,
          contactEmail: dto.contactEmail.trim().toLowerCase(),
          deadlineAt: dto.isOpenEnded ? null : this.nullableDate(dto.deadlineAt),
          isOpenEnded: dto.isOpenEnded,
          coverImageUrl: uploadedCover?.publicUrl ?? null,
          coverImageStoragePath: uploadedCover?.path ?? null,
          consentAcceptedAt: new Date(),
          submissionStatus: OpportunitySubmissionStatus.PENDING,
          isPaid: dto.compensationKind === "NONE" ? false : Boolean((dto.compensationAmount ?? 0) > 0 || (compensation && !/bez honorara|volontersk/i.test(compensation))),
          isDraft: true,
        },
      });

      let emailNotificationSent = true;
      try {
        await this.mailService.sendOpportunitySubmissionNotification({
          submissionId: opportunity.id,
          title: opportunity.title,
          organization: opportunity.organization ?? "",
          contactEmail: opportunity.contactEmail ?? "",
        });
      } catch (error) {
        emailNotificationSent = false;
        console.error("Opportunity submission was stored, but the admin notification failed.", error);
      }

      return {
        success: true,
        submissionId: opportunity.id,
        status: opportunity.submissionStatus,
        emailNotificationSent,
        message: "Oglas je poslat na provjeru.",
      };
    } catch (error) {
      if (uploadedCover) {
        try {
          await this.storageService.deleteFile(uploadedCover.path);
        } catch (cleanupError) {
          console.error("Could not clean up opportunity cover after submission failure.", cleanupError);
        }
      }
      throw error;
    }
  }

  async createOpportunity(dto: CreateOpportunityDto): Promise<Opportunity> {
    const title = dto.title.trim();
    const description = dto.description.trim();

    if (!title) {
      throw new BadRequestException("Opportunity title is required.");
    }

    if (!description) {
      throw new BadRequestException("Opportunity description is required.");
    }

    const slug = await this.makeUniqueSlug(dto.slug || title);

    return this.prisma.opportunity.create({
      data: {
        ...this.detailsData(dto),
        title,
        slug,
        type: dto.type ?? OpportunityType.OPEN_CALL,
        organization: this.nullableString(dto.organization),
        location: this.nullableString(dto.location),
        countryCode: this.nullableString(dto.countryCode),
        city: this.nullableString(dto.city),
        summary: this.nullableString(dto.summary),
        description,
        conditions: this.nullableString(dto.conditions),
        compensation: this.nullableString(dto.compensation),
        additionalInformation: this.nullableString(dto.additionalInformation),
        applicationMethod: dto.applicationMethod ?? null,
        applyUrl: this.nullableString(dto.applyUrl),
        applyEmail: this.nullableString(dto.applyEmail),
        contactEmail: this.nullableString(dto.contactEmail),
        deadlineAt: this.nullableDate(dto.deadlineAt),
        isOpenEnded: dto.isOpenEnded ?? false,
        organizerType: dto.organizerType ?? null,
        submissionStatus: dto.submissionStatus ?? OpportunitySubmissionStatus.APPROVED,
        reviewNotes: this.nullableString(dto.reviewNotes),
        isPaid: dto.isPaid ?? false,
        isFeatured: dto.isFeatured ?? false,
        isArchived: dto.isArchived ?? false,
        isDraft: dto.isDraft ?? false,
      },
    });
  }

  async updateOpportunity(id: string, dto: UpdateOpportunityDto): Promise<Opportunity> {
    const existing = await this.getOpportunityById(id);
    const data: Prisma.OpportunityUpdateInput = this.detailsData(dto);

    if (dto.title !== undefined) {
      const title = dto.title.trim();

      if (!title) {
        throw new BadRequestException("Opportunity title cannot be empty.");
      }

      data.title = title;
    }

    /**
     * If admin edits the slug directly, we respect it. If only title changes,
     * we regenerate the slug from the new title so the URL stays readable.
     */
    if (dto.slug !== undefined || dto.title !== undefined) {
      const slugSource = dto.slug?.trim() || String(data.title ?? existing.title);
      data.slug = await this.makeUniqueSlug(slugSource, id);
    }

    if (dto.type !== undefined) data.type = dto.type;
    if (dto.organization !== undefined) data.organization = this.nullableString(dto.organization);
    if (dto.location !== undefined) data.location = this.nullableString(dto.location);
    if (dto.countryCode !== undefined) data.countryCode = this.nullableString(dto.countryCode);
    if (dto.city !== undefined) data.city = this.nullableString(dto.city);
    if (dto.summary !== undefined) data.summary = this.nullableString(dto.summary);

    if (dto.description !== undefined) {
      const description = dto.description.trim();

      if (!description) {
        throw new BadRequestException("Opportunity description cannot be empty.");
      }

      data.description = description;
    }

    if (dto.applyUrl !== undefined) data.applyUrl = this.nullableString(dto.applyUrl);
    if (dto.applyEmail !== undefined) data.applyEmail = this.nullableString(dto.applyEmail);
    if (dto.contactEmail !== undefined) data.contactEmail = this.nullableString(dto.contactEmail);
    if (dto.deadlineAt !== undefined) data.deadlineAt = this.nullableDate(dto.deadlineAt);
    if (dto.conditions !== undefined) data.conditions = this.nullableString(dto.conditions);
    if (dto.compensation !== undefined) data.compensation = this.nullableString(dto.compensation);
    if (dto.additionalInformation !== undefined) {
      data.additionalInformation = this.nullableString(dto.additionalInformation);
    }
    if (dto.applicationMethod !== undefined) data.applicationMethod = dto.applicationMethod;
    if (dto.organizerType !== undefined) data.organizerType = dto.organizerType;
    if (dto.isOpenEnded !== undefined) data.isOpenEnded = dto.isOpenEnded;
    if (dto.reviewNotes !== undefined) data.reviewNotes = this.nullableString(dto.reviewNotes);
    if (dto.submissionStatus !== undefined) {
      data.submissionStatus = dto.submissionStatus;
      data.reviewedAt = new Date();
      data.isDraft = dto.submissionStatus !== OpportunitySubmissionStatus.APPROVED;
    }
    if (dto.isPaid !== undefined) data.isPaid = dto.isPaid;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.isArchived !== undefined) data.isArchived = dto.isArchived;
    if (dto.isDraft !== undefined) data.isDraft = dto.isDraft;

    const updated = await this.prisma.opportunity.update({
      where: {
        id,
      },
      data,
    });

    const decisionChanged =
      dto.submissionStatus !== undefined &&
      dto.submissionStatus !== existing.submissionStatus &&
      dto.submissionStatus !== OpportunitySubmissionStatus.PENDING;
    if (decisionChanged && updated.contactEmail) {
      try {
        await this.mailService.sendOpportunityReviewNotification({
          recipientEmail: updated.contactEmail,
          title: updated.title,
          approved: updated.submissionStatus === OpportunitySubmissionStatus.APPROVED,
          reviewNotes: updated.reviewNotes,
        });
      } catch (error) {
        console.error("Opportunity status was saved, but the submitter notification failed.", error);
      }
    }

    return updated;
  }

  async deleteOpportunity(id: string): Promise<{ id: string; deleted: true }> {
    await this.getOpportunityById(id);

    const deleted = await this.prisma.opportunity.delete({
      where: {
        id,
      },
    });

    if (deleted.coverImageStoragePath) {
      try {
        await this.storageService.deleteFile(deleted.coverImageStoragePath);
      } catch (error) {
        console.error("Opportunity was deleted, but its cover could not be removed.", error);
      }
    }

    return {
      id,
      deleted: true,
    };
  }

  async applyToOpportunity(
    id: string,
    artistAccountId: string,
  ): Promise<{ message: string }> {
    const opportunity = await this.getOpportunityById(id);

    if (opportunity.isDemo || opportunity.submissionStatus !== OpportunitySubmissionStatus.APPROVED || opportunity.isArchived || opportunity.isDraft) {
      throw new BadRequestException("Ovaj oglas trenutno nije otvoren za prijave.");
    }

    if (!opportunity.contactEmail) {
      throw new BadRequestException(
        "Oglas nema podesenu email adresu izdavaoca. Koristi vanjski link za prijavu.",
      );
    }

    const artistAccount = await this.prisma.artistAccount.findUnique({
      where: {
        id: artistAccountId,
      },
      include: {
        artist: {
          include: {
            disciplines: {
              include: {
                discipline: true,
              },
            },
            socialLinks: true,
            artworks: {
              orderBy: [
                {
                  isFeatured: "desc",
                },
                {
                  orderIndex: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
              take: 8,
            },
          },
        },
      },
    });

    if (!artistAccount || !artistAccount.artist) {
      throw new NotFoundException("Artist account was not found.");
    }

    if (artistAccount.artist.isArchived || artistAccount.artist.isDraft) {
      throw new BadRequestException("Profil umjetnika nije javno aktivan.");
    }

    const siteBaseUrl = env.siteBaseUrl.replace(/\/$/, "");
    const artistProfileUrl = `${siteBaseUrl}/umjetnik/${artistAccount.artist.slug}`;

    await this.mailService.sendOpportunityApplicationNotification({
      publisherEmail: opportunity.contactEmail,
      opportunityTitle: opportunity.title,
      opportunityOrganization: opportunity.organization,
      artistName: artistAccount.artist.name,
      artistEmail: artistAccount.artist.email ?? artistAccount.email,
      artistProfileUrl,
      artistBio: artistAccount.artist.bio,
      disciplines: artistAccount.artist.disciplines.map(
        (artistDiscipline) => artistDiscipline.discipline.name,
      ),
      socialLinks: artistAccount.artist.socialLinks.map(
        (link) => `${link.platform}: ${link.url}`,
      ),
      artworkUrls: artistAccount.artist.artworks.map((artwork) => artwork.imageUrl),
    });

    return {
      message: "Prijava je poslata izdavaocu oglasa.",
    };
  }

  private publicOpportunity(item: Opportunity) {
    const { contactEmail, coverImageStoragePath, consentAcceptedAt, reviewNotes, reviewedAt, ...publicData } = item;
    return {
      ...publicData,
      hasArtboardApplication: !item.applicationMethod && !item.applyUrl && Boolean(contactEmail),
    };
  }

  async getPublicOpportunity(identifier: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const item = await this.prisma.opportunity.findFirst({
      where: {
        isArchived: false,
        isDraft: false,
        submissionStatus: OpportunitySubmissionStatus.APPROVED,
        OR: [{ slug: identifier }, ...(isUuid ? [{ id: identifier }] : [])],
      },
    });
    if (!item) throw new NotFoundException("Opportunity was not found.");
    return this.publicOpportunity(item);
  }

  async recordPublicView(id: string) {
    const result = await this.prisma.opportunity.updateMany({
      where: { id, isArchived: false, isDraft: false, submissionStatus: OpportunitySubmissionStatus.APPROVED },
      data: { viewCount: { increment: 1 } },
    });
    if (!result.count) throw new NotFoundException("Opportunity was not found.");
    return { success: true };
  }

  private detailsData(dto: OpportunityDetailsDto) {
    const clean = (values: string[] | undefined) => Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
    return {
      ...(dto.workMode !== undefined ? { workMode: dto.workMode } : {}),
      ...(dto.compensationKind !== undefined ? { compensationKind: dto.compensationKind } : {}),
      ...(dto.compensationAmount !== undefined ? { compensationAmount: dto.compensationAmount } : {}),
      ...(dto.compensationCurrency != null ? { compensationCurrency: dto.compensationCurrency } : {}),
      ...(dto.applicationFee !== undefined ? { applicationFee: dto.applicationFee } : {}),
      ...(dto.maxAge !== undefined ? { maxAge: dto.maxAge } : {}),
      ...(dto.disciplines !== undefined ? { disciplines: clean(dto.disciplines) } : {}),
      ...(dto.eligibleCountries !== undefined ? { eligibleCountries: clean(dto.eligibleCountries) } : {}),
      ...(dto.applicationLanguages !== undefined ? { applicationLanguages: clean(dto.applicationLanguages) } : {}),
      ...(dto.requiredDocuments !== undefined ? { requiredDocuments: clean(dto.requiredDocuments) } : {}),
      ...(dto.coveredCosts !== undefined ? { coveredCosts: clean(dto.coveredCosts) } : {}),
    };
  }

  private buildWhere(query: ListOpportunitiesQueryDto): Prisma.OpportunityWhereInput {
    const andFilters: Prisma.OpportunityWhereInput[] = [];

    if (!query.includeDrafts) {
      andFilters.push({
        isArchived: false,
        isDraft: false,
        submissionStatus: OpportunitySubmissionStatus.APPROVED,
      });
    }

    if (query.type) {
      andFilters.push({
        type: query.type,
      });
    }

    if (query.status) {
      andFilters.push({ submissionStatus: query.status });
    }

    if (query.search) {
      andFilters.push({
        OR: [
          {
            title: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            organization: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    return andFilters.length ? { AND: andFilters } : {};
  }

  private nullableString(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private nullableDate(value: string | undefined): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Deadline date is invalid.");
    }

    return date;
  }

  private formatLocation(city: string, countryCode: string) {
    const countryNames: Record<string, string> = {
      ME: "Crna Gora",
      RS: "Srbija",
      HR: "Hrvatska",
      BA: "Bosna i Hercegovina",
      MK: "Sjeverna Makedonija",
      SI: "Slovenija",
      XK: "Kosovo",
      AL: "Albanija",
      REG: "Online · cijeli region",
      OTHER: "Druga država",
    };
    const normalizedCity = city.trim();
    const country = countryNames[countryCode.trim()] ?? countryCode.trim();
    if (!country || normalizedCity.toLocaleLowerCase() === country.toLocaleLowerCase()) return normalizedCity;
    return `${normalizedCity}, ${country}`;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "dj")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  private async makeUniqueSlug(value: string, ignoredId?: string): Promise<string> {
    const baseSlug = this.slugify(value) || "oglas";
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.prisma.opportunity.findUnique({
        where: {
          slug: candidate,
        },
      });

      if (!existing || existing.id === ignoredId) {
        return candidate;
      }

      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }
}
