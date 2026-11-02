import { getAdminSessionToken } from "@/lib/admin-session";
import { serverEnv } from "@/lib/env";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getAdminSessionToken(), id = (await params).id;
  if (!token) return new Response(null, { status: 401 }); if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const response = await fetch(`${serverEnv.apiBaseUrl}/admin/portfolio-purchases/${id}/preview-pdf`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
