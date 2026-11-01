export type PaymentContext = {
  product: "premium" | "portfolio" | "generator";
  variant: "PREMIUM" | "PORTFOLIO_FREE" | "PORTFOLIO_GUEST" | "PORTFOLIO_PREMIUM" | "GENERATOR_FREE" | "GENERATOR_PREMIUM";
  amountCents: number; checkoutAvailable: boolean; status: string;
  catalog: { currency: string; guestExportCents: number; extraExportCents: number; premiumAmountsCents: number[]; generatorPackCents: number; generatorPackSize: number; generatorAvailable: boolean; checkoutAvailable: boolean; mockPaymentsEnabled?: boolean };
  account: { name: string; email: string } | null;
  quota: { plan: "FREE" | "PREMIUM"; used: number; limit: number; remaining: number; reserved: number; periodEnd: string | null } | null;
  portfolio: { id: string | null; title: string; style: string; format: string; language: string; pageCount: number } | null;
  purchase: { id: string; status: string } | null;
  paymentMethod: { brand: string; last4: string } | null;
  buyerEmail?: string;
};
export const formatPaymentAmount = (cents: number) => new Intl.NumberFormat("sr-Latn-ME", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100) + " €";
export function amountToPercent(amount: number) { return amount === 8.9 ? 0 : 20 + (amount - 10) * 4; }
export function percentToAmount(percent: number) {
  const p = Math.max(0, Math.min(100, percent));
  if (p < 10) return 8.9;
  if (p < 20) return 10;
  return 10 + Math.round((p - 20) / 4);
}
export function paymentCopy(c: PaymentContext) {
  const price = formatPaymentAmount(c.amountCents);
  const renewal = c.quota?.periodEnd ? new Intl.DateTimeFormat("sr-Latn-ME", { dateStyle: "medium" }).format(new Date(c.quota.periodEnd)) : null;
  const premium = c.variant.endsWith("PREMIUM");
  if (c.product === "premium") return { title: "Izaberi svoj iznos.", description: "Svi iznosi otključavaju iste Premium mogućnosti. Izaberi koliko možeš i želiš da izdvojiš, a svoj iznos možeš kasnije promijeniti.", cta: "Aktiviraj Premium", note: "Iznos možeš promijeniti ili otkazati članstvo u bilo kom trenutku." };
  if (c.product === "generator") return { title: "Dopuna za Generator.", description: !c.catalog.generatorAvailable ? "Dodaj set od 10 Instagram objava. Kupovina dopune biće dostupna kada Generator i njegov saldo budu povezani sa naplatom."
    : premium ? `Iskoristio/la si 10 od 10 objava ovog mjeseca. Set od 10 dodatnih objava košta ${price}; potvrdi kupovinu. Objave iz seta ne ističu.`
    : `Iskoristio/la si besplatnu Instagram objavu. Dodaj set od 10 objava za ${price} ili izaberi Premium (10 objava mjesečno).`,
    cta: premium && c.paymentMethod ? `Potvrdi kupovinu · ${price}` : `Plati ${price} i dodaj 10 objava`, note: "Jednokratno plaćanje, bez pretplate i bez automatske naplate. Objave iz seta ne ističu dok ih ne potrošiš." };
  if (c.status === "QUOTA_AVAILABLE" || (c.quota && (c.quota.remaining > 0 || c.quota.reserved > 0))) return { title: "Preuzmi svoj portfolio.", description: c.quota?.reserved ? "Izvoz je već u obradi. Sačekaj završetak prije pokretanja nove kupovine." : "Imaš raspoloživ izvoz u svom nalogu. Vrati se u editor i iskoristi ga bez dodatne kupovine.", cta: `Plati ${price} i preuzmi PDF`, note: "Jednokratno plaćanje, bez pretplate." };
  return { title: premium ? "Dodatni export." : "Preuzmi svoj portfolio.", description: c.variant === "PORTFOLIO_GUEST"
    ? `Bez naloga: export ${price}. Napravi besplatan nalog i prvi export dobijaš besplatno.`
    : premium ? `Iskoristio/la si ${c.quota?.used ?? 0} od ${c.quota?.limit ?? 5} exporta ovog mjeseca. Dodatni export košta ${price}; potvrdi kupovinu.${renewal ? ` Limit se obnavlja ${renewal}.` : ""}`
    : `Iskoristio/la si besplatan export. Novu verziju možeš izvesti za ${price} ili uz Premium (5 exporta mjesečno).`,
    cta: premium && c.paymentMethod ? `Potvrdi kupovinu · ${price}` : `Plati ${price} i preuzmi PDF`,
    note: premium ? "Jednokratna naplata samo uz tvoju potvrdu. Mjesečni Premium iznos se ne mijenja." : "Jednokratno plaćanje, bez pretplate." };
}
