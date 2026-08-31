"use server";

import { redirect } from "next/navigation";

import { clearAdminSessionToken, setAdminSessionToken } from "@/lib/admin-session";
import { clearArtistSessionToken, setArtistSessionToken } from "@/lib/artist-session";
import { ApiError } from "@/services/api";
import { loginAdmin, loginArtist } from "@/services/auth";

function readSafeReturnTo(formData: FormData): string | null {
  const returnTo = String(formData.get("returnTo") ?? "").trim();

  if (!returnTo) {
    return null;
  }

  // Keep redirects inside this app only. External URLs should never be accepted from a form field.
  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.includes("://")) {
    return null;
  }

  return returnTo;
}

/**
 * One shared login action keeps the public login page simple:
 * if the entered email matches the configured admin email, we use the admin
 * auth flow, otherwise we use the artist auth flow.
 */
export async function loginArtistAction(
  _previousState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const returnTo = readSafeReturnTo(formData);

  if (!email || !password) {
    return {
      error: "Unesi email i lozinku.",
    };
  }

  /**
   * The shared login page should not depend on a frontend env variable to know
   * who is an admin. We first try the admin endpoint, and only if it responds
   * with 401 do we fall back to the artist endpoint.
   */
  try {
    const adminResponse = await loginAdmin({ email, password });
    await clearArtistSessionToken();
    await setAdminSessionToken(adminResponse.token);
    redirect("/admin");
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      return {
        error: "Prijava trenutno nije dostupna. Pokusaj ponovo.",
      };
    }
  }

  try {
    const response = await loginArtist({ email, password });
    await clearAdminSessionToken();
    await setArtistSessionToken(response.token);
    redirect(returnTo ?? "/artist/dashboard");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return {
        error: "Pogresan email ili lozinka, ili nalog jos nije aktiviran.",
      };
    }

    return {
      error: "Prijava trenutno nije dostupna. Pokusaj ponovo.",
    };
  }
}

export async function logoutArtistAction() {
  await clearArtistSessionToken();
  redirect("/artist/login");
}
