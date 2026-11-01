"use client";
import styles from "@/components/artist-subscription-panel.module.css";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className={styles.frame}><section className={styles.page}><h1 className={styles.title}>Upravljanje pretplatom</h1><p className={styles.intro} role="alert">Podaci o pretplati trenutno nijesu dostupni. Pokušaj ponovo.</p><button className={styles.outline} onClick={reset}>Pokušaj ponovo</button></section></div>;
}
