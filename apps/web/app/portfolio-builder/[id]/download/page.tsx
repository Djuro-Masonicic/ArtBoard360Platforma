import { redirect } from "next/navigation";

import { PortfolioPdfPreview } from "@/components/portfolio-pdf-preview";
import { getPublicPortfolioProject } from "@/services/portfolio-projects";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PortfolioBuilderDownloadPage({ params }: Props) {
  const { id } = await params;
  const project = await getPublicPortfolioProject(id);

  if (!project.access.canDownloadCleanPdf) {
    redirect(`/portfolio-builder/${project.id}/payment`);
  }

  return <PortfolioPdfPreview mode="download" project={project} />;
}
