import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSessionToken } from "@/lib/admin-session";
import { apiFetch } from "@/services/api";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const token = await getAdminSessionToken(); if (!token) redirect("/login");
  const value = Number((await searchParams).page ?? 1), page = Number.isSafeInteger(value) && value > 0 ? value : 1;
  const result = await apiFetch<{ items: { id: string; buyerEmail: string; amountCents: number; status: string; provider?: string|null; product: string; createdAt: string }[]; total: number }>(`/admin/portfolio-purchases?page=${page}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  return <main className="mx-auto max-w-6xl space-y-6 px-6 pb-20 pt-32"><h1 className="text-4xl font-bold">Portfolio kupovine</h1><p>Započete i potvrđene narudžbine. PENDING nije dokaz uplate. AllSecure naplata još nije aktivna.</p>
    <div className="overflow-x-auto rounded-3xl bg-white p-6"><table className="w-full text-left"><thead><tr>{["Kupac", "Proizvod", "Iznos", "Status", "Datum", ""].map(title => <th className="p-3" key={title}>{title}</th>)}</tr></thead><tbody>{result.items.map(item => <tr key={item.id}><td className="p-3">{item.buyerEmail}</td><td>{item.product}</td><td>{(item.amountCents / 100).toFixed(2)} €</td><td>{item.status}{item.provider==='mock'&&<small className="block text-blue-700">Testna uplata · bez naplate</small>}</td><td>{new Date(item.createdAt).toLocaleDateString("sr-Latn-ME")}</td><td><Link href={`/admin/portfolio-purchases/${item.id}`}>Detalji</Link></td></tr>)}</tbody></table>{!result.items.length ? <p>Nema narudžbina.</p> : null}</div>
    <nav className="flex gap-6">{page > 1 ? <Link href={`?page=${page - 1}`}>Prethodna</Link> : null}{page * 24 < result.total ? <Link href={`?page=${page + 1}`}>Sljedeća</Link> : null}</nav></main>;
}
