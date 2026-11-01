/** Version of the supplied document, independent of the current calendar date. */
export const LEGAL_POLICY = {
  version: "2026-10-10",
  effectiveDateLabel: "10. oktobra 2026.",
  artistConfirmation: "„Imam 18 ili više godina i prihvatam Uslove korišćenja i Politiku privatnosti.”",
} as const;

export const LEGAL_ARTICLES = [
  { id: "uslovi", label: "01 Opšte odredbe" },
  { id: "nalog", label: "02 Nalog i uzrast" },
  { id: "autorstvo", label: "03 Autorska prava" },
  { id: "licenca", label: "04 Promotivna upotreba" },
  { id: "odrasli", label: "05 Sadržaj 18+" },
  { id: "zabranjeno", label: "06 Zabranjen sadržaj" },
  { id: "prijava", label: "07 Prijava povrede" },
  { id: "oglasi", label: "08 Oglasna tabla" },
  { id: "placanje", label: "09 Plaćene usluge" },
  { id: "odgovornost", label: "10 Odgovornost" },
  { id: "gasenje", label: "11 Gašenje naloga" },
  { id: "izmjene", label: "12 Izmjene i pravo" },
  { id: "privatnost", label: "13 Lični podaci" },
  { id: "kolacici", label: "14 Kolačići" },
] as const;
