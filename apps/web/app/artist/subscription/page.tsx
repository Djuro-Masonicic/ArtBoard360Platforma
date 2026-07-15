import { ArtistSubscriptionPanel } from "@/components/artist-subscription-panel";
import { requireArtistSession } from "@/lib/artist-session";
import { getArtistSubscription } from "@/services/artist-subscriptions";

export default async function ArtistSubscriptionPage() {
  const session = await requireArtistSession();
  const subscription = await getArtistSubscription(session.token);

  return <ArtistSubscriptionPanel initialSubscription={subscription} mode="manage" />;
}
