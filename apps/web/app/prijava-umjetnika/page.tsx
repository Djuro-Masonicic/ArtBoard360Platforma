import { redirect } from "next/navigation";

/**
 * Clearer alias for the existing artist application form.
 *
 * The business plan separates "login", "registration" and "artist admission".
 * Until those flows are fully split, this route points to the current
 * production-ready prijava form.
 */
export default function PrijavaUmjetnikaPage() {
  redirect("/prijava");
}
