# Portfolio Builder — Podaci, faza 4.1

Obuhvat je isključivo centralni korak Podaci. Referenca je korisnikov HTML
sačuvan bez izmjena u `../references/portfolio-podaci.html`.

Prije izmjene sačuvane su kopije editora i CSS-a, hash vrijednosti i browser
snimci u `.tmp/portfolio-podaci-4-1`. Zamrznute kopije omogućavaju ponovno
renderovanje početnog stanja u istoj testnoj aplikaciji i sa istim Alcyone
fontom kao produkcioni layout. Referenca je HTML fragment: prikazuje se u istoj
širini centralne kolone, na istom viewportu i sa istim fontom. Nije dostavljen
cijeli interaktivni Artifact sa svim spoljašnjim stilovima ili dostupnim slikama.
Izvorni `blob:` URL-ovi iz Claude sesije nijesu prenosivi; testne slike su lokalni
SVG/PNG podaci.

## Šta se promijenilo

- Profil dobija zasebne, ograničene CSS klase: naslov/opis, karticu, jezik PDF-a,
  polja, discipline, biografiju/iskaz, dvije postojeće slikovne kartice i centralno
  dugme Dalje. Globalni CSS i prethodna CSS pravila ostaju isti.
- Telefon i umjetnički iskaz povezani su sa **postojećim** poljima `phone` i
  `artistStatement`, DTO-om, backend adapterom i memorijskim adapterom. Jezik koristi
  isto stanje `language` kao Dizajn. Nema drugog čuvanja ili posebne Guest rute.
- Postojeći Website, Instagram, discipline i sva polja kolekcije ostaju dostupni.
  Dodavanje/uklanjanje disciplina radi preko postojeće tekstualne reprezentacije.
- Prethodna provjera spremnosti 5/5 ostaje dostupna u sklopivoj sekciji kartice.
- U centralnim kontrolama zadržani su fokus, onemogućena stanja upload dugmadi i
  prikaz greške sa postojećeg API-ja. Sačuvana je navigacija kroz četiri koraka.

## Izmjerene vrijednosti

Viewport 1536 × 900, DPR 1, centralna kolona 795,4375 px. Vrijednosti reference
dobijene su renderovanjem dostavljenog HTML fragmenta u istoj širini.

| Element | Prije | Poslije | Referenca |
| --- | --- | --- | --- |
| Naslov: font / težina | 49,152 px / 900 | 46 px / 800 | 46 px / 800 |
| Naslov: line-height / tracking | 48,169 px / 0 | 50,6 px / −1,84 px | 50,6 px / −1,84 px |
| Opis: font / maksimalna širina | 15 px / 760 px | 15,5 px / 600 px | 15,5 px / 600 px |
| Kartica: padding / radius | 24 px / 22 px | 30 px / 22 px | 30 px / 22 px |
| Prvo polje: širina × visina | 236,469 × 48 px | 233,141 × 46 px | 233,141 × 46 px |
| Tekst polja: font / težina | 11 px / 700 | 14 px / 600 | 14 px / 600 |
| Biografija: početna visina | 210 px | 166,563 px | 166,563 px |
| Profilna slika | 96 × 96 px | 96 × 96 px | 96 × 96 px |
| Postojeći cover | 132 × 196,391 px | 96 × 120 px | 96 × 120 px |
| Dugme za fotografiju | 171,266 × 28 px | 180,266 × 28 px | 180,266 × 28 px |
| Centralno Dalje: visina | 42 px | 38 px | 38 px |

Prva polja imaju jednake x/y pozicije i širine kao referenca na svih osam
testiranih širina. Mreža koristi isti raspored i razmake 16/18 px. Na 375 px
polje je široko 311 px, na 320 px 256 px; mobilni naslov je 30 px. Precizni
rezultati svih elemenata su u `measurements.json`.

## Namjerna odstupanja

- Datum rođenja, poseban Behance, moto i autor citata nijesu dostupni kroz
  postojeći portfolio model/DTO. Nema dekorativnih polja bez čuvanja. Website
  ostaje generički link i nije preimenovan u Behance.
- Biografija zadržava ograničenje od 1200 karaktera, umjesto referentnih 200
  riječi. Iskaz prikazuje stvarni broj riječi; nije uvedeno novo tvrdo ograničenje
  od 60 riječi niti dodatna backend validacija u vizuelnom koraku.
- Postojeći cover kolekcije nije predstavljen kao nezavisna naslovna fotografija
  portfolija. Njegov upload i podaci kolekcije zadržani su u drugoj kartici.
- Ostaju četiri stvarna koraka: 1 od 4 i Dalje: Radovi. Kolekcije i CV nijesu
  uvedeni. Broj disciplina je stvarni broj opcija, umjesto fiksnih 23 iz reference.
- Zbog drugačijeg broja podržanih polja i očuvane provjere spremnosti visina
  glavne kartice nije ista: 785,844 px prema referentnih 927,844 px na desktopu.
  Kartice slika zato počinju 142 px ranije. Druga slikovna kartica ostaje viša
  zbog sačuvanih postojeće tri kontrole kolekcije. Ovo nije tvrdnja da su cijeli
  ekran ili ukupna visina identični Artifactu.
- Svijetla tema mjeri se prema dostavljenim bojama. Za tamnu temu nijesu
  dostavljeni referentni stilovi; zadržana je kompatibilnost sa postojećom temom.

## Pokretanje provjera

```powershell
node apps/web/test/portfolio-profile.browser.cjs --baseline
node apps/web/test/portfolio-profile.browser.cjs
node apps/web/test/guest-portfolio-memory.test.cjs
node apps/web/test/portfolio-access.test.cjs
node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false
```

Prva komanda se koristi prije izmjene, nakon čuvanja zamrznutog editora/CSS-a u
`.tmp/portfolio-podaci-4-1/editor-before.tsx` i `editor-before.module.css`.
U kopiji editora CSS import treba da pokazuje na `./editor-before.module.css`.
Skripta namjerno ne pravi novu kopiju početnog stanja pri naknadnom pokretanju.
Fazni B.1 vizuelni test poredi istorijski izgled prije B.1; za namjerno izmijenjen
korak Podaci sada se koristi ova referenca i test faze 4.1.

Browser test pravi izolovanu Next produkcionu aplikaciju izvan produkcionih ruta,
na portu 3108 (izmjenjiv preko `PORTFOLIO_PROFILE_TEST_PORT`). Free/Premium API je
presretnut i simuliran: provjeravaju se payload, čuvanje i reload, jezik, discipline,
prikaz validacionih grešaka i očuvanje podataka nakon odbijanja. Ovo nije test
pravih naloga/baze niti se pravi takva tvrdnja.

Guest provjere pokrivaju tekst, jezik, slike, live preview, postojeća polja
kolekcije, promjenu koraka, odsustvo upisnih API poziva, čišćenje URL-ova i refresh.
Testira se i tamna tema. Kod headera, sidebara, previewa i drugih koraka provjerava
se poređenjem TypeScript AST-a, a njihova geometrija browser mjerenjima. Nema
runtime grešaka u uspješnom završnom pokretanju.

Završni rezultat: **501/501 browser provjera** na 1536, 1440, 1280, 1024, 768,
440, 375 i 320 px; **12/12** memorijskih/backend adapter testova i **12/12**
portfolio access testova. Web TypeScript (`--noEmit --incremental false`) i
izolovani testni Next produkcioni build prolaze. U Guest scenariju nije bilo
upisnih API poziva ili slanja slika serveru. U repozitorijumu su izmijenjeni samo
editor i njegov CSS, a dodati ovaj izvještaj, browser test i kopija reference.

Backend, Prisma šema, PDF generator, oba adaptera, aktivni Guest ulaz i
`globals.css` imaju iste SHA-256 vrijednosti kao prije koraka. Nema migracija,
čišćenja, brisanja fajlova, stvarnih DB upisa ili R2 operacija. Memorijski Guest
režim i dalje nije aktiviran za korisnike. Implementacija Radova nije započeta.
