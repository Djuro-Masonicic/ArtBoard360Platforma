import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "../src/config/env";
import { createSlug, stripHtml } from "../src/common/utils/text";
import {
  buildArtworkRows,
  buildSocialLinksFromArtistRow,
  normalizeDisciplineNames,
  parseBooleanCell,
  parseCmsDate,
  readCsvRows,
  resolveCsvPath,
} from "./import-helpers";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: env.databaseUrl,
  }),
});

/**
 * This script imports artist records, inferred artwork rows, and social links.
 * It is intentionally idempotent: running it twice updates matching rows instead of duplicating them.
 */
async function main() {
  const filePath = resolveCsvPath(process.argv[2], env.artistsCsvPath, "ARTISTS_CSV_PATH");
  const rows = await readCsvRows(filePath);

  let importedArtists = 0;
  let importedArtworks = 0;

  for (const row of rows) {
    const name = row["First and last name"]?.trim() || row["Name"]?.trim();
    const slug = row["Slug"]?.trim();

    if (!name || !slug) {
      console.warn("Skipping artist row because the name or slug is missing.", row["Item ID"]);
      continue;
    }

    const disciplineNames = normalizeDisciplineNames(row["Disciplines Select"]);
    const socialLinks = buildSocialLinksFromArtistRow(row);
    const artworks = buildArtworkRows(name, row["Art"]);

    const artist = await prisma.$transaction(async (tx) => {
      const savedArtist = await tx.artist.upsert({
        where: { slug },
        update: {
          name,
          bio: stripHtml(row["Bio"]),
          quote: stripHtml(row["Artist's quote"]),
          email: row["Contact email"]?.trim() || null,
          profileImageUrl: row["Profile photo (Big)"]?.trim() || null,
          profileThumbnailUrl: row["Profile photo (Small)"]?.trim() || null,
          coverImageUrl: row["Cover image"]?.trim() || null,
          thumbnailUrl: row["Thumbnail"]?.trim() || null,
          isNsfw: parseBooleanCell(row["NSFW"]),
          darkenCoverOverlay: parseBooleanCell(row["Darken cover overlay"]),
          isArchived: parseBooleanCell(row["Archived"]),
          isDraft: parseBooleanCell(row["Draft"]),
          sourceItemId: row["Item ID"]?.trim() || null,
          sourceCollectionId: row["Collection ID"]?.trim() || null,
          sourceLocaleId: row["Locale ID"]?.trim() || null,
          sourceCreatedAt: parseCmsDate(row["Created On"]),
          sourceUpdatedAt: parseCmsDate(row["Updated On"]),
          sourcePublishedAt: parseCmsDate(row["Published On"]),
        },
        create: {
          name,
          slug: createSlug(slug),
          bio: stripHtml(row["Bio"]),
          quote: stripHtml(row["Artist's quote"]),
          email: row["Contact email"]?.trim() || null,
          profileImageUrl: row["Profile photo (Big)"]?.trim() || null,
          profileThumbnailUrl: row["Profile photo (Small)"]?.trim() || null,
          coverImageUrl: row["Cover image"]?.trim() || null,
          thumbnailUrl: row["Thumbnail"]?.trim() || null,
          isNsfw: parseBooleanCell(row["NSFW"]),
          darkenCoverOverlay: parseBooleanCell(row["Darken cover overlay"]),
          isArchived: parseBooleanCell(row["Archived"]),
          isDraft: parseBooleanCell(row["Draft"]),
          sourceItemId: row["Item ID"]?.trim() || null,
          sourceCollectionId: row["Collection ID"]?.trim() || null,
          sourceLocaleId: row["Locale ID"]?.trim() || null,
          sourceCreatedAt: parseCmsDate(row["Created On"]),
          sourceUpdatedAt: parseCmsDate(row["Updated On"]),
          sourcePublishedAt: parseCmsDate(row["Published On"]),
        },
      });

      await tx.artistDiscipline.deleteMany({
        where: {
          artistId: savedArtist.id,
        },
      });

      for (const disciplineName of disciplineNames) {
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
            artistId: savedArtist.id,
            disciplineId: discipline.id,
          },
        });
      }

      await tx.socialLink.deleteMany({
        where: {
          artistId: savedArtist.id,
        },
      });

      if (socialLinks.length > 0) {
        await tx.socialLink.createMany({
          data: socialLinks.map((link) => ({
            artistId: savedArtist.id,
            platform: link.platform,
            url: link.url,
          })),
        });
      }

      for (const artwork of artworks) {
        await tx.artwork.upsert({
          where: {
            artistId_imageUrl: {
              artistId: savedArtist.id,
              imageUrl: artwork.imageUrl,
            },
          },
          update: {
            title: artwork.title,
            altText: artwork.altText,
            orderIndex: artwork.orderIndex,
          },
          create: {
            artistId: savedArtist.id,
            imageUrl: artwork.imageUrl,
            title: artwork.title,
            altText: artwork.altText,
            orderIndex: artwork.orderIndex,
          },
        });
      }

      return savedArtist;
    });

    importedArtists += 1;
    importedArtworks += artworks.length;
    console.info(`Imported artist ${artist.name} with ${artworks.length} artworks.`);
  }

  console.info(`Artist import finished. Artists processed: ${importedArtists}. Artwork rows processed: ${importedArtworks}.`);
}

main()
  .catch((error) => {
    console.error("Artist import failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
