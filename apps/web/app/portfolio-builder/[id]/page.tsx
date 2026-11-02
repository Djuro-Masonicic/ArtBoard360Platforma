import { PortfolioBuilderEditorShell } from "@/components/portfolio-builder-editor-shell";
import { getPortfolioForPage } from "@/lib/portfolio-project-access";

type PortfolioBuilderDraftPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ step?: string | string[] }>;
};

export default async function PortfolioBuilderDraftPage({
  params,
  searchParams,
}: PortfolioBuilderDraftPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const project = await getPortfolioForPage(id);

  return <PortfolioBuilderEditorShell project={project} initialStep={typeof query.step === "string" ? query.step : undefined} />;
}
