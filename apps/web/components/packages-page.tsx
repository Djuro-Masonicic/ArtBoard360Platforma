import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { siteRoutes } from "@/lib/site-routes";
import styles from "./packages-page.module.css";

export const metadata: Metadata = {
  title: "Paketi | ArtBoard",
  description: "Počni besplatno. Istraži ArtBoard pakete i izaberi Premium kada ti bude potrebno.",
};

const freeFeatures = [
  "Besplatna prijava i profil",
  "Uređivanje profila jednom mjesečno",
  "1 besplatna Instagram objava (10 dodatnih za 4,90\u00a0€)",
  "1 besplatan Portfolio Builder export",
  "1 besplatna QR vizit karta",
  "Prisustvo u pretraživaču umjetnika",
  "Pregled oglasne table",
];
const premiumFeatures = [
  { label: "Neograničeno uređivanje profila i radova" },
  { label: "Automatsko povezivanje profila i portfolija" },
  { label: "10 Instagram objava mjesečno (10 dodatnih za 4,90\u00a0€)" },
  { label: "5 Portfolio Builder exporta mjesečno (dodatni 4,90\u00a0€)" },
  { label: "Neograničen export QR vizit kartica" },
  { label: "Pristup ArtBoard Edu sadržajima", comingSoon: true },
  { label: "Mogućnost kreiranja i prodaje Edu sadržaja", comingSoon: true },
];

function Features({ items }: { items: Array<{ label: string; comingSoon?: boolean }> }) {
  return <>
    <p className={styles.included}>Uključeno</p>
    <ul className={styles.features}>
      {items.map(({ label, comingSoon }) => <li key={label}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a7cff"
          strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.2 4.2L19 7" />
        </svg>
        <span>{label}{comingSoon ? <span className={styles.comingSoon}>Uskoro</span> : null}</span>
      </li>)}
    </ul>
  </>;
}

function ToolRule({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <div className={styles.toolRule}>
    <span className={styles.toolIcon} aria-hidden="true">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
    </span>
    <div className={styles.toolCopy}><h3>{title}</h3><p>{children}</p></div>
  </div>;
}

export default function PackagesPage() {
  return <div className={styles.frame}><section className={styles.page} aria-labelledby="paketi-title">
    <div className={styles.inner}>
      <h1 className={styles.title} id="paketi-title">
        Počni <span className={styles.gradientText}>besplatno.</span> Izaberi više<br />kada ti bude potrebno.
      </h1>
      <p className={styles.intro}>Kreiraj profil i koristi osnovne ArtBoard servise besplatno ili otključaj puni pristup alatima kroz Premium članstvo.</p>
      <div className={styles.plans}>
        <article className={`${styles.plan} ${styles.free}`} aria-labelledby="paketi-free">
          <div className={styles.planHeading}><h2 id="paketi-free">Besplatno</h2><p className={styles.price}>0€</p></div>
          <div className={styles.divider} aria-hidden="true" />
          <p className={styles.description}>Za umjetnike koji žele da predstave svoj rad i istraže ArtBoard mogućnosti.</p>
          <Features items={freeFeatures.map(label => ({ label }))} />
          <Link className={`${styles.action} ${styles.freeAction}`} href={siteRoutes.application}>Prijavi se besplatno</Link>
        </article>
        <article className={`${styles.plan} ${styles.premium}`} aria-labelledby="paketi-premium">
          <div className={styles.premiumPanel}>
            <div className={styles.planHeading}><h2 id="paketi-premium">Premium</h2>
              <p className={styles.price}><span className={styles.pricePrefix}>od</span><span className={styles.gradientText}>8,90€</span></p>
            </div>
            <div className={styles.divider} aria-hidden="true" />
            <p className={styles.description}>Isti Premium pristup. Ti biraš iznos koji ti trenutno odgovara.</p>
            <Features items={premiumFeatures} />
            <Link className={`${styles.action} ${styles.premiumAction}`} href="/artist/subscribe">Izaberi svoj iznos</Link>
          </div>
        </article>
      </div>
      <section className={styles.rules} aria-label="Pravila korišćenja alata">
        <ToolRule title="Generator promotivnih materijala" icon={<>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2.6" />
          <circle cx="9" cy="10" r="1.8" /><path d="M20.5 16l-4.8-4.8L6 19.5" />
        </>}>Prva Instagram objava je besplatna. Premium uključuje 10 objava mjesečno, a dodatni set od 10 košta 4,90&nbsp;€.</ToolRule>
        <ToolRule title="Portfolio Builder" icon={<>
          <path d="M14 3.5H7.5A2 2 0 0 0 5.5 5.5v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
          <polyline points="14 3.5 14 8 18.5 8" /><path d="M9 13h6M9 16.5h4" />
        </>}>Prvi PDF export je besplatan. Premium uključuje 5 exporta mjesečno, a svaki dodatni košta 4,90&nbsp;€.</ToolRule>
        <ToolRule title="QR vizit kartice" icon={<>
          <rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 14h2M14 18v2M17 17h3v3h-3z" />
        </>}>Prvo preuzimanje je besplatno, dok Premium omogućava neograničeno generisanje kartica.</ToolRule>
        <p className={styles.rulesNote}>Već generisane materijale možeš ponovo preuzeti besplatno. Neiskorišćeni mjesečni exporti i objave se ne prenose, dok kupljeni setovi Instagram objava ne ističu.</p>
      </section>
      <section className={styles.portfolioNote} aria-labelledby="paketi-portfolio">
        <div className={styles.noteCopy}><h2 id="paketi-portfolio">Treba ti samo portfolio?</h2>
          <p>Portfolio Builder možeš koristiti i bez ArtBoard profila ili članstva. Bez naloga export je 4,90&nbsp;€; napravi besplatan nalog i prvi export dobijaš besplatno.</p>
        </div>
        <Link className={`${styles.action} ${styles.portfolioAction}`} href={siteRoutes.portfolioBuilder}>Istraži Portfolio Builder</Link>
      </section>
      <section className={styles.accountNote} aria-labelledby="paketi-account">
        <div className={styles.noteCopy}><h2 id="paketi-account">Već imaš nalog?</h2>
          <p>Paket možeš promijeniti ili otkazati u bilo kom trenutku.</p>
        </div>
        <Link className={`${styles.action} ${styles.accountAction}`} href={siteRoutes.subscription}>Upravljaj pretplatom</Link>
      </section>
    </div>
  </section></div>;
}
