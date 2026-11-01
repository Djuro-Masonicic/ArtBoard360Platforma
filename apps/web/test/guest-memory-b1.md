# Guest memorijski editor — B.1

Pripremni režim, bez produkcionog ulaza. Cijela faza 3B.1c nije završena.
Nijedna stranica aplikacije ne kreira memorijski adapter. Postojeći Guest ulaz,
Free/Premium čuvanje, PDF generator i plaćanje nastavljaju prethodni tok.

## Primjena adaptera u budućem ulazu

U client komponenti napraviti **jedan adapter po montiranju**, npr. kroz lijeni
`useState(() => createGuestPortfolioMemoryAdapter())`, i postojećem
`PortfolioBuilderEditorShell` proslijediti `project={adapter.getSnapshot()}` i
`adapter={adapter}`. Ovo sada radi samo izolovana browser testna aplikacija.
Adapter ne kreirati ponovo pri svakom renderovanju i ne dijeliti ga između editora.

`PortfolioProject` služi samo kao postojeći prikazni tip. Memorijski identifikator
počinje sa `guest-memory:`; ne predstavlja zapis iz baze. Nijedan API se ne poziva.
Metapodaci i dizajn ostaju u React stanju i memorijskom dokumentu. Upload čuva
`File` u registru, a isti postojeći live preview prikazuje `blob:` URL.

Profilna slika, postojeća naslovnica, dodavanje radova, detalji, izbor, naslovni rad
i redosljed podržani su lokalno. Dozvoljene su postojeće vrste slika, do 10 MiB po
fajlu i najviše 30 radova. Premium kombinovanje dizajna ostaje zaključano.
Ovo ne uvodi novu funkcionalnost Kolekcija ili CV-a.

Zamjena oslobađa URL tek kada ga ne koristi drugo polje istog dokumenta.
Unmount oslobađa sve URL-ove i File reference. Kratko odloženo čišćenje podnosi
React StrictMode ponovno pokretanje efekata. Nema čuvanja dokumenta ili teme u
localStorage/IndexedDB, liste draftova, edit tokena ili obnove nakon refresha.

PDF pregled, generisanje, preuzimanje, javno dijeljenje i checkout u memorijskom
režimu su onemogućeni i jasno označeni kao nedovršeni. HTML live preview radi.
Nema lažnog uspješnog plaćanja ili generisanja PDF-a.

## Provjere

Pokrenuti iz korijena repozitorijuma:

```powershell
node apps/web/test/guest-portfolio-memory.test.cjs
node apps/web/test/portfolio-access.test.cjs
node apps/web/test/admin-artwork-upload.test.cjs
node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false
node apps/web/test/guest-portfolio-memory.browser.cjs
```

Browser test koristi lokalni Chrome i pravi zasebnu testnu Next aplikaciju u
`.tmp/guest-memory-b1/harness`, izvan produkcionog `apps/web/app`. API pozivi su
presretnuti testnim odgovorima; stvarna baza i R2 se ne koriste. Port: 3107,
promjenljiv preko `GUEST_MEMORY_TEST_PORT`.

Vizuelno poređenje zahtijeva kopiju editora prije B.1 u
`.tmp/guest-memory-b1/editor-before.tsx`, napravljenu prije izmjene. Kopija je
napravljena za ovu provjeru; skripta odbija da poredi kod sam sa sobom ako nedostaje.
Testira sva četiri koraka za Free, Premium i postojeći Guest tok, desktop/mobile,
svijetlu/tamnu temu. Animacije se zamrzavaju samo u testu; dimenzije moraju biti
jednake. Slike se porede sa tolerancijom najviše 0,1% piksela za browser
rasterizaciju (razlika kanala do 2 se zanemaruje). Dodatno se provjeravaju širine
320–1536 px, sticky zaglavlje/preview, avatar 72 px, četiri koraka i Premium oznaka.
Rezultati i slike nastaju u `.tmp/guest-memory-b1/`.

Rezultat provjere B.1: 12/12 memorijskih i backend adapter testova, 12/12
postojećih portfolio access testova i 6/6 admin upload testova. Web TypeScript
provjera bez emitovanja i izolovani testni Next produkcioni build prolaze.
Chrome: 92/92 provjere, uključujući 48 vizuelnih poređenja i svih 11 širina,
bez runtime grešaka. Guest scenario je imao nula API poziva; zasebne Free i Premium
provjere slale su po jedan PATCH presretnutom testnom API-ju.
CSS, aktivna Guest forma/ulaz i PDF generator imaju iste SHA-256 vrijednosti
kao prije ovog koraka.

## Preostalo za zasebnu funkcionalnu fazu

Prije aktivacije novog Guest ulaza treba završiti privremeni watermark PDF kroz
postojeći generator, validaciju sadržaja/slika na serveru pri kupovini, evidenciju
narudžbine, AllSecure/Hipotekarna banka integraciju sa serverskom potvrdom i
idempotentnošću, ograničenu isporuku plaćenog PDF-a i administratorski pregled.
Tek tada se zasebno zatvaraju stari Guest draft endpointi. B.1 ih ne zatvara.

Velike slike mogu potrošiti znatnu memoriju browsera i pri dozvoljenoj veličini
fajla; prije aktivacije provjeriti slabije telefone i budžet memorije. Browser
validacija služi lokalnom radu, a nije zamjena za buduću serversku validaciju.
Ograničenja i pixel poređenje nijesu provjera naplate stvarnim procesorom.

B.2 nije započet. Sljedeći prioritet nakon odobrenog izvještaja je vizuelno
poređenje sa originalnim Claude Artifactom: Podaci, Radovi, Dizajn, Izvoz/desni
preview, Kolekcije, CV. Ovaj korak ne započinje nijednu od tih izmjena.
