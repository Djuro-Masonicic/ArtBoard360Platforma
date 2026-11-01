import { notFound } from "next/navigation";
import { PortfolioPdfCanvasViewer } from "@/components/portfolio-pdf-canvas-viewer";

export default async function SharedPortfolioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  return (
    <main className="min-h-screen bg-[#05060b] px-4 py-12">
      <div className="mx-auto max-w-[760px]">
        <PortfolioPdfCanvasViewer maxPages={7} showPageLabels src={`/api/portfolio-shares/${token}/pdf`} />
      </div>
    </main>
  );
}
