import { LEGAL_POLICY } from "./legal-policy";

export const COOKIE_CONSENT_NAME = "artboard_cookie_consent";
export const COOKIE_CONSENT_EVENT = "artboard:cookie-consent";
export type CookieConsent = { version: string; analytics: boolean; updatedAt: string };

export function readCookieConsent(cookie: string): CookieConsent | null {
  try {
    const value = cookie.split(";").map(part => part.trim()).find(part => part.startsWith(COOKIE_CONSENT_NAME + "="));
    if (!value) return null;
    const data: unknown = JSON.parse(decodeURIComponent(value.slice(COOKIE_CONSENT_NAME.length + 1)));
    if (!data || typeof data !== "object") return null;
    const item = data as Partial<CookieConsent>;
    if (item.version !== LEGAL_POLICY.version || typeof item.analytics !== "boolean" || typeof item.updatedAt !== "string" || !Number.isFinite(Date.parse(item.updatedAt))) return null;
    return { version: item.version, analytics: item.analytics, updatedAt: item.updatedAt };
  } catch { return null; }
}

/** Optional analytics must consult this before loading; missing/old consent denies. */
export function analyticsAllowed(cookie: string) { return readCookieConsent(cookie)?.analytics === true; }

export function saveCookieConsent(analytics: boolean): CookieConsent {
  const preference = { version: LEGAL_POLICY.version, analytics, updatedAt: new Date().toISOString() };
  document.cookie = `${COOKIE_CONSENT_NAME}=${encodeURIComponent(JSON.stringify(preference))}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  const stored = readCookieConsent(document.cookie);
  if (stored?.updatedAt !== preference.updatedAt || stored.analytics !== analytics) throw new Error("Pregledač nije dozvolio čuvanje izbora kolačića.");
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: preference }));
  return preference;
}
