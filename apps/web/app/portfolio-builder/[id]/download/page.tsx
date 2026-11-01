import { redirect } from "next/navigation";

import { PortfolioPdfPreview } from "@/components/portfolio-pdf-preview";
import { getPortfolioForPage } from "@/lib/portfolio-project-access";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PortfolioBuilderDownloadPage({ params }: Props) {
  const { id } = await params;
  const project = await getPortfolioForPage(id);

  if (!project.access.canDownloadCleanPdf) {
    redirect(`/portfolio-builder/${project.id}/payment`);
  }

  return <PortfolioPdfPreview mode="download" project={project} />;
}
