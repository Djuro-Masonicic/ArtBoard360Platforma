import { redirect } from "next/navigation";

import { PortfolioDemoPaymentForm } from "@/components/portfolio-demo-payment-form";
import { getPortfolioForPage } from "@/lib/portfolio-project-access";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PortfolioBuilderPaymentPage({ params }: Props) {
  const { id } = await params;
  const project = await getPortfolioForPage(id);
  if (project.access.quota) redirect(`/pretplata/placanje?proizvod=portfolio&portfolio=${project.id}`);

  if (project.access.canDownloadCleanPdf) {
    redirect(`/portfolio-builder/${project.id}/download`);
  }

  return <PortfolioDemoPaymentForm project={project} />;
}
