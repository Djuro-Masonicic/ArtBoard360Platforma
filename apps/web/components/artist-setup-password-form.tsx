"use client";

import { useActionState, useEffect, useState } from "react";

import { completeArtistSetupAction } from "@/app/artist/setup-password/actions";
import { authStyles as styles } from "@/components/auth-page-shell";
import { PasswordInput } from "@/components/password-input";
import { PasswordRules } from "@/components/reset-password-form";
import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";

const initialState = {
  error: null as string | null,
};

export function ArtistSetupPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(completeArtistSetupAction, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const { showAlert } = useUiFeedback();

  const hasMinLength = password.length >= 8;
  const hasLetterAndNumber = /[A-Za-z]/.test(password) && /\d/.test(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const error = clientError ?? state.error;

  useUiLoadingState(isPending);

  useEffect(() => {
    if (!state.error) {
      return;
    }

    showAlert({
      kind: "error",
      title: "Aktivacija naloga nije uspjela",
      message: state.error,
    });
  }, [showAlert, state.error]);

  return (
    <form
      action={formAction}
      className={styles.form}
      onSubmit={(event) => {
        setClientError(null);

        if (!hasMinLength || !hasLetterAndNumber) {
          event.preventDefault();
          setClientError("Lozinka mora imati najmanje 8 znakova, bar jedno slovo i jedan broj.");
          return;
        }

        if (!passwordsMatch) {
          event.preventDefault();
          setClientError("Lozinke se ne poklapaju.");
        }
      }}
    >
      <input name="token" type="hidden" value={token} />

      <label className={styles.field} htmlFor="setup-password">
        <span className={styles.label}>Nova lozinka</span>
        <PasswordInput
          ariaDescribedBy="password-rules"
          ariaInvalid={Boolean(error) && (!hasMinLength || !hasLetterAndNumber)}
          autoComplete="new-password"
          className={`${styles.input} ${error && (!hasMinLength || !hasLetterAndNumber) ? styles.inputError : ""}`}
          id="setup-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
          value={password}
        />
      </label>

      <label className={styles.field} htmlFor="setup-confirm-password">
        <span className={styles.label}>Ponovi lozinku</span>
        <PasswordInput
          ariaInvalid={Boolean(error) && !passwordsMatch}
          autoComplete="new-password"
          className={`${styles.input} ${error && !passwordsMatch ? styles.inputError : ""}`}
          id="setup-confirm-password"
          name="confirmPassword"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="••••••••"
          required
          value={confirmPassword}
        />
      </label>

      {error ? <p className={styles.fieldError} role="alert">{error}</p> : null}

      <PasswordRules
        hasLetterAndNumber={hasLetterAndNumber}
        hasMinLength={hasMinLength}
        passwordsMatch={passwordsMatch}
      />

      <button className={styles.primaryButton} disabled={isPending} type="submit">
        {isPending ? "Čuvanje..." : "Sačuvaj lozinku"}
      </button>
    </form>
  );
}
