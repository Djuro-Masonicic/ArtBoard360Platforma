import type { Metadata } from "next";
import { PortfolioBuilderLanding } from "@/components/portfolio-builder-landing";
import { getArtistSessionUser } from "@/lib/artist-session";
import { getArtistPortfolioProjects } from "@/services/portfolio-projects";
import type { PortfolioProject } from "@/types/api";

export const metadata: Metadata = {
  title: "Portfolio Builder | ArtBoard",
  description: "Kreiraj profesionalni PDF portfolio ili link za dijeljenje. Počni od ArtBoard profila ili kreiraj portfolio od nule.",
};

export default async function PortfolioBuilderPage() {
  const session = await getArtistSessionUser();
  let recentProjects: PortfolioProject[] = [];

  if (session) {
    try {
      const projects = await getArtistPortfolioProjects(session.token, {
        page: 1,
        pageSize: 100,
      });

      recentProjects = projects.items;
    } catch {
      // The landing page should still open even if the API is temporarily unavailable.
      // The user can create a new draft and the backend error will surface there if needed.
      recentProjects = [];
    }
  }

  return (
    <PortfolioBuilderLanding
      artistName={session?.user.artistName}
      isArtistLoggedIn={Boolean(session)}
      recentProjects={recentProjects}
    />
  );
}
