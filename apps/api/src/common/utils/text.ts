import { randomUUID } from "node:crypto";

const HTML_BREAK_REGEX = /<br\s*\/?>/gi;
const HTML_CLOSING_PARAGRAPH_REGEX = /<\/p>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;

/**
 * Slug generation is used in both the API and the import scripts.
 * Keeping it shared prevents subtle differences between runtime-created and imported data.
 */
export function createSlug(input: string): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || randomUUID();
}

/**
 * The legacy CMS export stores rich text as HTML snippets.
 * We flatten it into plain text because the new frontend is intentionally minimal.
 */
export function stripHtml(input?: string | null): string | null {
  if (!input) {
    return null;
  }

  return decodeHtmlEntities(
    input
      .replace(HTML_BREAK_REGEX, "\n")
      .replace(HTML_CLOSING_PARAGRAPH_REGEX, "\n\n")
      .replace(HTML_TAG_REGEX, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function normalizeMatchKey(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseLegacyArtworkUrls(input?: string | null): string[] {
  if (!input) {
    return [];
  }

  return input
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function titleFromAssetUrl(url: string, fallbackPrefix = "Artwork"): string {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").pop() ?? fallbackPrefix;

    return decodeURIComponent(lastSegment)
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  } catch {
    return fallbackPrefix;
  }
}
