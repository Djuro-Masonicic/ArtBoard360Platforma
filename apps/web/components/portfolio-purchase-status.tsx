"use client";
import { useEffect, useState } from "react";
export function PortfolioPurchaseStatus({ id }: { id: string }) {
  const [status, setStatus] = useState<{ status: string; message: string } | null>(null), [error, setError] = useState("");
  useEffect(() => { const controller = new AbortController(); void fetch(`/api/portfolio-commerce/purchases/${id}`, { cache: "no-store", signal: controller.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw Error(data.message); setStatus(data); }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); }); return () => controller.abort(); }, [id]);
  return <main className="mx-auto max-w-2xl space-y-5 px-6 py-32"><h1 className="text-3xl font-bold">Narudžbina portfolija</h1>
    {error ? <p role="alert">{error}</p> : !status ? <p>Učitavanje…</p> : <><p>Status: {status.status}</p>{status.status === "PAID" ? <a href={`/api/portfolio-commerce/purchases/${id}/pdf`}>Preuzmi PDF</a> : <p>{status.status === "FAILED" ? "Plaćanje nije uspjelo. Finalni PDF nije dostupan." : status.message}</p>}</>}
    <p>Ovaj pristup služi samo za status i isporuku. Ne otvara editor. Link važi sedam dana i najviše pet preuzimanja.</p></main>;
}
