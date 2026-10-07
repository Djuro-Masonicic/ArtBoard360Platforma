"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";

import { loginArtistAction } from "@/app/artist/login/actions";
import { PasswordInput } from "@/components/password-input";
import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";

const initialState = {
  error: null as string | null,
};

/**
 * A dedicated artist login form keeps the account-entry flow separate from
 * admin auth while still following the same server-action pattern.
 */
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
    <form action={formAction} className="space-y-[22px]">
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}

      <label className="block space-y-2.5">
        <span className="text-[14px] font-extrabold text-[#111318]">E-mail</span>
        <input
          autoComplete="email"
          className="h-[54px] w-full rounded-full border-[1.5px] border-[#e6e8ee] bg-[#f3f4f8] px-5 text-[15px] font-medium text-[#111318] outline-none transition placeholder:text-[#9298a8] focus:border-[#1a7cff] focus:bg-white focus:ring-4 focus:ring-[#1a7cff]/10"
          name="email"
          placeholder="ime@primjer.com"
          required
          type="email"
        />
      </label>

      <label className="block space-y-2.5">
        <span className="text-[14px] font-extrabold text-[#111318]">Lozinka</span>
        <PasswordInput
          autoComplete="current-password"
          className="h-[54px] w-full rounded-full border-[1.5px] border-[#e6e8ee] bg-[#f3f4f8] px-5 text-[15px] font-medium text-[#111318] outline-none transition placeholder:text-[#9298a8] focus:border-[#1a7cff] focus:bg-white focus:ring-4 focus:ring-[#1a7cff]/10"
          name="password"
          placeholder="••••••••"
          required
        />
      </label>

      <div className="-mt-1.5 flex justify-end">
        <Link
          className="text-[14px] font-extrabold text-[#111318] transition hover:text-[#1a7cff]"
          href="/artist/forgot-password"
        >
          Zaboravili ste lozinku?
        </Link>
      </div>

      <button
        className="inline-flex h-[54px] w-full items-center justify-center rounded-full bg-[#111318] px-6 text-[13px] font-extrabold uppercase tracking-[0.06em] text-white transition hover:bg-[#2c313f] hover:shadow-[0_10px_24px_rgba(17,19,24,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Prijava u toku..." : "Prijavi se"}
      </button>

      <p className="text-center text-[14px] text-[#66707d]">
        Nemaš ArtBoard profil?{" "}
        <Link
          className="border-b-2 border-[#ffd028] pb-px font-extrabold text-[#111318] transition hover:border-[#ff2d55]"
          href="/prijava-umjetnika"
        >
          Pošalji prijavu.
        </Link>
      </p>
    </form>
  );
}
