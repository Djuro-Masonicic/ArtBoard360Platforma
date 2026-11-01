# ARTBOARD — Kolekcije, završena lokalna implementacija

Datum: 27.10.2026. Ovaj izvještaj zamjenjuje status iz Paketa 2 poslije
naknadnog odobrenja korisnika da se završe frontend, backend i lokalna baza.
Nije izvršen deploy. Guest memory adapter ostaje dormant, bez Guest checkout,
AllSecure ili CV implementacije.

## Šta je aktivno

- Dashboard umjetnika: kreiranje, naziv/opis/godina/naslovna slika, redosljed
  kolekcija, dodavanje postojećih sopstvenih radova, potvrđeno premještanje,
  lokalni redosljed radova, uklanjanje članstva i brisanje kolekcije bez brisanja rada.
- Javni profil: stvarne kolekcije zamjenjuju automatske grupe čim postoji prva
  ArtistCollection. Dok nema stvarnih kolekcija, ostaje prethodni automatski prikaz
  i njegov postojeći prag broja radova. Kartica stvarne kolekcije filtrira njene
  radove i poštuje njihov lokalni redosljed. Nema automatske konverzije grupa.
- Novi prijavljeni portfolio: snapshot kolekcija, radova i metapodataka sa
  nezavisnim kopijama svih potrebnih slika. Kreiranje se završava atomarno tek
  kada su potrebne slike uspješno kopirane i izvorni profil ponovo provjeren.
- Builder, korak 02: uključivanje kolekcija i pojedinačnih radova, posebna grupa
  van kolekcija, nove lokalne kolekcije, uređivanje/opis/godina/naslovna slika,
  redosljed kolekcija i članova, premještanje i uklanjanje kolekcije.
- „Dodaj radove”: izbor sopstvenih originala. Već postojeći snapshot se premješta
  uz potvrdu; ne nastaje duplikat niti se prepisuju ručni podaci.
- „Preuzmi sa profila”: nove kolekcije se dodaju kao snapshotovi; postojeće ručne
  vrijednosti ostaju. Premještanje već dodatih radova zahtijeva potvrdu.
- „Sačuvaj i na profilu”: izričita odluka, pregled naziva rada/stare/nove izvorne
  kolekcije i potvrda konflikata. Ponovna provjera izvora i vlasništva unutar
  transakcije. Čuva se lokalni redosljed. Nema automatske dvosmjerne sinhronizacije.
- Obavještenja o promjenama izvora: pregled portfolio/profil vrijednosti i
  konflikata, preuzimanje samo označenih metapodataka/slika ili zadržavanje
  snapshotova. Novi/obrisani radovi, članstvo i redosljed prikazuju se informativno
  i mijenjaju izričito u Kolekcijama. Brisanje izvora ne briše snapshot.
- PDF i desni preview koriste isti postojeći generator i zajednički plan:
  naslovna → profil → uvod kolekcije i njeni izabrani radovi → sljedeće kolekcije
  → radovi van kolekcija bez uvoda → kontakt. Isključene/prazne kolekcije ne daju
  uvod. Sačuvani ručni metapodaci, naslovna slika i Free/Premium prava ostaju.
  Desni panel prikazuje stvarni PDF sa watermarkom i stvarnim brojem stranica.
- Stari projekti ostaju format 1. Novi korak nudi samo izričitu konverziju:
  kopira njihove sadašnje slike i čuva postojeće podatke/izbor/redosljed, bez
  osvježavanja sa izvornog profila. Postojeći PDF fajlovi i istorija ostaju.

## Autorizacija i paralelni zahtjevi

Nove privatne rute su pod `/portfolio-projects/me/:id/collections` i koriste
ArtistAuthGuard i serverom provjeren artistAccountId. UUID nije ovlašćenje.
Katalog izvora pripada samo nalogu iz sesije. DTO odbija dodatne vlasničke
vrijednosti. Next proxy koristi HTTP-only sesiju, provjerava origin upisa i
dozvoljava samo izričito navedene operacije.

Izvorne kolekcije koriste postojeću verziju profila i zaključavanje umjetnika,
kolekcija i radova. Portfolio komande koriste obavezni expectedRevision,
zaključavanje i atomarno povećanje revizije. I obični PATCH/upload V2 projekata
koriste isti revision uslov. Stari paralelni zahtjev dobija 409.
Operacije koje pišu i na profil ponovo provjeravaju sourceVersion pod istim
zaključavanjem; stale potvrda ne kreira djelimičnu kolekciju.

Čitanja za uređivanje i PDF preview koriste dosljedne snapshotove transakcije.
Finalni PDF se ne objavljuje ako je sadržaj promijenjen tokom generisanja;
verzije se numerišu pod zaključavanjem projekta. Izmjena sadržaja poništava
trenutni PDF pokazivač, čuvajući istoriju i fizičke fajlove.

## Lokalna baza i backup

Primijenjena je samo prethodno pripremljena migracija
`20261026213000_artist_portfolio_collections`.
Tačan SQL: [migration.sql](../prisma/migrations/20261026213000_artist_portfolio_collections/migration.sql).
SQL migracije nije naknadno mijenjan.

Prije primjene napravljen je pg_dump i manifest podataka iz ISTOG eksportovanog
read-only snapshot-a. Host kopija backupa vraćena je u izolovanu bazu, provjerene
su sve 23 prethodne tabele, pa je migracija testirana na vraćenoj bazi prije
lokalne primjene. Izvorni poslovni podaci upoređeni su ponovo poslije primjene.

- Lokalna baza: `localhost:5433/artboard_platforma`.
- Backup: `.backups/20261026_c6e252b6e490/before-collections.dump`.
- Dokaz vraćanja i migracije: `.backups/20261026_c6e252b6e490/verification.json`.
- Restore baza: `artboard_restore_20261026_c6e252b6e490`.
- Završni read-only dokaz: `.tmp/collections-complete/local-database-verification.json`.
- 25/25 migracija završeno; Prisma migrate diff: **No difference detected**.
- Svih 22 prethodnih poslovnih tabela ima isti broj redova i isti SHA-256 za
  njihove prethodne kolone. Sačuvano: 76 umjetnika, 1106 radova, 25 projekata,
  231 portfolio rad, 18 PDF verzija i 3 payment zapisa.
- Svih 25 starih projekata je i dalje format 1; testovi nijesu kreirali radne
  kolekcije niti mijenjali stvarne projekte.

Oba Prisma klijenta sada nastaju iz iste aktivne schema.prisma. Zamrznuta
compatibility šema ostaje istorijski materijal; ne koristi se za standardno
generisanje klijenta. Lokalno su uključene ARTIST_COLLECTIONS_ENABLED i
PORTFOLIO_COLLECTIONS_ENABLED. U .env.example su bezbjedno isključene uz
napomenu o obaveznoj migraciji prije aktivacije na drugom okruženju.

## Slike i fizičko brisanje

Kopiranje čita provjerenu sliku iz R2 ili podržanih istorijskih CDN izvora,
provjerava veličinu i format/rezoluciju i upisuje novi UUID ključ u prostor tog
portfolija. Različiti portfoliji ne dijele kopije. URL/path neslaganje se odbija;
proizvoljni/private URL-ovi i preusmjerenja van liste CDN domena se odbijaju.
„Sačuvaj i na profilu” takođe kopira naslovnu sliku u prostor izvorne kolekcije.

Nema fizičkog brisanja: postojeći deleteFile ostaje odloženi no-op. Neuspjela
kopiranja ili revision konflikti mogu ostaviti nove objekte bez reference;
oni se zadržavaju do posebno odobrenog storage čišćenja. Stari dijeljeni objekti
nijesu masovno kopirani, mijenjani niti brisani.

## Izmijenjeni/dodati fajlovi završnog koraka

Konfiguracija i pakovanje:

- `.gitignore`, `.dockerignore`, `.env.example`; lokalni ignorisani `.env` — samo dvije zastavice.
- `package.json`, `package-lock.json`.
- `apps/api/package.json`, `apps/api/Dockerfile`, `apps/api/prisma/schema.prisma`.
- `apps/web/package.json`, `apps/web/Dockerfile`.
- `packages/portfolio-document-plan/package.json`, `index.cjs`, `index.d.ts`.

API:

- `apps/api/src/config/env.ts`.
- `apps/api/src/modules/artists/artists.service.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-projects.controller.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-projects.dto.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-projects.module.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-projects.service.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-collections.controller.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-collections.dto.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-collections.service.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-collections-enabled.guard.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-pdf.generator.ts`.
- `apps/api/src/storage/r2-storage.service.ts`.
- `apps/api/scripts/verify-collections-migration.cjs`.

Web:

- `apps/web/app/artists/[slug]/page.tsx`.
- `apps/web/components/artist-artwork-gallery.tsx`.
- `apps/web/components/portfolio-builder-editor-shell.tsx`.
- `apps/web/components/portfolio-collections-workspace.tsx`.
- `apps/web/components/portfolio-collections-workspace.module.css`.
- `apps/web/components/portfolio-source-changes.tsx`.
- `apps/web/components/portfolio-live-pdf-preview.tsx`.
- `apps/web/lib/portfolio-editor-adapter.ts`, `apps/web/lib/portfolio-proxy.ts`.
- `apps/web/services/portfolio-collections.ts`, `portfolio-projects.ts`, `uploads.ts`.
- `apps/web/types/api.ts`.

Testovi i dokumentacija:

- `apps/api/test/artist-collections.fixture.cjs`.
- `apps/api/test/artist-collections.api.test.cjs` — prilagođena provjera poslije migracije.
- `apps/api/test/artworks.patch.test.cjs` — read-only transaction podrška testnom mock-u.
- `apps/api/test/portfolio-collections.api.test.cjs`.
- `apps/api/test/portfolio-document-plan.test.cjs`.
- `apps/api/test/portfolio-storage-copy.test.cjs`.
- `apps/web/test/portfolio-collections.browser.cjs`.
- `apps/web/test/portfolio-access.test.cjs`.
- `apps/web/test/portfolio-profile.browser.cjs` — namjerne conditional Collections
  izmjene provjeravaju se browser geometrijom umjesto prethodnim AST equality uslovom.
- `apps/api/docs/collections-4-2-package2.md`, ovaj izvještaj.

Već implementirani artist-collections API/modul, dashboard editor, dashboard
proxy i kolekcijska migracija iz ranijih paketa korišćeni su i ponovo testirani.
Nije rađen redizajn headera, sidebara ili drugih koraka. Njihov raniji CSS nije
mijenjan u ovom završnom koraku. CV ima samo nedostupno mjesto u numeraciji.

## Rezultati provjere

| Provjera | Rezultat |
| --- | --- |
| Kompletan API/web Node skup | **171/171 prolazi** |
| Novi Portfolio Collections API, stvarni Nest + PostgreSQL + PDF | **27/27 prolazi** (dio gornjeg skupa) |
| Izvorne kolekcije, dashboard browser | **32/32, bez runtime grešaka** |
| Novi builder + stvarni Next proxy/API/baza/PDF + javni profil | **31/31, bez runtime grešaka** |
| Podaci, stari Free/Premium/Guest tokovi, header/sidebar i drugi koraci | **504 provjere, bez runtime grešaka** |
| API i web TypeScript | **prolazi** |
| API build i puna web build provjera | **prolazi** |
| Naknadna provjera dosljednog shared/admin PDF čitanja + novi API | **49/49 prolazi** |
| Aktivna lokalna aplikacija, read-only autentifikovan smoke | **web/API 200; oba kolekcijska servisa dostupna** |

Svi testovi koriste izolovane baze i sintetičke slike. Domenski/browser testovi
koriste lažni storage transport; poseban storage-copy skup izvršava stvarnu
metodu kopiranja uz zamijenjen S3 transport, bez kontakta sa stvarnim R2.
PDF generator nije zamijenjen u novom API/browser skupu.

Provjereni su 401/404 za odsutnog/tuđeg vlasnika, podmetnuti vlasnički ID-jevi,
potvrde premještanja, stale revision/sourceVersion, paralelni PATCH/komande,
rollback pri grešci, zadržavanje slika i ručnih vrijednosti, idempotentno
objavljivanje na profilu, neuspjelo kopiranje, promjene izvora i eksplicitna
konverzija. U sva tri PDF šablona provjereni su stvarni tekst i redosljed stranica,
broj stranica i watermark. I dodatne fizičke stranice zbog dugog teksta imaju
tačno jedan watermark. Postojeći cover-test pregled takođe ostaje watermarked.

Responsive browser provjera: 1536, 1440, 1280, 1024, 768, 440, 375 i 320 px.
Kontrole i otvoreni meniji ostaju u viewportu. Mjerenje prema originalnom
`apps/web/references/portfolio-kolekcije.html`, pri istoj širini kolone 795.44 px:

| Element | Referenca | Implementacija |
| --- | --- | --- |
| Padding kartice, desktop | 24 px | 24 px |
| Radius kartice | 22 px | 22 px |
| Razmak kartica | 18 px | 18 px |
| Checkbox | 26 px | 26 px |
| Grid gap | 12 px | 12 px |
| Izbor rada | 22 px | 22 px |
| Slika rada | 4:5 | 4:5, uz browser zaokruživanje |

Dodate funkcionalne kontrole za kreiranje/import/uređivanje/objavu nijesu dio
statičkog originalnog Artifakta; uklopljene su u sažetak, meni i dijaloge.
Sintetičke testne slike nijesu vizuelna referenca za stvarne radove.

Dokazi: `.tmp/collections-complete/browser-results.json`,
`reference-measurements.json`, screenshotovi `portfolio-collections-1536.png`
i `portfolio-collections-375.png`; `.tmp/collections-4-2-package2/browser-results.json`;
`.tmp/portfolio-podaci-4-1/results.json`; `.tmp/collections-all-tests.log`.
Privatni backup/test/runtime artefakti isključeni su iz Gita i Docker konteksta.

## Pokretanje i preostala ograničenja

Lokalni projekat je ponovo pokrenut sa uključenim zastavicama:
web `http://localhost:3000`, API `http://localhost:4000`.
Runtime PID i putanje logova: `.tmp/local-runtime/collections-runtime.json`.
Dashboard je na `/artist/dashboard`, builder na `/portfolio-builder`.

- Postojećih 25 portfolija nije automatski konvertovano. Korisnik odlučuje po draftu.
- Slike čiji istorijski URL ne pripada podržanom CDN-u, neispravne/prevelike slike
  ili nedostajući objekti zaustavljaju snapshot/konverziju bez djelimičnog upisa.
- Zadržan je limit od 30 sačuvanih radova. Profil preko limita dobija jasno odbijanje
  pri početnom kreiranju; poseban izbor početnih 30 prije kreiranja nije dodat.
- „Sačuvaj i na profilu” koristi postojeće originalne radove. Ručno uploadovani
  portfolio rad bez izvora jasno je blokiran za tu akciju; ne izmišlja se original.
- Napuštene kopije i stari dijeljeni R2 objekti ostaju do odobrene storage faze.
- Stari legacy Guest tok/plaćanje nijesu mijenjani. To nije konačni Guest flow
  iz odložene funkcionalne faze; memorijski adapter nije javno aktiviran.
- Postoji pg/Prisma upozorenje o paralelnim upitima na istom connection-u;
  testovi i runtime rade, ali nadogradnju adaptera/pg treba zasebno provjeriti.
- Docker manifesti su ažurirani za novi zajednički paket; Docker image build i
  produkcioni deploy nijesu izvršavani.

Nema brisanja stvarnih podataka ili R2 fajlova, masovne konverzije projekata,
automatske sinhronizacije profila, implementacije CV-a ili pokretanja naredne faze.
