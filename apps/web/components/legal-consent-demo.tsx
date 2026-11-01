"use client";

import { useMemo, useState } from "react";

import styles from "@/app/uslovi-koriscenja/uslovi-koriscenja.module.css";

type AdultChoice = "no" | "yes" | null;

export function LegalConsentDemo() {
  const [isAuthor, setIsAuthor] = useState(false);
  const [allowsPromotion, setAllowsPromotion] = useState(false);
  const [adultChoice, setAdultChoice] = useState<AdultChoice>(null);

  const missing = useMemo(() => {
    const items: string[] = [];
    if (!isAuthor) items.push("autorstvo");
    if (!allowsPromotion) items.push("licenca");
    if (!adultChoice) items.push("oznaka 18+");
    return items;
  }, [adultChoice, allowsPromotion, isAuthor]);

  return (
    <section className={styles.consentCard} aria-labelledby="consent-demo-title">
      <div className={styles.consentHeading}>
        <p>Pri svakoj objavi djela</p>
        <h2 id="consent-demo-title">Obavezne izjave umjetnika</h2>
        <span>
          Dok ne potvrdite sve obavezne stavke, djelo se ne može objaviti. Ovako izgleda ovaj korak
          u formi za objavu.
        </span>
      </div>

      <label className={styles.consentOption}>
        <input checked={isAuthor} onChange={(event) => setIsAuthor(event.target.checked)} type="checkbox" />
        <span><strong>Ja sam autor ovog djela</strong>ili imam pisanu saglasnost autora i svih nosilaca prava. Djelo ne krši prava trećih lica.</span>
      </label>

      <label className={styles.consentOption}>
        <input checked={allowsPromotion} onChange={(event) => setAllowsPromotion(event.target.checked)} type="checkbox" />
        <span><strong>Dozvoljavam promotivnu upotrebu</strong>ArtBoard smije prikazati djelo uz moje ime u promociji platforme i programa, prema članu 4.</span>
      </label>

      <div className={styles.adultOption}>
        <span><strong>Da li djelo sadrži sadržaj 18+?</strong>Nagost, eksplicitna seksualnost, izražena brutalnost ili uznemirujući prizori.</span>
        <div>
          <button aria-pressed={adultChoice === "no"} className={adultChoice === "no" ? styles.isSelected : undefined} onClick={() => setAdultChoice("no")} type="button">Ne</button>
          <button aria-pressed={adultChoice === "yes"} className={adultChoice === "yes" ? styles.isSelected : undefined} onClick={() => setAdultChoice("yes")} type="button">Da, sadrži 18+</button>
        </div>
      </div>

      <div className={styles.consentStatus} aria-live="polite">
        <span>{missing.length ? `Nedostaje: ${missing.join(", ")}` : "Sve obavezne izjave su potvrđene."}</span>
        <button disabled={missing.length > 0} type="button">Objavi djelo</button>
      </div>
    </section>
  );
}
