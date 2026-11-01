import { proxyPortfolioRequest } from "@/lib/portfolio-proxy";

type Context = { params: Promise<{ id: string }> };
async function handle(request: Request, context: Context) {
  return proxyPortfolioRequest(request, (await context.params).id);
}
export { handle as GET, handle as PATCH };
