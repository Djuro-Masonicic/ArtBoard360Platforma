import { OPPORTUNITY_COUNTRIES } from "@/lib/opportunity-countries";
import type { Opportunity, OpportunityCompensationKind, OpportunityOrganizerType, OpportunityType, OpportunityWorkMode } from "@/services/opportunities";

export const opportunityTypeLabels: Record<OpportunityType, string> = {
  JOB: "Posao", EXHIBITION: "Izložba", FREELANCE: "Honorarni angažman", OPEN_CALL: "Konkurs",
  COLLABORATION: "Saradnja", RESIDENCY: "Rezidencija", GRANT: "Grant", SCHOLARSHIP: "Stipendija",
  WORKSHOP: "Radionica / edukacija", OTHER: "Drugo",
};
export const opportunityTypeOrder = Object.keys(opportunityTypeLabels) as OpportunityType[];
export const workModeLabels: Record<OpportunityWorkMode, string> = { ONSITE: "Na licu mjesta", REMOTE: "Na daljinu", HYBRID: "Hibridno" };
export const compensationKindLabels: Record<OpportunityCompensationKind, string> = {
  PRIZE: "Nagradni fond", STIPEND: "Stipendija", FEE: "Honorar", SALARY: "Plata", NONE: "Bez naknade", OTHER: "Naknada",
};
export const organizerTypeLabels: Record<OpportunityOrganizerType, string> = {
  INDIVIDUAL: "Pojedinac", INFORMAL_GROUP: "Neformalna grupa", NGO: "NVO / udruženje",
  ENTREPRENEUR: "Preduzetnik", COMPANY: "Kompanija", INSTITUTION: "Institucija", EDUCATIONAL_INSTITUTION: "Obrazovna ustanova",
};
export const languageLabels: Record<string, string> = {
  ME: "crnogorski", SR: "srpski", HR: "hrvatski", BS: "bosanski", MK: "makedonski", SL: "slovenački",
  SQ: "albanski", EN: "engleski", DE: "njemački", FR: "francuski", IT: "italijanski", ES: "španski",
};
export const documentLabels: Record<string, string> = {
  cv: "Biografija / CV", portfolio: "Portfolio (PDF)", bio: "Kratka umjetnička biografija",
  proposal: "Prijedlog projekta", sketch: "Skica / idejno rješenje", motivation: "Motivaciono pismo",
};
const countries = new Map(OPPORTUNITY_COUNTRIES.map(({ code, name }) => [code, name]));
export function countryLabel(code: string) { return countries.get(code) ?? code; }
export function normalizeOpportunityText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "dj").toLowerCase();
}

// Calendar days in the site's timezone keep deadline-day calls open until midnight.
export function calendarDay(value: string | number) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Podgorica", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const number = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(number("year"), number("month") - 1, number("day"));
}
export function daysRemaining(item: Opportunity, now: number) {
  return item.isOpenEnded || !item.deadlineAt ? null : Math.round((calendarDay(item.deadlineAt) - calendarDay(now)) / 86400000);
}
export function isOpenOpportunity(item: Opportunity, now: number) {
  const remaining = daysRemaining(item, now);
  return !item.isArchived && !item.isDraft && item.submissionStatus === "APPROVED" && (remaining === null || remaining >= 0);
}
export function deadlineLabel(item: Opportunity, now: number, detailed = false) {
  if (item.isOpenEnded) return "Otvoreno do popunjavanja";
  if (!item.deadlineAt) return "Rok nije naveden";
  const days = daysRemaining(item, now)!;
  const date = new Intl.DateTimeFormat("sr-Latn-ME", { timeZone: "Europe/Podgorica", day: "numeric", month: "short", year: "numeric" }).format(new Date(item.deadlineAt));
  if (days < 0) return detailed ? `${date} · rok je istekao` : "Rok je istekao";
  const remaining = days === 0 ? "danas" : days === 1 ? "za 1 dan" : `za ${days} dana`;
  if (detailed) return `${date} · ${days === 0 ? "danas" : `još ${days} ${days === 1 ? "dan" : "dana"}`}`;
  return days <= 7 ? `Ističe ${remaining}` : `Rok: ${date}`;
}
export function money(amount: string | number, currency = "EUR") {
  return new Intl.NumberFormat("sr-Latn-ME", { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(Number(amount));
}
export function compensationLabel(item: Opportunity) {
  return item.compensationKind ? compensationKindLabels[item.compensationKind] : item.isPaid ? "Naknada" : "Uslovi prijave";
}
export function compensationValue(item: Opportunity) {
  if (item.compensationKind === "NONE") return "Bez naknade";
  if (item.compensationAmount !== null && item.compensationAmount !== undefined) return money(item.compensationAmount, item.compensationCurrency);
  return item.compensation || (item.isPaid ? "Po dogovoru" : "Detalji u oglasu");
}
export function feeLabel(item: Opportunity) {
  return item.applicationFee === null || item.applicationFee === undefined ? null : Number(item.applicationFee) === 0 ? "Bez kotizacije" : `Kotizacija: ${money(item.applicationFee, item.compensationCurrency)}`;
}
export function locationLabel(item: Opportunity) {
  return item.countryCode && item.city ? `${item.city}, ${countryLabel(item.countryCode)}` : item.location || "Lokacija nije navedena";
}
export function publishedLabel(item: Opportunity, now: number) {
  const days = Math.max(0, Math.round((calendarDay(now) - calendarDay(item.createdAt)) / 86400000));
  return days === 0 ? "Objavljeno danas" : days === 1 ? "Objavljeno juče" : `Objavljeno prije ${days} dana`;
}
