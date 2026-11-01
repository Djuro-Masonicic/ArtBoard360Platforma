import type { Metadata } from "next";
import Link from "next/link";
import { ArtBoardLogo } from "@/components/artboard-logo";
import { LegalPolicyDocument } from "@/components/legal-policy-document";
import { siteRoutes } from "@/lib/site-routes";
import styles from "./uslovi-koriscenja.module.css";

export const metadata: Metadata = {
  title: "Uslovi korišćenja i privatnost | ArtBoard",
  description: "Uslovi korišćenja, autorska prava, plaćene usluge, politika privatnosti i kolačići ArtBoard platforme.",
  robots: { index: true, follow: true },
};

const navigation = [
  { href: "#uslovi", label: "Uslovi" },
  { href: "#autorstvo", label: "Autorska prava" },
  { href: "#odrasli", label: "Sadržaj 18+" },
  { href: "#privatnost", label: "Privatnost" },
  { href: "#kontakt", label: "Kontakt" },
];

export default function UsloviKoriscenjaPage() {
  return <div className={styles.page}>
    <LegalHeader />
    <LegalPolicyDocument />
  </div>;
}

function LegalHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.headerLogo} href={siteRoutes.artboard} aria-label="ArtBoard početna">
          <ArtBoardLogo tone="dark" />
        </Link>
        <nav className={styles.headerNav} aria-label="Pravne sekcije">
          {navigation.map((item) => (
            <a href={item.href} key={item.href}>
              <span aria-hidden="true" />
              {item.label}
            </a>
          ))}
        </nav>
        <Link className={styles.backButton} href={siteRoutes.artboard}>Nazad na početnu</Link>
      </div>
      <span className={styles.headerAccent} aria-hidden="true" />
    </header>
  );
}
