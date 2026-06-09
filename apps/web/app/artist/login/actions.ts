"use server";

import { redirect } from "next/navigation";

import { clearAdminSessionToken, setAdminSessionToken } from "@/lib/admin-session";
import { clearArtistSessionToken, setArtistSessionToken } from "@/lib/artist-session";
import { ApiError } from "@/services/api";
import { loginAdmin, loginArtist } from "@/services/auth";

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
  const normalizedEmail = email.toLowerCase();
  const adminEmail = (process.env.ADMIN_SEED_EMAIL ?? "admin@artboard.local").trim().toLowerCase();

  if (!email || !password) {
    return {
      error: "Unesi email i lozinku.",
    };
  }

  if (normalizedEmail === adminEmail) {
    try {
      const adminResponse = await loginAdmin({ email, password });
      await clearArtistSessionToken();
      await setAdminSessionToken(adminResponse.token);
      redirect("/admin/admissions");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return {
          error: "Pogresan email ili lozinka.",
        };
      }

      return {
        error: "Prijava trenutno nije dostupna. Pokusaj ponovo.",
      };
    }
  }

  try {
    const response = await loginArtist({ email, password });
    await clearAdminSessionToken();
    await setArtistSessionToken(response.token);
    redirect("/artist/dashboard");
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
