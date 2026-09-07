import { ArtStudioContactCtaSection } from "@/components/art-studio-contact-cta-section";
import { ArtStudioHero } from "@/components/art-studio-hero";
import { ArtStudioToolsSection } from "@/components/art-studio-tools-section";
import { ArtStudioWorkAreasSection } from "@/components/art-studio-work-areas-section";
import { HomeArtboardArtistsSection } from "@/components/home-artboard-artists-section";
import { HomeArtistsCommunitySection } from "@/components/home-artists-community-section";
import { HomeCollaborationStrip } from "@/components/home-collaboration-strip";
import { HomeCosmosSection } from "@/components/home-cosmos-section";
import { HomeImpactStatsSection } from "@/components/home-impact-stats-section";
import { HomeProjectsSection } from "@/components/home-projects-section";
import { HomeStudioServicesSection } from "@/components/home-studio-services-section";
import { HomeTeamStorySection } from "@/components/home-team-story-section";
import { HomeTestimonialsSection } from "@/components/home-testimonials-section";
import { getArtists } from "@/services/artists";
import { getArtBoardStats, type ArtBoardStats } from "@/services/stats";

export async function HomePage() {
  const [artists, stats] = await Promise.all([getHomepageArtists(), getHomepageStats()]);

  return (
    <>
      <div className="-mx-5 -mt-8 sm:-mx-8 sm:-mt-10 lg:-mx-10 lg:-mt-12">
        <ArtStudioHero artists={artists} />
      </div>

      <ArtStudioWorkAreasSection />
      <HomeCosmosSection />
      <HomeArtboardArtistsSection />
      <ArtStudioToolsSection />
      <HomeArtistsCommunitySection artists={artists} />
      <HomeImpactStatsSection stats={stats} />
      <HomeTeamStorySection />
      <HomeStudioServicesSection />
      <HomeCollaborationStrip />
      <HomeProjectsSection />
      <HomeTestimonialsSection />
      <ArtStudioContactCtaSection />
    </>
  );
}

async function getHomepageArtists() {
  try {
    const artistsResponse = await getArtists({ includeNsfw: true, page: 1, pageSize: 30 });
    return artistsResponse.items;
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
    return { artists: 70, artworks: 1013, disciplines: 15 };
  }
}
