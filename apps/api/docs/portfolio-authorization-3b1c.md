# Faza 3B.1c — analiza i Grupa A; Grupa B čeka odobrenje

**Cijela Faza 3B.1c nije završena.** Implementirana je samo Grupa A. Postojeći Guest
editor privremeno i dalje kreira trajni projekat dok se zasebno ne odobri i uvede Grupa B.
Nije uveden Guest edit token niti guestEditTokenHash. Novi publicShareToken služi isključivo
izričitom javnom pregledu portfolija vlasnika naloga i ne autorizuje uređivanje.

## Analiza Guest toka prije izmjena

Read-only provjera: 24 projekta, 22 sa artistAccountId, dva Guest projekta bez vlasničkog naloga.
Nijedan projekat nije imao publicShareToken. Postojeća ArtistAccount relacija je dovoljna za vlasništvo.

1. Landing vodi na `/portfolio-builder/new`; GuestPortfolioBuilderForm šalje ime i email na
   `POST /portfolio-projects/guest`. Backend odmah kreira PortfolioProject sa source=GUEST i paymentStatus=REQUIRED.
2. Browser otvara `/portfolio-builder/:id`. Server dohvaća projekat po UUID-u.
3. Editor čuva forme PATCH zahtjevom; izbor i metapodaci radova se upisuju odvojenim PATCH zahtjevima.
   Nema posebnog prolaznog adaptera. Lokalni React state je radna kopija već sačuvanog projekta.
4. Upload radova, profilne slike i naslovnice zahtijeva postojeći projekat, uploaduje u R2 i čuva putanje u bazi.
5. Detaljni preview učitava zapis i koristi backend PDF generator sa watermarkom. Ne pravi PDF verziju.
6. Clean export provjerava plaćanje/Premium pristup, uploaduje generisani PDF u R2, kreira PortfolioVersion
   i čuva latestPdfUrl/latestPdfStoragePath. Download čita te sačuvane podatke.
7. Demo plaćanje kreira PortfolioPayment vezan obaveznim FK-om za projekat i označava ga kao plaćenog.
   Nije stvarni platni procesor. Nema implementiranog preuzimanja Guest projekta nakon prijave/registracije.
8. Guest nema listu projekata na landing stranici, ali UUID trenutno omogućava ponovno otvaranje njegovog projekta.

Zato samo uklanjanje POST guest ili zahtijevanje login-a na svim starim rutama prekida postojeći Guest tok.
Te izmjene pripadaju Grupi B, a ne nezavisnoj sigurnosnoj ispravci Grupe A.

## Matrica backend ruta

Sve putanje u prvoj tabeli imaju prefiks `/portfolio-projects`.

| Metoda i ruta | Prije | Grupa A |
| --- | --- | --- |
| POST guest | Javno trajno kreiranje | Privremeno ostaje zbog zavisnosti Guest editora; uklanja se u B |
| GET public/:id | UUID daje cijeli zapis | Za projekat sa nalogom: validna artist sesija + odgovarajući artistAccountId |
| PATCH public/:id | UUID daje pravo upisa | Ista provjera prije upisa; DTO ne dopušta vlasnička polja |
| PATCH public/:id/artworks/:artworkId | Provjera samo da rad pripada projektu | Prvo vlasništvo projekta, zatim pripadnost rada |
| POST public/:id/artworks/upload | Samo postojanje projekta | Provjera vlasništva prije storagea i promjena |
| POST public/:id/profile-image | Samo postojanje projekta | Provjera vlasništva prije storagea i promjena |
| POST public/:id/collection-cover | Samo postojanje projekta | Provjera vlasništva prije storagea i promjena |
| POST public/:id/demo-payment | UUID može mijenjati plaćanje | Provjera vlasništva prije transakcije; poslovna demo pravila sačuvana |
| POST public/:id/generate-pdf | Samo pravo na čist PDF | Provjera vlasništva pa postojeće Free/Premium/paid pravilo |
| GET public/:id/preview-pdf | Javno po UUID-u | Vlasnik za privatni projekat; sačuvan postojeći watermark |
| GET public/:id/cover-test-pdf | Javno po UUID-u | Vlasnik za privatni projekat |
| POST from-profile | ArtistAuthGuard; vlasnik iz sesije | Sačuvano |
| GET me | ArtistAuthGuard; filter po nalogu | Sačuvano; no-store |
| GET me/:id | ArtistAuthGuard; 403 za tuđi | Sačuvana provjera; generički 404 za tuđi zapis |
| DELETE me/:id | ArtistAuthGuard; provjera vlasnika | Vlasnik uključen i u uslov brisanja; R2 brisanje ostaje odloženo |
| POST me/:id/share | Nije postojala | ArtistAuthGuard; samo vlasnik eksplicitno objavljuje read-only token |
| GET shared/:token/preview-pdf | Nije postojala | Javni watermark PDF samo za jak objavljeni token; bez JSON-a, plaćanja, verzija ili upisa |

Za svaki legacy public/:id ulaz opcioni guard provjerava token ako je poslat. Servis zatim:
za projekat sa artistAccountId zahtijeva validan nalog i poredi ga sa vlasnikom; anoniman zahtjev dobija 401,
tuđi projekat generički 404. Projekat profila sa izgubljenim nalogom ne postaje javni Guest projekat.
Samo postojeći oblik ownerless source=GUEST ostaje privremeni izuzetak do Grupe B.
Ne smije se predstavljati kao konačna Guest autorizacija.

| Admin ruta | Zaštita |
| --- | --- |
| GET /admin/portfolio-projects | Postojeći AdminAuthGuard |
| GET /admin/portfolio-projects/:id | Postojeći AdminAuthGuard |
| POST /admin/portfolio-projects/:id/generate-pdf | Postojeći AdminAuthGuard; postojeći admin review pristup |
| GET /admin/portfolio-projects/:id/preview-pdf | AdminAuthGuard; zaseban watermark pregled bez prava uređivanja kroz artist rute |

## Matrica Next.js putanja

| Putanja | Namjena i provjera |
| --- | --- |
| /portfolio-builder | Landing i postojeća lista samo prijavljenog naloga |
| /portfolio-builder/new | Postojeća Guest forma, privremeno nepromijenjena |
| /portfolio-builder/:id | Server prosljeđuje artist cookie token; privatni tuđi zapis daje 404 |
| /portfolio-builder/:id/preview | Isti vlasnički pristup; admin može zasebno pregledati kroz admin API |
| /portfolio-builder/:id/payment | Vlasnička provjera prije prikazivanja privatnih podataka |
| /portfolio-builder/:id/download | Vlasnička provjera pa postojeća provjera clean PDF prava |
| /api/artist/portfolio-projects | Postojeći cookie -> Bearer posrednik za listu |
| /api/artist/portfolio-projects/from-profile | Postojeći posrednik za kreiranje na sesijskom nalogu |
| /api/artist/portfolio-projects/:id | Postojeći posrednik za DELETE; backend provjerava vlasnika |
| /api/admin/portfolios/:id/generate-pdf | Postojeći admin cookie posrednik |
| /api/portfolio-projects/:id | Novi ograničeni GET/PATCH posrednik, cookie -> Bearer |
| /api/portfolio-projects/:id/actions/...operation | Tačno navedene operacije, validacija ID-a i porijekla upisa; nema slobodnog proxyja |
| /api/portfolio-projects/:id/pdf | Prosljeđuje sesiju prije previewa ili provjere pristupa čistom fajlu; ne šalje Bearer storageu |
| /portfolio-builder/share/:token | Zaseban javni pregled bez editor/payment kontrola |
| /api/portfolio-shares/:token/pdf | Samo javni watermark PDF; UUID nije dovoljan |

Browser nikada ne dobija sesijski token. Nepouzdani Authorization iz browser zahtjeva se ne prosljeđuje.
Nazivi starih backend public ruta ostaju radi kompatibilnosti, ali više ne znače da su projekti naloga javni.
Ranije kopirani UUID linkovi privatnih projekata sada zahtijevaju vlasnika. Novo kopiranje linka vlasnika
objavljuje zaseban publicShareToken u postojećoj koloni. To je namjerna promjena prava pristupa.
Izgled editora i PDF renderer nijesu mijenjani; u editoru je izmijenjen samo handler dijeljenja.

## Grupa B — plan za zasebno odobrenje

Procjena: značajna promjena toka kroz editor, slike, PDF i postojeće Guest plaćanje. Nije migracija baze
sama po sebi, ali nije bezbjedna kao jednostavno uklanjanje jednog endpointa. Podijeliti u male korake:

1. **Prolazni adapter editora — srednja složenost.** Novi Guest editor kreira dokument u React memoriji,
   bez POST guest, bez PortfolioProject ID-a i bez localStorage/IndexedDB čuvanja dokumenta. Isti UI koristi
   memorijske operacije za unos, izbor i redosljed. Slike ostaju File/Blob objekti u tabu. Nema trajnog
   drafta, liste, ponovnog otvaranja ni Guest edit tokena. Potrebna je jasna poruka da se rad gubi po zatvaranju.
2. **Stateless PDF zahtjev — veća složenost.** Multipart zahtjev šalje validirani dokument i bajtove slika
   direktno u obradu; ne kreira projekat, PDF verziju, plaćanje, R2 objekte ili fajlove na disku. Vraća PDF
   u istom odgovoru. Nema server sesije ili tokena za ponovno otvaranje. Renderer dobija request-scoped
   izvor slika u memoriji, bez proizvoljnih URL-ova i bez zajedničkog globalnog stanja između korisnika.
   Geometrija i izgled postojećih PDF šablona ostaju isti. Ova izmjena render ulaza zahtijeva odobrenje.
3. **Ograničenja obrade — srednja složenost.** Stroga šema polja i enum vrijednosti, postojeći broj radova,
   provjera stvarnog formata slike, ograničenje pojedinačne i ukupne veličine, dimenzija i broja piksela,
   vremenski limit i limit istovremenih rendera. Rate limit treba definisati uz stvarnu proxy/deployment
   konfiguraciju; limit po procesu nije pouzdana globalna zaštita više instanci. Predloženi zbirni limit
   i ponašanje pri prekoračenju treba odobriti prije implementacije. Nema mrežnog preuzimanja slika iz zahtjeva.
4. **Guest clean export/plaćanje — odluka prije implementacije.** Trenutni Guest može demo plaćanjem dobiti
   clean PDF; ta logika zahtijeva PortfolioPayment.portfolioId. Ne smije se samo prenijeti u anoniman stateless
   endpoint niti dodati prividna provjera u browseru. Najmanji predlog je Guest watermark preview i preuzimanje
   tog istog previewa; za clean export korisnik prelazi na autentifikovani tok. To mijenja sadašnji Guest
   put naplate i zahtijeva izričito odobrenje. Ako se zadržava jednokratni export bez naloga, potrebno je prvo
   posebno projektovati stvarnu naplatu i dokaz prava; ne uvoditi novi Guest token sistem u ovoj podfazi.
   Free/Premium pravila ostaju netaknuta.
5. **Prelazak na nalog — opciona zasebna cjelina.** Trenutno ne postoji. Ako se traži čuvanje sadržaja iz
   otvorenog Guest taba poslije prijave, korisnik eksplicitno uvozi memorijski dokument; novi projekat se
   kreira isključivo na vlasniku iz sesije, bez preuzimanja bilo kog starog Guest UUID-a.
6. **Prebacivanje — poslije testova.** Zamijeniti Guest ulaz, ukinuti trajni POST guest i odbiti pristup
   starim ownerless Guest draftovima kroz stare javne rute. Dva postojeća testna zapisa ostaju u bazi do
   zasebno odobrenog čišćenja. Tek tada se uklanja prelazni anonimni izuzetak Grupe A.

Testovi prihvatanja B: rad kroz sve dozvoljene Guest korake bez upisa u bazu/R2, gubitak stanja nakon novog
otvaranja, nedostupnost starog UUID-a, 410/odbijanje starog POST guest, odbijanje ownership/storage/URL polja,
odbacivanje prevelikih/neispravnih slika i dokumenata, ograničenje rendera, paralelni dokumenti bez miješanja
podataka, prekid obrade bez trajnih objekata, regresije Free/Premium čuvanja/otvaranja/naplate i poređenje
PDF izgleda sa postojećim šablonima. Ti testovi još nijesu implementirani niti proglašeni prolaznim.

## Provjere Grupe A i ograničenja

API testovi pokrivaju sve stare ulaze, anonimnog i tuđeg korisnika, vlasničke upise, radove, upload,
plaćanje, PDF prava, eksplicitno dijeljenje i odvojeni admin pregled. Renderer/storage i baza su izolovane
zamjene; nema testnih upisa u stvarnu bazu ili R2. Web testovi pokrivaju sesiju u posrednicima, download
uslove, neprosljeđivanje kredencijala storageu i server-side otvaranje projekta.

Rezultat: 17/17 novih API testova, 12/12 web testova pristupa i 32/32 regresiona testa iz 3B.1b prolaze.
API i web TypeScript provjere prolaze. B testovi o zabrani trajnog Guest kreiranja još nijesu primjenjivi:
novi Guest tok nije implementiran. Test prelaznog ponašanja eksplicitno potvrđuje da stari Guest upis
još postoji, umjesto da ga pogrešno predstavi kao završen zahtjev.

```powershell
node apps/api/test/portfolio-authorization.test.cjs
node apps/web/test/portfolio-access.test.cjs
node apps/api/test/artworks.patch.test.cjs
node node_modules/typescript/bin/tsc -p apps/api/tsconfig.build.json --noEmit --incremental false
node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false
```

Poznati preostali rizici: prelazni Guest trajni upisi/ponovno otvaranje do B; postojeći demo payment nije
stvarna naplata; ranije izdate javne R2 URL adrese ne mogu se opozvati samo API guardom; javni share PDF
render zahtijeva operativno ograničenje zloupotrebe. Fizičko brisanje R2 ostaje isključeno kao u 3B.1b.

## Tačan obuhvat izmjena ove podfaze

- apps/api/src/modules/portfolio-projects/portfolio-access.guard.ts
- apps/api/src/modules/portfolio-projects/portfolio-projects.module.ts
- apps/api/src/modules/portfolio-projects/portfolio-projects.controller.ts
- apps/api/src/modules/portfolio-projects/portfolio-projects.service.ts
- apps/api/src/modules/portfolio-projects/admin-portfolio-projects.controller.ts
- apps/api/test/portfolio-authorization.test.cjs
- apps/api/test/artworks.patch.test.cjs (preciziran postojeći Guest fixture za regresioni test)
- apps/api/docs/portfolio-authorization-3b1c.md
- apps/web/lib/portfolio-proxy.ts
- apps/web/lib/portfolio-project-access.ts
- apps/web/services/portfolio-projects.ts
- apps/web/components/portfolio-builder-editor-shell.tsx (samo funkcija dijeljenja, bez promjene rasporeda/stilova)
- apps/web/app/portfolio-builder/[id]/page.tsx
- apps/web/app/portfolio-builder/[id]/preview/page.tsx
- apps/web/app/portfolio-builder/[id]/payment/page.tsx
- apps/web/app/portfolio-builder/[id]/download/page.tsx
- apps/web/app/portfolio-builder/share/[token]/page.tsx
- apps/web/app/api/portfolio-projects/[id]/route.ts
- apps/web/app/api/portfolio-projects/[id]/actions/[...operation]/route.ts
- apps/web/app/api/portfolio-projects/[id]/pdf/route.ts
- apps/web/app/api/portfolio-shares/[token]/pdf/route.ts
- apps/web/test/portfolio-access.test.cjs
