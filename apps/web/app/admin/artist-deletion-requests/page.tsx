import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import { apiFetch } from "@/services/api";
import { subscriptionDate } from "@/lib/subscription-overview";
type RecordItem = { id: string; status: string; createdAt: string; dueAt: string; adminNotes: string | null; acknowledgedEmailAt: string | null; adminNotifiedAt: string | null; artistAccount: { name: string; email: string; artist: { slug: string } } };
type PageResult = { items: RecordItem[]; meta: { page: number; totalPages: number; total: number } };
export default async function ArtistDeletionRequestsPage({ searchParams }: { searchParams: Promise<{ page?: string; error?: string }> }) {
  const session = await requireAdminSession(), query = await searchParams;
  const page = Math.max(1, Number.isSafeInteger(Number(query.page)) ? Number(query.page) : 1);
  const result = await apiFetch<PageResult>(`/admin/artist-deletion-requests?page=${page}`, { headers: { Authorization: `Bearer ${session.token}` }, cache: "no-store" });
  async function review(form: FormData) {
    "use server";
    const current = await requireAdminSession(), id = String(form.get("id") || "");
    if (!/^[a-f0-9-]{36}$/i.test(id)) return;
    try { await apiFetch(`/admin/artist-deletion-requests/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${current.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ expectedStatus: "PENDING", status: "IN_REVIEW", adminNotes: String(form.get("notes") || "").trim() }) }); }
    catch { redirect("/admin/artist-deletion-requests?error=review"); }
    revalidatePath("/admin/artist-deletion-requests");
  }
  return <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 pb-16 pt-28"><Link href="/admin" className="text-sm font-bold">← Admin pregled</Link><section className="rounded-[28px] bg-white p-7 text-[#111318] shadow-sm"><h1 className="text-3xl font-bold">Zahtjevi za brisanje naloga</h1><p className="mt-3 text-sm text-[#6b7184]">{result.meta.total} zahtjeva. Ovaj pregled ne briše naloge, radove, PDF-ove ili storage objekte. Tim treba da pregleda zavisnosti i pošalje odluku korisniku do naznačenog roka.</p></section>{query.error ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-red-800">Zahtjev je promijenjen ili nije mogao biti ažuriran. Provjeri trenutno stanje.</p> : null}
    {result.items.map(r=><article className="rounded-[24px] bg-white p-6 text-[#111318] shadow-sm" key={r.id}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{r.artistAccount.name}</h2><span className="rounded-full border px-3 py-1 text-xs font-bold">{r.status === "PENDING" ? "ČEKA ODOBRENJE" : r.status === "IN_REVIEW" ? "U PREGLEDU" : r.status}</span></div><p className="mt-3 text-sm">Zahtjev: {subscriptionDate(r.createdAt)} · Rok za odgovor: {subscriptionDate(r.dueAt)}</p><div className="mt-3 flex flex-wrap gap-5 text-sm"><a className="underline" href={`mailto:${r.artistAccount.email}`}>{r.artistAccount.email}</a><a className="underline" href={`/umjetnik/${r.artistAccount.artist.slug}`} target="_blank" rel="noopener noreferrer">Javni profil ↗</a></div><p className="mt-3 text-xs text-[#6b7184]">E-mail potvrda: {r.acknowledgedEmailAt ? "prihvaćena od providera" : "nije potvrđena"} · Admin obavještenje: {r.adminNotifiedAt ? "prihvaćeno od providera" : "nije potvrđeno"}</p>{r.adminNotes?<p className="mt-3 whitespace-pre-wrap text-sm">{r.adminNotes}</p>:null}{r.status === "PENDING" ? <form className="mt-5 flex flex-wrap gap-3" action={review}><input name="id" type="hidden" value={r.id}/><input className="min-w-0 flex-1 rounded-xl border px-4 py-2 text-sm" name="notes" aria-label={`Interna napomena za ${r.artistAccount.name}`} maxLength={4000} placeholder="Interna napomena"/><button className="rounded-full bg-[#111318] px-5 py-2 text-xs font-bold text-white" type="submit">Preuzmi na pregled</button></form>:null}</article>)}
    {!result.items.length?<p className="rounded-2xl bg-white p-6 text-sm text-[#6b7184]">Još nema zahtjeva.</p>:null}<nav className="flex justify-between text-sm font-bold" aria-label="Stranice zahtjeva">{page>1?<Link href={`?page=${page-1}`}>← Prethodna</Link>:<span/>}{page<result.meta.totalPages?<Link href={`?page=${page+1}`}>Sljedeća →</Link>:null}</nav>
  </div>;
}
