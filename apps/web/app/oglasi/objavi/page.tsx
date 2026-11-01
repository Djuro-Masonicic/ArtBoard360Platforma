import type { Metadata } from "next";

import { OpportunitySubmissionPage } from "@/components/opportunity-submission-page";

export const metadata: Metadata = {
  title: "Objavi oglas | ArtBoard",
  description: "Besplatno predstavi konkurs, posao, rezidenciju ili saradnju ArtBoard zajednici.",
};

export default function SubmitOpportunityPage() {
  return <OpportunitySubmissionPage />;
}
