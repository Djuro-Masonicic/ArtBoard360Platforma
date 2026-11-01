"use client";
import { useRef, useState } from "react";
import { newDeliverySecret } from "@/lib/portfolio-guest-transport";
import styles from "./portfolio-export-workspace.module.css";
export function PortfolioAccountPurchase({ id, disabled }: { id: string; disabled: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [purchase, setPurchase] = useState<string | null>(null);
  const attempt = useRef<{ operationKey: string; deliverySecret: string } | null>(null);
  async function prepare() {
    setBusy(true); setError("");
    try {
      attempt.current ??= { operationKey: crypto.randomUUID(), deliverySecret: newDeliverySecret() };
      const response = await fetch(`/api/portfolio-commerce/projects/${id}/purchase`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(attempt.current) });
      const result = await response.json(); if (!response.ok) { if (response.status < 500) attempt.current = null; throw Error(result.message || "Narudžbina nije pripremljena."); }
      setPurchase(result.id);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Narudžbina nije pripremljena."); }
    finally { setBusy(false); }
  }
  return <div>{purchase ? <><a className={styles.outline} href={`/pretplata/placanje?proizvod=portfolio&narudzbina=${purchase}`}>Detalji plaćanja</a><a className={styles.outline} href={`/portfolio-purchase/${purchase}`}>Status dodatnog izvoza · ništa nije naplaćeno</a></>
    : <button type="button" className={styles.outline} disabled={busy || disabled} onClick={() => void prepare()}>{busy ? "Priprema…" : "Pripremi narudžbinu za dodatni izvoz"}</button>}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}</div>;
}
