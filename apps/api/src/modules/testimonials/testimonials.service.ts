import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PaginatedResponse } from "../../common/dto/pagination-query.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { ListTestimonialsQueryDto } from "./testimonials.dto";

/**
 * Testimonials are kept lightweight because the public site mostly needs
 * read-only access with filtering by artist or search text.
 */
@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTestimonials(query: ListTestimonialsQueryDto): Promise<PaginatedResponse<unknown>> {
    const where = this.buildWhere(query);
    const page = query.page;
    const pageSize = query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.testimonial.findMany({
        where,
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [
          {
            sourcePublishedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.testimonial.count({ where }),
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

  private buildWhere(query: ListTestimonialsQueryDto): Prisma.TestimonialWhereInput {
    const andFilters: Prisma.TestimonialWhereInput[] = [
      {
        isArchived: false,
      },
      {
        isDraft: false,
      },
    ];

    if (query.search) {
      andFilters.push({
        OR: [
          {
            author: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            company: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            content: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    if (query.artistSlug) {
      andFilters.push({
        artist: {
          is: {
            slug: query.artistSlug,
          },
        },
      });
    }

    if (query.linkedOnly) {
      andFilters.push({
        artistId: {
          not: null,
        },
      });
    }

    return {
      AND: andFilters,
    };
  }
}
