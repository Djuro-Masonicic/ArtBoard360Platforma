import { PortfolioBuilderEditorShell } from "@/components/portfolio-builder-editor-shell";
import { getPublicPortfolioProject } from "@/services/portfolio-projects";

type PortfolioBuilderDraftPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PortfolioBuilderDraftPage({
  params,
}: PortfolioBuilderDraftPageProps) {
  const { id } = await params;
  const project = await getPublicPortfolioProject(id);

  return <PortfolioBuilderEditorShell project={project} />;
}
