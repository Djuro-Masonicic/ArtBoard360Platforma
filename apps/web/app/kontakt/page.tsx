import { ContactPage } from "@/components/contact-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_BASE_URL || "http://localhost:3000"),
  title: "Kontakt | ArtBoard Platforma",
  description: "Kontaktiraj ArtBoard za kreativne usluge, saradnje i podršku vezanu za platformu.",
  alternates: { canonical: "/kontakt" },
};

export default function KontaktPage() {
  return <ContactPage />;
}
