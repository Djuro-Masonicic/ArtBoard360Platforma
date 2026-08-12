import { redirect } from "next/navigation";

/**
 * Alias for profile editing.
 *
 * Keeping this separate route lets us later split "account overview" and
 * "profile editing" without changing links across the site.
 */
export default function UrediProfilPage() {
  redirect("/artist/dashboard");
}
