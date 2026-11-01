"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { subscriptionDate as date, subscriptionMoney as money, type SubscriptionOverview } from "@/lib/subscription-overview";
import { updateSubscriptionRenewal } from "@/services/artist-subscriptions";
import styles from "./artist-subscription-panel.module.css";

const freeFeatures = ["Besplatna prijava i profil", "Uređivanje profila jednom mjesečno", "1 besplatna Instagram objava (10 dodatnih za 4,90 €)", "1 besplatan Portfolio Builder export", "1 besplatna QR vizit karta", "Prisustvo u pretraživaču umjetnika", "Pregled oglasne table"];
const premiumFeatures = ["Neograničeno uređivanje profila i radova", "Automatsko povezivanje profila i portfolija", "10 Instagram objava mjesečno (10 dodatnih za 4,90 €)", "5 Portfolio Builder exporta mjesečno (dodatni 4,90 €)", "Neograničen export QR vizit kartica", "Pristup ArtBoard Edu sadržajima", "Mogućnost kreiranja i prodaje Edu sadržaja"];

function Check() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>; }
function Usage({ title, text, total, used }: { title: string; text: string; total?: number; used?: number | null }) {
  return <div className={styles.usageBox}><div className={styles.usageLine}><strong>{title}</strong><span>{text}</span></div>
    {total !== undefined && used !== null && used !== undefined ? <div className={styles.segments} role="img" aria-label={title + ": " + used + " od " + total + " iskorišćeno"}>
      {Array.from({ length: total }, (_, i) => <span key={i} data-active={i < used} style={i < used ? { backgroundSize: total * 100 + "% 100%", backgroundPosition: (total === 1 ? 0 : i / (total - 1) * 100) + "% 0" } : undefined} />)}
    </div> : null}
  </div>;
}

export function ArtistSubscriptionPanel({ initialOverview }: { initialOverview: SubscriptionOverview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [confirming, setConfirming] = useState(false), [pending, setPending] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const inflight = useRef(false), cancelButton = useRef<HTMLButtonElement>(null), confirmationTitle = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  useEffect(() => { setOverview(initialOverview); }, [initialOverview]);
  useEffect(() => {
    if (!overview.billing.accessUntil) return;
    const deadline = Date.parse(overview.billing.accessUntil);
    if (deadline <= Date.now()) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const remaining = deadline - Date.now();
      timer = setTimeout(() => { if (Date.now() >= deadline) router.refresh(); else schedule(); }, Math.min(Math.max(remaining + 100, 1), 86_400_000));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [overview.billing.accessUntil, router]);
  useEffect(() => { if (confirming) confirmationTitle.current?.focus(); }, [confirming]);

  const { state, billing: b, usage, capabilities: caps, prices } = overview;
  const premium = overview.effectivePlan === "PREMIUM", canceled = state === "CANCELED_PENDING_EXPIRY", failed = state === "PAYMENT_FAILED", expired = state === "EXPIRED";
  const amount = b.monthlyAmountCents === null ? "Nije evidentirano" : money(b.monthlyAmountCents);
  const method = b.paymentMethod ? b.paymentMethod.brand + " •••• " + b.paymentMethod.last4 : "Nije evidentirano";
  const range = (start: string | null, end: string | null) => start && end ? date(start, true) + " – " + date(end) : date(start || end);
  const status = canceled ? "Otkazano · aktivno do " + date(b.accessUntil, true) : failed ? "Naplata nije uspjela" : premium ? "Aktivan" : expired ? "Premium istekao" : "Free plan";
  const details = failed ? [
    ["Premium aktivan do", date(b.accessUntil)], ["Neuspješna naplata", b.lastFailedAt ? date(b.lastFailedAt) + (b.failedAmountCents !== null ? " · " + money(b.failedAmountCents) : "") : "Nije evidentirano"],
    ["Ponovni pokušaj", b.nextRetryAt ? date(b.nextRetryAt) : "Nije najavljen"], ["Način plaćanja", method],
  ] : premium ? [
    ["Plan aktivan od", date(b.activatedAt)], [canceled ? "Premium aktivan do" : "Obračunski period", canceled ? date(b.accessUntil) : range(b.periodStart, b.periodEnd)],
    ["Sljedeća naplata", canceled ? "Nema, članstvo je otkazano" : caps.providerConnected ? date(b.periodEnd) + (b.monthlyAmountCents !== null ? " · " + amount : "") : "Nije potvrđena"], ["Način plaćanja", method],
  ] : expired ? [["Posljednji evidentirani Premium period", range(b.lastPremiumStart, b.lastPremiumEnd)], ["Sada", "Free plan, bez pretplate"]]
    : [["Plan", "Free, bez pretplate"], ["Nalog otvoren", date(overview.account.createdAt)]];
  const portfolioText = premium ? usage.portfolio.used + " od " + usage.portfolio.limit + " iskorišćeno · " + (canceled ? "važi do " : "obnova ") + date(usage.portfolio.periodEnd)
    : "1 besplatan · " + (usage.portfolio.remaining > 0 ? "dostupan" : usage.portfolio.reserved > 0 ? "u obradi" : "iskorišćen");
  const instagramText = usage.instagram.known && usage.instagram.used !== null ? premium ? usage.instagram.used + " od " + usage.instagram.limit + " iskorišćeno · " + (canceled ? "važi do " : "obnova ") + date(usage.instagram.periodEnd)
    : "1 besplatna · " + (usage.instagram.used > 0 ? "iskorišćena" : "dostupna") : "Podaci još nijesu dostupni";
  const qrText = !usage.qr.known ? "Podaci još nijesu dostupni" : premium ? canceled ? "Uključeno do " + date(b.accessUntil) : "Uključeno · nove verzije bez ograničenja"
    : usage.qr.available ? "1 besplatna · dostupna" : expired ? "Ranije preuzete verzije ostaju dostupne" : "1 besplatna · iskorišćena";
  async function mutate(action: "cancel" | "reactivate") {
    if (inflight.current) return;
    inflight.current = true; setPending(true); setError(""); setNotice("");
    try {
      const updated = await updateSubscriptionRenewal(action);
      setOverview(updated); setConfirming(false);
      setNotice(action === "cancel" ? "Obnavljanje je otkazano. Premium ostaje aktivan do " + date(updated.billing.accessUntil) : "Obnavljanje je ponovo uključeno. Tekući period nije ponovo naplaćen.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Izmjena nije uspjela. Pokušaj ponovo."); }
    finally { inflight.current = false; setPending(false); }
  }

  return <div className={styles.frame}><section className={styles.page} aria-labelledby="subscription-title" data-state={state}>
    <span className={styles.eyebrow}>Pretplata</span>
    <h1 className={styles.title} id="subscription-title">Upravljanje <span className={styles.gradient}>pretplatom</span></h1>
    <p className={styles.intro}>Pregledaj plan i potrošnju, promijeni iznos članstva ili ga otkaži kad želiš.</p>
    {notice ? <p role="status" className={styles.notice}>{notice}</p> : null}
    <div className={styles.grid}>
      <section className={styles.card + " " + styles.plan} aria-label="Trenutni plan" data-ab="sub-plan">
        <div className={styles.planTop}>
          <div className={styles.planIdentity}><span className={styles.eyebrow}>Trenutni plan</span><div className={styles.planName}>
            <h2>{premium ? "Premium" : "Free"}</h2><span className={styles.badge + (premium && !failed ? " " + styles.gradientFrame : "")}><span className={failed ? styles.dangerBadge : ""}>{premium && !failed ? <Check /> : null}{status}</span></span>
          </div></div>
          <div className={styles.price}><strong className={premium && b.monthlyAmountCents === null ? styles.unknownPrice : ""}>{premium ? amount : "0 €"}</strong><span>{premium ? "mjesečno" : "bez pretplate"}</span></div>
        </div>
        <dl className={styles.details}>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className={styles.usage}>
          <span className={styles.eyebrow}>Uključeno u {premium ? "Premium" : "Free"}</span>
          <Usage title="Instagram objave" text={instagramText} total={premium ? usage.instagram.limit : undefined} used={usage.instagram.known ? usage.instagram.used : null} />
          <Usage title="Portfolio Builder exporti" text={portfolioText} total={premium ? usage.portfolio.limit : undefined} used={usage.portfolio.used} />
          {usage.portfolio.reserved > 0 ? <span className={styles.note}>U obradi: {usage.portfolio.reserved}. Raspoloživo: {usage.portfolio.remaining}.</span> : null}
          <Usage title="QR vizit karta" text={qrText} />
          <p className={styles.note}>{premium ? "Neiskorišćene objave i exporti se ne prenose u sljedeći mjesec. Set od 10 dodatnih objava i dodatni export koštaju po " + money(prices.extraExportCents) + " i naplaćuju se samo uz tvoju potvrdu."
            : "Poslije besplatnog: set od 10 Instagram objava " + money(prices.instagramPackCents) + ", export " + money(prices.extraExportCents) + ", jednokratno i bez pretplate. Nova QR vizit karta uz Premium."}</p>
          {!premium ? <div className={styles.topups}><Link className={styles.outline} href="/pretplata/placanje?proizvod=generator">Kupi set · {money(prices.instagramPackCents)}</Link><Link className={styles.outline} href="/placanje?proizvod=portfolio">Kupi export · {money(prices.extraExportCents)}</Link></div> : null}
        </div>
      </section>
      <aside className={styles.card + " " + styles.actions} aria-label="Upravljanje članstvom" data-ab="sub-actions" aria-busy={pending}>
        <span className={styles.eyebrow + (failed ? " " + styles.red : "")}>{failed ? "Naplata" : canceled ? "Članstvo je otkazano" : premium ? "Članstvo" : "Premium članstvo"}</span>
        <h2>{failed ? "Naplata nije uspjela." : canceled ? "Premium je aktivan do " + date(b.accessUntil) : premium ? (caps.providerConnected ? "Sljedeće obnavljanje: " + date(b.periodEnd) : "Tekući Premium period: do " + date(b.accessUntil)) : expired ? "Premium je istekao " + date(b.lastPremiumEnd) : "Koristiš Free plan."}</h2>
        <p>{failed ? (b.failedAmountCents !== null ? "Nismo uspjeli naplatiti " + money(b.failedAmountCents) + " za sljedeći period. " : "Naplata za sljedeći period nije potvrđena. ") + (b.nextRetryAt ? "Sljedeći pokušaj je " + date(b.nextRetryAt) + ". " : "Novi pokušaj naplate nije najavljen. ") + "Premium pristup važi do " + date(b.accessUntil) + "."
          : canceled ? "Nakon toga nalog prelazi na Free. Preuzete objave, PDF-ovi i kartice ostaju dostupni. Ako se predomisliš, članstvo nastavljaš bez nove prijave."
          : premium ? "Iznos članstva biraš od 8,90 do 30 € mjesečno, a Premium pristup je isti za svaki iznos. Novi iznos važi od sljedećeg obračunskog perioda."
          : expired ? "Nalog sada koristi Free plan, a preuzete verzije ostaju dostupne. Premium od " + money(prices.premiumMinimumCents) + " mjesečno uključuje 10 Instagram objava, 5 Portfolio Builder exporta i QR vizit kartu."
          : "Premium od " + money(prices.premiumMinimumCents) + " mjesečno uključuje 10 Instagram objava i 5 Portfolio Builder exporta mjesečno, QR vizit kartu i neograničeno uređivanje profila."}</p>
        <div className={styles.actionStack}>
          {canceled ? <button className={styles.primary} disabled={pending || !caps.canReactivate} onClick={() => void mutate("reactivate")}>{pending ? "Obrađujemo…" : "Obnovi članstvo"}</button>
            : premium ? <button className={styles.primary} disabled aria-describedby="subscription-limitations">{failed ? "Ažuriraj karticu" : "Promijeni iznos"}</button>
            : <Link className={styles.gradientAction} href="/placanje?proizvod=premium">{expired ? "Obnovi Premium" : "Aktiviraj Premium"}</Link>}
          {premium && !canceled && !confirming ? <button ref={cancelButton} className={styles.cancel} disabled={!caps.canCancel} onClick={() => { setError(""); setConfirming(true); }}>Otkaži članstvo</button> : null}
          {confirming ? <section className={styles.confirmation} aria-labelledby="cancel-confirmation-title">
            <h3 ref={confirmationTitle} tabIndex={-1} id="cancel-confirmation-title">Otkazati Premium članstvo?</h3>
            <p>Premium ostaje aktivan do {date(b.accessUntil)} Nakon toga nalog prelazi na Free, a preuzete objave, PDF-ovi i kartice ostaju dostupni.</p>
            <div><button className={styles.confirmButton} disabled={pending} onClick={() => void mutate("cancel")}>{pending ? "Obrađujemo…" : "Potvrdi otkazivanje"}</button><button className={styles.dismiss} disabled={pending} onClick={() => { setConfirming(false); setError(""); requestAnimationFrame(() => cancelButton.current?.focus()); }}>Odustani</button></div>
          </section> : null}
        </div>
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        {overview.limitations.length > 0 ? <p id="subscription-limitations" className={styles.note}>{overview.limitations.join(" ")}</p> : null}
      </aside>
    </div>
    <section className={styles.plans} aria-label="Planovi"><span className={styles.eyebrow}>Planovi</span><div className={styles.planGrid}>
      {[false, true].map(isPremium => <div key={String(isPremium)} className={isPremium ? styles.premiumFrame : styles.freeFrame}>
        <article className={styles.comparison}><div className={styles.comparisonHeading}><h2>{isPremium ? "Premium" : "Free"}</h2><strong>{isPremium ? "od " + money(prices.premiumMinimumCents) + " mjesečno" : "0 €"}</strong></div>
          {isPremium ? <p>Iznos biraš od 8,90 do 30 € mjesečno; pristup je isti za svaki iznos.</p> : null}
          <ul>{(isPremium ? premiumFeatures : freeFeatures).map((feature, i) => <li key={feature}><Check /><span>{feature}{isPremium && i >= 5 ? <small>Uskoro</small> : null}</span></li>)}</ul>
          {isPremium === premium ? <span className={styles.current}>Trenutni plan</span> : null}
        </article>
      </div>)}
    </div></section>
  </section></div>;
}
