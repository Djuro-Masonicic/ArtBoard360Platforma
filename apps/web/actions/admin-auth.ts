"use server";

import { redirect } from "next/navigation";

import { clearAdminSessionToken, setAdminSessionToken } from "@/lib/admin-session";
import { ApiError } from "@/services/api";
import { loginAdmin } from "@/services/auth";

/**
 * Admin auth server actions live outside the route tree so both the public
 * login screen and the hidden admin entry can reuse the same logic cleanly.
 */
export async function loginAdminAction(
  _previousState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Unesi email i lozinku.",
    };
  }

  try {
    const response = await loginAdmin({ email, password });
    await setAdminSessionToken(response.token);
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

  redirect("/admin/admissions");
}

export async function logoutAdminAction() {
  await clearAdminSessionToken();
  redirect("/artist/login");
}
