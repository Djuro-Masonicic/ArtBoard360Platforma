"use client";

import { Check } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";

import { authStyles as styles } from "@/components/auth-page-shell";
import { NavigationButton } from "@/components/navigation-button";
import { PasswordInput } from "@/components/password-input";
import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";
import { resetArtistPassword } from "@/services/password-reset";

export function ResetPasswordForm({ token }: { token: string }) {
  const { showAlert } = useUiFeedback();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasMinLength = password.length >= 8;
  const hasLetterAndNumber = /[A-Za-z]/.test(password) && /\d/.test(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  useUiLoadingState(isPending);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!hasMinLength || !hasLetterAndNumber) {
      setError("Lozinka mora imati najmanje 8 znakova, bar jedno slovo i jedan broj.");
      return;
    }

    if (!passwordsMatch) {
      setError("Lozinke se ne poklapaju.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await resetArtistPassword(token, password);
        setIsComplete(true);
        showAlert({
          kind: "success",
          title: "Lozinka je promijenjena",
          message: response.message,
        });
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "Pokušaj ponovo.";
        setError(message);
        showAlert({
          kind: "error",
          title: "Lozinka nije promijenjena",
          message,
        });
      }
    });
  }

  if (isComplete) {
    return (
      <div className={styles.stateContent}>
        <span className={styles.stateIcon} aria-hidden="true"><Check /></span>
        <h2 className={styles.stateTitle}>Lozinka je sačuvana</h2>
        <p className={styles.stateCopy}>
          Sada se možeš ulogovati e-mailom i novom lozinkom i nastaviti rad na svom profilu.
        </p>
        <div className={styles.stateActions}>
          <NavigationButton className={styles.primaryButton} href="/artist/login">
            Uloguj se
          </NavigationButton>
        </div>
      </div>
    );
  }

  const mismatch = Boolean(error) && !passwordsMatch && confirmPassword.length > 0;

  return (
    <>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Nova lozinka</h2>
        <p className={styles.cardCopy}>
          Izaberi lozinku za svoj ArtBoard nalog. Nakon toga se loguješ e-mailom i novom lozinkom.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field} htmlFor="reset-password">
          <span className={styles.label}>Nova lozinka</span>
          <PasswordInput
            ariaDescribedBy="password-rules"
            ariaInvalid={Boolean(error) && (!hasMinLength || !hasLetterAndNumber)}
            autoComplete="new-password"
            className={`${styles.input} ${error && (!hasMinLength || !hasLetterAndNumber) ? styles.inputError : ""}`}
            id="reset-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            value={password}
          />
        </label>

        <label className={styles.field} htmlFor="reset-confirm-password">
          <span className={styles.label}>Ponovi lozinku</span>
          <PasswordInput
            ariaDescribedBy={mismatch ? "reset-password-error" : undefined}
            ariaInvalid={mismatch}
            autoComplete="new-password"
            className={`${styles.input} ${mismatch ? styles.inputError : ""}`}
            id="reset-confirm-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="••••••••"
            required
            value={confirmPassword}
          />
        </label>

        {error ? <p className={styles.fieldError} id="reset-password-error" role="alert">{error}</p> : null}

        <PasswordRules
          hasLetterAndNumber={hasLetterAndNumber}
          hasMinLength={hasMinLength}
          passwordsMatch={passwordsMatch}
        />

        <button className={styles.primaryButton} disabled={isPending} type="submit">
          {isPending ? "Čuvanje..." : "Sačuvaj lozinku"}
        </button>
      </form>
    </>
  );
}

export function PasswordRules({
  hasLetterAndNumber,
  hasMinLength,
  passwordsMatch,
}: {
  hasLetterAndNumber: boolean;
  hasMinLength: boolean;
  passwordsMatch: boolean;
}) {
  return (
    <ul className={styles.rules} id="password-rules">
      <PasswordRule isValid={hasMinLength}>Najmanje 8 znakova</PasswordRule>
      <PasswordRule isValid={hasLetterAndNumber}>Bar jedno slovo i jedan broj</PasswordRule>
      <PasswordRule isValid={passwordsMatch}>Lozinke se poklapaju</PasswordRule>
    </ul>
  );
}

function PasswordRule({ children, isValid }: { children: React.ReactNode; isValid: boolean }) {
  return (
    <li className={`${styles.rule} ${isValid ? styles.ruleValid : ""}`}>
      <span className={styles.ruleIcon} aria-hidden="true"><Check /></span>
      {children}
    </li>
  );
}
