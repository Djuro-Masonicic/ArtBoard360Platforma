# Produkciono generisanje fajlova — 2. novembar 2026.

## Potvrđeno stanje

- Generator, QR vizit karta i Portfolio PDF koriste isti privatni R2 bucket,
  preko `R2_PRIVATE_PDF_BUCKET_NAME`. Vrijednost mora biti različita od
  `R2_BUCKET_NAME`, koji sadrži javne originalne slike.
- Početna provjera dostupnim R2 ključevima pronašla je samo
  `artboard-platform`. Nakon posebnog odobrenja korisnika kreiran je zaseban
  `artboard-platform-private`. Jedan mali dijagnostički tekst bez korisničkih
  podataka uspješno je upisan i pročitan; postojeći objekti nijesu mijenjani
  ili brisani. Javni pristup nije uključivan.
- Lokalni Chrome uspješno pravi PNG i potrebni Alcyone fontovi postoje.
  Dostupnost Chrome-a u produkcionom kontejneru nije potvrđena bez pristupa
  Railway runtime-u.
- Mock plaćanje ne mijenja ove uslove dostupnosti izvoza.

## Pripremljeni kod

`railpack.json` dodaje `chromium` runtime paketu i zadržava automatske
pakete pomoću `...`. Runtime varijabla `R2_PRIVATE_PDF_BUCKET_NAME` pokazuje
na odobreni i provjereni privatni bucket. Ne mijenja build/start komande ili
varijable baze. Platforma i dalje može eksplicitno postaviti svoj naziv bucketa.
Ako API već koristi `apps/api/Dockerfile`, taj fajl instalira Chromium i
postavlja isti naziv privatnog bucketa;
Railpack konfiguracija pokriva alternativni podrazumijevani Railway builder.
Reference: [Railpack paketi](https://railpack.com/guides/installing-packages/),
[konfiguracija](https://railpack.com/config/file/).

Novi read-only dijagnostički alat koristi istu detekciju Chrome-a kao
Generator. Provjerava privatni bucket preko `HeadBucket`, pokretanje
stvarnog Chromiuma, PNG u memoriji i potrebne fontove. Ne otvara bazu,
ne upisuje u R2 i ne prikazuje ključeve ili connection stringove.

Lokalno:

```powershell
npm run exports:check --workspace @artboard/api
```

Unutar produkcionog API kontejnera, poslije builda:

```sh
npm run exports:check:railway --workspace @artboard/api
```

Izlazni kod je 0 samo kada su svi produkcioni uslovi ispunjeni. Početna
lokalna provjera bez varijable daje `privateStorage.configured=false`,
`renderReady=true` i `fontsReady=true`; očekivano završava kodom 1.
Lokalni `.env` nije mijenjan; provjera sa novim bucketom koristi varijablu
procesa, kao što je dobija produkcioni kontejner.
Ta provjera nakon kreiranja bucketa prolazi kodom 0: sva tri `ready` polja
su `true`, privatni bucket je dostupan, Chromium pravi PNG i fontovi postoje.

## Preostala konfiguracija

Pripremljen je konkretan plan za zaseban bucket
`artboard-platform-private`, bez javnog domena i bez `r2.dev` pristupa.
[Cloudflare dokumentacija](https://developers.cloudflare.com/r2/buckets/public-buckets/)
navodi da su novi bucketi podrazumijevano privatni. Skripta ne uključuje
javni pristup. Jedan mali dijagnostički tekst bez korisničkih podataka
provjerio bi pisanje i čitanje. Nema brisanja postojećih objekata.

Automatska provjera odobrenja prvobitno je odbila kreiranje bucketa i
dijagnostički upis bez izričitog odobrenja. Korisnik je zatim odobrio
kreiranje i provjeru; odobrene operacije su uspješno izvršene.

Deployment konfiguracija sada postavlja:

```text
R2_PRIVATE_PDF_BUCKET_NAME=artboard-platform-private
```

Postojeći lokalni R2 token uspješno je pisao i čitao taj bucket. Produkcioni
token mora imati iste read/write dozvole. Privatni
bucket ne dobija javni URL; isporuka ostaje kroz postojeće provjere
vlasnika i ograničene delivery grantove. Vrijednost dolazi iz Railpack/Docker
runtime konfiguracije, bez pisanja tajni u Git. Pronađena Railway integracija
još nije povezana, a lokalni Railway CLI nije prijavljen.

Poslije redeploya prvo izvršiti dijagnostiku u API kontejneru, zatim
generisati i preuzeti PDF, QR PDF/PNG i Generator PNG sa testnim nalogom.
Potrebno je provjeriti istoriju i kvote, a ne samo ukloniti poruku u UI-ju.
Rad nije završen dok ove produkcione provjere ne prođu.

## Lokalne provjere

- API build prolazi.
- Stvarni lokalni Chromium uspješno generiše PNG u memoriji.
- 25/25 Generator API regresija prolazi na izolovanoj bazi i storageu.
- 43/43 QR i portfolio commerce API regresije prolaze na izolovanim bazama
  i storageu. Ukupno 68/68 API regresija; produkcioni korisnički zapisi nijesu
  korišćeni za automatizovane testove.
- Railpack konfiguracija validirana je prema zvaničnoj JSON šemi.
- Nema novih Prisma modela, migracija, izmjena poslovnih podataka ili
  fizičkog brisanja R2 objekata.
