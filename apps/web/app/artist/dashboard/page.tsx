import { ArtistDashboardEditor } from "@/components/artist-dashboard-editor";
import { requireArtistSession } from "@/lib/artist-session";
import { getArtistBySlug } from "@/services/artists";

export default async function ArtistDashboardPage() {
  const session = await requireArtistSession();
  const artist = await getArtistBySlug(session.user.artistSlug);

  return <ArtistDashboardEditor artist={artist} sessionEmail={session.user.email} />;
}
