"use client";
import { useEffect, useRef, useState } from "react";
import type { PortfolioProject } from "@/types/api";
import type { GuestPortfolioMemoryAdapter } from "@/lib/guest-portfolio-memory";
import { guestDocumentForm, newDeliverySecret } from "@/lib/portfolio-guest-transport";
import styles from "./portfolio-export-workspace.module.css";
import { formatPaymentAmount } from "@/lib/payment-context";

export function PortfolioGuestCheckout({ project, adapter, onPreview, disabled = false }: { project: PortfolioProject; adapter: GuestPortfolioMemoryAdapter; onPreview: (url: string) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [purchase, setPurchase] = useState<{ id: string; message: string } | null>(null);
  const attempt = useRef<{ operationKey: string; secret: string; project: PortfolioProject } | null>(null), preview = useRef("");
  const [price, setPrice] = useState<number | null>(null), [mock, setMock] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    void fetch("/api/payment-catalog", { cache: "no-store", signal: abort.signal }).then(async response => {
      if (!response.ok) throw Error("Cijena kupovine nije dostupna.");
      const catalog = await response.json(); setPrice(catalog.guestExportCents); setMock(Boolean(catalog.mockPaymentsEnabled));
    }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, []);
  useEffect(() => () => { if (preview.current) URL.revokeObjectURL(preview.current); }, []);
  async function send(action: "preview" | "purchase") {
    setBusy(true); setError("");
    try {
      if (!attempt.current && action === "purchase") attempt.current = { operationKey: crypto.randomUUID(), secret: newDeliverySecret(), project: structuredClone(project) };
      const frozen = action === "preview" ? { operationKey: crypto.randomUUID(), secret: newDeliverySecret(), project } : attempt.current!;
      const form = await guestDocumentForm(action === "preview" ? project : frozen.project, adapter, frozen.operationKey, frozen.secret);
      const response = await fetch(`/api/portfolio-commerce/guest/${action}`, { method: "POST", body: form, cache: "no-store" });
      if (!response.ok) { const result = await response.json(); if (action === "purchase" && response.status < 500) attempt.current = null; throw Error(result.message || "Zahtjev nije uspio."); }
      if (action === "purchase") setPurchase(await response.json());
      else { const url = URL.createObjectURL(await response.blob()); if (preview.current) URL.revokeObjectURL(preview.current); preview.current = url; onPreview(url); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Zahtjev nije uspio."); }
    finally { setBusy(false); }
  }
  return <section className={styles.card} aria-label="Guest kupovina">
    <h2>Guest PDF{price !== null ? ` · ${formatPaymentAmount(price)}` : ""}</h2>
    <p className={styles.help}>Uređivanje je privremeno. Refresh briše nezavršeni rad. Pregled ima watermark i ne čuva draft.</p>
    <button className={styles.outline} disabled={busy || disabled} onClick={() => void send("preview")} type="button">PDF preview</button>
    <p className={styles.help}>{mock ? 'Testno plaćanje je dostupno nakon pripreme narudžbine. Na stranici plaćanja možeš simulirati uspjeh, odbijanje ili otkazivanje bez stvarne naplate.' : 'AllSecure naplata još nije dostupna. Možeš sačuvati nepromjenjiv sadržaj narudžbine za kupovinu bez naloga; ništa se neće naplatiti.'}</p>
    {!purchase ? <button className={styles.primary} disabled={busy || disabled || price === null} onClick={() => void send("purchase")} type="button">{busy ? "Obrada…" : price === null ? "Učitavam cijenu…" : `Pripremi narudžbinu · ${formatPaymentAmount(price)}`}</button>
      : <><p role="status">{purchase.message}</p><a className={styles.outline} href={`/pretplata/placanje?proizvod=portfolio&narudzbina=${purchase.id}`}>Detalji plaćanja</a><a className={styles.outline} href={`/portfolio-purchase/${purchase.id}`}>Status narudžbine i isporuka</a><p className={styles.note}>Narudžbina se ne može uređivati niti ponovo otvoriti kao draft.</p></>}
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {disabled ? <p className={styles.help}>Provjeri podatke forme prije PDF pregleda ili pripreme narudžbine.</p> : null}
  </section>;
}
