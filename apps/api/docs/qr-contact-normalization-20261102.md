# QR kontakt validacija — 2026-11-02

QR izvoz je odbijao Instagram/Behance korisnička imena i linkove bez protokola porukom `Unesi punu HTTPS adresu kontakta.`

- Editor i API dijele `normalizeCardSocialContact` iz `packages/qr-card-renderer/contacts.cjs`.
- Prihvataju `@ime`, `ime`, `instagram.com/ime`, `behance.net/ime` i pune profile linkove. Rezultat je HTTPS URL na odgovarajućem zvaničnom domenu.
- Tuđi domeni, opasne šeme, kredencijali u URL-u, nestandardni portovi i neispravan unos ostaju odbijeni. Poruka sada navodi da li treba ispraviti Instagram ili Behance.
- Kontakti iz profila normalizuju se za novi editor bez promjene profila ili kreiranja drafta. Eksplicitno čuvanje i izvoz koriste normalizovan sadržaj. Postojeći istorijski izvozi ostaju nepromijenjeni.
- Editor prihvata skraćeni unos i prikazuje normalizovan URL nakon izlaska iz polja. Odgovor čuvanja ne prepisuje novije izmjene napravljene dok zahtjev traje.

Provjere: 29 API/unit testova, 71 browser provjera bez runtime grešaka, API/web TypeScript, API build i izolovani Next produkcioni build. Browser je stvarno preuzeo ZIP sa PDF-om i obje PNG strane, sa normalizovanim kontaktom u serverskom snapshotu. API test potvrđuje da odbijena adresa ne kreira draft/izvoz, ne piše storage i ne troši Free pravo; ponovljen zahtjev sa ekvivalentnim punim linkom koristi isti izvoz.

Testovi koriste izolovanu QR bazu i memorijski storage. Nema migracija niti direktnih promjena postojećih produkcionih podataka ili R2 objekata. Preuzimanje iz korisnikove prijavljene produkcione sesije nije provjeravano.
