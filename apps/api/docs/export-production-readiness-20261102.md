# Produkciono generisanje fajlova — 2. novembar 2026.

## Potvrđeno stanje

- Generator, QR vizit karta i Portfolio PDF koriste isti privatni R2 bucket,
  preko `R2_PRIVATE_PDF_BUCKET_NAME`. Vrijednost mora biti različita od
  `R2_BUCKET_NAME`, koji sadrži javne originalne slike.
- Lokalni `.env` nema privatni bucket. Provjera dostupnim R2 ključevima
  uspješno je pročitala listu bucketa: postoji samo `artboard-platform`.
  Provjera nije čitala korisničke objekte ili mijenjala postojeće fajlove.
- Lokalni Chrome uspješno pravi PNG i potrebni Alcyone fontovi postoje.
  Dostupnost Chrome-a u produkcionom kontejneru nije potvrđena bez pristupa
  Railway runtime-u.
- Mock plaćanje ne mijenja ove uslove dostupnosti izvoza.

## Pripremljeni kod

`railpack.json` dodaje `chromium` runtime paketu i zadržava automatske
pakete pomoću `...`. Ne mijenja build/start komande ili varijable baze.
Ako API već koristi `apps/api/Dockerfile`, taj fajl već instalira Chromium;
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

Izlazni kod je 0 samo kada su svi produkcioni uslovi ispunjeni. Trenutna
lokalna provjera daje `privateStorage.configured=false`, `renderReady=true`
i `fontsReady=true`; očekivano završava kodom 1 zbog privatnog storagea.

## Preostala konfiguracija

Pripremljen je konkretan plan za zaseban bucket
`artboard-platform-private`, bez javnog domena i bez `r2.dev` pristupa.
[Cloudflare dokumentacija](https://developers.cloudflare.com/r2/buckets/public-buckets/)
navodi da su novi bucketi podrazumijevano privatni. Skripta ne uključuje
javni pristup. Jedan mali dijagnostički tekst bez korisničkih podataka
provjerio bi pisanje i čitanje. Nema brisanja postojećih objekata.

Automatska provjera odobrenja odbila je kreiranje bucketa i dijagnostički
upis dok korisnik izričito ne odobri ove eksterne promjene. Zahtjev za
odobrenje je poslat; bucket nije kreiran.

Nakon odobrenog kreiranja i provjere, na Railway API servisu treba podesiti:

```text
R2_PRIVATE_PDF_BUCKET_NAME=artboard-platform-private
```

Postojeći R2 token mora imati read/write dozvole za taj bucket. Privatni
bucket ne dobija javni URL; isporuka ostaje kroz postojeće provjere
vlasnika i ograničene delivery grantove. Git push ne postavlja Railway
varijable. Pronađena Railway integracija još nije povezana, a lokalni
Railway CLI nije prijavljen.

Poslije redeploya prvo izvršiti dijagnostiku u API kontejneru, zatim
generisati i preuzeti PDF, QR PDF/PNG i Generator PNG sa testnim nalogom.
Potrebno je provjeriti istoriju i kvote, a ne samo ukloniti poruku u UI-ju.
Rad nije završen dok ove produkcione provjere ne prođu.

## Lokalne provjere

- API build prolazi.
- Stvarni lokalni Chromium uspješno generiše PNG u memoriji.
- 25/25 Generator API regresija prolazi na izolovanoj bazi i storageu.
- Nema novih Prisma modela, migracija, izmjena poslovnih podataka ili
  fizičkog brisanja R2 objekata.
