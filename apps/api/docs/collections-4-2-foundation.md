# Faza 4.2 — početni implementacioni paket

Datum: 26.10.2026. Ovaj paket završava migracionu pripremu Podataka i izolovano
provjerava model Kolekcija. Ne predstavlja završenu funkcionalnost Kolekcija.

## Podaci: backup, vraćanje i lokalna primjena

- Lokalna baza: `localhost:5433/artboard_platforma`.
- Backup: `.backups/20261026_3dbea7e0a274/before-profile-fields.dump`.
- Privatna provjera: `.backups/20261026_3dbea7e0a274/verification.json`.
- Vraćena baza: `artboard_restore_20261026_3dbea7e0a274`.
- Backup je napravljen pomoću PostgreSQL 16 `pg_dump --format=custom`.
  Dump i manifest redova koriste isti izvezeni, dosljedni DB snapshot.
- U novu bazu je vraćen arhivski fajl kopiran na host; provjereni su brojevi
  redova i SHA-256 svih postojećih kolona u svih 23 tabela.
- `20261026193000_portfolio_profile_fields` prvo je primijenjena na vraćenu
  bazu. Poslovne vrijednosti su upoređene sa originalnim manifestom.
- Tek nakon uspjeha primijenjena je na radnu lokalnu bazu. Skripta je prije
  primjene odbila mogućnost bilo koje druge pending migracije i provjerila
  da podaci nijesu promijenjeni od backupa.
- Ponovljeno je poređenje svih 22 poslovne tabele, izuzimajući istoriju migracija
  kojoj Prisma legitimno dodaje novi zapis. Svih šest novih kolona su NULL.
- Provjereno je čitanje punih zapisa Artist/PortfolioProject kroz aktivni
  Prisma klijent u read-only transakciji.
- Završni `prisma migrate diff --exit-code` potvrđuje da radna baza odgovara
  aktivnoj šemi, a izolovana kolekcijska baza odgovara šemi prijedloga.
- Ostalo je 76 umjetnika, 1106 izvornih radova, 25 projekata i 231 portfolio rad.

Skripta `apps/api/scripts/verify-portfolio-profile-migration.cjs` je lokalna,
ručno pokretana procedura, a ne startup/deploy hook. Bez `--apply-local` radi
samo backup, vraćanje i migraciju izolovane kopije. Odobrava isključivo navedenu
pending migraciju na tačno provjerenom lokalnom cilju. Poslije uspješne primjene
ne treba je ponavljati: preflight odbija cilj na kom je migracija već evidentirana.
Skripta ne briše backup, kontejnere, baze ili storage objekte.

## Kolekcije: izolovana osnova

Fajlovi su u `apps/api/prisma/proposals/collections-v2/`:

- `schema.prisma`: validiran model sa ArtistCollection/PortfolioCollection,
  njihovim vezama, izborom, lokalnim redosljedom, baseline podacima i revizijom.
- `migration.sql`: SQL generisan Prisma poređenjem dvije datoteke šeme.
- `baseline.json`: SHA-256 aktivne šeme radi otkrivanja zastarjelog prijedloga.
- `README.md`: ograničenja, integritet i postupak kasnijeg aktiviranja.

Prijedlog nije uključen u `prisma.config.ts`, aktivni generisani klijent ili
redovni direktorijum migracija. Redovan deploy ga ne može slučajno primijeniti.
Radna baza nema ArtistCollection/PortfolioCollection tabele. Aktivna šema,
editor, adapteri i PDF generator nijesu mijenjani u ovom paketu.

Test `apps/api/test/collections-migration.test.cjs` pravi zasebnu bazu iz
provjerenog restorea i migraciju Kolekcija izvršava samo na toj kopiji.
Uspješan prolaz: `artboard_collections_test_63335fa9c31348728cce7fd1f07ee39d`.
Rezultati: `.tmp/collections-4-2/migration-results.json`.

**20/20 stvarnih PostgreSQL testova** obuhvata očuvanje starih podataka,
lokalne/izvorne kolekcije, složene FK granice umjetnika/projekta, jedinstvenost,
opcione izvore, očuvanje ručnih podataka, nezavisna stanja izbora, odvajanje
radova pri uklanjanju kolekcije, brisanje sintetičkog izvora, kaskade,
redosljed i transakcioni rollback. Dva testa koriste paralelne konekcije i
provjeravaju stvarno čekanje na DB zaključavanje: dupli import i reviziju.

Ovo su testovi DB integriteta i transakcionih mehanizama, ne testovi još
neimplementiranih kolekcijskih endpointova ili kompletnog korisničkog toka.
Testovi brisanja koriste isključivo nove sintetičke UUID zapise u zasebnoj bazi.
Nijedan postojeći rad, projekat ili fajl u radnoj bazi nije obrisan.

## Regresije i granice

- Postojeći artwork/storage sigurnosni testovi: **32/32**.
- Portfolio autorizacija i polja Podataka: **22/22**.
- Memorijski/backend adapter: **14/14**.
- Next autorizacioni posrednici: **13/13**.
- API i web TypeScript: prolaze (`--noEmit --incremental false`).
- Novi browser test nije pokretan: nije bilo izmjena UI-ja ili njegovog CSS-a.
- Sačuvan je originalni HTML u `apps/web/references/portfolio-kolekcije.html`.
- Free/Premium i stari Guest tokovi nijesu mijenjani. Novi Guest memory ulaz
  ostaje neaktivan.
- Nije bilo R2 kopiranja/brisanja, promjene checkouta, AllSecure ili CV rada.
- Backup, restore i testne baze ostavljeni su sačuvani. Neuspjeli rani pokušaji
  pripreme/testa nijesu automatski čišćeni; završni rezultati navedeni su iznad.

Sljedeći korak je odvojena primjena pregledane kolekcijske migracije uz svjež
backup i implementacija autentifikovanih servisa za izvorne kolekcije. Potom
slijede snapshotovi sa nezavisnim slikama, UI i PDF. Format 2 se ne aktivira
korisnicima prije usklađivanja cijelog toka.

## Tačan spisak fajlova ovog paketa

1. `.gitignore` — isključivanje privatnih lokalnih backupa.
2. `apps/api/scripts/verify-portfolio-profile-migration.cjs` — backup, restore,
   provjera i uslovna lokalna primjena postojeće migracije Podataka.
3. `apps/api/prisma/proposals/collections-v2/schema.prisma` — izolovani model.
4. `apps/api/prisma/proposals/collections-v2/migration.sql` — generisani SQL.
5. `apps/api/prisma/proposals/collections-v2/baseline.json` — otisak aktivne šeme.
6. `apps/api/prisma/proposals/collections-v2/README.md` — ograničenja i postupak.
7. `apps/api/test/collections-migration.test.cjs` — stvarni izolovani DB testovi.
8. `apps/api/docs/portfolio-profile-fields-4-1.md` — ažuriran status migracije.
9. `apps/api/docs/collections-4-2-foundation.md` — ovaj izvještaj.
10. `apps/web/references/portfolio-kolekcije.html` — originalna korisnička referenca.

Backup i privatni manifest su ignorisani lokalni artefakti. Rezultati testova
su pod `.tmp/collections-4-2/`. Postojeće nepovezane izmjene u radnom stablu
nijesu vraćane, prepisivane ili uključivane u ovaj paket.
