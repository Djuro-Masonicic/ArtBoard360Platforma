import styles from "@/components/artist-dashboard.module.css";
export default function LoadingArtistDashboard() {
  return <div className={styles.root}><div className={styles.layout}><section className={styles.card} role="status" aria-live="polite" style={{ width: "100%" }}><p className={styles.fieldLabel}>Učitavanje dashboarda…</p><p className={styles.helper}>Pripremamo podatke tvog naloga.</p></section></div></div>;
}
