import { PortfolioBuilderLanding } from "@/components/portfolio-builder-landing";
import { getArtistSessionUser } from "@/lib/artist-session";

export default async function PortfolioBuilderPage() {
  const session = await getArtistSessionUser();

  return (
    <PortfolioBuilderLanding
      artistName={session?.user.artistName}
      isArtistLoggedIn={Boolean(session)}
    />
  );
}
