"use client";
import styles from "@/components/artist-dashboard.module.css";
export default function ArtistDashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className={styles.root}><div className={styles.layout}><section className={styles.card} role="alert" style={{ width: "100%" }}><h1 className={styles.deleteTitle}>Dashboard trenutno nije dostupan.</h1><p className={styles.deleteText}>Podaci naloga nijesu mogli biti učitani. Pokušaj ponovo za nekoliko trenutaka.</p><div className={styles.actions}><button className={styles.primary} type="button" onClick={reset}>Pokušaj ponovo</button><a className={styles.outline} href="/artboard">Nazad na sajt</a></div></section></div></div>;
}
