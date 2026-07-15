"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";

import { PasswordInput } from "@/components/password-input";
import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";
import { resetArtistPassword } from "@/services/password-reset";

export function ResetPasswordForm({ token }: { token: string }) {
  const { showAlert } = useUiFeedback();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [isPending, startTransition] = useTransition();

  useUiLoadingState(isPending);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      showAlert({
        kind: "error",
        title: "Lozinka je prekratka",
        message: "Nova lozinka mora imati najmanje 8 karaktera.",
      });
      return;
    }

    if (password !== confirmPassword) {
      showAlert({
        kind: "error",
        title: "Lozinke se ne podudaraju",
        message: "Unesi istu lozinku u oba polja.",
      });
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
      } catch (error) {
        showAlert({
          kind: "error",
          title: "Lozinka nije promijenjena",
          message: error instanceof Error ? error.message : "Pokusaj ponovo.",
        });
      }
    });
  }

  if (isComplete) {
    return (
      <div>
        <h2 className="text-[28px] font-bold text-[#2f3138]">Nova lozinka je sacuvana</h2>
        <p className="mt-4 text-[16px] leading-[1.6] text-[#5f6772]">
          Sada se mozes prijaviti novom lozinkom.
        </p>
        <Link
          className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#182fc7] px-6 text-[16px] font-medium text-white transition hover:bg-[#1326a8]"
          href="/artist/login"
        >
          Idi na prijavu
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-[15px] font-semibold text-[#2f3138]">Nova lozinka</span>
        <PasswordInput
          autoComplete="new-password"
          className="h-12 w-full rounded-full border border-[#d8dfeb] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Najmanje 8 karaktera"
          required
          value={password}
        />
      </label>

      <label className="block space-y-2">
        <span className="text-[15px] font-semibold text-[#2f3138]">Potvrdi novu lozinku</span>
        <PasswordInput
          autoComplete="new-password"
          className="h-12 w-full rounded-full border border-[#d8dfeb] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Ponovi lozinku"
          required
          value={confirmPassword}
        />
      </label>

      <button
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#182fc7] px-6 text-[16px] font-medium text-white transition hover:bg-[#1326a8] disabled:cursor-not-allowed disabled:bg-[#9aa6dd]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Cuvanje..." : "Sacuvaj novu lozinku"}
      </button>
    </form>
  );
}
