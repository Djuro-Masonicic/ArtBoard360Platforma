import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { createSlug, stripHtml } from "../src/common/utils/text";
import { env } from "../src/config/env";
import { parseBooleanCell, parseCmsDate, readCsvRows, resolveCsvPath } from "./import-helpers";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: env.databaseUrl,
  }),
});

/**
 * Imports FAQ questions from the Webflow CMS export.
 * We upsert by Webflow Item ID when available, otherwise by slug, so running
 * the importer multiple times updates existing rows instead of duplicating them.
 */
async function main() {
  const filePath = resolveCsvPath(process.argv[2], env.faqsCsvPath, "FAQS_CSV_PATH");
  const rows = await readCsvRows(filePath);

  let importedCount = 0;

  for (const [index, row] of rows.entries()) {
    const question = row["Question"]?.trim() || row["Question title"]?.trim();
    const answer = stripHtml(row["Answer"])?.trim();
    const slug = row["Slug"]?.trim() || createSlug(question || `faq-${index + 1}`);

    if (!question || !answer) {
      console.warn("Skipping FAQ row because question or answer is missing.", row["Item ID"]);
      continue;
    }

    const uniqueWhere = row["Item ID"]?.trim()
      ? { sourceItemId: row["Item ID"].trim() }
      : { slug };

    await prisma.faqQuestion.upsert({
      where: uniqueWhere,
      update: {
        question,
        answer,
        slug,
        orderIndex: index,
        isArchived: parseBooleanCell(row["Archived"]),
        isDraft: parseBooleanCell(row["Draft"]),
        sourceCollectionId: row["Collection ID"]?.trim() || null,
        sourceLocaleId: row["Locale ID"]?.trim() || null,
        sourceCreatedAt: parseCmsDate(row["Created On"]),
        sourceUpdatedAt: parseCmsDate(row["Updated On"]),
        sourcePublishedAt: parseCmsDate(row["Published On"]),
      },
      create: {
        question,
        answer,
        slug,
        orderIndex: index,
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

    importedCount += 1;
    console.info(`Imported FAQ: ${question}`);
  }

  console.info(`FAQ import finished. Imported rows: ${importedCount}.`);
}

main()
  .catch((error) => {
    console.error("FAQ import failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
