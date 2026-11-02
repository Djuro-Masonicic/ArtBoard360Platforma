import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";
import { getArtistSessionToken } from "@/lib/artist-session";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ operation: string[] }> }) {
  const operation = (await params).operation.join("/");
  const owned = /^projects\/[a-f0-9-]{36}\/purchase$/i.test(operation);
  const mockOwner = ['mock/premium','mock/generator'].includes(operation),mockPurchase = /^purchases\/([a-f0-9-]{36})\/mock-payment$/i.exec(operation);
  if (!owned && !mockOwner && !mockPurchase && !["guest/preview", "guest/purchase"].includes(operation)) return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (mockOwner || mockPurchase) {
    const headers = new Headers({ 'Content-Type':'application/json' });
    if (mockOwner) { const token=await getArtistSessionToken();if(!token)return Response.json({message:'Potrebna je prijava.'},{status:401});headers.set('Authorization',`Bearer ${token}`); }
    else { const secret=(await cookies()).get(`portfolio_delivery_${mockPurchase![1]}`)?.value;if(!secret)return Response.json({message:'Narudžbina nije dostupna.'},{status:404});headers.set('X-Portfolio-Delivery',secret); }
    const body=await request.text();if(body.length>2048)return new Response(null,{status:413});
    const response=await fetch(`${serverEnv.apiBaseUrl}/portfolio-commerce/${operation}`,{method:'POST',headers,body,cache:'no-store'});
    return new Response(await response.arrayBuffer(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }
  if (owned) {
    const token = await getArtistSessionToken(); if (!token) return new Response(null, { status: 401 });
    let body: { operationKey?: string; deliverySecret?: string };
    try { const raw = await request.text(); if (raw.length > 2048) return new Response(null, { status: 413 }); body = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
    const response = await fetch(`${serverEnv.apiBaseUrl}/portfolio-commerce/${operation}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body), cache: "no-store" });
    const purchase = await response.json();
    if (response.ok) (await cookies()).set(`portfolio_delivery_${purchase.id}`, body.deliverySecret!, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: `/api/portfolio-commerce/purchases/${purchase.id}`, maxAge: 7 * 86400 });
    return Response.json(purchase, { status: response.status, headers: { "Cache-Control": "no-store" } });
  }
  if (Number(request.headers.get("content-length") || 0) > 35 * 1024 * 1024) return new Response(null, { status: 413 });
  // Bound chunked requests too, before decoding multipart data.
  const reader = request.body?.getReader(), chunks: Uint8Array[] = []; let size = 0;
  if (!reader) return new Response(null, { status: 400 });
  for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 35 * 1024 * 1024) { await reader.cancel(); return new Response(null, { status: 413 }); } chunks.push(next.value); }
  const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
  let form: FormData;
  try { form = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") ?? "" }, body: bytes }).formData(); } catch { return new Response(null, { status: 400 }); }
  const response = await fetch(`${serverEnv.apiBaseUrl}/portfolio-commerce/${operation}`, { method: "POST", body: form, cache: "no-store" });
  if (operation === "guest/purchase" && response.ok) {
    const purchase = await response.json(), secret = String(form.get("deliverySecret") ?? "");
    (await cookies()).set(`portfolio_delivery_${purchase.id}`, secret, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: `/api/portfolio-commerce/purchases/${purchase.id}`, maxAge: 7 * 86400 });
    return Response.json(purchase, { headers: { "Cache-Control": "no-store" } });
  }
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["Content-Type", "Content-Disposition", "X-Portfolio-Page-Count", "X-Content-Type-Options"]) { const value = response.headers.get(name); if (value) headers.set(name, value); }
  return new Response(response.body, { status: response.status, headers });
}
export async function GET(request: Request, { params }: { params: Promise<{ operation: string[] }> }) {
  const operation = (await params).operation.join("/");
  const match = /^purchases\/([a-f0-9-]{36})(\/(?:pdf|checkout-context))?$/i.exec(operation);
  if (!match) return new Response(null, { status: 404 });
  const token = (await cookies()).get(`portfolio_delivery_${match[1]}`)?.value;
  if (!token) return Response.json({ message: "Pristup narudžbini nije dostupan u ovom browseru." }, { status: 404 });
  const response = await fetch(`${serverEnv.apiBaseUrl}/portfolio-commerce/${operation}`, { headers: { "X-Portfolio-Delivery": token }, cache: "no-store" });
  const headers = new Headers({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  for (const name of ["Content-Type", "Content-Disposition", "X-Content-Type-Options"]) { const value = response.headers.get(name); if (value) headers.set(name, value); }
  return new Response(response.body, { status: response.status, headers });
}
