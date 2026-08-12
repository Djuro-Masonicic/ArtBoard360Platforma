import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

/**
 * StatsService exposes small public counters used by marketing pages.
 *
 * We keep these counts on the backend because the database can count directly,
 * while the frontend may only have a paginated or partial list of artists.
 */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getArtBoardStats() {
    const publicArtistWhere = {
      isArchived: false,
      isDraft: false,
      // Keep this aligned with GET /artists default behavior.
      // The public catalog hides NSFW artists unless the caller explicitly asks for them.
      isNsfw: false,
    };

    const [artists, artworks, disciplineRows] = await this.prisma.$transaction([
      this.prisma.artist.count({
        where: publicArtistWhere,
      }),

      this.prisma.artwork.count({
        where: {
          artist: publicArtistWhere,
        },
      }),

      this.prisma.artistDiscipline.findMany({
        where: {
          artist: publicArtistWhere,
        },
        distinct: ["disciplineId"],
        select: {
          disciplineId: true,
        },
      }),
    ]);

    return {
      artists,
      artworks,
      disciplines: disciplineRows.length,
    };
  }
}
