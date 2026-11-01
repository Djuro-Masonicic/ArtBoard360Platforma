import styles from "@/components/artist-subscription-panel.module.css";
export default function Loading() {
  return <div className={styles.frame}><section className={styles.page} aria-busy="true"><span className={styles.eyebrow}>Pretplata</span><h1 className={styles.title}>Upravljanje <span className={styles.gradient}>pretplatom</span></h1><p className={styles.intro} role="status">Učitavamo plan i potrošnju…</p></section></div>;
}
