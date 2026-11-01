# Faza 4.2 / Paket 2 — izvorne kolekcije umjetnika

> Istorijski izvje?taj Paketa 2. Aktuelno stanje poslije naknadnog odobrenja pune implementacije i migracije: [Kolekcije ? zavr?ni izvje?taj](./collections-4-2-complete.md).

## Status i granica odobrenja

Kod API-ja i dashboard kontrola je implementiran. Kolekcijski SQL je izvršavan
isključivo na novim izolovanim bazama. **Nije primijenjen na lokalnu radnu bazu
`localhost:5433/artboard_platforma`. Nije bilo deploya.**

Radna baza i dalje završava migracijom
`20261026193000_portfolio_profile_fields`. Nova pending migracija je
`20261026213000_artist_portfolio_collections`. Nema kolekcijskih tabela.
Sačuvano je 76 umjetnika, 1106 izvornih radova, 25 projekata i 231 portfolio rad.
Stvarno čitanje profila sa radovima i portfolija sa radovima/verzijama/plaćanjima
provjereno je kroz postojeći Prisma servis, u read-only transakciji.

`ARTIST_COLLECTIONS_ENABLED` podrazumijevano je false i nije dodavan/uključivan
u radnom `.env` fajlu. Dashboard ima novu sekciju Kolekcije, ali backend vraća
obavještenje da aktiviranje čeka migraciju; nema funkcionalnih upisnih kontrola
dok servis nije dostupan. Upisne rute tada vraćaju 503, nakon autentifikacije.
Ni uključena zastavica ne zaobilazi provjeru prisustva potrebne šeme.

## Model i privremena kompatibilnost

Aktivna Prisma šema sadrži pregledane ArtistCollection/PortfolioCollection
modele i pripadajuća polja, lokalni redosljed, baseline, verziju i reviziju.
Portfolio funkcionalnost tih polja nije uključena u ovom paketu.

Samo dodavanje novih modela u podrazumijevani klijent nije bezbjedno prije
migracije: postojeći SELECT-i mogu tražiti nove kolone, a INSERT-i poslati nove
podrazumijevane vrijednosti. Zato je prelazno rješenje:

- `prisma/compatibility/schema.prisma` je zamrznuti prethodni model. Generiše
  standardni `@prisma/client` koji koriste postojeći servisi.
- Aktivna šema generiše zasebni `.prisma/collections-client`. Njega koristi
  isključivo `CollectionsPrismaService` u novom modulu.
- `npm run prisma:generate --workspace @artboard/api` generiše oba klijenta,
  bez primjene SQL-a. Postojeći Dockerfile već koristi ovu skriptu.
- Standardni `PrismaService` nije mijenjan. Testirana su i stvarna čitanja i
  kreiranja legacy Artist/Artwork/PortfolioProject/PortfolioArtwork zapisa na
  posebnoj bazi koja NEMA kolekcijske kolone.

Ovo je privremena kompatibilnost do zasebno odobrene migracije. Regeneraciju
treba raditi navedenom npm skriptom, koja priprema oba klijenta. Nakon migracije
treba kontrolisano ukloniti kompatibilni sloj i objediniti generisanje.

## Implementirane operacije

Sve rute koriste postojeći `ArtistAuthGuard`. Identitet se uzima iz
`request.artistUser.artistId`; body ne određuje vlasništvo.

| Ruta | Namjena |
| --- | --- |
| `GET /artist/collections` | Privatno stanje kolekcija i postojećih radova, verzija stanja ili obavještenje o nedostupnosti |
| `POST /artist/collections` | Kreiranje kolekcije |
| `PATCH /artist/collections/:id` | Naziv, opis, godina, naslovna slika iz sopstvenih radova ili uklanjanje naslovne slike |
| `PUT /artist/collections/order` | Potpun redosljed kolekcija |
| `PUT /artist/collections/membership` | Dodavanje/premještanje sopstvenih radova ili odvajanje pomoću `collectionId: null` |
| `PUT /artist/collections/:id/artworks/order` | Potpun redosljed članova jedne kolekcije |
| `POST /artist/collections/:id/cover` | Upload posebne naslovne slike |
| `DELETE /artist/collections/:id` | Odvajanje članova i brisanje same kolekcije |

DTO-i odbijaju proizvoljne vlasničke podatke, direktne storage putanje/URL-ove,
neispravne ID-jeve, prazne naslove i duple stavke. Godina podržava i raspon.
Naslovna slika može biti postojeći sopstveni rad ili poseban upload. Prazan
opis/godina briše vrijednost; eksplicitan null naslov nije dozvoljen.

Dashboard koristi postojeće dashboard forme, Alcyone tipografiju i bijele
kartice. Ima kreiranje, uređivanje, izbor/upload slike, strelice redosljeda,
izbor postojećih radova, potvrdu premještanja iz druge kolekcije, odvajanje i
potvrdu brisanja kolekcije. Otkazivanje potvrde ne šalje upisni zahtjev.
Odbijena zastarjela izmjena osvježava serversko stanje, ali zadržava lokalne
nesačuvane unose i ne pokušava automatski ponovni upis.

## Transakcije i paralelni zahtjevi

Svaka izmjena nosi `expectedVersion`, SHA-256 otisak privatnog stanja kolekcija
i radova. On je provjera zastarjelosti, a ne dokaz vlasništva.

Server u jednoj transakciji zaključava umjetnikov zapis, kolekcije i radove
u dosljednom redosljedu, ponovo učitava stanje, provjerava verziju i tek onda
mijenja podatke. Zaključavanje redova radova koordinira se i sa postojećim
artwork UPDATE/DELETE operacijama. Konflikti i isteci zaključavanja odbijaju se
bez djelimičnog upisa; zastarjeli zahtjev dobija 409.

Paralelne izmjene različitih kolekcija istog umjetnika mogu dobiti 409 jer je
verzija na nivou cijelog tog stanja. To je namjerna V1 zaštita; nema tihog
prepisivanja. Potpun redosljed provjerava se prije upisa, bez gubitka izostavljenih
članova. Globalni `Artwork.orderIndex` se ne mijenja kolekcijskim operacijama.

## Slike i brisanje

Brisanje kolekcije u transakciji prvo odvaja njene radove, a zatim briše samo
ArtistCollection zapis. Ne poziva storage delete. Radovi i njihove slike ostaju.
Naslovna slika odabrana iz izvornog rada koristi postojeću sliku tog profila;
to nije novi portfolio snapshot.

Posebni uploadi koriste `artist-collections/:id/cover/...` sa jedinstvenim
ključevima. Provjeravaju se sesija, vlasništvo, verzija, tip/veličina fajla i
ispravnost slike uz ograničenje ulazne rezolucije. Tokom R2 I/O nema otvorene DB
transakcije; prije upisa se ponovo provjerava verzija. Greška storagea ne mijenja
postojeće DB stanje. Ako se stanje promijeni tokom uploada, nova nekorišćena
kopija ostaje sačuvana za kasniju posebno odobrenu proceduru. Nema fizičkog brisanja.

U ovom paketu nije bilo stvarnih R2 operacija: testovi zamjenjuju isključivo
storage transport. Nezavisne slike portfolio snapshotova ostaju naredni paket.

## Testovi

- 21/21 novih API testova sa stvarnim Nest kontrolerom, DTO-ima, guardom,
  autentifikacionim servisom i PostgreSQL bazom.
- 20/20 testova migracije i DB integriteta, uključujući paralelne konekcije.
- 6/6 novih testova Next posrednika: sesija, Origin, metode/putanje, multipart,
  privatno keširanje i nedostupan upstream.
- 81/81 postojećih sigurnosnih i adapterskih testova (32 + 22 + 14 + 13).
- API i web TypeScript prolaze bez emitovanja.
- API produkcioni build prolazi; kompajlirani AppModule učitava oba klijenta.
- Browser provjera koristi izolovani Next produkcioni build, pravi dashboard,
  postojeći Next session helper, HTTP-only cookie sintetičkog naloga i stvarni
  API/DB. R2 transport je zamijenjen; slike u browseru su testni PNG-ovi.
  Završni browser rezultat i snimci su u `.tmp/collections-4-2-package2/`.
- **32/32 browser provjere**, bez runtime grešaka: stvarni save/reload, potvrda
  i otkazivanje premještanja/brisanja, redosljed, upload, zastarjela izmjena,
  očuvanje nesačuvanog unosa, neaktivan servis i odbijanje lažnog headera bez
  sesije. Na 1536, 1440, 1280, 1024, 768, 440, 375 i 320 px provjereni su i
  širina dokumenta i granice svake kartice/kontrole. Screenshotovi su vizuelno
  pregledani. Minimalna `min-w-0` dopuna dashboard aside-a sprječava širenje
  mobilnog grida zbog dugog sluga; globalni i Portfolio Builder CSS nijesu dirani.

API testovi pokrivaju kreiranje/izmjenu, sve anonimne upise, tuđe kolekcije i
radove, podmetnute vlasničke podatke, članstvo, redosljed, odvajanje, brisanje,
paralelne metapodatke i premještanje, zastarjelu potvrdu, saradnju sa legacy
artwork uređivanjem, cover upload/greške i kompatibilnost stare šeme.

Testovi koriste nove `artboard_collections_api_*`, `artboard_collections_compat_*`
i `artboard_collections_test_*` baze iz ranije provjerenog restorea. Sintetički
nalozi/radovi nijesu kreirani u radnoj bazi. Testne baze nijesu brisane.

## Fajlovi ovog paketa

1. `apps/api/prisma/schema.prisma`
2. `apps/api/prisma/compatibility/schema.prisma`
3. `apps/api/prisma/proposals/collections-v2/baseline.prisma`
4. `apps/api/prisma/proposals/collections-v2/README.md`
5. `apps/api/prisma/migrations/20261026213000_artist_portfolio_collections/migration.sql`
6. `apps/api/package.json`
7. `apps/api/src/config/env.ts`
8. `apps/api/src/app.module.ts`
9. `apps/api/src/modules/artist-collections/artist-collections.module.ts`
10. `apps/api/src/modules/artist-collections/artist-collections.controller.ts`
11. `apps/api/src/modules/artist-collections/artist-collections.dto.ts`
12. `apps/api/src/modules/artist-collections/artist-collections.service.ts`
13. `apps/api/src/modules/artist-collections/collections-prisma.service.ts`
14. `apps/api/src/storage/storage.types.ts`
15. `apps/api/src/storage/r2-storage.service.ts`
16. `apps/api/test/collections-migration.test.cjs`
17. `apps/api/test/artist-collections.fixture.cjs`
18. `apps/api/test/artist-collections.api.test.cjs`
19. `apps/web/services/artist-collections.ts`
20. `apps/web/lib/artist-collections-proxy.ts`
21. `apps/web/app/api/artist/collections/[[...operation]]/route.ts`
22. `apps/web/components/artist-collections-editor.tsx`
23. `apps/web/components/artist-collections-editor.module.css`
24. `apps/web/components/artist-dashboard-editor.tsx`
25. `apps/web/test/artist-collections-proxy.test.cjs`
26. `apps/web/test/artist-collections.browser.cjs`
27. `apps/api/docs/collections-4-2-package2.md`

Prisma klijenti su generisani lokalno u ignorisanom node_modules direktorijumu.
Testni buildovi/snimci/rezultati su lokalni artefakti pod `.tmp/`.

## Sačuvana ograničenja i sljedeća kontrolna tačka

SHA-256 potvrđuje da nijesu mijenjani Portfolio Builder editor i njegov CSS,
globalni CSS, PDF generator ili javni profil sa automatskim grupama. Postojeći
Guest adapter i checkout nijesu mijenjani; nema AllSecure ili CV rada.

Za korišćenje novih kolekcija na lokalnoj radnoj bazi neophodni su posebno
odobrenje SQL-a, svjež backup/test vraćanja, primjena samo odobrene migracije i
izričito uključivanje `ARTIST_COLLECTIONS_ENABLED=true`. Ovaj paket ne izvodi
te korake. Ne pokretati `prisma migrate deploy` nad radnom bazom prije odobrenja,
jer sada postoji pripremljena pending kolekcijska migracija.

Konačan SQL za pregled nalazi se u gore navedenom migration.sql. Sadrži dvije
nove tabele, devet novih kolona na postojećim tabelama, osam indeksa i pet FK
veza, u jednoj transakciji. Nema konverzije draftova, uklanjanja kolona ili
brisanja poslovnih podataka. Za dalji paket treba sačekati korisničke instrukcije.

SQL SHA-256: `c70d07abe5c006ba8f667a2872cb0f7619dc0dee50c3292779ee9d010d7f2747`.
Završni read-only `prisma migrate diff` potvrđuje da radna baza odgovara
kompatibilnoj šemi i da razlika aktivnog modela tačno odgovara prethodno
pregledanom SQL-u Kolekcija. Nema dodatnih neplaniranih promjena šeme.

## Kona?an SQL za posebno odobrenje

```sql
-- Package 2: prepared only. Requires separate approval before applying to the working database.
BEGIN;

-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "artistCollectionId" UUID,
ADD COLUMN     "collectionOrderIndex" INTEGER;

-- AlterTable
ALTER TABLE "PortfolioProject" ADD COLUMN     "collectionSchemaVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "includeUncollectedArtworks" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourceProfileBaseline" JSONB;

-- AlterTable
ALTER TABLE "PortfolioArtwork" ADD COLUMN     "collectionOrderIndex" INTEGER,
ADD COLUMN     "portfolioCollectionId" UUID,
ADD COLUMN     "sourceBaseline" JSONB;

-- CreateTable
CREATE TABLE "ArtistCollection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artistId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "year" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "coverImageStoragePath" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioCollection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolioId" UUID NOT NULL,
    "sourceCollectionId" UUID,
    "title" TEXT NOT NULL,
    "year" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "coverImageStoragePath" TEXT,
    "isIncluded" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "sourceBaseline" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistCollection_artistId_orderIndex_idx" ON "ArtistCollection"("artistId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistCollection_id_artistId_key" ON "ArtistCollection"("id", "artistId");

-- CreateIndex
CREATE INDEX "PortfolioCollection_portfolioId_orderIndex_idx" ON "PortfolioCollection"("portfolioId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioCollection_id_portfolioId_key" ON "PortfolioCollection"("id", "portfolioId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioCollection_portfolioId_sourceCollectionId_key" ON "PortfolioCollection"("portfolioId", "sourceCollectionId");

-- CreateIndex
CREATE INDEX "Artwork_artistCollectionId_collectionOrderIndex_idx" ON "Artwork"("artistCollectionId", "collectionOrderIndex");

-- CreateIndex
CREATE INDEX "PortfolioArtwork_portfolioCollectionId_collectionOrderIndex_idx" ON "PortfolioArtwork"("portfolioCollectionId", "collectionOrderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioArtwork_portfolioId_sourceArtworkId_key" ON "PortfolioArtwork"("portfolioId", "sourceArtworkId");

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_artistCollectionId_artistId_fkey" FOREIGN KEY ("artistCollectionId", "artistId") REFERENCES "ArtistCollection"("id", "artistId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PortfolioArtwork" ADD CONSTRAINT "PortfolioArtwork_portfolioCollectionId_portfolioId_fkey" FOREIGN KEY ("portfolioCollectionId", "portfolioId") REFERENCES "PortfolioCollection"("id", "portfolioId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ArtistCollection" ADD CONSTRAINT "ArtistCollection_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioCollection" ADD CONSTRAINT "PortfolioCollection_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "PortfolioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioCollection" ADD CONSTRAINT "PortfolioCollection_sourceCollectionId_fkey" FOREIGN KEY ("sourceCollectionId") REFERENCES "ArtistCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

```
