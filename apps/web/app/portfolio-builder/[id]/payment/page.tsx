import { redirect } from "next/navigation";

import { PortfolioDemoPaymentForm } from "@/components/portfolio-demo-payment-form";
import { getPublicPortfolioProject } from "@/services/portfolio-projects";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PortfolioBuilderPaymentPage({ params }: Props) {
  const { id } = await params;
  const project = await getPublicPortfolioProject(id);

  if (project.access.canDownloadCleanPdf) {
    redirect(`/portfolio-builder/${project.id}/download`);
  }

  return <PortfolioDemoPaymentForm project={project} />;
}
