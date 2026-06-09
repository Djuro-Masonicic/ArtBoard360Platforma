"use client";

import { useActionState } from "react";

import { loginArtistAction } from "@/app/artist/login/actions";

const initialState = {
  error: null as string | null,
};

/**
 * A dedicated artist login form keeps the account-entry flow separate from
 * admin auth while still following the same server-action pattern.
 */
export function ArtistLoginForm() {
  const [state, formAction, isPending] = useActionState(loginArtistAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block space-y-2">
        <span className="text-[15px] font-semibold text-[#2f3138]">E-mail</span>
        <input
          className="h-12 w-full rounded-full border border-[#d8dfeb] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
          name="email"
          placeholder="ime@domen.com"
          type="email"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-[15px] font-semibold text-[#2f3138]">Lozinka</span>
        <input
          className="h-12 w-full rounded-full border border-[#d8dfeb] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
          name="password"
          placeholder="Unesi lozinku"
          type="password"
        />
      </label>

      {state.error ? (
        <div className="rounded-[18px] border border-[#dc1735]/20 bg-[#fff1f4] px-5 py-4 text-[15px] text-[#b4132c]">
          {state.error}
        </div>
      ) : null}

      <button
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#182fc7] px-6 text-[16px] font-medium text-white transition hover:bg-[#1326a8] disabled:cursor-not-allowed disabled:bg-[#9aa6dd]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Prijava u toku..." : "Prijavi se"}
      </button>
    </form>
  );
}
