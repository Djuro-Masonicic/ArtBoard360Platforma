import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SocialPlatform } from "@prisma/client";

import { PaginatedResponse } from "../../common/dto/pagination-query.dto";
import { createSlug } from "../../common/utils/text";
import { PrismaService } from "../../prisma/prisma.service";
import { R2StorageService } from "../../storage/r2-storage.service";
import {
  ArtistSocialLinkInputDto,
  CreateArtistDto,
  ListArtistsQueryDto,
  UpdateArtistDto,
} from "./artists.dto";

const artistListInclude = {
  artworks: {
    orderBy: [
      {
        isFeatured: "desc",
      },
      {
        orderIndex: "asc",
      },
    ],
    take: 8,
  },
  socialLinks: {
    orderBy: {
      platform: "asc",
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
  _count: {
    select: {
      artworks: true,
      testimonials: true,
    },
  },
} satisfies Prisma.ArtistInclude;

const artistDetailInclude = {
  artworks: {
    orderBy: {
      orderIndex: "asc",
    },
  },
  socialLinks: {
    orderBy: {
      platform: "asc",
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
  testimonials: {
    where: {
      isArchived: false,
      isDraft: false,
    },
    orderBy: [
      {
        sourcePublishedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  },
} satisfies Prisma.ArtistInclude;

/**
 * ArtistsService contains the main public content queries for the site.
 * The methods intentionally return frontend-friendly shapes so the Next app stays simple.
 */
@Injectable()
export class ArtistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: R2StorageService,
  ) {}

  async listArtists(query: ListArtistsQueryDto): Promise<PaginatedResponse<unknown>> {
    const where = this.buildListWhere(query);
    const page = query.page;
    const pageSize = query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.artist.findMany({
        where,
        include: artistListInclude,
        orderBy: {
          name: "asc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.artist.count({ where }),
    ]);

    return {
      items: items.map((artist) => this.serializeArtist(artist)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getArtistBySlug(slug: string) {
    const artist = await this.prisma.artist.findFirst({
      where: {
        slug,
        isArchived: false,
        isDraft: false,
      },
      include: artistDetailInclude,
    });

    if (!artist) {
      throw new NotFoundException(`Artist with slug "${slug}" was not found.`);
    }

    return this.serializeArtist(artist);
  }

  async createArtist(dto: CreateArtistDto) {
    const createdArtist = await this.prisma.$transaction(async (tx) => {
      const artist = await tx.artist.create({
        data: {
          name: dto.name.trim(),
          slug: dto.slug ? createSlug(dto.slug) : createSlug(dto.name),
          bio: dto.bio?.trim() || null,
          quote: dto.quote?.trim() || null,
          email: dto.email?.trim() || null,
          profileImageUrl: dto.profileImageUrl ?? null,
          profileThumbnailUrl: dto.profileThumbnailUrl ?? null,
          coverImageUrl: dto.coverImageUrl ?? null,
          thumbnailUrl: dto.thumbnailUrl ?? null,
          isNsfw: dto.isNsfw ?? false,
          darkenCoverOverlay: dto.darkenCoverOverlay ?? false,
        },
      });

      await this.syncArtistRelations(tx, artist.id, dto.disciplines, dto.socialLinks);

      return artist;
    });

    const hydratedArtist = await this.prisma.artist.findUnique({
      where: {
        id: createdArtist.id,
      },
      include: artistDetailInclude,
    });

    return this.serializeArtist(hydratedArtist);
  }

  async updateArtist(id: string, dto: UpdateArtistDto) {
    await this.assertArtistExists(id);

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.ArtistUpdateInput = {};

      if (dto.name !== undefined) {
        data.name = dto.name.trim();
      }

      if (dto.slug !== undefined) {
        data.slug = createSlug(dto.slug);
      }

      if (dto.bio !== undefined) {
        data.bio = dto.bio.trim() || null;
      }

      if (dto.quote !== undefined) {
        data.quote = dto.quote.trim() || null;
      }

      if (dto.email !== undefined) {
        data.email = dto.email.trim() || null;
      }

      if (dto.profileImageUrl !== undefined) {
        data.profileImageUrl = dto.profileImageUrl || null;
      }

      if (dto.profileThumbnailUrl !== undefined) {
        data.profileThumbnailUrl = dto.profileThumbnailUrl || null;
      }

      if (dto.coverImageUrl !== undefined) {
        data.coverImageUrl = dto.coverImageUrl || null;
      }

      if (dto.thumbnailUrl !== undefined) {
        data.thumbnailUrl = dto.thumbnailUrl || null;
      }

      if (dto.isNsfw !== undefined) {
        data.isNsfw = dto.isNsfw;
      }

      if (dto.darkenCoverOverlay !== undefined) {
        data.darkenCoverOverlay = dto.darkenCoverOverlay;
      }

      if (Object.keys(data).length > 0) {
        await tx.artist.update({
          where: { id },
          data,
        });
      }

      await this.syncArtistRelations(tx, id, dto.disciplines, dto.socialLinks);
    });

    const hydratedArtist = await this.prisma.artist.findUnique({
      where: {
        id,
      },
      include: artistDetailInclude,
    });

    return this.serializeArtist(hydratedArtist);
  }

  async uploadProfileImage(id: string, file: Express.Multer.File | undefined) {
    await this.assertArtistExists(id);

    if (!file) {
      throw new BadRequestException("A profile image file is required.");
    }

    const uploadedFile = await this.storageService.uploadFile({
      recordId: id,
      entityType: "profile",
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      body: file.buffer,
    });

    await this.prisma.artist.update({
      where: { id },
      data: {
        profileImageUrl: uploadedFile.publicUrl,
        profileThumbnailUrl: uploadedFile.publicUrl,
        thumbnailUrl: uploadedFile.publicUrl,
      },
    });

    const hydratedArtist = await this.prisma.artist.findUnique({
      where: {
        id,
      },
      include: artistDetailInclude,
    });

    return this.serializeArtist(hydratedArtist);
  }

  private buildListWhere(query: ListArtistsQueryDto): Prisma.ArtistWhereInput {
    const andFilters: Prisma.ArtistWhereInput[] = [
      {
        isArchived: false,
      },
      {
        isDraft: false,
      },
    ];

    if (!query.includeNsfw) {
      andFilters.push({
        isNsfw: false,
      });
    }

    if (query.search) {
      andFilters.push({
        OR: [
          {
            name: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            bio: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            quote: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    if (query.discipline) {
      andFilters.push({
        disciplines: {
          some: {
            discipline: {
              slug: createSlug(query.discipline),
            },
          },
        },
      });
    }

    if (query.onlyWithArtworks) {
      andFilters.push({
        artworks: {
          some: {},
        },
      });
    }

    return {
      AND: andFilters,
    };
  }

  private async assertArtistExists(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with id "${id}" was not found.`);
    }
  }

  private async syncArtistRelations(
    tx: Prisma.TransactionClient,
    artistId: string,
    disciplines?: string[],
    socialLinks?: ArtistSocialLinkInputDto[],
  ) {
    if (disciplines) {
      await tx.artistDiscipline.deleteMany({
        where: { artistId },
      });

      for (const disciplineName of Array.from(new Set(disciplines.map((value) => value.trim()).filter(Boolean)))) {
        const discipline = await tx.discipline.upsert({
          where: {
            slug: createSlug(disciplineName),
          },
          update: {
            name: disciplineName,
          },
          create: {
            name: disciplineName,
            slug: createSlug(disciplineName),
          },
        });

        await tx.artistDiscipline.create({
          data: {
            artistId,
            disciplineId: discipline.id,
          },
        });
      }
    }

    if (socialLinks) {
      await tx.socialLink.deleteMany({
        where: { artistId },
      });

      const deduplicatedLinks = new Map<SocialPlatform, string>();

      for (const link of socialLinks) {
        deduplicatedLinks.set(link.platform, link.url);
      }

      if (deduplicatedLinks.size > 0) {
        await tx.socialLink.createMany({
          data: Array.from(deduplicatedLinks.entries()).map(([platform, url]) => ({
            artistId,
            platform,
            url,
          })),
        });
      }
    }
  }

  private serializeArtist(artist: (Prisma.ArtistGetPayload<{ include: typeof artistDetailInclude }> | Prisma.ArtistGetPayload<{ include: typeof artistListInclude }>) | null) {
    if (!artist) {
      return null;
    }

    return {
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      bio: artist.bio,
      quote: artist.quote,
      email: artist.email,
      profileImageUrl: artist.profileImageUrl,
      profileThumbnailUrl: artist.profileThumbnailUrl,
      coverImageUrl: artist.coverImageUrl,
      thumbnailUrl: artist.thumbnailUrl,
      isNsfw: artist.isNsfw,
      darkenCoverOverlay: artist.darkenCoverOverlay,
      createdAt: artist.createdAt,
      updatedAt: artist.updatedAt,
      disciplines: "disciplines" in artist
        ? artist.disciplines.map((entry) => ({
            id: entry.discipline.id,
            name: entry.discipline.name,
            slug: entry.discipline.slug,
          }))
        : [],
      socialLinks: "socialLinks" in artist ? artist.socialLinks : [],
      artworks: "artworks" in artist ? artist.artworks : [],
      testimonials: "testimonials" in artist ? artist.testimonials : [],
      counts: "_count" in artist
        ? {
            artworks: artist._count.artworks,
            testimonials: artist._count.testimonials,
          }
        : undefined,
    };
  }
}
