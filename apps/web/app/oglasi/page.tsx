import type { Metadata } from "next";
import { OpportunitiesPage } from "@/components/opportunities-page";
import { getOpportunities, getPublicOpportunity, type Opportunity } from "@/services/opportunities";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Oglasi i prilike za umjetnike | ArtBoard",
  description: "Konkursi, poslovi, rezidencije i saradnje za umjetnike u cijelom regionu. Pronađi svoju sljedeću priliku ili objavi oglas besplatno.",
};

export default async function OglasiPage({ searchParams }: { searchParams: Promise<{ oglas?: string }> }) {
  const params = await searchParams;
  let opportunities: Opportunity[] = [];
  let couldLoad = true;
  let initialSelected: Opportunity | null = null;
  try {
    const first = await getOpportunities({ page: 1, pageSize: 100 });
    opportunities = first.items;
    for (let page = 2; page <= first.meta.totalPages; page += 1) {
      const response = await getOpportunities({ page, pageSize: 100 });
      opportunities.push(...response.items);
    }
    if (typeof params.oglas === "string") {
      initialSelected = opportunities.find((item) => item.slug === params.oglas || item.id === params.oglas) ?? await getPublicOpportunity(params.oglas).catch(() => null);
    }
  } catch (error) {
    couldLoad = false;
    console.error("Opportunities could not be loaded.", error);
  }
  return <OpportunitiesPage couldLoad={couldLoad} opportunities={opportunities} initialSelected={initialSelected} now={Date.now()} />;
}
