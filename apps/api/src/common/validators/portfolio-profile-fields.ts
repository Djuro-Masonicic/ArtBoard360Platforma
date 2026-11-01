import { ValidateBy } from "class-validator";

export function validBirthDate(value: unknown): value is string {
  if (value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10);
}

export function normalizeBehanceUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!/^(www\.)?behance\.net$/i.test(url.hostname) || url.username || url.password || url.port ||
      !/^https?:$/.test(url.protocol) || /\s/.test(trimmed) || url.pathname === "/") return null;
    url.protocol = "https:";
    return url.toString();
  } catch { return null; }
}

export const IsBirthDate = () => ValidateBy({ name: "birthDate", validator: {
  validate: validBirthDate,
  defaultMessage: () => "Datum rođenja mora biti ispravan datum u formatu YYYY-MM-DD i ne smije biti u budućnosti.",
} });

export const IsBehanceProfile = () => ValidateBy({ name: "behanceProfile", validator: {
  validate: (value: unknown) => typeof value === "string" && normalizeBehanceUrl(value) !== null,
  defaultMessage: () => "Unesi ispravan Behance link (behance.net/ime).",
} });
