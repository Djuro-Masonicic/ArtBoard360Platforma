"use client";

import { useActionState, useEffect } from "react";

import { completeArtistSetupAction } from "@/app/artist/setup-password/actions";
import { PasswordInput } from "@/components/password-input";
import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";

const initialState = {
  error: null as string | null,
};

interface ArtistSetupPasswordFormProps {
  token: string;
}

/**
 * Artists arrive here from their invite email. The form only asks for the
 * password because the token already proves which account is being activated.
 */
export function ArtistSetupPasswordForm({ token }: ArtistSetupPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(completeArtistSetupAction, initialState);
  const { showAlert } = useUiFeedback();

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
    <form action={formAction} className="space-y-5">
      <input name="token" type="hidden" value={token} />

      <label className="block space-y-2">
        <span className="text-[15px] font-semibold text-[#2f3138]">Nova lozinka</span>
        <PasswordInput
          autoComplete="new-password"
          className="h-12 w-full rounded-full border border-[#d8dfeb] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
          name="password"
          placeholder="Najmanje 8 karaktera"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-[15px] font-semibold text-[#2f3138]">Potvrdi lozinku</span>
        <PasswordInput
          autoComplete="new-password"
          className="h-12 w-full rounded-full border border-[#d8dfeb] bg-white px-5 text-[16px] text-[#2f3138] outline-none transition focus:border-[#182fc7]"
          name="confirmPassword"
          placeholder="Ponovi lozinku"
        />
      </label>

      <button
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#182fc7] px-6 text-[16px] font-medium text-white transition hover:bg-[#1326a8] disabled:cursor-not-allowed disabled:bg-[#9aa6dd]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Aktivacija naloga..." : "Postavi lozinku i udji"}
      </button>
    </form>
  );
}
