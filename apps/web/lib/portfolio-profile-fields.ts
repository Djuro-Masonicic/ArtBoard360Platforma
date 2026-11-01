// Keep calendar dates as strings: parsing local midnight would shift a birthday
// in some time zones. Only the API converts the canonical date to a DB DATE.
export function parseBirthDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const local = /^(\d{2})\.(\d{2})\.(\d{4})\.?$/.exec(trimmed);
  const iso = local ? `${local[3]}-${local[2]}-${local[1]}` : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso.startsWith("0000")) return null;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso &&
    iso <= new Date().toISOString().slice(0, 10) ? iso : null;
}

export function formatBirthDate(value?: string | null): string {
  const iso = value?.slice(0, 10);
  return iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}.` : "";
}
