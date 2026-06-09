import { ArtistsPage as ArtistsPageContent } from "@/components/artists-page";
import { getArtists } from "@/services/artists";

export default async function ArtistsPage() {
  const response = await getArtists({
    page: 1,
    pageSize: 100,
  });

  return <ArtistsPageContent artists={response.items} totalArtists={response.meta.total} />;
}
