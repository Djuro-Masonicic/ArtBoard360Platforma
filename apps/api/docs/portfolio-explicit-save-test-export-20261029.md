# Izričito prvo čuvanje i razvojni PDF izvoz — 29. 10. 2026.

## Ponašanje

- „Generiši iz profila” otvara `/portfolio-builder/from-profile`. Autentifikovani GET preuzima podatke, radove i kolekcije vlasnika, bez kreiranja projekta ili kopiranja slika.
- Postojeći editor koristi opcioni `profile-memory` adapter. Podaci, CV, dizajn, redosljed, kolekcije i nove slike ostaju u otvorenoj stranici. Nove slike koriste File/blob URL, sa oslobađanjem URL-ova. Refresh odbacuje nezavršene izmjene.
- Header prikazuje „Nije sačuvano”. Tek „Sačuvaj draft” / „Sačuvaj izbor” šalje prvi multipart save. Tek tada slike dobijaju nezavisne portfolio kopije i projekat sa djecom nastaje u jednoj transakciji. Poslije čuvanja otvara se postojeći editor sačuvanog projekta.
- Izbor sekcija u novom portfoliju ne kreira draft. Objavljivanje portfolio kolekcije na izvornom profilu i dijeljenje zahtijevaju prethodno čuvanje.
- „Preuzmi testni PDF” u Izvozu koristi postojeći generator bez watermarka. Dostupan je autentifikovanom vlasniku samo kada API radi sa `NODE_ENV=development`; server odbija zahtjev u produkciji. Ne zahtijeva privatni PDF bucket, ne upisuje PDF verziju, ne troši kvotu, ne kreira kupovinu i ne čuva draft. Dostupan je i u postojećem sačuvanom portfoliju.
- Redovni izvoz, plaćanje, istorija verzija i njihove zaštite ostaju odvojeni. Guest ne dobija besplatan čisti PDF ovim endpointom.

## Rute i zaštite

`GET /portfolio-projects/editor/from-profile` i `POST /portfolio-projects/editor/{preview,test-export,save}` zahtijevaju ArtistAuthGuard. Next proxy koristi HTTP-only sesiju i provjerava Origin za upise. Dokument i fajlovi imaju ograničenja; slike se dekodiraju i normalizuju. Remote URL se prihvata samo iz serverom učitanog vlastitog profila ili vlastitog projekta. Proizvoljni vlasnik, tuđi izvorni ID ili URL nijesu dokaz pristupa.

Prvo čuvanje provjerava verziju izvornog profila prije kopiranja i ponovo u transakciji. Promjena tokom kopiranja abortira DB upis. Save UUID i hash zamrznutog zahtjeva štite od duplih draftova pri ponovljenom/paralelnom zahtjevu. Pregled i čuvanje imaju odvojene limite po autentifikovanom vlasniku.

## Izmijenjeni fajlovi

API:

- `src/modules/portfolio-projects/portfolio-editor.controller.ts` — nove autentifikovane rute i limiter.
- `src/modules/portfolio-projects/portfolio-editor.service.ts` — read-only seed, validacija, privremeni render, izričito prvo čuvanje.
- `src/modules/portfolio-projects/portfolio-projects.module.ts` — registracija.
- `src/modules/portfolio-projects/portfolio-projects.service.ts` — dostupnost testnog izvoza i zajednička serijalizacija.
- `src/modules/portfolio-projects/portfolio-collections.service.ts` — zajedničko čitanje izvora, uključujući postojeću transakciju.
- `src/modules/portfolio-projects/portfolio-guest.service.ts` — izdvojena postojeća normalizacija slika.
- `test/portfolio-editor.api.test.cjs` — deset novih izolovanih API provjera.

Web:

- `app/portfolio-builder/from-profile/page.tsx`, `app/api/portfolio-editor/[action]/route.ts`.
- `components/portfolio-profile-editor.tsx`, `lib/portfolio-profile-memory.ts`.
- `components/portfolio-builder-landing.tsx`, `components/portfolio-builder-editor-shell.tsx`.
- `components/portfolio-export-workspace.tsx`, `components/portfolio-export-pdf-pages.tsx`, `components/portfolio-live-pdf-preview.tsx`.
- `components/portfolio-collections-workspace.tsx`, `services/portfolio-collections.ts`.
- `lib/portfolio-editor-adapter.ts`, `lib/guest-portfolio-memory.ts`, `lib/portfolio-guest-transport.ts`, `types/api.ts`.
- `test/portfolio-commerce.browser.cjs` — proširen postojeći stvarni Next/API browser harness.
- `test/guest-portfolio-memory.test.cjs` — dodatna provjera lokalnih kolekcija, redosljeda i privremenih slika prijavljenog vlasnika.

Dokumentacija: ovaj izvještaj i `portfolio-export-commerce-status.md`.

## Provjere

- 71/71 API test: deset novih + postojeći commerce i kolekcijski testovi, na izolovanim PostgreSQL bazama sa lažnim storageom.
- 51/51 PDF i memorijski test: svih šest stilova, Guest adapter i novi adapter za profil.
- 45 browser provjera kroz izolovan Next build: ulazak bez upisa, privremeni upload, PDF pregled i preuzimanje, refresh, izbor sekcija, prvo čuvanje i otvaranje sačuvanog dizajna; postojeći Guest/Free/Premium tokovi, istorija, kvote i admin isporuka. Bez browser runtime izuzetaka.
- API i web TypeScript prolaze.
- Lokalni API prepoznaje novu rutu i anonimnom zahtjevu vraća 401.

## Granice

Nema Prisma izmjena, migracija, brisanja starih draftova ili fizičkog brisanja R2 objekata. Realni projekti i slike nijesu korišćeni za testove. Prilikom izričitog prvog čuvanja stvarnih korisničkih podataka nastaju potrebne R2 kopije, kao kod postojećeg snapshot toka.

Neuspjelo ili paralelno prvo čuvanje može ostaviti nepotrebne kopirane objekte, ali ne djelimičan/dupli projekat. Njihovo čišćenje ostaje za posebnu storage proceduru. Testni PDF se ne pojavljuje u istoriji. Stari eksplicitni POST `/portfolio-projects/from-profile` ostaje kompatibilan API za kreiranje; korisničko dugme ga više ne poziva.
