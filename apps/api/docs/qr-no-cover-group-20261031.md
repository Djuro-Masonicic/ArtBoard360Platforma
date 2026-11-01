# No Cover — objedinjeni izbor Clean / Profilna

Glavni izbor sada ima pet kartica: Basic, ArtBoard, Classic, No Cover i Portret. Clean i Profilna su varijante iste kartice No Cover, kao na dostavljenoj referenci.

U panelu „Varijanta i boja” postoje dvije grupe: „Varijanta šablona No Cover” (Clean / Profilna) i „Boja kartice” (Svijetla / Tamna). Na telefonu se grupe slažu jedna ispod druge. Jezik i naslov poleđine ostaju funkcionalni u narednom panelu. Thumbnail No Cover i live preview prikazuju izabranu varijantu, a izbor se pamti tokom prelaska na drugi šablon i povratka.

Sačuvani zapisi ostaju kompatibilni: Clean i dalje koristi postojeći `no-cover`, Profilna postojeći `portrait`. To je grupisanje prikaza u editoru, bez prepisivanja draftova, novih vlasničkih polja ili migracije. Novi i stari draftovi se otvaraju sa odgovarajućom odabranom varijantom. PDF/PNG renderer i istorijski fajlovi nijesu mijenjani.

Izmijenjeni fajlovi:

- `apps/web/components/qr-card-editor.tsx` — jedinstvena kartica, izbor varijante/boje, odgovarajući thumbnail i raspored kontrola.
- `apps/web/components/qr-card-editor.module.css` — dva paralelna segmentna izbora i responsive raspored.
- `apps/web/test/qr-cards.browser.cjs` — pet kartica, obje varijante, boje, čuvanje/ponovno otvaranje, povratak na No Cover i pregled na različitim širinama.
- `apps/api/docs/qr-no-cover-group-20261031.md` — ovaj izvještaj.
- `apps/api/docs/qr-vizit-karta-20261030.md` — ažurirano grupisanje kataloga.

Provjere:

- Web TypeScript prolazi (`npx tsc --noEmit -p apps/web/tsconfig.json`).
- Browser provjere prolaze: 68/68, bez runtime grešaka (`node apps/web/test/qr-cards.browser.cjs`). Obuhvataju i stvarno preuzimanje postojećeg toka.
- Browser test koristi produkciono kompilovan testni prikaz stvarnog editora, izolovanu bazu i storage zamjene.

Backend, Prisma šema, migracije, radna baza i stvarni R2 objekti nijesu mijenjani. Testni screenshotovi: `.tmp/qr-browser/no-cover-*-desktop.png` i `no-cover-*-mobile.png`.
