"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import { newDeliverySecret } from '@/lib/portfolio-guest-transport';
import { amountToPercent, percentToAmount, formatPaymentAmount as money, paymentCopy, type PaymentContext } from "@/lib/payment-context";
import styles from "./payment-workspace.module.css";

const benefits = ["Neograničeno uređivanje profila i radova", "Automatsko povezivanje profila i portfolija", "10 Instagram objava mjesečno (10 dodatnih za 4,90 €)", "5 Portfolio Builder exporta mjesečno (dodatni 4,90 €)", "Neograničen export QR vizit kartica", "Pristup ArtBoard Edu sadržajima", "Mogućnost kreiranja i prodaje Edu sadržaja"];
function Row({ label, value }: { label: string; value: string }) { return <div className={styles.row}><span>{label}</span><strong>{value}</strong></div>; }
function AmountSlider({ cents, allowed, onChange }: { cents: number; allowed: number[]; onChange: (c: number) => void }) {
  const p = amountToPercent(cents / 100), position = (percent: number) => `calc(${percent}% + ${13 - .26 * percent}px)`;
  function point(event: React.PointerEvent<HTMLDivElement>) {
    const r = event.currentTarget.getBoundingClientRect();
    const selected = Math.round(percentToAmount(100 * (event.clientX - r.left - 13) / Math.max(1, r.width - 26)) * 100);
    if (allowed.includes(selected)) onChange(selected);
  }
  return <div className={styles.sliderGroup}>
    <div className={styles.slider} role="slider" aria-label="Mjesečni iznos" aria-valuemin={8.9} aria-valuemax={30} aria-valuenow={cents / 100} aria-valuetext={money(cents)} tabIndex={0}
      onPointerDown={e => { e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); point(e); }}
      onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) point(e); }}
      onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
      onKeyDown={e => {
        const i = allowed.indexOf(cents); let next = i;
        if (["ArrowRight", "ArrowUp"].includes(e.key)) next++;
        else if (["ArrowLeft", "ArrowDown"].includes(e.key)) next--;
        else if (e.key === "Home") next = 0; else if (e.key === "End") next = allowed.length - 1;
        else if (e.key === "PageUp") next += 5; else if (e.key === "PageDown") next -= 5; else return;
        e.preventDefault(); onChange(allowed[Math.max(0, Math.min(allowed.length - 1, next))]!);
      }}>
      <span className={styles.track} /><span className={styles.fill} style={{ clipPath: `inset(0 calc(${100 - p}% - ${26 * (1 - p / 100)}px) 0 0 round 999px)` }} />
      {[0, 20, 40, 60, 80, 100].map(tick => <span className={styles.tick} style={{ left: position(tick), background: tick === 0 || tick === 100 ? "transparent" : tick <= p ? "#fff" : "#c3c7d2" }} key={tick} />)}
      <span className={styles.thumb} style={{ left: position(p) }} />
    </div>
    <div className={styles.ticks} aria-hidden="true">{[890, 1000, 1500, 2000, 2500, 3000].map((v, i) => <span style={{ left: position(i * 20) }} key={v}>{money(v)}</span>)}</div>
  </div>;
}
function CardFields({ method }: { method: PaymentContext["paymentMethod"] }) {
  if (method) return <section className={styles.method}><h3>Način plaćanja</h3><strong>Platna kartica · {method.brand} ···· {method.last4}</strong><p>Ista kao za Premium članstvo</p></section>;
  return <section className={styles.cardFields} aria-label="Podaci o kartici — plaćanje još nije dostupno">
    <h3>Podaci o kartici</h3>
    <div className={styles.fields}>
      <label>Ime na kartici<input disabled autoComplete="off" placeholder="Ime i prezime" /></label>
      <label>Broj kartice<input disabled autoComplete="off" inputMode="numeric" placeholder="1234 5678 9012 3456" /></label>
      <div className={styles.fieldPair}><label>Datum isteka<input disabled autoComplete="off" placeholder="MM / GG" /></label><label>CVC<input disabled autoComplete="off" placeholder="123" /></label></div>
    </div>
  </section>;
}
export function PaymentWorkspace({ context }: { context: PaymentContext }) {
  const [c,setContext]=useState(context),[busy,setBusy]=useState(false),[mockMessage,setMockMessage]=useState(''),[mockStatus,setMockStatus]=useState('');
  const attempt=useRef<{operationKey:string;deliverySecret:string}|null>(null),router=useRouter();
  const [amount, setAmount] = useState(c.product === "premium" ? c.catalog.premiumAmountsCents[0]! : c.amountCents);
  const [email, setEmail] = useState(c.buyerEmail ?? ""), [consent, setConsent] = useState(false), [error, setError] = useState("");
  const copy = paymentCopy(c), isPremium = c.product === "premium", guest = c.variant === "PORTFOLIO_GUEST", generator = c.product === "generator";
  const back = isPremium ? "/paketi" : generator ? "/generator" : c.portfolio?.id ? `/portfolio-builder/${c.portfolio.id}` : "/portfolio-builder";
  const renewal = c.quota?.periodEnd ? new Intl.DateTimeFormat("sr-Latn-ME", { dateStyle: "medium" }).format(new Date(c.quota.periodEnd)) : "—";
  const premiumPlan = c.variant.endsWith("PREMIUM") && !isPremium;
  const hasAllowance = Boolean(c.quota && (c.quota.remaining > 0 || c.quota.reserved > 0));
  const mock=Boolean(c.catalog.mockPaymentsEnabled),paid=mockStatus==='PAID'||c.status==='PAID';
  async function simulate(outcome:'success'|'failure'|'cancel') {
    if(busy)return;setBusy(true);setError('');setMockMessage('');
    try {
      attempt.current??={operationKey:crypto.randomUUID(),deliverySecret:newDeliverySecret()};
      const post=async(path:string,body:unknown)=>{const response=await fetch(`/api/portfolio-commerce/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(Array.isArray(data.message)?data.message.join(' '):data.message||'Testno plaćanje nije uspjelo.');return data;};
      let path:string,body:unknown;
      if(c.product==='portfolio'){
        let id=c.purchase?.id;
        if(!id){if(!c.portfolio?.id)throw Error('Pripremi narudžbinu u Portfolio Builderu.');id=(await post(`projects/${c.portfolio.id}/purchase`,attempt.current)).id;setContext(old=>({...old,purchase:{id:id!,status:'PENDING'}}));}
        path=`purchases/${id}/mock-payment`;body={outcome};
      }else{path=`mock/${c.product}`;body={outcome,operationKey:attempt.current.operationKey,...(isPremium?{amountCents:amount}:{})};}
      const result=await post(path,body);setContext(result.context);setMockStatus(result.status);setMockMessage(result.message);router.refresh();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className={styles.frame}><section className={styles.page} aria-labelledby="payment-title">
    <div className={styles.inner}>
      <Link className={styles.back} href={back}><span aria-hidden="true">←</span>{isPremium ? "Nazad na pakete" : generator ? c.catalog.generatorAvailable ? "Nazad u Generator" : "Nazad na nalog" : "Nazad u Portfolio Builder"}</Link>
      <div className={styles.grid}>
        <div className={styles.left}>
          <h1 id="payment-title" className={styles.title}>{isPremium ? <>Izaberi svoj <span className={styles.gradient}>iznos.</span></> : copy.title}</h1>
          <p className={styles.intro}>{copy.description}</p>
          <section className={`${styles.card} ${styles.priceCard}`} aria-label={isPremium ? "Mjesečni iznos članstva" : "Cijena kupovine"}>
            <div className={styles.priceHeading}><div className={styles.priceLine}><strong className={`${styles.price} ${styles.gradient}`} data-price="large">{money(amount).replace(" €", "€")}</strong><span>/ {isPremium ? "mjesečno" : "jednokratno"}</span></div>
            {isPremium || generator ? <p className={styles.priceNote}>{isPremium ? "Isti Premium pristup za svaki iznos." : "Set od 10 Instagram objava."}</p> : null}</div>
            {isPremium ? <>
              <AmountSlider cents={amount} allowed={c.catalog.premiumAmountsCents} onChange={setAmount} />
              <div className={styles.benefits}><h3>Premium uključuje</h3><ul>{benefits.map((b, i) => <li key={b}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a7cff" strokeWidth="2.4" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg><span>{b}{i > 4 ? <small>Uskoro</small> : null}</span></li>)}</ul></div>
            </> : <div className={styles.priceRows}>
              {generator ? <><Row label={premiumPlan ? "Instagram objave" : "Besplatna objava"} value={c.catalog.generatorAvailable ? `${c.quota?.used ?? 0} od ${c.quota?.limit ?? 1} iskorišćeno` : "Podaci još nijesu dostupni"} /><Row label="Set od 10 dodatnih objava" value={money(amount)} /></>
                : guest ? <><Row label="Prvi export uz besplatan nalog" value="Besplatno" /><Row label="Export bez naloga" value={money(amount)} /></>
                : <><Row label={premiumPlan ? "Portfolio Builder exporti" : hasAllowance ? "Raspoloživi exporti" : "Besplatan export · iskorišćen"} value={premiumPlan ? `${c.quota?.used ?? 0} od ${c.quota?.limit ?? 5}` : hasAllowance ? String(c.quota?.remaining ?? 0) : "Besplatno"} /><Row label={premiumPlan ? "Dodatni export" : "Svaki sljedeći export"} value={money(amount)} /></>}
              {premiumPlan ? <Row label="Obnova Premium limita" value={generator && !c.catalog.generatorAvailable ? "Još nije povezana" : renewal} /> : <><Row label={`Uz Premium, od ${money(c.catalog.premiumAmountsCents[0]!)} mjesečno`} value={generator ? "10 objava mjesečno" : "5 exporta mjesečno"} /><Link className={styles.upgrade} href="/artist/subscribe">{generator ? "Objavljuješ češće? " : guest ? "Izvoziš češće? " : ""}Izaberi Premium →</Link></>}
            </div>}
          </section>
        </div>
        <form className={`${styles.card} ${styles.details}`} aria-label="Detalji plaćanja" onSubmit={e => { e.preventDefault();if(mock)void simulate('success');else setError("AllSecure plaćanje još nije dostupno. Ništa nije naplaćeno."); }}>
          <h2>Detalji plaćanja</h2>
          {mock&&<div className={styles.mockBanner}><strong>Testno plaćanje</strong><span>Ništa se ne naplaćuje i kartica nije potrebna. Uspješna simulacija aktivira Premium ili dodaje kupljena prava za testiranje.</span></div>}
          <div className={styles.summary}>
            {isPremium ? <Row label="ArtBoard Premium" value={`${money(amount)} / mj.`} /> : generator ? <>
              <Row label="Proizvod" value="Dopuna za Generator" /><Row label="Sadržaj" value="10 Instagram objava" /><Row label="Važenje" value="Ne ističe dok ih ne potrošiš" /><Row label="Koristi se u" value="Generator promotivnih materijala" /><Row label="Nalog" value={c.quota?.plan === "PREMIUM" ? "Premium" : c.account ? "Free" : "Potrebna prijava"} />
            </> : c.portfolio ? <><Row label="Portfolio" value={c.portfolio.title} /><Row label="Stil" value={c.portfolio.style} /><Row label="Format" value={c.portfolio.format} /><Row label="Broj strana" value={String(c.portfolio.pageCount)} /><Row label="Jezik" value={c.portfolio.language} /></> : <p className={styles.help}>Pripremi portfolio u editoru da bi se prikazali stvarni podaci narudžbine.</p>}
            {!isPremium ? <Row label={generator ? "Dopuna za Generator · 10 objava" : "Portfolio Builder export"} value={money(amount)} /> : null}
            <Row label={mock ? "Testni period" : "Naplata"} value={mock ? isPremium ? "Jedan mjesec · bez automatske obnove" : "Jednokratno · bez naplate" : isPremium ? "Mjesečno" : "Jednokratno"} />
          </div>
          <div className={styles.total}><span>{mock ? "Iznos simulacije · bez naplate" : "Ukupno danas"}</span><strong data-price="total">{money(amount)}</strong></div>
          {!isPremium && c.account ? <section className={styles.account}><h3>Tvoj nalog</h3><div className={styles.identity}><span aria-hidden="true">{(c.account.name || c.account.email).slice(0, 1).toUpperCase()}</span><strong>{c.account.email}</strong></div><p>{generator ? c.catalog.generatorAvailable ? "Objave iz seta dodaju se nakon serverske potvrde uplate." : "Saldo Generatora još nije povezan sa naplatom." : "Draft i PDF se čuvaju u tvom nalogu."}</p></section> : null}
          {guest ? <section className={styles.guest}><h3>E-mail za račun</h3><label><span className={styles.srOnly}>E-mail za račun</span><input type="email" autoComplete="email" placeholder="ime@primjer.me" required value={email} readOnly={Boolean(c.purchase)} onChange={e => setEmail(e.target.value)} /></label>
            <p>Na ovaj e-mail šaljemo račun i link za preuzimanje PDF-a. Za kupovinu ti ne treba nalog.</p>
            {c.purchase ? <p>E-mail pripremljene narudžbine se ne može mijenjati. Automatsko slanje čeka povezivanje naplate i isporuke.</p> : null}
            <Link href="/prijava">Napravi nalog i prvi export dobij besplatno</Link>
          </section> : null}
          {!mock&&<CardFields method={c.paymentMethod} />}
          {guest ? <label className={styles.consent}><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Prihvatam <Link href="/uslovi-koriscenja">Uslove korišćenja</Link> i <Link href="/uslovi-koriscenja#privatnost">Politiku privatnosti</Link>.</span></label> : null}
          <button className={styles.submit} type="submit" disabled={!mock||!c.checkoutAvailable||busy||paid} title={mock?'Serverska simulacija uspješne uplate':'AllSecure plaćanje još nije povezano'}>{busy?'Obrada…':mock?paid?'Testno plaćanje potvrđeno':`Simuliraj uspješnu uplatu · ${money(amount)}`:copy.cta}</button>
          {mock&&<div className={styles.mockActions}><button type="button" disabled={!c.checkoutAvailable||busy||paid} onClick={()=>void simulate('failure')}>Odbij uplatu</button><button type="button" disabled={!c.checkoutAvailable||busy||paid} onClick={()=>void simulate('cancel')}>Otkaži plaćanje</button></div>}
          <p className={styles.footnote}>{copy.note}</p>
          <p className={styles.notice} role="status">{mockMessage|| (mock&&c.checkoutAvailable?'Izaberi ishod testne uplate. Uspjeh stvarno aktivira testna prava na nalogu ili narudžbini.':c.status === "PAID" ? "Plaćanje je potvrđeno na serveru." : c.status === "FAILED" ? "Plaćanje nije uspjelo. PDF nije otključan." : c.status === "ALREADY_PREMIUM" ? "Premium je već aktivan. Promjena mjesečnog iznosa čeka povezivanje naplate; ovim izborom ne mijenjaš postojeću pretplatu." : c.product === "generator" ? "AllSecure naplata još nije dostupna. Krediti se dodaju tek nakon potvrđene uplate. Ništa nije naplaćeno." : "AllSecure plaćanje još nije dostupno. Podaci kartice se ne prikupljaju i ništa nije naplaćeno.")}</p>
          {mock&&!c.account&&!guest&&<Link className={styles.upgrade} href="/artist/login">Prijavi se za testnu kupovinu</Link>}
          {mock&&paid&&<Link className={styles.upgrade} href={generator?'/generator':isPremium?'/artist/subscription':c.purchase?`/portfolio-purchase/${c.purchase.id}`:back}>{generator?'Otvori Generator i provjeri kredite':isPremium?'Pregledaj testno Premium članstvo':'Otvori isporuku PDF-a'}</Link>}
          {c.purchase?.status === "PAID" ? <a className={styles.download} href={`/api/portfolio-commerce/purchases/${c.purchase.id}/pdf`}>Preuzmi PDF</a> : null}
          {c.purchase ? <Link className={styles.upgrade} href={`/portfolio-purchase/${c.purchase.id}`}>Status narudžbine i isporuka</Link> : null}
          {c.product === "portfolio" && hasAllowance ? <Link className={styles.upgrade} href={back}>Vrati se i iskoristi raspoloživ izvoz</Link> : null}
          {error ? <p role="alert">{error}</p> : null}
        </form>
      </div>
    </div>
  </section></div>;
}
