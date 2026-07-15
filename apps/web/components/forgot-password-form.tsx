"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";

import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";
import { requestArtistPasswordReset } from "@/services/password-reset";

export function ForgotPasswordForm() {
  const { showAlert } = useUiFeedback();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useUiLoadingState(isPending);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        const response = await requestArtistPasswordReset(email);
        setIsSubmitted(true);
        showAlert({
          kind: "success",
          title: "Provjeri email",
          message: response.message,
        });
      } catch (error) {
        showAlert({
          kind: "error",
          title: "Zahtjev nije poslat",
          message: error instanceof Error ? error.message : "Pokusaj ponovo.",
        });
      }
    });
  }

  if (isSubmitted) {
    return (
      <div>
        <h2 className="text-[28px] font-bold text-[#2f3138]">Provjeri svoj email</h2>
        <p className="mt-4 text-[16px] leading-[1.6] text-[#5f6772]">
          Ako postoji aktivan artist nalog za <strong>{email}</strong>, poslali smo link koji vazi 60 minuta.
        </p>
        <Link
          className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full border border-[#182fc7] px-6 text-[16px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
          href="/artist/login"
        >
          Nazad na prijavu
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-[15px] font-semibold text-[#2f3138]">E-mail artist naloga</span>
        <input
          autoComplete="email"
          className="h-12 w-full rounded-full border border-[#d8dfeb] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ime@domen.com"
          required
          type="email"
          value={email}
        />
      </label>

      <button
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#182fc7] px-6 text-[16px] font-medium text-white transition hover:bg-[#1326a8] disabled:cursor-not-allowed disabled:bg-[#9aa6dd]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Slanje..." : "Posalji reset link"}
      </button>

      <Link
        className="block text-center text-[14px] font-semibold text-[#4f5967] underline underline-offset-4 transition hover:text-[#182fc7]"
        href="/artist/login"
      >
        Nazad na prijavu
      </Link>
    </form>
  );
}
