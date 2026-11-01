# Odobrena commerce migracija i brisanje portfolija — 27. 10. 2026.

Korisnik je odobrio tačan SQL iz prethodnog izvještaja i izričito dozvolio brisanje svih portfolio zapisa. Operacija je izvršena na lokalnoj radnoj bazi `localhost:5433/artboard_platforma`, schema `public`.

## Primijenjeno

Aktivna migracija: `20261027143000_portfolio_commerce_foundation`. Njen SQL je byte-for-byte jednak odobrenom prijedlogu `prisma/proposals/portfolio-commerce-v1/migration.sql`.

SHA-256 SQL-a: `db3f7cbab1b59564eddb620e8baef04f9ba8bc354629c1ede0ba96b880d03743`.

U aktivnoj Prisma šemi su dodati modeli `PortfolioPurchase`, `PortfolioPaymentEvent`, `PortfolioDeliveryGrant`, `PortfolioQuotaPeriod`, `PortfolioExportUsage`, njihove relacije i opcioni manifest/metapodaci na `PortfolioVersion`. Statusi ostaju SQL TEXT sa odobrenim CHECK ograničenjima; zaštita nepromjenjivog sadržaja/cijene i partial unique index za Free nalaze se u SQL-u. Regenerisani su glavni i kolekcijski Prisma klijent.

Prije operacije je svih 25 postojećih migracija bilo uspješno primijenjeno i Prisma diff je bio prazan. Poslije operacije je primijenjeno svih 26 migracija i Prisma diff je ponovo prazan. Odobreni SQL prvo je primijenjen na obnovljenoj izolovanoj bazi; tek nakon poređenja sa aktivnom šemom primijenjen je na radnu bazu.

## Brisanje

Brisanje je izvršeno direktno u PostgreSQL transakciji, sa zaključavanjem tabela i prethodnom provjerom backupa. Brisani su samo zatečeni `PortfolioProject` ID-jevi; povezani portfolio zapisi uklonjeni su kroz postojeće FK kaskade.

| Zapisi | Prije | Poslije |
|---|---:|---:|
| Portfolio projekti | 27 | 0 |
| Portfolio radovi/snapshotovi | 255 | 0 |
| Portfolio kolekcije/snapshotovi | 3 | 0 |
| PDF verzije | 18 | 0 |
| Portfolio zapisi plaćanja | 3 | 0 |
| Izvorni umjetnici | 76 | 76 |
| Izvorni umjetnički radovi | 1106 | 1106 |
| Izvorne kolekcije umjetnika | 2 | 2 |
| Prijave umjetnika | 6 | 6 |
| Portfolio linkovi u prijavama | 5 | 5 |

Svih 19 tabela van Portfolio Buildera imaju nepromijenjene redove i SHA-256 vrijednosti. Ovo uključuje naloge, pretplate, prijave i javne profile. Novi commerce modeli su prazni. **Nijedan R2 objekat nije obrisan, kopiran ili prepisan.** Stare datoteke ostaju u storageu do zasebno odobrene storage procedure.

## Backup i dokaz vraćanja

Puni PostgreSQL custom-format backup:

`.backups/20261027_commerce_82a896c5c16e/before-commerce-and-portfolio-cleanup.dump`

Backup je vraćen u novu bazu `artboard_commerce_restore_20261027_82a896c5c16e`. Svi redovi i struktura provjereni su prije primjene migracije. Poređenje strukture zanemaruje fizičke ordinalne praznine starih obrisanih kolona, koje `pg_dump` očekivano ne prenosi; nazivi, tipovi, defaulti, ograničenja, indeksi i triggeri se porede.

Puni kontrolni izvještaj, hash backupa, brojevi i hash vrijednosti tabela prije/poslije, migracioni izlazi i obrisani ID-jevi:

`.backups/20261027_commerce_82a896c5c16e/verification.json`

Backup i kontrolni izvještaji su u git-ignored direktorijumu jer sadrže privatne podatke. Izolovana obnovljena baza zadržana je radi provjere; radna baza je prazna u portfolio tabelama.

## Provjere i runtime

- 37/37 integracionih provjera na novim izolovanim bazama prolazi sa regenerisanim klijentima: portfolio/PDF/autorizacija i commerce SQL ograničenja.
- API i web TypeScript prolaze.
- Produkcioni build API-ja i weba prolazi; nije izvršen deploy.
- Direktno čitanje svih novih modela kroz regenerisani Prisma klijent prolazi na radnoj bazi i vraća prazne rezultate.
- Poslije ponovnog pokretanja ponovo su provjereni svi hash-evi 19 neportfolio tabela i prazne portfolio/commerce tabele.
- Lokalni web `http://localhost:3000` i API `http://localhost:4000` ponovo su pokrenuti i odgovaraju HTTP 200. Za vrijeme operacije pauziran je samo prethodno provjereni razvojni proces ovog workspace-a.

## Granica ovog koraka

**Migraciona osnova i modeli su sada aktivni na lokalnoj radnoj bazi.** To ne uključuje automatski aplikacionu implementaciju Guest kupovine, admin evidencije, rezervacije/potrošnje kvota ili bankarske naplate. Njihova logika je naredni funkcionalni paket, nad upravo pripremljenim modelima. AllSecure testni pristup i privatni R2 bucket ostaju ranije navedeni spoljašnji preduslovi. Nema deploya.
