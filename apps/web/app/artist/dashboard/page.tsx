import { ArtistDashboardEditor } from "@/components/artist-dashboard-editor";
import { requireArtistSession } from "@/lib/artist-session";
import { getArtistDashboard } from "@/services/artist-dashboard";
import { getArtistPortfolioProjects } from "@/services/portfolio-projects";

export default async function ArtistDashboardPage() {
  const session = await requireArtistSession();
  const dashboard = await getArtistDashboard(session.token);
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
      dashboard={dashboard}
      portfolioTotal={portfolioProjectsResponse.meta.total}
      mustChangePassword={session.user.mustChangePassword}
      portfolioProjects={portfolioProjectsResponse.items}
      sessionEmail={session.user.email}
    />
  );
}
