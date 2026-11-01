import { notFound } from "next/navigation";
import { PaymentWorkspace } from "@/components/payment-workspace";
import { PaymentPurchaseLoader } from "@/components/payment-purchase-loader";
import { getPaymentContext } from "@/lib/payment-context.server";
import { ApiError } from "@/services/api";
export const metadata = { title: "Plaćanje | ArtBoard" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams, product = query.proizvod ?? "premium";
  if (!["premium", "portfolio", "generator"].includes(String(product)) || Array.isArray(product)) notFound();
  const purchase = query.narudzbina, id = query.portfolio;
  const valid = (value: unknown) => typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value);
  if (purchase) { if (!valid(purchase) || product !== "portfolio") notFound(); return <PaymentPurchaseLoader id={purchase as string} />; }
  if (id && !valid(id)) notFound();
  try { return <PaymentWorkspace context={await getPaymentContext(product as "premium" | "portfolio" | "generator", id as string | undefined)} />; }
  catch (e) { if (e instanceof ApiError && [400, 401, 404].includes(e.status)) notFound(); throw e; }
}
