import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ message: "Neispravan ID oglasa." }, { status: 400 });
  }
  try {
    const response = await fetch(new URL(`/opportunities/${id}/view`, serverEnv.apiBaseUrl), { method: "POST", cache: "no-store" });
    return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return NextResponse.json({ message: "Pregled nije evidentiran." }, { status: 503 });
  }
}
