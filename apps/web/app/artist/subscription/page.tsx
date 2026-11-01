import { ArtistSubscriptionPanel } from "@/components/artist-subscription-panel";
import { requireArtistSession } from "@/lib/artist-session";
import { getSubscriptionOverview } from "@/services/artist-subscriptions";

export const metadata = { title: "Upravljanje pretplatom | ArtBoard" };

export default async function ArtistSubscriptionPage() {
  const session = await requireArtistSession();
  const subscription = await getSubscriptionOverview(session.token);

  return <ArtistSubscriptionPanel initialOverview={subscription} />;
}
