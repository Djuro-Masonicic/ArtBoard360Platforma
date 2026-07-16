import { ArtistDashboardEditor } from "@/components/artist-dashboard-editor";
import { requireArtistSession } from "@/lib/artist-session";
import { getArtistBySlug } from "@/services/artists";
import { getArtistPortfolioProjects } from "@/services/portfolio-projects";

export default async function ArtistDashboardPage() {
  const session = await requireArtistSession();
  const artist = await getArtistBySlug(session.user.artistSlug);
  const portfolioProjectsResponse = await getArtistPortfolioProjects(session.token, {
    page: 1,
    pageSize: 24,
  }).catch(() => ({
    items: [],
    meta: {
      page: 1,
      pageSize: 24,
      total: 0,
      totalPages: 1,
    },
  }));

  return (
    <ArtistDashboardEditor
      artist={artist}
      mustChangePassword={session.user.mustChangePassword}
      portfolioProjects={portfolioProjectsResponse.items}
      sessionEmail={session.user.email}
    />
  );
}
