import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "../src/config/env";
import { createSlug, stripHtml } from "../src/common/utils/text";
import {
  mapAccentColor,
  normalizePersonKey,
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
 * The testimonial export contains both artist feedback and general platform feedback.
 * We link to artists when we can match by slug or normalized name, otherwise we keep the testimonial standalone.
 */
async function main() {
  const filePath = resolveCsvPath(process.argv[2], env.testimonialsCsvPath, "TESTIMONIALS_CSV_PATH");
  const rows = await readCsvRows(filePath);

  const artists = await prisma.artist.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  const artistIdBySlug = new Map(artists.map((artist) => [artist.slug, artist.id]));
  const artistIdByName = new Map(artists.map((artist) => [normalizePersonKey(artist.name), artist.id]));

  let linkedTestimonials = 0;
  let standaloneTestimonials = 0;

  for (const row of rows) {
    const author = row["Client name"]?.trim() || row["Name"]?.trim();
    const sourceSlug =
      row["Slug"]?.trim() ||
      createSlug(`${author}-${row["Item ID"]?.trim() || row["Created On"]?.trim() || "testimonial"}`);

    if (!author) {
      console.warn("Skipping testimonial row because the author name is missing.", row["Item ID"]);
      continue;
    }

    const linkedArtistId =
      (sourceSlug ? artistIdBySlug.get(sourceSlug) : undefined) ??
      artistIdByName.get(normalizePersonKey(author)) ??
      null;

    if (linkedArtistId) {
      linkedTestimonials += 1;
    } else {
      standaloneTestimonials += 1;
    }

    const uniqueWhere =
      row["Item ID"]?.trim()
        ? { sourceItemId: row["Item ID"].trim() }
        : { sourceSlug };

    await prisma.testimonial.upsert({
      where: uniqueWhere,
      update: {
        artistId: linkedArtistId,
        author,
        sourceSlug,
        company: row["Client's company"]?.trim() || null,
        avatarUrl: row["Client's photo"]?.trim() || null,
        content: stripHtml(row["Testimonial"]) ?? "",
        accentColor: mapAccentColor(row["Quote icon color"]),
        isBottomRow: parseBooleanCell(row["BOTTOM ROW"]),
        isArchived: parseBooleanCell(row["Archived"]),
        isDraft: parseBooleanCell(row["Draft"]),
        sourceCollectionId: row["Collection ID"]?.trim() || null,
        sourceLocaleId: row["Locale ID"]?.trim() || null,
        sourceCreatedAt: parseCmsDate(row["Created On"]),
        sourceUpdatedAt: parseCmsDate(row["Updated On"]),
        sourcePublishedAt: parseCmsDate(row["Published On"]),
      },
      create: {
        artistId: linkedArtistId,
        author,
        sourceSlug,
        company: row["Client's company"]?.trim() || null,
        avatarUrl: row["Client's photo"]?.trim() || null,
        content: stripHtml(row["Testimonial"]) ?? "",
        accentColor: mapAccentColor(row["Quote icon color"]),
        isBottomRow: parseBooleanCell(row["BOTTOM ROW"]),
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

    console.info(`Imported testimonial from ${author}.`);
  }

  console.info(
    `Testimonial import finished. Linked: ${linkedTestimonials}. Standalone: ${standaloneTestimonials}.`,
  );
}

main()
  .catch((error) => {
    console.error("Testimonial import failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
