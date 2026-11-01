import { redirect } from "next/navigation";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams, out = new URLSearchParams();
  for (const key of ["proizvod", "portfolio", "narudzbina"]) if (typeof query[key] === "string") out.set(key, query[key] as string);
  // Existing Generator/dashboard links use this public product alias.
  if (out.get("proizvod") === "dopuna-generatora") out.set("proizvod", "generator");
  redirect(`/pretplata/placanje${out.size ? `?${out}` : ""}`);
}
