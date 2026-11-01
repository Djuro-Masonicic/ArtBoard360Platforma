import { serverEnv } from "@/lib/env";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) return new Response("Not found", { status: 404 });
  const response = await fetch(new URL(`/portfolio-projects/shared/${token}/preview-pdf`, serverEnv.apiBaseUrl), {
    cache: "no-store",
  });
  if (!response.ok) return new Response("Preview could not be loaded.", { status: response.status });
  return new Response(await response.arrayBuffer(), {
    headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store", "Content-Disposition": 'inline; filename="portfolio-preview.pdf"' },
  });
}
