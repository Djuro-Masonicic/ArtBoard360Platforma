"use server";

import { redirect } from "next/navigation";

import { setArtistSessionToken } from "@/lib/artist-session";
import { ApiError } from "@/services/api";
import { completeArtistSetup } from "@/services/auth";

/**
 * The setup action turns a one-time invite token into a real artist session.
 */
export async function completeArtistSetupAction(
  _previousState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return {
      error: "Aktivacioni token nedostaje.",
    };
  }

  if (!password || password.length < 8) {
    return {
      error: "Lozinka mora imati najmanje 8 karaktera.",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Lozinke se ne poklapaju.",
    };
  }

  try {
    const response = await completeArtistSetup({ token, password });
    await setArtistSessionToken(response.token);
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        error: error.message,
      };
    }

    return {
      error: "Postavljanje lozinke trenutno nije dostupno. Pokusaj ponovo.",
    };
  }

  redirect("/artist/dashboard");
}
