import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSessionToken } from "@/lib/admin-session";
import { apiFetch } from "@/services/api";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id, token = await getAdminSessionToken(); if (!token) redirect("/login");
  if (!/^[a-f0-9-]{36}$/i.test(id)) redirect("/admin/portfolio-purchases");
  const p = await apiFetch<any>(`/admin/portfolio-purchases/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  async function revoke() { "use server"; const current = await getAdminSessionToken(); if (!current) redirect("/login"); await apiFetch(`/admin/portfolio-purchases/${id}/delivery`, { method: "DELETE", headers: { Authorization: `Bearer ${current}` } }); revalidatePath(`/admin/portfolio-purchases/${id}`); }
  const snapshot = p.snapshot;
  return <main className="mx-auto max-w-5xl space-y-6 px-6 pb-20 pt-32"><h1 className="text-3xl font-bold">Narudžbina · {p.status}</h1>
    <section className="space-y-3 rounded-3xl bg-white p-7"><p>{p.buyerEmail} · {p.product} · {(p.amountCents / 100).toFixed(2)} {p.currency}</p><p>Potvrđena uplata: {p.paidAt ?? "Nije potvrđena"}</p><p>Snapshot SHA-256: {p.snapshotHash}</p>{p.product === "GENERATOR_PACK" ? <p>Set od 10 dodatnih Instagram objava. Krediti se dodjeljuju poslije potvrđene uplate; ovaj proizvod nema PDF isporuku.</p> : <><a href={`/api/admin/portfolio-purchases/${id}/preview-pdf`} target="_blank" rel="noreferrer">Pregled zamrznutog sadržaja · watermark</a><form action={revoke}><button className="rounded-full border px-5 py-2" type="submit">Opozovi sve linkove za isporuku</button></form></>}</section>
    <section className="space-y-3 rounded-3xl bg-white p-7"><h2 className="text-2xl font-bold">Sadržaj kupovine</h2><p>{snapshot.artistName} · {snapshot.title}</p><p>{snapshot.biography}</p><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{snapshot.artworks?.map((w: any) => <figure key={w.id}><img className="h-40 w-full object-contain" src={w.imageUrl} alt={w.title ?? "Rad"} /><figcaption>{w.title} · {w.technique} · {w.year}</figcaption></figure>)}</div><details><summary>Tekstualni podaci i CV</summary><pre className="whitespace-pre-wrap break-all">{JSON.stringify({ ...snapshot, profileImageUrl: undefined, coverImageUrl: undefined, collectionCoverUrl: undefined, artworks: snapshot.artworks?.map(({ imageUrl, ...w }: any) => w) }, null, 2)}</pre></details></section>
    <section className="rounded-3xl bg-white p-7"><h2 className="text-2xl font-bold">Isporuka</h2>{p.deliveryGrants.map((g: any) => <p key={g.id}>{g.downloads}/{g.maximumDownloads} preuzimanja · važi do {g.expiresAt} · {g.revokedAt ? "Opozvan" : "Aktivan"}</p>)}<h2 className="mt-6 text-2xl font-bold">Payment događaji</h2>{p.paymentEvents.map((e: any) => <p key={e.id}>{e.provider} · {e.status} · {e.receivedAt}</p>)}</section></main>;
}
