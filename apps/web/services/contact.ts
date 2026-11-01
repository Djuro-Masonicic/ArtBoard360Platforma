import type { ContactTopic, ContactValues } from "@/lib/contact-form";
export async function sendContact(values: ContactValues, topic: ContactTopic, operationKey: string) {
  const unavailable = "Poruka trenutno nije mogla biti poslata. Pokušaj ponovo.";
  let response: Response;
  try { response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": operationKey }, body: JSON.stringify({ ...values, topic }), cache: "no-store" }); }
  catch { throw new Error(unavailable); }
  let payload: { accepted?: boolean } | null;
  try { payload = await response.json(); } catch { throw new Error(unavailable); }
  if (!response.ok || payload?.accepted !== true) throw new Error(response.status === 429 ? "Previše poruka. Pokušaj malo kasnije." : response.status === 400 ? "Provjeri unijete podatke." : unavailable);
}
