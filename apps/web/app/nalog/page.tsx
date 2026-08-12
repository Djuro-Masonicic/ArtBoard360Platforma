import { redirect } from "next/navigation";

/**
 * Public-friendly alias for the logged-in artist account area.
 */
export default function NalogPage() {
  redirect("/artist/dashboard");
}
