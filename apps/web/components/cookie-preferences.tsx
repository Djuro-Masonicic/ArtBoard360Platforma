"use client";

import { useEffect, useRef, useState } from "react";
import { readCookieConsent, saveCookieConsent, COOKIE_CONSENT_EVENT } from "@/lib/cookie-consent";
import styles from "./legal-policy-document.module.css";

export function CookiePreferences() {
  const [expanded, setExpanded] = useState(false), [analytics, setAnalytics] = useState(false);
  const [saved, setSaved] = useState<boolean | null>(null), [error, setError] = useState("");
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const sync = () => { const preference = readCookieConsent(document.cookie); setAnalytics(preference?.analytics ?? false); setSaved(preference?.analytics ?? null); };
    sync(); window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);
  function save(allow: boolean) {
    try { saveCookieConsent(allow); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Izbor nije sačuvan."); }
  }
  return <div className={styles.cookieSettings} data-cookie-settings="">
    <button className={styles.cookieToggle} ref={button} type="button" aria-expanded={expanded} aria-controls="cookie-preferences-panel" onClick={() => setExpanded(value => !value)}>Podešavanja kolačića</button>
    {expanded ? <section id="cookie-preferences-panel" className={styles.cookiePanel} aria-label="Izbor kolačića">
      <p>Neophodni kolačići omogućavaju prijavu i čuvanje podešavanja. Analitički kolačići su opcioni; analitički alati trenutno nijesu uključeni.</p>
      <label><input type="checkbox" checked disabled />Neophodni kolačići — uvijek uključeni</label>
      <label><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} />Dozvoli analitičke kolačiće</label>
      <div className={styles.cookieActions}><button type="button" onClick={() => save(analytics)}>Sačuvaj izbor</button><button type="button" onClick={() => save(false)}>Samo neophodni</button><button type="button" onClick={() => { setExpanded(false); button.current?.focus(); }}>Zatvori</button></div>
      {error ? <p role="alert">{error}</p> : <p role="status">{saved === null ? "Analitički kolačići nijesu dozvoljeni dok ne daš saglasnost." : saved ? "Izbor je sačuvan: analitički kolačići su dozvoljeni." : "Izbor je sačuvan: samo neophodni kolačići."}</p>}
    </section> : null}
  </div>;
}
