import { CirclePlus, UserRound } from "lucide-react";

import { NavigationButton } from "@/components/navigation-button";
import styles from "@/components/prijava-page.module.css";

export function PrijavaEntryOptions() {
  return (
    <div className={styles.entryOptions}>
      <article className={styles.entryCard}>
        <span className={styles.entryLabel}>
          <CirclePlus aria-hidden="true" size={15} strokeWidth={2.2} />
          Nova prijava
        </span>
        <h2>Kreiraj svoj umjetnički profil.</h2>
        <p>
          Kreiraj profil, pojavi se u pretraživaču umjetnika i isprobaj ArtBoard alate, sve
          besplatno.
        </p>
        <a className={styles.entryButton} href="#prijava-form">
          Počni prijavu
        </a>
      </article>

      <article className={styles.entryCard}>
        <span className={`${styles.entryLabel} ${styles.entryLabelBlue}`}>
          <UserRound aria-hidden="true" size={15} strokeWidth={2.2} />
          Postojeći profil
        </span>
        <h2>Već imaš profil?</h2>
        <p>
          Uloguj se da urediš profil, dodaš nove radove, napraviš kolekcije i nastaviš rad u
          ArtBoard alatima.
        </p>
        <NavigationButton
          className={`${styles.entryButton} ${styles.entryButtonSecondary}`}
          href="/artist/login"
          title="Idi na login stranicu"
        >
          Uloguj se
        </NavigationButton>
      </article>
    </div>
  );
}
