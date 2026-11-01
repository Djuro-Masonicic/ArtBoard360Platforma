import { PortfolioPdfPreview } from "@/components/portfolio-pdf-preview";
import { getPortfolioForPage } from "@/lib/portfolio-project-access";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PortfolioBuilderPreviewPage({ params }: Props) {
  const { id } = await params;
  const project = await getPortfolioForPage(id, true);

  return <PortfolioPdfPreview mode="preview" project={project} />;
}
