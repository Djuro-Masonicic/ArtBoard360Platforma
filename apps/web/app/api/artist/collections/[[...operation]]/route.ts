import { proxyArtistCollectionsRequest } from "@/lib/artist-collections-proxy";

async function handle(request: Request, context: { params: Promise<{ operation?: string[] }> }) {
  return proxyArtistCollectionsRequest(request, (await context.params).operation ?? []);
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
