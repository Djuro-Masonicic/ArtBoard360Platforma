# Minimal — stvarni PDF templejt, 27. 10. 2026.

**Nastavak 28. 10.:** [Rounded (Tačke)](portfolio-rounded-template-20261028.md) je sada implementiran u zajedničkom rendereru. Tvrdnje ispod da je Rounded prototip opisuju stanje prije tog nastavka.

Minimal je povezan sa postojećim PDFKit generatorom, editorom, čuvanjem vlasničkog projekta i Guest memorijskim tokom. Ostali novi vizuelni stilovi i njihovo kombinovanje ostaju označeni kao prototipi.

Implementirane su naslovnice A–G, profil sa biografijom, motom i kontakt podacima, grid izdvojenih radova, pojedinačni rad, uvod kolekcije, rad unutar kolekcije, strukturisani CV i kontakt. Podaci, fotografije, nazivi, datumi i brojevi stranica dolaze iz dokumenta; referentni primjer nije ugrađen u produkcioni sadržaj.

**Izbor i kompatibilnost.** Naslovnica se čuva u postojećem JSON polju kao `designConfig.minimal = { version: 1, cover: "A" }`. Dozvoljena su samo ova dva polja i sedam poznatih vrijednosti. Bez ovog zapisa koristi se A. Nema promjene Prisma šeme ili migracije. Backend čuva postojeći izbor PDF sekcija, a Guest šalje samo dozvoljeni Minimal izbor uz podatke dokumenta. Izbor u memorijskom Guest editoru nestaje nakon refresha; snapshot se trajno vezuje za kupovinu samo kroz postojeći eksplicitni checkout.

U editoru je ispravljeno poređenje JSON objekata: redosljed ključeva koji vraća JSONB više ne stvara lažnu nesačuvanu izmjenu i ne blokira izvoz nakon ponovnog otvaranja projekta.

**Fontovi i linkovi.** API koristi postojeći Alcyone Regular/Bold/Italic, pretvoren iz WOFF2 u TTF bez zamjene fonta. TTF fajlovi su runtime resursi; Python nije potreban aplikaciji. Skripta za ponavljanje konverzije traži `fonttools[woff]`. QR se generiše lokalno iz stvarnog HTTP(S) linka, kao vektorske ćelije sa tihom zonom, kroz [node-qrcode](https://github.com/soldair/node-qrcode). Bez bezbjednog cilja nema QR koda. Ne koristi se demonstracioni QR iz slike.

**Sadržaj i paginacija.** Postojeći document plan određuje sekcije, izbor radova i njihov redosljed. Isključene sekcije se ne vraćaju u dokument. Sa kompletnim CV podacima raspored je CV–1 i CV–2; prazne grupe ne prave prazne stranice. Dugi CV, biografija, moto, opis rada i linkovi nastavljaju se na dodatnim stranicama. Preview watermark se primjenjuje i na nastavke. A4 prati izvornu geometriju, Letter se proporcionalno prilagođava. Postojeći izbor serifnog fonta i opcije brendiranja/cijena ostaju funkcionalni.

**Mjerenje reference.** Izvorni korisnički HTML sačuvan je u `apps/web/references/portfolio-minimal.html`. Poređenje je rađeno u Chrome-u na istih 794 × 1123 px, sa javno dostupnim fotografijama iz primjera i istim Alcyone fontom. Privremene slike za test nijesu produkcioni resursi.

| Element | Referenca / implementacija, u izvornim CSS px |
| --- | --- |
| Stranica | 794 × 1123 |
| Unutrašnja lijeva margina / širina | 68 / 658 |
| Naslov unutrašnje stranice | x 68, y 68; 26,67 px |
| Početak sadržaja | y 151,2 |
| Footer linija | y 1053,7 |
| A — glavna slika | 794 × 718,1 |
| A — ime / portret | x 68, y 771; portret x 567,3, 158,7 × 158,7 |
| E — portret / početak glavne slike | x 461,1, y 75,6, 211,7 × 272,1 / y 385,5 |
| F — bijela kartica | x 68, y 830,17, 658 × 224,83 |
| Grid izdvojenih radova | 3 kolone; oko 209,3 × 209,1, razmak 15,1 |
| Kolekcija | glavna slika 433,7 × 672,8; dvije desne 209,2 × 328,85 |

PDF test provjerava poziciju imena na svih sedam naslovnica sa tolerancijom ispod jedne PDF tačke. Browser test zasebno provjerava proporcionalnu veličinu fonta i debljinu prezimena u svih sedam stvarnih minijatura. Zabilježeni su screenshotovi svih 15 referentnih stranica i odgovarajućih PDF stranica, desktop i mobilni editor.

Razlike rasterizacije fontova/slika i QR sadržaja ostaju. Izmjereni prosječni apsolutni RGB pomak za naslovnice A–G je 0,66–3,14 na skali 0–255; ovo nije tvrdnja o procentu identičnih piksela. Ručno je pregledan raspored naslovnica, profila, kolekcija, CV-a i kontakta. Kontakt koristi izabranu naslovnu fotografiju; u statičnom referentnom primjeru prikazan je i originalni fajl istog rada sa drugačijim kadriranjem. Brojevi stranica prate stvarni broj radova i nastavaka, umjesto demonstracionih 01–10.

**Provjere.**

- 33/33 unit/PDF testa: Minimal, postojeći CV templejti, document plan i Guest memorijski adapter.
- 52/52 API testa: vlasništvo, sačuvaj/ponovo otvori, privremeni preview bez prepisivanja, neispravna konfiguracija, kolekcije, kupovine, kvote, privatna isporuka i istorija. Korišćene su nove izolovane baze i storage mock, bez stvarnog R2 upisa/brisanja.
- 23/23 browser provjere: svih sedam minijatura, izbor i modal, Guest preview/snapshot kupovine, čuvanje i ponovno otvaranje vlasničke naslovnice, Free/Premium kvote i istorijske verzije. Rezultat: `.tmp/portfolio-commerce-browser/results.json`.
- Vizuelno poređenje sedam naslovnica i unutrašnjih stranica, bez browser runtime grešaka: `.tmp/portfolio-minimal/visual-comparison.json` i `reference-metrics.json`.
- Lokalni Guest smoke na 1440 px i 390 px: bez API upisa ili runtime grešaka.
- `npm run build` — API TypeScript i web production build prolaze; dodatni web `tsc --noEmit --incremental false` prolazi. Završni API build ponovljen poslije posljednjih PDF stilskih korekcija.
- `git diff --check` za obuhvaćene fajlove prolazi.

**Fajlovi ovog nastavka.** Repozitorijum već sadrži druge ranije izmjene; spisak ispod odnosi se na ovaj Minimal zadatak.

| Oblast | Fajlovi |
| --- | --- |
| Zajednička konfiguracija | `packages/portfolio-document-plan/minimal.cjs`, `index.cjs`, `index.d.ts` |
| PDF | `apps/api/src/modules/portfolio-projects/portfolio-minimal.pages.ts`, `portfolio-pdf.generator.ts` |
| Čuvanje / Guest snapshot | `apps/api/src/modules/portfolio-projects/portfolio-projects.service.ts`, `portfolio-guest.service.ts` |
| Fontovi | `apps/api/assets/portfolio-fonts/Alcyone-Regular.ttf`, `Alcyone-Bold.ttf`, `Alcyone-RegularItalic.ttf`, `apps/api/scripts/prepare-portfolio-fonts.py` |
| Editor / minijature | `apps/web/components/portfolio-builder-editor-shell.tsx`, `portfolio-design-workspace.tsx`, `portfolio-design-preview-markup.json` |
| Web transport / tipovi | `apps/web/lib/portfolio-guest-transport.ts`, `apps/web/types/api.ts` |
| Zavisnosti | `apps/api/package.json`, `apps/web/package.json`, `package-lock.json` — `qrcode` i pripadajući tipovi |
| Referenca | `apps/web/references/portfolio-minimal.html` |
| PDF testovi | `apps/api/test/portfolio-minimal.fixture.cjs`, `portfolio-minimal.test.cjs`, `portfolio-cv.test.cjs` |
| Integracioni / browser testovi | `apps/api/test/portfolio-collections.api.test.cjs`, `apps/web/test/portfolio-commerce.browser.cjs`, `portfolio-minimal.visual.cjs` |
| Dokumentacija | ovaj izvještaj i link u `portfolio-export-commerce-status.md` |

**Granice i preostali rad.**

- Nijesu mijenjani header, sidebar, drugi koraci editora, Prisma šema ili migracije. Nijesu obrisani stvarni podaci ili fajlovi. Nije bilo deploya.
- Realni clean PDF izvoz i dalje traži prethodno predviđeni privatni R2 bucket; ova izmjena ga ne kreira niti zaobilazi provjeru. Watermarked preview koristi postojeći tok. AllSecure integracija nije aktivirana.
- Guest desni panel ima lokalnu naslovnicu; unutrašnje male ilustrativne kartice tog starog panela nijesu stvarni PDF. Tačan Guest dokument dostupan je kroz postojeći PDF preview u Izvozu. Vlasnički PDF preview i Izvoz koriste stvarni generator.
- Tačke, Gradijent, Editorijal, Kartice i Blok iz novog vizuelnog izbora, kao i njihovo miješanje, čekaju svoje potpune reference i implementaciju. Stara dva serverska templejta ostaju očuvana.
- Dugi dokument može imati više stranica od statičnog primjera. Dugački sadržaj se čuva umjesto odsijecanja. Minijature i finalni PDF mogu imati sitne razlike u browser/PDF rasterizaciji.

Primjer kompletnog dokumenta: `.tmp/portfolio-minimal/minimal-A.pdf` (ostale naslovnice: B–G u istom direktorijumu). Nije potrošena kvota stvarnog korisnika i nije potvrđena stvarna uplata.
