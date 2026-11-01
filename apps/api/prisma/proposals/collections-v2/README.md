# Kolekcije — izolovano provjerena migraciona osnova

**Dopuna Paketa 2:** modeli su preneseni u aktivni `prisma/schema.prisma`, a
transakcioni SQL u `prisma/migrations/20261026213000_artist_portfolio_collections/`.
Migracija i dalje NIJE primijenjena na radnu bazu. Ovaj direktorijum ostaje
istorijski prijedlog Paketa 1. `baseline.prisma` i kompatibilna šema čuvaju
prethodni model; hash iz `baseline.json` sada provjerava kompatibilnu šemu.
Detalji aktivnog koda i njegovog odvojenog Prisma klijenta su u
`apps/api/docs/collections-4-2-package2.md`.

Ovaj direktorijum je priprema koraka 2 Faze 4.2. Nije dio aktivne Prisma šeme
ili direktorijuma automatski primjenjivanih migracija. Novi API/UI i PDF nijesu
implementirani niti aktivirani. `prisma.config.ts` i dalje koristi
`prisma/schema.prisma` i `prisma/migrations`. Opis neaktivnog prijedloga ispod
bilježi stanje pri završetku Paketa 1; za trenutno stanje važi dopuna iznad.

## Model

- `ArtistCollection`: vlasnik, naslov, opciona godina/opis/slika, redosljed.
- `Artwork.artistCollectionId`: najviše jedna izvorna kolekcija; složeni FK
  uključuje `artistId` i odbija vezivanje za kolekciju drugog umjetnika.
- `PortfolioCollection`: nezavisan sadržaj, opciona izvorna veza,
  `isIncluded`, redosljed i verzionisani JSON baseline.
- `PortfolioArtwork.portfolioCollectionId`: složeni FK uključuje `portfolioId`
  i onemogućava vezivanje za kolekciju drugog projekta.
- Jedinstveni parovi portfolio–izvorni rad i portfolio–izvorna kolekcija
  sprječavaju duplikate i pri paralelnim upisima. NULL izvor dopušta lokalni sadržaj.
- Lokalni `collectionOrderIndex` ne mijenja postojeći globalni `orderIndex`.
- `PortfolioProject`: `collectionSchemaVersion` podrazumijevano 1, `revision`
  podrazumijevano 0, nezavisni `includeUncollectedArtworks` i izvorni baseline.
  Format 2 će se uključiti izričito tek nakon završetka cijelog toka.

Složene veze rad–kolekcija koriste `NO ACTION`: brisanje same kolekcije zahtijeva
eksplicitno odvajanje radova u transakciji. Nema automatskog brisanja radova.
Brisanje izvora postavlja opcioni izvorni FK snapshotova na NULL; baseline
zadržava prvobitni identitet. Testirani su i postojeći kaskadni postupci brisanja
cijelog projekta/umjetnika, isključivo na sintetičkim podacima u izolovanoj bazi.

## Provjere

`migration.sql` je generisan poređenjem aktivne šeme i ovog prijedloga pomoću
Prisma 7 `migrate diff`. Dodaje dvije tabele, nova polja, indekse i strane ključeve.
Ne sadrži konverziju postojećih draftova, promjenu njihovih vrijednosti ili R2 rad.
Aktivna šema ostaje ista. `baseline.json` bilježi njen SHA-256; test odbija
prijedlog ako se aktivna šema u međuvremenu promijeni.

Za test treba navesti ime baze čije je vraćanje iz backupa već provjereno:

```powershell
$env:ARTBOARD_COLLECTIONS_RESTORE_DATABASE = 'artboard_restore_20261026_3dbea7e0a274'
node apps/api/test/collections-migration.test.cjs
```

Test pravi novu bazu `artboard_collections_test_<uuid>` iz te kopije. Nikad ne
primjenjuje SQL Kolekcija na radnu bazu. Provjerava SHA-256 svih postojećih
vrijednosti u 23 tabele prije/poslije migracije, ograničenja integriteta,
nezavisnost snapshotova, transakcioni rollback i paralelne upise preko dvije
stvarne PostgreSQL konekcije. Rezultati su u
`.tmp/collections-4-2/migration-results.json`. Testne baze se ne brišu automatski.

Ovi testovi dokazuju ponašanje baze i potrebnih mehanizama. Ne predstavljaju
testove još nepostojećih kolekcijskih API-ja, vlasničke autorizacije u tim
servisima, kopiranja slika, PDF-a ili browser interakcija.

## Prije aktiviranja

1. Zasebno pregledati i odobriti primjenu ove migracije na radnu bazu.
2. Ponovo provjeriti duplikate i napraviti svjež, provjerljiv backup.
3. Prenijeti model u aktivnu šemu, SQL u zasebnu redovnu migraciju i generisati
   aktivni Prisma klijent tek uz usklađenu bazu. Ne zamjenjivati generator
   aktivnog klijenta testnim `output` podešavanjem ovog prijedloga.
   Redovna PostgreSQL migracija mora imati eksplicitnu transakcionu granicu;
   test ove pripreme izvršava generisani SQL unutar BEGIN/COMMIT.
4. Implementirati autentifikovane servise i zaključavanje, uključujući postojeće
   putanje koje mijenjaju članstvo. Sama FK ograničenja ne autorizuju zahtjev.
5. Za sve izmjene formata 2 koristiti provjeru revizije. Nova kolona sama po
   sebi ne štiti stare upisne putanje od izgubljenih izmjena.
6. Implementirati nezavisne fizičke kopije slika prije spremnosti novih snapshotova.
7. Uskladiti editor, PDF i preview prije uključivanja formata 2.

Ne pokretati `migrate dev`, `db push`, reset ili automatsku konverziju starih
projekata kao dio ove pripreme. Fizičko brisanje objekata ostaje isključeno.
