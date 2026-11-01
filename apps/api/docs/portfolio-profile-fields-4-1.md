# Podaci — datum rođenja, Behance, moto i nezavisna naslovna fotografija

Implementacija je pripremljena i izolovano testirana. **Migracija je 26.10.2026.
primijenjena na lokalnu bazu `localhost:5433/artboard_platforma`.** Prije toga je
napravljen backup, provjereno vraćanje svih 23 tabela i izvršena migracija na
izolovanoj kopiji. Sve postojeće poslovne vrijednosti ostale su sačuvane.
R2 objekti nijesu mijenjani. Detalji su u `collections-4-2-foundation.md`.

## Ponašanje

- Podaci imaju isti raspored sedam glavnih polja kao referenca: ime, e-mail,
  telefon, datum rođenja, lokacija, Behance i Instagram. Moto i autor citata su
  posebna, opciona polja ispod umjetničkog iskaza.
- Datum se unosi kao `DD.MM.GGGG.`, šalje kao `YYYY-MM-DD`, čuva kao PostgreSQL
  `DATE` i vraća kao datum bez vremena. Provjeravaju se stvaran kalendarski datum
  i zabrana budućih datuma. Prazan string briše vrijednost, bez vremenskog pomjeranja.
- `Artist.dateOfBirth` je pripremljen za opšti model umjetnika. Nije dodat u
  javni JSON umjetnika ili u postojeće artist write DTO-e. Kreiranje
  portfolija iz profila kopira datum ako je već postavljen na modelu umjetnika.
  Izmjena portfolija, kao i ostali njegovi podaci, ne prepisuje izvorni profil.
  Generalni editor naloga/profila nije predmet ovog koraka.
- Behance se pri kreiranju iz profila kopira iz postojeće `SocialLink.BEHANCE`
  relacije. Ne dodaje se duplirano Behance polje modelu Artist. Pri čuvanju
  portfolija prihvataju se Behance linkovi sa ili bez protokola i normalizuju na
  HTTPS; drugi domeni, neispravne adrese i nepodržani protokoli se odbijaju.
- Moto (do 1000 karaktera) i autor (do 160) imaju zasebne nullable kolone u
  portfoliju. Čuvaju se, ponovo učitavaju i mogu se obrisati praznim unosom.
- Postojeći Website podatak ostaje sačuvan; forma prikazuje Behance kao zasebno
  polje. Nijesu brisani podaci Website-a ili kolekcije.
- Iz Podataka su uklonjeni naziv/godina/opis kolekcije i kartica covera kolekcije.
  Njihove kolone i API podrška ostaju za kasniju implementaciju Kolekcija.
- Druga slikovna kartica je stvarna naslovna fotografija portfolija. Upload ide
  na novi `POST /portfolio-projects/public/:id/cover-image`, kroz postojeći
  `PortfolioAccessGuard` i servisnu provjeru vlasništva prije storagea. Koristi
  posebnu putanju `portfolio-projects/:id/cover/...` i mijenja samo cover URL/path.
  Ne dodaje rad, ne mijenja sliku kolekcije i ne briše prethodne objekte.
- Next posrednik prosljeđuje provjerenu sesiju, čuva multipart boundary i
  odbija cross-origin upise. UUID ili ID vlasnika iz zahtjeva ne autorizuju upload.
- Guest memorijski adapter podržava nova polja i cover kao File/blob URL,
  uz čišćenje pri zamjeni/unmountu. Novi Guest ulaz i dalje nije aktiviran.
  Postojeći prelazni ownerless Guest tok nije redizajniran u ovom zadatku.
- Header, sidebar, Radovi, Dizajn, Izvoz, PDF generator, checkout i admin prikaz
  nijesu mijenjani. Novi podaci se čuvaju u modelu; njihov novi prikaz u PDF-u
  nije implementiran u ovom koraku. Prethodni limit biografije od 1200 karaktera
  i postojeće ponašanje umjetničkog iskaza ostaju isti.

## Migracija za odobrenje

`prisma/migrations/20261026193000_portfolio_profile_fields/migration.sql` dodaje:

| Tabela | Nove nullable kolone |
| --- | --- |
| Artist | dateOfBirth DATE |
| PortfolioProject | dateOfBirth DATE, behanceUrl TEXT, motto TEXT, mottoAuthor TEXT, coverImageStoragePath TEXT |

Nema DROP, DELETE, UPDATE podataka, promjena postojeće kolone ili obaveznog
backfilla. SQL je upoređen sa `prisma migrate diff` nad dvije lokalne šeme i
odgovara generisanom rezultatu. `prisma generate` je pokrenut samo za lokalne
tipove; ne primjenjuje SQL. Prije primjene treba provjeriti status migracija i
primijeniti samo odobrenu promjenu, bez automatskog uključivanja drugih pending
migracija. Ne pokretati novu API verziju na staroj šemi.

## Provjere

- **22/22** izolovana Nest API testa: stvarni guardovi, DTO validacija, kontroler
  i servis, uz zamjenu DB/storage transporta. Nova polja se čuvaju/učitavaju/brišu;
  neispravan datum/link/predug tekst i lažni vlasnik nemaju upisne efekte.
  Novi upload je provjeren za vlasnika, tuđi UUID, anoniman pristup, neispravan
  fajl i storage grešku. Kolekcija i radovi ostaju neizmijenjeni.
- **32/32** postojećih artwork/storage sigurnosnih testova.
- **14/14** memorijskih/backend adapter i date-only testova.
- **13/13** Next autorizacionih/posredničkih testova, uključujući novi cover upload.
- **510/510** Chrome provjera, osam viewporta 320–1536 px: sva polja, Free/Premium
  save/reload preko testnog API-ja, neispravan datum bez zahtjeva, Guest memorija,
  cover bez novog rada, uklonjene kontrole kolekcije, URL cleanup, refresh,
  navigacija, tamna tema i regresije drugih koraka. Nema browser runtime grešaka.
- TypeScript za web i API i izolovani Next produkcioni testni build prolaze.
- Testovi ne koriste stvarne naloge, bazu ili storage. Primjena i verifikacija
  migracije nad lokalnom bazom završene su u početnom paketu Faze 4.2, uz
  provjeren backup i test vraćanja (vidjeti dopunu ispod).

Na 1536 × 900 glavna kartica ima **927,844 px**, a cijeli centralni korak
**1364,797 px**, jednako renderovanom referentnom HTML-u u istoj širini.
Slike su testne. Screenshotovi, snimci prije izmjena i rezultati su u
`.tmp/portfolio-podaci-4-1/` i `.tmp/portfolio-podaci-fields/`.

## Tačni izmijenjeni/dodati fajlovi

1. `apps/api/prisma/schema.prisma`
2. `apps/api/prisma/migrations/20261026193000_portfolio_profile_fields/migration.sql`
3. `apps/api/src/common/validators/portfolio-profile-fields.ts`
4. `apps/api/src/modules/portfolio-projects/portfolio-projects.dto.ts`
5. `apps/api/src/modules/portfolio-projects/portfolio-projects.service.ts`
6. `apps/api/src/modules/portfolio-projects/portfolio-projects.controller.ts`
7. `apps/api/src/storage/storage.types.ts`
8. `apps/api/src/storage/r2-storage.service.ts`
9. `apps/web/lib/portfolio-proxy.ts`
10. `apps/web/services/portfolio-projects.ts`
11. `apps/web/types/api.ts`
12. `apps/web/lib/portfolio-editor-adapter.ts`
13. `apps/web/lib/guest-portfolio-memory.ts`
14. `apps/web/lib/portfolio-profile-fields.ts`
15. `apps/web/components/portfolio-builder-editor-shell.tsx`
16. `apps/web/components/portfolio-builder-editor-shell.module.css`
17. `apps/api/test/portfolio-authorization.test.cjs`
18. `apps/web/test/guest-portfolio-memory.test.cjs`
19. `apps/web/test/portfolio-access.test.cjs`
20. `apps/web/test/portfolio-profile.browser.cjs`
21. `apps/api/docs/portfolio-profile-fields-4-1.md`

`globals.css`, postojeći referentni HTML i šabloni PDF-a ostaju isti. Ovaj izvještaj
zamjenjuje ograničenja prethodnog izvještaja 4.1 koja su se odnosila na nedostajuća
polja i zadržanu karticu kolekcije.

## Dopuna: lokalna migracija završena 26.10.2026.

Primijenjena je samo `20261026193000_portfolio_profile_fields`, nakon izričitog
uslovnog odobrenja i uspješnog backupa/restore testa. Vraćanje je provjereno
SHA-256 poređenjem svih starih kolona i redova u 23 tabele. Migracija je prvo
primijenjena na tu kopiju. Poslije primjene na radnu lokalnu bazu ponovo su
provjerene sve poslovne tabele prema manifestu prije migracije.

Nove kolone su nullable i poslije migracije prazne. Sačuvano je 76 umjetnika,
1106 izvornih radova, 25 portfolio projekata i 231 portfolio rad. Provjereno je
čitanje cijelog Artist/PortfolioProject zapisa kroz stvarni postojeći Prisma
klijent, u read-only transakciji. Prethodna neusklađenost lokalne baze i aktivne
šeme više ne postoji za ova polja. Ovo nije tvrdnja o stanju udaljenih baza.

Backup i privatni manifest su u `.backups/20261026_3dbea7e0a274/`; direktorijum
je isključen iz Gita. Migracija Kolekcija nije primijenjena na radnu bazu.
