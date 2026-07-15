import { PortfolioPdfPreview } from "@/components/portfolio-pdf-preview";
import { getPublicPortfolioProject } from "@/services/portfolio-projects";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PortfolioBuilderPreviewPage({ params }: Props) {
  const { id } = await params;
  const project = await getPublicPortfolioProject(id);

  return <PortfolioPdfPreview mode="preview" project={project} />;
}
