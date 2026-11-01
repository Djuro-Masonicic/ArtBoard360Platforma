import { serverEnv } from "@/lib/env";
export async function GET() {
  const response = await fetch(`${serverEnv.apiBaseUrl}/portfolio-commerce/checkout-catalog`, { cache: "no-store" });
  return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
