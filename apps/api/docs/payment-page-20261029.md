# Stranica Plaćanje — 29. 10. 2026.

## Isporuka

Zajednički prikaz je dostupan preko `/placanje?proizvod=premium`, koji preusmjerava na `/pretplata/placanje?proizvod=premium`. Postojeća `/artist/subscribe` ruta vodi na isti prikaz. Prepoznati ArtBoard prefiks omogućava korišćenje postojećeg layouta, headera, navigacije i footera **bez izmjena tih komponenti**. Cijela stranica koristi postojeći Alcyone i lokalni CSS Module.

Za portfolio se koristi `/pretplata/placanje?proizvod=portfolio&portfolio=<stvarni UUID>` ili `&narudzbina=<UUID pripremljene kupovine>`. Sam UUID ne daje pravo pristupa. Guest iz editora prvo priprema postojeću nepromjenjivu narudžbinu, zatim preko ograničenog HTTP-only pristupa otvara njene detalje plaćanja. Nema novog Guest drafta niti edit tokena.

## Stanja i stvarne integracije

| Stanje | Implementirano | Ograničenje |
| --- | --- | --- |
| Premium | Izbor 8,90 € i svih cijelih iznosa 10–30 €, tačna skala, sinhronizovan rezime, stvarni nalog kada je prijavljen | Aktivacija i promjena iznosa čekaju procesor i serversku evidenciju mjesečnog iznosa |
| Portfolio Free | Stvarni projekat, detalji, nalog i potrošnja iz serverskog ledgera | Ako ima raspoloživu kvotu, prikaz vraća korisnika na postojeći izvoz; ne tvrdi da je besplatan izvoz potrošen |
| Portfolio Guest | Stvarna zamrznuta narudžbina, cijena, e-mail, checkbox, ograničen pristup i postojeći download nakon serverske potvrde | E-mail već pripremljene nepromjenjive narudžbine je zaključan; novo slanje računa/linka e-mailom čeka integraciju |
| Portfolio Premium 5/5 | Stvarni period, broj iskorišćenih izvoza, datum obnove i dodatna kupovina | Premium status nije dokaz sačuvane kartice; nema lažnog reusable payment methoda |
| Generator Free | Zajednička vizuelna varijanta, proizvod i serverski definisana cijena seta | Generator ruta, saldo i ledger još ne postoje; prikaz to izričito kaže i ne izmišlja potrošnju |
| Generator Premium 10/10 | Ista zajednička komponenta podržava Premium prikaz i potvrdu sa validnim provider metodom | U produkciji ne prikazuje izmišljeni 10/10 limit ili karticu. Oba proširena stanja testirana su vizuelnim fixture podacima samo u izolovanom testnom app-u |

Način plaćanja podržava prikaz provjerenog sačuvanog metoda u zajedničkoj komponenti. Postojeći backend takav dokaz ne posjeduje i trenutno vraća `paymentMethod: null`, pa se ne prikazuje lažna potvrda kartice.

AllSecure još nije integrisan. Kartična polja su **onemogućeni vizuelni slotovi**, bez prihvatanja PAN/CVC podataka. CTA naplate je jasno onemogućen, uz poruku da ništa nije naplaćeno. Nova stranica nikada ne poziva stari demo checkout i ne dodjeljuje Premium, PDF ili Generator prava na osnovu browsera.

## Cijene i bezbjednost

Korisnik je posebno odobrio promjenu novih Guest kupovina sa **890 na 490 centi**. Serverski cjenovnik je zajednički za pripremu novih narudžbina i prikaz cijene. Postojeće narudžbine nijesu prepisivane: prikaz i ponovljeni zahtjevi koriste njihov originalni `amountCents`. DB zaštita nepromjenjivosti cijene ostaje aktivna.

- Novi read-only endpointi: `GET /portfolio-commerce/checkout-catalog`, `checkout-public`, `checkout-context` i `purchases/:id/checkout-context`.
- Vlasnički kontekst koristi `ArtistAuthGuard`, identitet iz sesije i provjeru vlasništva nad projektom. Query parametri za vlasnika/plan/cijenu se odbijaju.
- Guest detalji narudžbine zahtijevaju postojeći delivery grant; proxy šalje tajnu iz postojeće usko ograničene HTTP-only cookie putanje. Opoziv i istek važe i za novi prikaz.
- Prikazuju se samo potrebni detalji proizvoda, naloga i cijene; kompletan snapshot i tajna nijesu dio checkout odgovora.
- Postojeća provjera iznosa/valute, idempotentnost payment događaja i privatno PDF preuzimanje ostaju aktivni.
- Nove rute ne pokreću naplatu ili upise. Guest email/consent validacija je dio forme; prije buduće stvarne naplate treba dodati i serversku evidenciju prihvatanja uslova vezanu za narudžbinu.

## Vizuelne provjere i odstupanja

Na 1536 px kontejner je 1180 px, kolone su po **570 px**, gap **40 px**, CTA **494 × 38 px**, a datum/CVC po **241 × 46 px**. Slider koristi šest tick pozicija 0/20/40/60/80/100%, korekciju ručice od 26 px i sve dozvoljene međuvrijednosti. Provjereni su tastatura, Home/End, klik, pointer drag i stvarni touchscreen tap. Izbor se ne resetuje pri drugim interakcijama.

Mobilni raspored koristi jednu kolonu, padding kartica 24 px i zadržava datum/CVC u istom redu. Na 440 px lokalni layout skriva scrollbar, pa je kartica 400 px, a unutrašnji prostor 352 px. U izvornom mjerenju je stvarni prostor bio približno 425 px pri 440 px prozoru; nijesu mijenjani globalni scrollbar stilovi radi te razlike.

Originalni HTML sadrži samo kompletan Premium ekran, pa je za ostalih pet stanja korišćen zajednički raspored i eksplicitna tekstualna specifikacija. Nema demo prekidača ili Claude watermarka u produkcionom prikazu.

Pri poređenju Premium ekrana za iznos 17 € u istom font/layout kontekstu: H1 ima isti font i visinu, kartice istu širinu, lijeva kartica se razlikuje oko 1 px; početak grida oko 0,375 px. Desna kartica ima dodatnu vidljivu poruku o nedostupnoj naplati, pa joj je visina veća od referentne. Primijenjena su izričita tekstualna pravila **input 46 px** i **CTA font 12,5 px**; dostavljeni raw HTML u ovom kontekstu daje input 50,5 px i CTA font 15 px. Ne tvrdi se potpuna identičnost tih međusobno različitih izvora.

Povratak iz Generator varijante trenutno vodi na postojeći `/nalog`, sa jasnom napomenom, jer `/nalog/alati/promo` ne postoji. Pravni linkovi koriste postojeći `/uslovi-koriscenja` i njegov odjeljak privatnosti, umjesto nepostojećeg `/pravila`.

## Testovi

- **81/81 API regresioni test**: novi payment kontekst, promjena cijene, stara nepromjenjiva narudžbina, vlasništvo, delivery grant, stvarne kvote, verifikovani/ponovljeni/neuspješni događaji, postojeći commerce, kolekcije i memorijski editor. Izolovane PostgreSQL baze i lažni storage.
- **4/4 unit testa**: sva dozvoljena stanja slidera, procenti, format cijene i istinit prikaz potrošnje.
- **25/25 payment browser provjera**: šest vizuelnih varijanti na desktopu i mobilnom, dodatne širine 390/360/320 px, par polja, e-mail/checkbox validacija, kartica po stvarnoj dostupnosti, slider/touch i odsustvo naplatnih zahtjeva/runtime grešaka.
- **47/47 commerce browser provjera**: stvarni Guest editor → narudžbina po cijeni 4,90 € → detalji plaćanja preko scoped cookie-ja → status i provjerena PDF isporuka; postojeći Free/Premium tokovi ostaju funkcionalni.
- **3 lokalne read-only smoke provjere**: stvarne rute/preusmjerenja, zajednički header/footer i mobilni prikaz.
- API/web TypeScript i izolovani Next build prolaze. Root produkcioni build nije pokretan preko aktivnog dev servera.

Artefakti: `.tmp/payment-browser/`, `.tmp/payment-api-regression.log`, `.tmp/payment-commerce-browser.log`, `.tmp/payment-unit-tests.log` i `.tmp/payment-live-smoke.log`.

## Tačni fajlovi

API:

- `src/modules/portfolio-projects/portfolio-prices.ts` — novi zajednički serverski cjenovnik.
- `src/modules/portfolio-projects/portfolio-payment-context.service.ts` — read-only kontekst.
- `src/modules/portfolio-projects/portfolio-payment-context.controller.ts` — validacija i autorizacija.
- `src/modules/portfolio-projects/portfolio-commerce.service.ts` — cjenovnik i ograničeno čitanje narudžbine.
- `src/modules/portfolio-projects/portfolio-projects.module.ts` — registracija.
- `test/payment-context.api.test.cjs`, `test/portfolio-commerce.api.test.cjs`.

Web:

- `app/placanje/page.tsx`, `app/pretplata/placanje/page.tsx`, `app/artist/subscribe/page.tsx`, `app/portfolio-builder/[id]/payment/page.tsx`.
- `app/api/payment-catalog/route.ts`, `app/api/portfolio-commerce/[...operation]/route.ts`.
- `components/payment-workspace.tsx`, `components/payment-workspace.module.css`, `components/payment-purchase-loader.tsx`.
- `components/portfolio-guest-checkout.tsx`, `components/portfolio-account-purchase.tsx`.
- `lib/payment-context.ts`, `lib/payment-context.server.ts`.
- `references/payment-artifact-20261029.html`.
- `test/payment-workspace.browser.cjs`, `test/payment-context.test.cjs`, `test/portfolio-commerce.browser.cjs`.

Dokumentacija: ovaj izvještaj, `portfolio-export-commerce-status.md` i `apps/web/test/packages-page-20261029.md`.

## Šta je potrebno prije stvarne naplate

1. AllSecure/Hipotekarna testni trgovac i zvanična dokumentacija; hosted checkout/fields, tokenizacija, serverska autorizacija i verifikovani callback/webhook.
2. Serverska evidencija izabranog mjesečnog iznosa i verifikovanog reusable payment methoda; postojeći model nema odgovarajuće podatke za potvrdu tih funkcionalnosti.
3. Backend Generatora: vlasnički saldo, neistekli kupljeni setovi, potrošnja, idempotentna dodjela deset objava tek nakon potvrde plaćanja i stvarna ruta alata.
4. Serverska saglasnost gosta, račun/transakcioni e-mail i povezivanje procesora sa postojećom privatnom PDF isporukom.

Nema Prisma izmjena, migracija, brisanja podataka ili fizičkih R2 operacija. Nijesu mijenjani header, navigacija, hamburger, zajednički footer, globalni CSS, dizajn editora ili PDF generator. Svi finansijski testovi koriste izolovane podatke i simulirani storage; nijedna stvarna uplata nije izvršena.
