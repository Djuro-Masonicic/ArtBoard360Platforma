# Mobilni Portfolio Builder — 1. novembar 2026.

## Obuhvat

Mobilni izgled postojećeg editora usklađen je sa dostavljenom specifikacijom i 38 screenshotova iz `Portfolio_Builder_Mobile_Referentni_Screenshotovi.zip`. Nema novog editora ili promjene generatora PDF-a. Sve nove vizuelne vrijednosti aktiviraju se samo do 640 px; postojeći tablet i desktop breakpointi ostaju isti.

Prije izmjena snimljeni su svih šest desktop koraka na 1536 px i početni mobilni prikazi. Poslije izmjena desktop screenshotovi imaju isti sadržaj piksela za svih šest koraka. Dinamički Chrome PDF iframe je maskiran identično prije/poslije; njegov okvir, položaj i sticky panel ostaju u poređenju.

## Ispravke

- Header ima dva reda, visinu 102 px, logo, povratak na nalog i jedan mobilni theme toggle. Desktop kontrole ostaju postojeće. Mobilne kontrole pozivaju postojeći callback za temu.
- Postojeći sidebar je na telefonu ponovo vidljiv kao profil, horizontalni red koraka i dvije dinamičke statističke kartice. Aktivni korak se otkriva horizontalnim skrolom navigacije, bez pomjeranja stranice po vertikali.
- Osnovna forma i fotografije su složene vertikalno; svi postojeći podaci i validacija ostaju sačuvani. Biografija zadržava postojeće ograničenje 1200 karaktera, bez promjene poslovnog pravila na demo ograničenje riječi.
- Kolekcije imaju tri kolone, radovi dvije. Postojeći modal ostaje isti, ograničen viewportom i vertikalno skrolabilan. Checkboxovi, meni kolekcije i uvoz nijesu zamijenjeni novom logikom.
- Detalji rada imaju thumbnail 64 px i pojedinačno složena polja, uz mobilnu poruku kada nedostaju naziv ili tehnika. Desktop prikaz poruke je skriven; desktop pravila ostaju ista.
- CV stavke imaju jednu kolonu i postojeće dodavanje/uklanjanje. Dizajni imaju dvije kolone; naslovnice ostaju horizontalna galerija, a Premium dropdown kontrole se slažu vertikalno.
- Na koracima 01–05 mobilni PDF pregled dolazi poslije forme i donje navigacije. Ponovo koristi `PortfolioExportPdfPages` i već dobijeni PDF Blob; nema dodatne kompozicije PDF-a ili novog backend endpointa. PDF.js se za ovaj prikaz montira samo na mobilnom breakpointu. Desktop zadržava isti iframe.
- Mobilni pregled ima postojeće akcije čuvanja i detaljnog pregleda. Guest ne dobija trajni draft niti novo pravo izvoza.
- Izvoz ostaje pregled → akcije → prava/generisanje → izbor sekcija → verzije → dijeljenje → nazad. PDF thumbnailovi imaju tri kolone; akcije pregleda su u jednom redu.

## Mjerenja

Headless Chrome nasljeđuje postojeće globalno skrivanje scrollbara. Zato na viewportu 440 px ima `clientWidth=440`, a referenca sa klasičnim scrollbarom ima `clientWidth≈425`. Nije uvedena fiksna širina od 425 px, niti promijenjen globalni scrollbar. Dimenzije slijede raspoloživu širinu.

| Element | Implementacija | Referenca / poređenje |
| --- | --- | --- |
| Header | 102 px | približno 102,4 px |
| Profilni avatar | 72 × 72 px | 72 × 72 px |
| Navigacioni red / dugme | 62 / 46 px | 62 / 46 px |
| Glavni naslov | 30 px | 30 px |
| Spoljne margine / razmak blokova | 16 / 18 px | 16 / 18 px |
| Sadržaj na clientWidth 425 | 393 px | približno 392,8 px |
| A4 pregled na clientWidth 425 | približno 353 × 499 px | 352,8 × 499 px |
| Input detalja rada na clientWidth 425 | 277 × 44 px | 276,8 × 44 px |
| CV input na clientWidth 425 | 295 × 42 px | 294,8 × 42 px |
| Pregled na clientWidth 440 | približno 368 × 520 px | responzivno širenje bez deformisanja A4 |

Snimci reference sadrže različite cropove i skale, okvir telefona i Claude trake. Zato nijesu osnova za tvrdnju da su svi pikseli mobilnih screenshotova identični. Poređeni su raspored, proporcije i zadate dimenzije; demo podaci i ilustracije nijesu kopirani u stvarni nalog.

## Provjere i granice

Konačni browser suite: **99/99 provjera**, bez runtime grešaka. Pokretanje: `node apps/web/test/portfolio-mobile.browser.cjs`; početni snimci se prave sa `--baseline` prije izmjena.

- Browser test: svih šest koraka na 375, 390, 425 i 440 px; nema horizontalnog overflowa. Aktivni korak je vidljiv, pregled je na odgovarajućem mjestu, canvas stranice zadržavaju A4 proporcije.
- Desktop: svih šest koraka na 1536 px prolaze poređenje prije/poslije bez promjene piksela uz isto maskiranje ugrađenog browser PDF prikaza.
- Testirani su unos i povratak između koraka, discipline, selekcija radova, postojeći modal, mobilna validacija, CV dodavanje/uklanjanje, Premium panel, izbor naslovnice/modal, čuvanje sa revision poljem, izbor PDF sekcija, generisanje, istorijsko preuzimanje i privatni share.
- Free nalog zadržava Premium ograničenja. Guest privremeni upload koristi Blob URL, ne pravi API upis i gubi nezavršen rad nakon refresha.
- Stvarni lokalni Guest editor `/portfolio-builder/new` dodatno je otvoren na 390 px: HTTP 200, bez overflowa i runtime grešaka.
- API i web TypeScript i cijeli produkcioni web build prolaze.

Automatizovani funkcionalni browser test koristi izolovane API odgovore i PDF fixture, a stvarne frontend komponente i PDF.js. Ne predstavlja novu provjeru banke, stvarnog R2 uploada ili zapisivanja u radnu bazu. Backend, Prisma, migracije, naplata, PDF sadržaj, Generator i QR editor nijesu mijenjani u ovom paketu.

Postojeća kombinacija PDF stilova po sekcijama ostaje označeni prototip. Guest zadržava svoj postojeći tok i broj koraka. Ove funkcionalne odluke ostaju za odvojeni nastavak; nijesu mijenjane radi mobilnog izgleda.

## Tačni fajlovi ovog paketa

- `apps/web/components/portfolio-builder-editor-shell.tsx`
- `apps/web/components/portfolio-builder-editor-shell.module.css`
- `apps/web/components/portfolio-live-pdf-preview.tsx`
- `apps/web/components/portfolio-collections-workspace.module.css`
- `apps/web/components/portfolio-works-workspace.tsx`
- `apps/web/components/portfolio-works-workspace.module.css`
- `apps/web/components/portfolio-cv-workspace.module.css`
- `apps/web/components/portfolio-design-workspace.module.css`
- `apps/web/components/portfolio-export-workspace.module.css`
- `apps/web/components/portfolio-export-pdf-pages.module.css`
- `apps/web/test/portfolio-mobile.browser.cjs`
- ovaj izvještaj

Priprema odobrenog pusha dodatno proširuje `.gitignore` i `.dockerignore` na čitav lokalni `.data/` direktorijum. Privatni generisani fajlovi i `.env` nijesu objavljeni; nijesu ni obrisani. Push uključuje i ranije završeni kod iz ove radne sesije, kako je korisnik tražio.

Mjerenja, snimci prije/poslije, lokalni smoke i build log nalaze se u `.tmp/portfolio-mobile/`. Referentni screenshotovi i testni artefakti ne ulaze u Git.
