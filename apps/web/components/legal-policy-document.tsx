import Link from "next/link";
import { LEGAL_ARTICLES, LEGAL_POLICY } from "@/lib/legal-policy";
import { PrivacyArticles, TermsArticles } from "./legal-policy-articles";
import { LegalAnchorOffset } from "./legal-anchor-offset";
import styles from "./legal-policy-document.module.css";

const responsibilities = [
  { href: "#autorstvo", title: "Objavljuješ samo svoja djela", description: "Ili djela za koja imaš pisanu saglasnost autora i svih nosilaca prava.", action: "Član 3 →" },
  { href: "#licenca", title: "ArtBoard može prikazivati i promovisati djelo", description: "Uvijek uz tvoje ime. Djelo ne prodajemo i ne ustupamo trećim licima bez posebnog ugovora s tobom.", action: "Član 4 →" },
  { href: "#odrasli", title: "Profil sa sadržajem 18+ označavaš", description: "Nagost, eksplicitna seksualnost, izraženo nasilje i uznemirujući prizori traže oznaku 18+ na profilu.", action: "Član 5 →" },
];

function ContentsLinks({ privacy = false }: { privacy?: boolean }) {
  return <div className={styles.tocLinks}>{LEGAL_ARTICLES.slice(privacy ? 12 : 0, privacy ? 14 : 12).map(item => <a key={item.id} href={"#" + item.id}><span aria-hidden="true" />{item.label}</a>)}</div>;
}

function PolicyPart({ id, part, title, description }: { id: string; part: string; title: string; description: string }) {
  return <div className={styles.part} id={id}><span className={styles.eyebrow}>{part}</span><h2>{title}</h2><p>{description}</p></div>;
}

export function LegalPolicyDocument() {
  return <div className={styles.document} data-policy-version={LEGAL_POLICY.version}>
    <LegalAnchorOffset />
    <section className={styles.hero} aria-labelledby="legal-title"><div className={styles.heroGlow} aria-hidden="true" /><div className={styles.heroInner}>
      <div className={styles.heroEyebrow}><span aria-hidden="true" />Pravila platforme · važi od {LEGAL_POLICY.effectiveDateLabel}</div>
      <h1 id="legal-title">Uslovi korišćenja i <span className={styles.gradient}>privatnost</span></h1>
      <p className={styles.heroCopy}>Pravila za sve koji koriste ArtBoard: umjetnike, posjetioce, oglašivače i kupce. Stranica ima dva dijela: <em>Uslove korišćenja</em> i <em>Politiku privatnosti</em>.</p>
    </div></section>
    <div className={styles.layout}>
      <aside className={styles.toc} aria-label="Sadržaj pravnih informacija"><div className={styles.eyebrow}>Sadržaj</div>
        <nav aria-label="Sadržaj"><a className={styles.tocLead} href="#odgovornosti">Odgovornosti umjetnika</a><a className={styles.tocGroup} href="#dio-uslovi">I · Uslovi korišćenja</a><ContentsLinks /><a className={styles.tocGroup} href="#dio-privatnost">II · Politika privatnosti</a><ContentsLinks privacy /><a className={styles.tocGroup} href="#kontakt">Kontakt</a></nav>
      </aside>
      <div className={styles.content}>
        <section className={styles.responsibilities} id="odgovornosti" aria-labelledby="responsibilities-title">
          <div><div className={styles.eyebrow}>Jedna potvrda, prije objave profila</div><h2 id="responsibilities-title">Odgovornosti umjetnika</h2>
            <p>U posljednjem koraku prijave jednom potvrđuješ da imaš 18 ili više godina i da prihvataš <em>Uslove korišćenja</em> i <em>Politiku privatnosti</em>. Pri objavi pojedinačnih djela nema dodatnih potvrda, ali za svako djelo važi sljedeće:</p>
          </div>
          <div className={styles.responsibilityGrid}>{responsibilities.map(item => <a href={item.href} key={item.href}><span className={styles.responsibilityTitle}><span aria-hidden="true" />{item.title}</span><span className={styles.responsibilityCopy}>{item.description}</span><span className={styles.responsibilityAction}>{item.action}</span></a>)}</div>
          <div className={styles.confirmation}><div className={styles.eyebrow}>Tekst potvrde u posljednjem koraku prijave</div><div>{LEGAL_POLICY.artistConfirmation}</div></div>
        </section>
        <PolicyPart id="dio-uslovi" part="Dio I" title="Uslovi korišćenja" description="Nalog, autorska prava, sadržaj, oglasi i plaćene usluge." />
        <TermsArticles />
        <PolicyPart id="dio-privatnost" part="Dio II" title="Politika privatnosti" description="Koje lične podatke obrađujemo, zašto, koliko dugo i koja su tvoja prava." />
        <PrivacyArticles />
        <section className={styles.contactCard} id="kontakt" aria-labelledby="legal-contact-title"><h2 id="legal-contact-title">Imaš pitanje o pravilima?</h2><p>Za pitanja o pravilima, prijave povreda i zahtjeve u vezi s ličnim podacima piši nam.</p>
          <div className={styles.contactActions}><a className={styles.primaryButton} href="mailto:info@artstudio360.me">info@artstudio360.me</a><Link className={styles.secondaryButton} href="/">Nazad na početnu</Link></div>
          <dl className={styles.company} aria-label="Podaci o firmi"><div><dt>Naziv</dt><dd>„ART STUDIO 360“ D.O.O. Podgorica</dd></div><div><dt>PIB</dt><dd>03792994</dd></div><div><dt>Adresa</dt><dd>Dalmatinska 152, Podgorica</dd></div><div><dt>Broj računa</dt><dd>520000000005382993</dd></div></dl>
        </section>
      </div>
    </div>
  </div>;
}
