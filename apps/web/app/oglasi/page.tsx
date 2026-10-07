import { OpportunitiesPage } from "@/components/opportunities-page";
import { getOpportunities, type Opportunity } from "@/services/opportunities";

export const dynamic = "force-dynamic";

export default async function OglasiPage() {
  let opportunities: Opportunity[] = [];
  let couldLoadOpportunities = true;

  try {
    const response = await getOpportunities({ page: 1, pageSize: 24 });
    opportunities = response.items;
  } catch (error) {
    couldLoadOpportunities = false;
    console.error("Opportunities could not be loaded.", error);
  }

  return <OpportunitiesPage couldLoad={couldLoadOpportunities} opportunities={opportunities} />;
}
