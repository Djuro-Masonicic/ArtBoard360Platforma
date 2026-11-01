# Editorial — stvarni PDF dizajn, 28. 10. 2026.

Kartica **Editorijal** u koraku Dizajn sada bira stvarni PDF stil. Izbor naslovnice A–G može se sačuvati i ponovo otvoriti. Isti dizajn koriste privatni preview, finalni PDF, Guest snapshot kupovine i istorijska PDF verzija. Postojeći legacy `ARTBOARD_EDITORIAL` renderer nije zamijenjen ovim novim stilom.

Koristi se postojeći PDFKit generator, Alcyone fontovi, document plan i JSON konfiguracija, bez novog Prisma polja:

```json
{ "minimal": { "version": 1, "cover": "G", "style": "EDITORIAL" } }
```

Konfiguracije bez `style` i dalje znače Minimal. `ROUNDED` i `GRADIENT` zadržavaju prethodno ponašanje. Zajednička validacija dozvoljava samo poznate stilove, verziju i naslovnice; proizvoljni ključevi se odbijaju. Kartice i Blok ostaju označeni kao „Uskoro”; kombinovanje stilova po sekcijama ostaje prototip.

Originalni HTML sačuvan je u `apps/web/references/portfolio-editorial.html`. Dopunjena stranica kolekcije iz naknadnog odgovora nalazi se u `portfolio-editorial-collection.html`. Prvi prilog sadrži duplikat „Rad 2”; za poređenje se koristi prvi primjer. Sa dopunom imamo svih 16 jedinstvenih referentnih rasporeda. Privremena Minimal kompozicija uvoda kolekcije uklonjena je čim je dopuna dostavljena.

| Element | Implementacija prema referenci, na 794 × 1123 px |
| --- | --- |
| Naslovnice A–F | Zajednički Minimal raspored: ime regular, prezime bold, pravougaone slike |
| Naslovnica G | Magazin; crno-bijela velika slika, logo i kružni portret, kontrast 1,05; bijeli obrub portreta |
| Unutrašnje zaglavlje | Masthead na y 37,8; dvije linije na y 56,7/60,8; broj i naslov od 40 px na y 83,1 |
| Podnožje | Broj stranice regular od 18,67 px; tanki razdjelnik i dinamički broj stvarne fizičke stranice |
| Profil | Tijelo od y 181,4; dvije kolone sa razmakom 30,2 px, inicijal od 56 px; moto između linija; četiri kontakt kolone |
| Izdvojeni radovi | Šest numerisanih slika po stranici, prvi rad zauzima dvije kolone i dva reda; razmak 15,1 px |
| Radovi | Slika širine do 438,8 px, visina do 642,5 px; desni metapodaci širine 189 px na x 537; broj rada 72 px |
| Rad u kolekciji | Isti bočni metapodaci, visina slike do 597,2 px, stvarni broj rada i ukupan broj u kolekciji |
| Uvod kolekcije | Numerisani kolaž visine 612,3 px; panel sa godinom od 53,33 px i stvarnim brojem radova; naziv/opis od x 303,5 uz vertikalni razdjelnik |
| CV | Dvije osnovne grupe; podvučeni podnaslovi, vertikalni razdjelnici kod programa i publikacija; zaseban CV kroz isti generator |
| Kontakt | Podvučeni kontakt redovi; pravi QR; završna slika uvećana 165%, crno-bijela sa kontrastom 1,1 i prozorom u boji, obrub 3 px |

Filtriranje slika radi samo nad privremenim baferima u PDF procesu. Originalne slike i R2 objekti ostaju nepromijenjeni. QR koristi stvarni, provjereni HTTP(S) link; ne dodaje se izmišljeno odredište.

Sadržaj je dinamički: redosljed kolekcija/radova, ručni metapodaci, izbor sekcija, prikaz cijena, jezik, format papira, watermark i postojeća pravila izvoza ostaju očuvani. Devet izdvojenih radova sada zahtijeva dvije kolaž stranice. Demo dokument sa devet radova i jednom kolekcijom ima 17 fizičkih stranica. Broj i redosljed ne oponašaju statičnu numeraciju HTML primjera.

Predugački tekstovi nastavljaju se na dodatnim stranicama umjesto `overflow:hidden` isijecanja iz reference. Izuzetno dugački nazivi mogu smanjiti veličinu fonta ili preći u sljedeći red. Dvokolonski tekst čuva sve redove i razmake između pasusa; PDF i browser mogu različito prelomiti pojedinu riječ.

**Provjere**

- **30/30 PDF testova**: sedam Editorial naslovnica, zaglavlja, kolaž i nastavak devet radova, bočni metapodaci, nova uvodna kolekcija i dugi opisi, profil, CV, Letter, watermark, linkovi i regresije Minimal/Rounded/Gradijent/CV.
- **57/57 API testova** na izolovanim bazama: sačuvaj/ponovo otvori, preview bez prepisivanja, neispravna konfiguracija, tuđe vlasništvo, Guest snapshot/preview bez drafta ili storage upisa, prethodne kolekcije, kvote i kupovine.
- **35/35 browser provjera**: četiri aktivne kartice, svih sedam Editorial minijatura i tipografija, G filter, modal, Guest preview i snapshot kupovine, vlasničko čuvanje i ponovno otvaranje, istorijski manifest/oznaka, Free/Premium kvote i nula runtime izuzetaka.
- Izolovani Next.js production build browser harness-a prolazi.
- API i web `tsc --noEmit` prolaze; scoped `git diff --check` prolazi.
- Stvarna lokalna Guest ruta provjerena na **1440 × 1000** i **390 × 844**: izbor Editorijala, modal, bez horizontalnog preliva, bez API upisa, bez runtime izuzetaka; refresh resetuje nezavršene podatke.
- Svih **16 rasporeda** prikazano je u Chrome-u i kao stvarni PDF na **794 × 1123 px**. Geometrijski testovi provjeravaju linije zaglavlja/podnožja unutar jednog piksela, kolaž, kolekciju, vertikalne CV razdjelnike, G filter i kružni portret, kontakt kadriranje, kontrast i prozor u boji.
- Prosječna apsolutna RGB razlika naslovnica je **0,66–2,96** na skali 0–255. To je mjera razlike, a ne procenat identičnih piksela. Razlike uključuju rasterizaciju fontova, SVG/PNG loga i resampling slika.

**Fajlovi ovog nastavka**

- `packages/portfolio-document-plan/minimal.cjs`, `index.d.ts` — stroga konfiguracija EDITORIAL i oznaka Editorijal.
- `apps/api/src/modules/portfolio-projects/portfolio-minimal.pages.ts` — Editorial varijante svih stranica u postojećem rendereru, privremeni filteri i paginacija kolona.
- `apps/web/components/portfolio-builder-editor-shell.tsx`, `portfolio-design-workspace.tsx`, `portfolio-design-preview-markup.json` — aktivna kartica, minijature, memorijski Guest izbor i vlasničko čuvanje/ponovno otvaranje.
- `apps/web/references/portfolio-editorial.html`, `portfolio-editorial-collection.html` — dostavljene reference.
- `apps/api/test/portfolio-editorial.test.cjs`, `portfolio-collections.api.test.cjs`, `portfolio-commerce.api.test.cjs` — novi PDF testovi i proširena API provjera stila.
- `apps/web/test/portfolio-commerce.browser.cjs`, `portfolio-minimal.visual.cjs`, `portfolio-template-live.browser.cjs` — funkcionalne provjere, `--editorial` vizuelni režim i read-only smoke lokalne aplikacije.
- Ovaj izvještaj i link u `portfolio-export-commerce-status.md`.

**Obuhvat i postojeća ograničenja**

Radna baza, stvarni umjetnici/portfoliji i R2 objekti nijesu mijenjani. Nema izmjene Prisma šeme, migracije na radnoj bazi, brisanja, stvarne naplate ili deploya. API/browser testovi koriste odvojene testne baze i lažni storage. Header, sidebar i dizajn drugih koraka nijesu redizajnirani.

Guest izbor postoji samo u otvorenoj stranici, a u evidenciju kupovine ulazi kroz postojeću eksplicitnu pripremu narudžbine. Pravi Guest PDF preview nalazi se u Izvozu; stare male unutrašnje ilustracije njegovog desnog panela ostaju ilustrativne. Privatni R2 bucket i AllSecure integracija ostaju prethodno dokumentovani uslovi za produkcionu isporuku/naplatu; ova promjena ih ne aktivira.

Dokazi: `.tmp/portfolio-editorial/editorial-A.pdf` do `editorial-G.pdf`, `reference-metrics.json`, `visual-comparison.json`, `pdf-tests.log`, `api-tests.log`, `live-smoke.json`, `live-desktop.png`, `live-mobile.png`, `live-modal.png`. Funkcionalni browser rezultati: `.tmp/portfolio-commerce-browser/results.json`.
