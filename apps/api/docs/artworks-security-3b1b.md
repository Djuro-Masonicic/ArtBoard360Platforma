# Faza 3B.1b — izvorni radovi i zadržavanje storage objekata

## Rute

| Ruta | Autorizacija |
| --- | --- |
| `POST /artworks/upload-url` | ArtistAuthGuard; odredište određuje umjetnik iz sesije. |
| `POST /artworks/upload` | ArtistAuthGuard; upload i novi zapis pripadaju umjetniku iz sesije. |
| `POST /artworks` | ArtistAuthGuard; upsert je ograničen sesijskim umjetnikom i URL-om. |
| `POST /artworks/reorder` | ArtistAuthGuard; svi radovi moraju biti vlasništvo sesijskog umjetnika; promjena je transakciona. |
| `PATCH /artworks/:id` | ArtistAuthGuard; čitanje i upis koriste ID rada i sesijski artistId. |
| `DELETE /artworks/:id` | ArtistAuthGuard; čitanje i brisanje koriste ID rada i sesijski artistId. |
| `POST /admin/artworks/upload` | AdminAuthGuard; administrator eksplicitno bira postojeći profil. |

ArtworksController nema GET rute. Javna čitanja profila i radova kroz artists API nijesu mijenjana.
Opcioni artistId ostaje za kompatibilnost klijenata; ako se razlikuje od sesijskog identiteta, zahtjev se odbija.
Administratorski upload je zasebna ruta; admin token ne zaobilazi artist guard.
Postojeći `/upload` alat zahtijeva admin sesiju i šalje multipart preko zaštićenog Next.js posrednika.

## Zašto se fizičko brisanje odlaže

Trenutne veze predstavljene su i storage putanjama i URL-ovima, bez zajedničkog
protokola zaključavanja pri dodavanju reference i brisanju objekta. SELECT prije
DeleteObject nije dovoljan: drugi zahtjev može u međuvremenu dodati referencu.

Najmanja bezbjedna mjera je zadržavanje **svih** kandidata u R2StorageService.deleteFile.
Metoda vraća `{ deleted: false, deferred: true }`, evidentira zadržavanje u logu i ne šalje
nikakav R2 zahtjev. Nema automatskog background brisanja ni trajnog reda zadataka.
Odluka ne zavisi od broja trenutno pronađenih referenci, tipa fajla, prefiksa ili ekstenzije.
Zato štiti URL-only reference, nepoznate putanje i paralelne uvoze.

Pregledane su sve putanje pozivanja deleteFile u API izvoru:

- ArtworksService: uklanjanje izvornog rada i cleanup poslije neuspjelog upisa u bazu.
- PortfolioProjectsService: uklanjanje drafta, neuspjeli upload rada, PDF-a i profilne/naslovne slike.
- ArtistSubmissionsService: cleanup neuspjele prijave i uklanjanje radova iz prijave/odobrenog profila.
- OpportunitiesService: cleanup neuspjelog uploada i uklanjanje naslovnice oglasa.
- ArtistsService.uploadProfileImage: zamjenjuje URL reference, ali već ne uklanja prethodni objekat.

Pregledana relevantna polja:

| Model | Reference |
| --- | --- |
| Artwork | storagePath, imageUrl |
| Artist | profileImageUrl, profileThumbnailUrl, coverImageUrl, thumbnailUrl |
| PortfolioArtwork | storagePath, imageUrl |
| PortfolioProject | profileImageStoragePath/profileImageUrl, collectionCoverStoragePath/collectionCoverUrl, coverImageUrl, latestPdfStoragePath/latestPdfUrl |
| PortfolioVersion | storagePath, pdfUrl |
| ArtistSubmission | portfolioPdfStoragePath/portfolioPdfUrl, profilePhotoStoragePath/profilePhotoUrl, coverPhotoStoragePath/coverPhotoUrl |
| ArtistSubmissionArtwork | storagePath, imageUrl |
| Opportunity | coverImageStoragePath, coverImageUrl |
| Testimonial | avatarUrl |

Ovo nije implementacija prebrojavanja referenci ili garbage collectora. Sve ove reference
su konzervativno zaštićene time što aplikacija trenutno uopšte ne uklanja storage objekte.
Metadata zapisi se i dalje mogu ukloniti kroz dozvoljeni korisnički tok, bez fizičkog brisanja fajla.

## Ograničenja i naredni storage korak

Mogu ostati napušteni uploadovi i PDF-ovi, uz rast potrošnje storagea. Nije obećano njihovo
automatsko uklanjanje. Za buduće čišćenje potrebni su pregledan manifest, normalizacija URL/key
referenci, koordinacija sa svim writerima i aktivnim uvozima, provjera ponavljanja/grešaka i
posebno odobrenje za fizičko brisanje. Sam vremenski period čekanja nije dokaz da objekat više
nije u upotrebi. Ovaj korak ne uvodi kolekcije, izmjenu šeme, migraciju niti fizičke portfolio kopije.

Autorizacija postojećih javnih Portfolio Builder upisnih ruta ostaje zasebna podfaza;
u ovoj podfazi njihova storage brisanja dobijaju istu zaštitu zadržavanjem objekata.

## Provjere

Pokretanje iz korijena repozitorijuma:

```powershell
node apps/api/test/artworks.patch.test.cjs
node apps/web/test/admin-artwork-upload.test.cjs
node node_modules/typescript/bin/tsc -p apps/api/tsconfig.build.json --noEmit --incremental false
node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false
```

API testovi koriste stvarni Nest HTTP tok, guardove, autentifikacioni servis i potpise tokena,
uz izolovanu memorijsku zamjenu baze i storage transporta. Testovi ne učitavaju .env i ne pristupaju
stvarnoj bazi ili R2. Provjereni su tuđi/anonimni pristup, dozvoljeni upisi i brisanja, upload greške,
rollback, dijeljene i URL-only slike, zamjena profilne slike, uklanjanje drafta i paralelno kreiranje
nove reference tokom uklanjanja izvornog zapisa. Posebni testovi pokrivaju admin posrednik.
