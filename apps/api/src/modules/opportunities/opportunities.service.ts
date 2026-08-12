import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Opportunity, OpportunityType, Prisma } from "@prisma/client";

import { PaginatedResponse } from "../../common/dto/pagination-query.dto";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateOpportunityDto,
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
  constructor(private readonly prisma: PrismaService) {}

  async listOpportunities(query: ListOpportunitiesQueryDto): Promise<PaginatedResponse<unknown>> {
    const where = this.buildWhere({
      ...query,
      includeDrafts: false,
    });
    return this.findPaginatedOpportunities(query, where);
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
      items,
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
        title,
        slug,
        type: dto.type ?? OpportunityType.OPEN_CALL,
        organization: this.nullableString(dto.organization),
        location: this.nullableString(dto.location),
        summary: this.nullableString(dto.summary),
        description,
        applyUrl: this.nullableString(dto.applyUrl),
        contactEmail: this.nullableString(dto.contactEmail),
        deadlineAt: this.nullableDate(dto.deadlineAt),
        isPaid: dto.isPaid ?? false,
        isFeatured: dto.isFeatured ?? false,
        isArchived: dto.isArchived ?? false,
        isDraft: dto.isDraft ?? false,
      },
    });
  }

  async updateOpportunity(id: string, dto: UpdateOpportunityDto): Promise<Opportunity> {
    const existing = await this.getOpportunityById(id);
    const data: Prisma.OpportunityUpdateInput = {};

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
    if (dto.summary !== undefined) data.summary = this.nullableString(dto.summary);

    if (dto.description !== undefined) {
      const description = dto.description.trim();

      if (!description) {
        throw new BadRequestException("Opportunity description cannot be empty.");
      }

      data.description = description;
    }

    if (dto.applyUrl !== undefined) data.applyUrl = this.nullableString(dto.applyUrl);
    if (dto.contactEmail !== undefined) data.contactEmail = this.nullableString(dto.contactEmail);
    if (dto.deadlineAt !== undefined) data.deadlineAt = this.nullableDate(dto.deadlineAt);
    if (dto.isPaid !== undefined) data.isPaid = dto.isPaid;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.isArchived !== undefined) data.isArchived = dto.isArchived;
    if (dto.isDraft !== undefined) data.isDraft = dto.isDraft;

    return this.prisma.opportunity.update({
      where: {
        id,
      },
      data,
    });
  }

  async deleteOpportunity(id: string): Promise<{ id: string; deleted: true }> {
    await this.getOpportunityById(id);

    await this.prisma.opportunity.delete({
      where: {
        id,
      },
    });

    return {
      id,
      deleted: true,
    };
  }

  private buildWhere(query: ListOpportunitiesQueryDto): Prisma.OpportunityWhereInput {
    const andFilters: Prisma.OpportunityWhereInput[] = [];

    if (!query.includeDrafts) {
      andFilters.push({
        isArchived: false,
        isDraft: false,
      });
    }

    if (query.type) {
      andFilters.push({
        type: query.type,
      });
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
