"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect } from "react";

import { loginArtistAction } from "@/app/artist/login/actions";
import { authStyles as styles } from "@/components/auth-page-shell";
import { PasswordInput } from "@/components/password-input";
import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";

const initialState = {
  error: null as string | null,
};

export function ArtistLoginForm({ returnTo }: { returnTo?: string | null }) {
  const [state, formAction, isPending] = useActionState(loginArtistAction, initialState);
  const { showAlert } = useUiFeedback();

  useUiLoadingState(isPending);

  useEffect(() => {
    if (!state.error) {
      return;
    }

    showAlert({
      kind: "error",
      title: "Prijava nije uspjela",
      message: state.error,
    });
  }, [showAlert, state.error]);

  return (
    <>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Tvoj nalog</h2>
        <p className={styles.cardCopy}>
          Pristupi svom umjetničkom profilu, uređuj ga i koristi alate kao što su Portfolio
          Builder, Generator promotivnih materijala i QR vizit karta.
        </p>
      </div>

      <form action={formAction} className={styles.form}>
        {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}

        {state.error ? (
          <div className={styles.formError} role="alert">
            <span className={styles.formErrorIcon} aria-hidden="true"><CircleAlert /></span>
            <div>
              <strong>Pogrešan e-mail ili lozinka</strong>
              <p>Provjeri podatke i pokušaj ponovo. Ako se ne sjećaš lozinke, postavi novu.</p>
            </div>
          </div>
        ) : null}

        <label className={styles.field} htmlFor="artist-login-email">
          <span className={styles.label}>E-mail</span>
          <input
            aria-invalid={Boolean(state.error)}
            autoComplete="email"
            className={`${styles.input} ${state.error ? styles.inputError : ""}`}
            id="artist-login-email"
            name="email"
            placeholder="ime@primjer.com"
            required
            type="email"
          />
        </label>

        <label className={styles.field} htmlFor="artist-login-password">
          <span className={styles.label}>Lozinka</span>
          <PasswordInput
            ariaInvalid={Boolean(state.error)}
            autoComplete="current-password"
            className={`${styles.input} ${state.error ? styles.inputError : ""}`}
            id="artist-login-password"
            name="password"
            placeholder="••••••••"
            required
          />
        </label>

        <div className={styles.rightLinkRow}>
          <Link className={styles.textLink} href="/artist/forgot-password">
            Zaboravljena lozinka?
          </Link>
        </div>

        <button className={styles.primaryButton} disabled={isPending} type="submit">
          {isPending ? "Prijava u toku..." : "Uloguj se"}
        </button>

        <p className={styles.formFooter}>
          Nemaš ArtBoard profil?{" "}
          <Link className={styles.underlinedLink} href="/prijava-umjetnika">
            Prijavi se besplatno.
          </Link>
        </p>
      </form>
    </>
  );
}
