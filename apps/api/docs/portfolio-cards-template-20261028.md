# Kartice — stvarni PDF dizajn, 28. 10. 2026.

Kartica **Kartice** u koraku Dizajn sada bira stvarni PDF stil. Podržano je svih sedam naslovnica i svih devet unutrašnjih rasporeda iz dostavljenog HTML-a, sa stvarnim podacima, čuvanjem izbora, Guest preview-om i istorijskim PDF verzijama. Originalna referenca je `apps/web/references/portfolio-cards.html`; nema nedostajućih stranica.

Izbor se čuva u postojećem JSON polju:

```json
{ "minimal": { "version": 1, "cover": "F", "style": "CARDS" } }
```

Zajednička stroga validacija prihvata `CARDS`, poznatu verziju i naslovnice A–G, a odbija proizvoljna vlasnička/dizajnerska polja. Postojeći Minimal, Rounded, Gradijent i Editorijal zadržavaju značenje. Nema novog Prisma modela, enum vrijednosti ili migracije. Aktivno je pet stilova; Blok ostaje „Uskoro”, a miješanje stilova po sekcijama ostaje prototip.

**Izgled iz reference**

| Element | Pravilo na referentnom formatu 794 × 1123 px |
| --- | --- |
| Pozadina | `#eef0f4`, uključujući naslovnice |
| Ime na naslovnicama | Bold ime i prezime, uz postojeće rasporede A–G |
| Portreti/slike | Kružni portreti A/C/G; ostale unutrašnje slike imaju radius 15,1 px |
| F | Bijela kartica radiusa 18,9 px, žuta oznaka, rotirana QR kartica sa mekom sjenkom |
| G | Bijeli lijevi panel, slike u boji, samo spoljašnji uglovi panela zaobljeni; kružni portret ima sivi obrub od 6 px |
| Naslov stranice | Logo 18,9 × 17 px uz naslov od 14,67 px, na y 64,3 |
| Tijelo | x 68, y 136,1, širina 658 px |
| Bijele kartice | Radius 15,1 px, padding 22,7 px; razmak 15,1 px |
| Profil | Posebna kartica biografije, zatim moto/iskaz lijevo i podaci/linkovi desno; kapsula discipline |
| Izdvojeni radovi | Šest slika po stranici, prvi rad zauzima dvije kolone i dva reda; ostale pločice 209,27 × 209,1 px, razmak 15,1 px |
| Radovi | Slika iznad kartice metapodataka/opisa; kartica počinje na y 718,1 za običan rad |
| Kolekcije | Kolaž visine 672,8 px, ispod bijela kartica naziva, godine i opisa; radovi imaju naziv kolekcije i stvarni broj rada |
| CV | Obrazovanje i iskustvo u odvojenim karticama; vještine/programi, izložbe/nagrade i sertifikati/publikacije u tri kartice druge grupe |
| Kontakt | Kartica portreta/podataka, kartica linkova sa QR-om rotiranim 4°, završna fotografija u bijelom okviru sa paddingom 11,3 px |
| Podnožje | Broj stranice, ime i bijela Portfolio kapsula, bez linije preko stranice |

**Kako je povezano**

Koristi se postojeći PDFKit generator, zajednički document plan, Alcyone fontovi, obrada slika, bezbjedni linkovi, QR i watermark. `portfolio-cards.pages.ts` je pomoćnik za raspored kartica unutar tog generatora. Ne postoji drugi PDF pipeline niti slika cijele stranice umjesto stvarnog teksta.

Visine kartica se mjere prije crtanja podloge. Dugi sadržaj i dvije kolone nastavljaju se na narednim fizičkim stranicama bez gubitka posljednjih redova. Slike se ne sijeku preko preloma. Redosljed radova i kolekcija, ručni metapodaci, prikaz cijena, jezik, izbor sekcija, zaseban CV, format papira i watermark ostaju dio postojećeg toka.

Izuzetno duga disciplina prikazuje se u punom polju; dodatna dekorativna kapsula se izostavlja ako ne može stati u kolonu. Dugački nazivi i tekstovi mogu proizvesti dodatne redove/stranice. To čuva sadržaj umjesto `overflow:hidden` isijecanja iz HTML primjera.

Devet izdvojenih radova daje dvije kolaž stranice. Broj fizičkih stranica i numeracija dolaze iz stvarnog dokumenta, pa nijesu statični brojevi iz reference. Primjer sa devet radova, jednom kolekcijom i punim CV-jem ima 17 stranica. Vizuelni test sada bilježi stvarni početak svake PDF sekcije, uključujući moguće nastavke bilo koje duge sekcije.

Guest izbor postoji samo u otvorenoj stranici. U postojeću evidenciju kupovine ulazi nakon eksplicitne pripreme narudžbine. Vlasničko čuvanje i ponovno otvaranje koriste postojeće autentifikovane rute. Oznaka Kartice u istoriji čita se iz manifesta konkretne PDF verzije.

QR koristi stvarni bezbjedni link; ne dodaje se izmišljeno odredište. Kontakt ne pravi izvršive ili credential-bearing PDF linkove. Meke QR sjenke nastaju u privremenim baferima, bez upisa slika u storage.

**Provjere i mjerenja**

- **37/37 PDF testova**: sedam novih testova za Kartice i prethodnih 30 za Minimal/Rounded/Gradijent/Editorijal/CV. Pokriveni su svih sedam naslovnica, redosljed kolekcija/radova, dvije kolaž stranice, cijene, dugi tekstovi i istovremene kolone, dugi metapodaci, Letter, zaseban i legacy CV, watermark na nastavcima i bezbjednost linkova.
- **59/59 API testova** na izolovanim bazama: vlasništvo, sačuvaj/ponovo otvori, neispravna konfiguracija, preview bez prepisivanja, Guest Kartice snapshot/preview bez drafta i storage upisa, kvote i kupovine.
- **37/37 browser provjera**: pet aktivnih kartica, svih sedam Kartice minijatura i tipografija/pozadina, modal, Guest preview i snapshot, vlasničko čuvanje/ponovno otvaranje F naslovnice, manifest i oznaka Kartice u istoriji, Free/Premium tokovi i nula runtime izuzetaka.
- Izolovani Next.js production build browser harness-a prolazi.
- API i web `tsc --noEmit` prolaze; scoped `git diff --check` prolazi.
- Stvarna lokalna Guest ruta provjerena na **1440 × 1000** i **390 × 844**: izbor Kartica, modal, bez horizontalnog preliva, bez API upisa i bez runtime grešaka; refresh resetuje nezavršeni unos.
- Svih **16 referentnih rasporeda** poređeno je kao HTML u Chrome-u i kao PDF na **794 × 1123 px**. Automatski su provjerene boje podloge, klipovanje slika, kolaž, G panel/obrub, F kartica i oznaka, kartice profila/CV-ja/kontakta i podnožje. Granice bijelih kartica slažu se unutar **2 px**.
- Prosječna apsolutna RGB razlika sedam naslovnica je **0,64–2,93** na skali 0–255. Ovo nije procenat identičnih piksela. Ostaju razlike rasterizacije fontova, SVG/PNG prikaza i resamplinga slika, uz dinamički sadržaj i numeraciju.

**Tačni fajlovi ovog nastavka**

- `packages/portfolio-document-plan/minimal.cjs`, `index.d.ts` — dozvoljeni CARDS stil i oznaka Kartice.
- `apps/api/src/modules/portfolio-projects/portfolio-minimal.pages.ts` — integracija stila, zajedničke naslovnice, pozadina, podnožje, kolaž i QR sjenke.
- `apps/api/src/modules/portfolio-projects/portfolio-cards.pages.ts` — mjerenje i raspored bijelih kartica, sadržaja i nastavnih stranica.
- `apps/web/components/portfolio-builder-editor-shell.tsx`, `portfolio-design-workspace.tsx`, `portfolio-design-preview-markup.json` — aktivan izbor, sedam stvarnih minijatura, čuvanje i ponovno otvaranje.
- `apps/web/references/portfolio-cards.html` — originalna referenca.
- `apps/api/test/portfolio-cards.test.cjs`, `portfolio-collections.api.test.cjs`, `portfolio-commerce.api.test.cjs` — PDF i API pokrivenost novog stila.
- `apps/web/test/portfolio-commerce.browser.cjs`, `portfolio-minimal.visual.cjs`, `portfolio-template-live.browser.cjs` — browser provjere, `--cards` vizuelni režim i lokalni smoke.
- Ovaj izvještaj i link u `portfolio-export-commerce-status.md`.

Radna baza, stvarni umjetnici/portfoliji i R2 objekti nijesu mijenjani. Nema migracije na radnoj bazi, brisanja, stvarne naplate ili deploya. Testovi koriste odvojene testne baze i storage mock. Header, sidebar, drugi koraci i poslovne Free/Premium kvote nijesu redizajnirani.

Postojeći uslovi privatnog R2 bucketa i AllSecure integracije za produkcionu isporuku/naplatu ostaju dokumentovani u prethodnim paketima. Ovaj nastavak ih ne aktivira. Pravi Guest PDF preview ostaje u Izvozu; male unutrašnje ilustracije njegovog desnog panela ostaju ilustrativne.

Dokazi: `.tmp/portfolio-cards/cards-A.pdf` do `cards-G.pdf`, `reference-metrics.json`, `physical-page-map.json`, `visual-comparison.json`, `pdf-tests.log`, `api-tests.log`, `live-smoke.json`, `live-desktop.png`, `live-mobile.png`, `live-modal.png`. Funkcionalni browser rezultati su u `.tmp/portfolio-commerce-browser/results.json`.
