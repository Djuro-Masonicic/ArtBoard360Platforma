"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PaymentContext } from "@/lib/payment-context";
import { PaymentWorkspace } from "./payment-workspace";
export function PaymentPurchaseLoader({ id }: { id: string }) {
  const [context, setContext] = useState<PaymentContext | null>(null), [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    void fetch(`/api/portfolio-commerce/purchases/${id}/checkout-context`, { cache: "no-store", signal: abort.signal }).then(async r => {
      const data = await r.json(); if (!r.ok) throw Error(data.message || "Narudžbina nije dostupna."); setContext(data);
    }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [id]);
  if (context) return <PaymentWorkspace context={context} />;
  return <section style={{ padding: "110px 20px" }}><p role={error ? "alert" : "status"}>{error || "Učitavam detalje narudžbine…"}</p><Link href="/portfolio-builder">Nazad u Portfolio Builder</Link></section>;
}
