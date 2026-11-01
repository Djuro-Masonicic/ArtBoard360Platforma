import { proxyPortfolioRequest } from "@/lib/portfolio-proxy";

type Context = { params: Promise<{ id: string; operation: string[] }> };
async function handle(request: Request, context: Context) {
  const { id, operation } = await context.params;
  return proxyPortfolioRequest(request, id, operation.join("/"));
}
export { handle as GET, handle as PATCH, handle as POST, handle as DELETE };
