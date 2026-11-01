# Gradijent — stvarni PDF dizajn, 28. 10. 2026.

Gradijent je aktivan kroz postojeću karticu **Gradijent** u editoru. Naslovnice A–G, profil, izdvojeni radovi, radovi, kolekcije, CV i kontakt koriste stvarni PDF generator i podatke portfolija. Dostavljeni HTML sa 16 primjera sačuvan je u `apps/web/references/portfolio-gradient.html`.

Minimal, Rounded i Gradijent dijele obradu sadržaja, paginaciju i renderer. Izbor je sačuvan u postojećem JSON polju:

```json
{ "minimal": { "version": 1, "cover": "C", "style": "GRADIENT" } }
```

Postojeće konfiguracije bez `style` polja ostaju Minimal; `ROUNDED` ostaje Rounded. Dozvoljeni su samo poznati stilovi, naslovnice i verzija. Proizvoljni vlasnički ili dizajnerski ključevi se odbijaju. Nema Prisma izmjene ili migracije.

**Preuzeto iz reference**

| Element | Gradijent pravilo |
| --- | --- |
| Ime na naslovnicama | Bold ime i prezime |
| Portret A, C i G | Krug; G ima bijeli obrub |
| Portreti B, D, E i slike unutar dokumenta | Radius 11,3 px |
| C naslovnica | Gradijent 135°, bijela kartica sa insetom 26,5 px i radiusom 18,9 px; portret y 294,8 i ime y 597,2 |
| F naslovnica | Bijela kartica radiusa 18,9 px; gradijentna kapsula sa bijelim tekstom; QR kartica radiusa 15,1 px |
| G naslovnica | Sivi veliki naslov, gradijentne linije, vertikalni gradijentni panel; zaobljeni samo spoljašnji uglovi panela i velike slike |
| Naslovi unutrašnjih stranica | 29,33 px, `#3a3a40`, gradijentna linija ispod |
| Profil | Kratka gradijentna linija uz moto i vertikalni gradijentni razdjelnik |
| CV i kontakt | Gradijentne crtice; kontakt ima liniju ispod završne slike |
| Podnožje | Bez dodatne Minimal razdjelne linije |

Gradijenti su PDF vektorski ispuni, sa smjerovima i stanicama boja iz HTML-a: `#0d74ff` 0%, `#783cff` 28%, `#fe171d` 56%, `#ffd31b` 100%. G panel koristi zaseban vertikalni niz 0% / 55% / 100%. Geometrija se skalira iz formata 794 × 1123 px; nije ugrađena statična slika stranice.

**Funkcionalnost i provjere**

- **23/23 PDF testa**: novi Gradijent i regresije Minimal/Rounded/CV, svih sedam naslovnica, pozicije imena, dijakritika, kolekcije, dugi tekstovi, Letter, zaseban CV i watermark na nastavnim stranicama.
- **55/55 API testova** na izolovanim bazama: vlasništvo, sačuvaj/ponovo otvori, neispravna konfiguracija, privremeni preview bez prepisivanja, Guest Gradijent snapshot bez drafta ili storage upisa, postojeće kolekcije, kvote i kupovine.
- **28/28 browser provjera**: minijature sva tri implementirana stila, C okvir, modal, Guest izbor i snapshot kupovine, prelazak Minimal → Rounded → Gradijent, ponovno otvaranje G naslovnice, stvarni PDF preview, oznaka Gradijent prema istorijskom manifestu, Free/Premium tokovi i odsustvo runtime grešaka.
- Vizuelno poređenje svih 16 referentnih primjera na 794 × 1123 px. Gradijentne boje i smjer na C i G numerički su upoređeni sa Chrome prikazom HTML-a; provjerene su i F oznaka, kontakt linija i isijecanje uglova slika.
- Prosječna apsolutna RGB razlika sedam naslovnica iznosi 0,66–2,96 na skali 0–255. Ovo nije procenat identičnih piksela. Ostaju razlike browser/PDF rasterizacije i dinamičkog sadržaja.
- Lokalni Guest editor, modal i prikaz na 1440 px i 390 px prolaze bez API upisa, horizontalnog preliva ili runtime grešaka.
- API/web TypeScript i `npm run build` prolaze; scoped `git diff --check` prolazi.

**Fajlovi ovog nastavka**

- `packages/portfolio-document-plan/minimal.cjs`, `index.d.ts` — dozvoljeni GRADIENT stil i zajednička oznaka dizajna.
- `apps/api/src/modules/portfolio-projects/portfolio-minimal.pages.ts` — vektorski gradijenti, asimetrični uglovi i razlike svih stranica iz reference.
- `apps/api/src/modules/portfolio-projects/portfolio-guest.service.ts` — zajednička poruka validacije PDF dizajna.
- `apps/web/components/portfolio-builder-editor-shell.tsx`, `portfolio-design-workspace.tsx`, `portfolio-design-preview-markup.json` — izbor, čuvanje, ponovno otvaranje, sedam minijatura i lokalna Guest naslovnica.
- `apps/web/components/portfolio-export-workspace.tsx`, `portfolio-pdf-preview.tsx` — odgovarajuća oznaka trenutnog i istorijskog dizajna.
- `apps/web/references/portfolio-gradient.html` — originalna referenca.
- `apps/api/test/portfolio-gradient.test.cjs`, `portfolio-rounded.test.cjs`, `portfolio-collections.api.test.cjs`, `portfolio-commerce.api.test.cjs` — novi i prilagođeni testovi za sva tri podržana stila.
- `apps/web/test/portfolio-commerce.browser.cjs`, `portfolio-minimal.visual.cjs` — funkcionalna i vizuelna provjera, uključujući `--gradient` opciju.
- Ovaj izvještaj i linkovi u `portfolio-export-commerce-status.md`, `portfolio-rounded-template-20261028.md`.

**Obuhvat**

Radna baza, stvarni portfolio podaci i R2 objekti nijesu mijenjani. Testovi koriste izolovane baze i storage mock. Nema stvarne naplate, trošenja korisničke kvote, čišćenja podataka ili deploya. Nijesu redizajnirani header, sidebar ili drugi koraci.

Guest izbor ostaje u memoriji otvorene stranice i prenosi se u postojeći snapshot samo prilikom eksplicitne pripreme kupovine. Zaseban CV, izbor PDF stranica i postojeća ograničenja ostaju očuvani. Pravi Guest PDF preview je u Izvozu; stare unutrašnje male ilustracije desnog Guest panela ostaju ilustrativne. Za stvarni clean izvoz i dalje važi postojeći uslov privatnog R2 bucketa; AllSecure nije aktiviran.

Editorijal, Kartice, Blok i miješanje novih stilova ostaju prototipi. Slike i brojevi stranica dolaze iz stvarnog dokumenta, pa mogu odstupati od demonstracionog sadržaja HTML-a. Kontakt koristi izabranu naslovnu fotografiju; referentni primjer može koristiti drugačije kadriran original istog rada.

Primjeri i mjerenja: `.tmp/portfolio-gradient/gradient-A.pdf` do `gradient-G.pdf`, `reference-metrics.json`, `visual-comparison.json`, `live-desktop.png`, `live-mobile.png`, `live-modal.png`. Rezultati funkcionalnog browser paketa su i u `.tmp/portfolio-commerce-browser/results.json`.
