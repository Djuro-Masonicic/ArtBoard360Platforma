import { PortfolioPurchaseStatus } from "@/components/portfolio-purchase-status";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <PortfolioPurchaseStatus id={(await params).id} />; }
