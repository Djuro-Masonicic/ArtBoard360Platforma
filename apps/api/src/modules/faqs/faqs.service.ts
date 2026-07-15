import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PaginatedResponse } from "../../common/dto/pagination-query.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { ListFaqsQueryDto } from "./faqs.dto";

/**
 * FAQ questions are public read-only content imported from the Webflow CMS.
 * Keeping them in Postgres lets the homepage render real migrated content
 * instead of hardcoded placeholder questions.
 */
@Injectable()
export class FaqsService {
  constructor(private readonly prisma: PrismaService) {}

  async listFaqs(query: ListFaqsQueryDto): Promise<PaginatedResponse<unknown>> {
    const where = this.buildWhere(query);
    const page = query.page;
    const pageSize = query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.faqQuestion.findMany({
        where,
        orderBy: [
          {
            orderIndex: "asc",
          },
          {
            sourcePublishedAt: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.faqQuestion.count({ where }),
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

  private buildWhere(query: ListFaqsQueryDto): Prisma.FaqQuestionWhereInput {
    const andFilters: Prisma.FaqQuestionWhereInput[] = [];

    if (!query.includeDrafts) {
      andFilters.push({
        isArchived: false,
        isDraft: false,
      });
    }

    if (query.search) {
      andFilters.push({
        OR: [
          {
            question: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            answer: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    return andFilters.length ? { AND: andFilters } : {};
  }
}
