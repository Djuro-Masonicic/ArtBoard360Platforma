import { readFile } from "node:fs/promises";
import path from "node:path";

import { SocialPlatform, TestimonialAccentColor } from "@prisma/client";
import { parse } from "csv-parse/sync";

import { createSlug, normalizeMatchKey, parseLegacyArtworkUrls, titleFromAssetUrl } from "../src/common/utils/text";

export type CsvRow = Record<string, string>;

const socialColumns: Record<string, SocialPlatform> = {
  ArtStation: "ARTSTATION",
  Behance: "BEHANCE",
  DeviantArt: "DEVIANTART",
  Dribbble: "DRIBBBLE",
  Facebook: "FACEBOOK",
  Instagram: "INSTAGRAM",
  LinkedIn: "LINKEDIN",
  Medium: "MEDIUM",
  "Personal Website": "PERSONAL_WEBSITE",
  PDF: "PDF",
  Pinterest: "PINTEREST",
  Telegram: "TELEGRAM",
  Threads: "THREADS",
  Vimeo: "VIMEO",
  "X (Twitter)": "X_TWITTER",
  YouTube: "YOUTUBE",
};

/**
 * We use a real CSV parser because the exports contain quoted commas,
 * HTML content, and occasional newlines inside text fields.
 */
export async function readCsvRows(filePath: string): Promise<CsvRow[]> {
  const absolutePath = path.resolve(filePath);
  const csvContent = await readFile(absolutePath, "utf8");

  return parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as CsvRow[];
}

export function resolveCsvPath(argumentValue: string | undefined, envValue: string | undefined, label: string) {
  const resolvedValue = argumentValue ?? envValue;

  if (!resolvedValue) {
    throw new Error(
      `Missing CSV path. Pass the file path as the first argument or set ${label} in .env.`,
    );
  }

  return path.resolve(resolvedValue);
}

export function parseBooleanCell(value?: string | null): boolean {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "true";
}

export function parseCmsDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildSocialLinksFromArtistRow(row: CsvRow) {
  const links = new Map<SocialPlatform, string>();

  for (const [column, platform] of Object.entries(socialColumns)) {
    const rawValue = row[column]?.trim();

    if (rawValue) {
      links.set(platform, rawValue);
    }
  }

  return Array.from(links.entries()).map(([platform, url]) => ({
    platform,
    url,
  }));
}

export function buildArtworkRows(artistName: string, rawArtworkValue?: string | null) {
  return parseLegacyArtworkUrls(rawArtworkValue).map((imageUrl, index) => ({
    imageUrl,
    title: titleFromAssetUrl(imageUrl, `${artistName} artwork ${index + 1}`),
    altText: `${artistName} artwork ${index + 1}`,
    orderIndex: index,
  }));
}

export function mapAccentColor(value?: string | null): TestimonialAccentColor | null {
  const normalized = value?.trim().toUpperCase();

  if (normalized === "BLUE" || normalized === "RED" || normalized === "YELLOW") {
    return normalized;
  }

  return null;
}

export function normalizePersonKey(value: string) {
  return normalizeMatchKey(value);
}

export function normalizeDisciplineNames(value?: string | null) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function fallbackSlug(value: string, fallbackPrefix: string) {
  return createSlug(value || fallbackPrefix);
}
