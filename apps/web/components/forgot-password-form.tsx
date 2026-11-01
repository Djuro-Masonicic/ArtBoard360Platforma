"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";

import { authStyles as styles } from "@/components/auth-page-shell";
import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";
import { requestArtistPasswordReset } from "@/services/password-reset";

export function ForgotPasswordForm() {
  const { showAlert } = useUiFeedback();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useUiLoadingState(isPending);

  function sendResetLink() {
    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail)) {
      setError("Unesi ispravnu e-mail adresu.");
      return;
    }

    setEmail(normalizedEmail);
    setError(null);

    startTransition(async () => {
      try {
        const response = await requestArtistPasswordReset(normalizedEmail);
        setIsSubmitted(true);
        showAlert({
          kind: "success",
          title: "Provjeri e-mail",
          message: response.message,
        });
      } catch (requestError) {
        const originalMessage = requestError instanceof Error ? requestError.message : "Pokušaj ponovo.";
        const message = /email must be an email/i.test(originalMessage)
          ? "Unesi ispravnu e-mail adresu."
          : originalMessage;
        setError(message);
        showAlert({
          kind: "error",
          title: "Zahtjev nije poslat",
          message,
        });
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendResetLink();
  }

  if (isSubmitted) {
    return (
      <div className={styles.stateContent}>
        <span className={styles.stateIcon} aria-hidden="true"><Mail /></span>
        <h2 className={styles.stateTitle}>Provjeri e-mail</h2>
        <p className={styles.stateCopy}>
          Ako postoji nalog sa adresom <strong>{email}</strong>, poslali smo link za postavljanje
          nove lozinke. Ne vidiš e-mail? Provjeri folder za neželjenu poštu ili pošalji link ponovo.
        </p>
        <div className={styles.stateActions}>
          <button className={styles.secondaryButton} disabled={isPending} onClick={sendResetLink} type="button">
            {isPending ? "Slanje..." : "Pošalji ponovo"}
          </button>
          <Link className={styles.backLink} href="/artist/login"><ArrowLeft /> Nazad na login</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Nova lozinka</h2>
        <p className={styles.cardCopy}>
          Unesi e-mail adresu kojom se prijavljuješ. Poslaćemo ti link za postavljanje nove lozinke.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field} htmlFor="forgot-password-email">
          <span className={styles.label}>E-mail</span>
          <input
            aria-invalid={Boolean(error)}
            autoComplete="email"
            className={`${styles.input} ${error ? styles.inputError : ""}`}
            id="forgot-password-email"
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            placeholder="ime@primjer.com"
            required
            type="email"
            value={email}
          />
        </label>

        {error ? <p className={styles.fieldError} role="alert">{error}</p> : null}

        <button className={styles.primaryButton} disabled={isPending} type="submit">
          {isPending ? "Slanje..." : "Pošalji link"}
        </button>

        <Link className={`${styles.backLink} self-center`} href="/artist/login">
          <ArrowLeft /> Nazad na login
        </Link>
      </form>
    </>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
