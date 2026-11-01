import { PortfolioBuilderEditorShell } from "@/components/portfolio-builder-editor-shell";
import { getPortfolioForPage } from "@/lib/portfolio-project-access";

type PortfolioBuilderDraftPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PortfolioBuilderDraftPage({
  params,
}: PortfolioBuilderDraftPageProps) {
  const { id } = await params;
  const project = await getPortfolioForPage(id);

  return <PortfolioBuilderEditorShell project={project} />;
}
