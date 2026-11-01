import { ArtStudioHome } from "@/components/art-studio-home";
import { getArtists } from "@/services/artists";
import { getArtBoardStats, type ArtBoardStats } from "@/services/stats";

export async function HomePage() {
  const [artists, stats] = await Promise.all([getHomepageArtists(), getHomepageStats()]);

  return <ArtStudioHome artists={artists} stats={stats} />;
}

async function getHomepageArtists() {
  try {
    const response = await getArtists({ includeNsfw: false, page: 1, pageSize: 30 });
    return response.items;
  } catch (error) {
    console.error("Homepage artists could not be loaded.", error);
    return [];
  }
}

async function getHomepageStats(): Promise<ArtBoardStats> {
  try {
    return await getArtBoardStats();
  } catch (error) {
    console.error("Homepage ArtBoard stats could not be loaded.", error);
    return { artists: 70, artworks: 1013, disciplines: 26 };
  }
}
