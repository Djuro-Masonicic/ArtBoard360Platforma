import { redirect } from "next/navigation";

/**
 * Temporary bridge for the new ArtBoard route map.
 *
 * The current working artist application form still lives on /prijava.
 * We keep this route so future navigation can use /registracija without
 * breaking the already implemented prijava workflow.
 */
export default function RegistracijaPage() {
  redirect("/prijava");
}
