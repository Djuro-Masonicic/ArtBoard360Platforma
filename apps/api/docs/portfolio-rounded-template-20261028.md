# Rounded (Tačke) — 28. 10. 2026.

**Sljedeći nastavak:** [Gradijent](portfolio-gradient-template-20261028.md) je sada implementiran. Tvrdnje ispod da je Gradijent prototip opisuju stanje prije tog nastavka.

Rounded je povezan sa stvarnim PDF generatorom i postojećom karticom **Tačke** u editoru. Implementirane su naslovnice A–G, profil, izdvojeni radovi, samostalni radovi, uvod kolekcije i njeni radovi, CV i kontakt. Korisnički HTML sa svih 16 primjera sačuvan je u `apps/web/references/portfolio-rounded.html`.

Koristi se zajednički Minimal/Rounded raspored, obrada podataka i paginacija. Rounded je izričit izbor u postojećem JSON polju:

```json
{ "minimal": { "version": 1, "cover": "F", "style": "ROUNDED" } }
```

Bez `style` polja prethodni Minimal projekti zadržavaju svoj izgled. `style`, verzija, naslovnica i dozvoljeni ključevi strogo se validiraju; ova konfiguracija ne daje pravo pristupa projektu. Nema novog Prisma enum-a, polja, šeme ili migracije. Guest transport prenosi isti dozvoljeni izbor; snapshot kupovine i manifest PDF verzije čuvaju izabrani stil. Istorija prikazuje Rounded prema manifestu konkretne verzije.

**Razlike preuzete iz HTML-a**

| Element | Rounded pravilo |
| --- | --- |
| Ime na svih sedam naslovnica | I ime i prezime koriste bold |
| A i C portret | Krug |
| B, D, E portret | Radius 22,7 px |
| D glavna slika | Radius 22,7 px |
| F QR kartica / bijela kartica | Radius 26,5 / 18,9 px |
| F oznaka | Žuta `#ffd31b`, crni tekst, oblik kapsule |
| G crni panel / velika slika | Radius 22,7 px |
| G portret | Krug sa bijelim obrubom |
| Unutrašnji naslovi | ArtBoard znak, tekst 21,33 px na x 102,4; bez Minimal linije ispod |
| Početak unutrašnjeg sadržaja | y 136,1 px, umjesto Minimal y 151,2 |
| Grid, radovi, kolekcije i kontakt slike | Radius 22,7 px |
| Kontakt QR kartica | Radius 26,5 px |
| Podnožje | Bez Minimal razdjelne linije |

Dimenzije su preuzete iz izvornog formata 794 × 1123 px i skaliraju se u PDF. Slike uz samu ivicu na naslovnicama A, B, E i F ostaju ravne prema referenci. Kod pojedinačnih radova zaobljenje se primjenjuje na stvarni okvir slike koja koristi `contain`, umjesto na prazni prostor oko nje.

**Provjere**

- **19/19 PDF testova** — Rounded, regresioni Minimal i postojeći CV: naslovnice, bold ime, koordinate, unutrašnji naslovi, radovi u kolekciji, CV-only, Letter, dugi sadržaj i watermark na nastavnim stranicama.
- **53/53 API testa** na novim izolovanim bazama — čuvanje i ponovno otvaranje Rounded izbora, preview bez prepisivanja, neispravni stilovi i pokušaji pristupa tuđim projektima, postojeće kolekcije, kvote i kupovine.
- **26/26 browser provjera** — Minimal i Rounded minijature, Guest izbor bez drafta, modal, snapshot kupovine, prelazak Minimal → Rounded, ponovno otvaranje stila i naslovnice, realni preview, istorijski manifest i oznaka Rounded, Free/Premium tokovi i izostanak runtime grešaka.
- Poređenje svih sedam naslovnica i devet unutrašnjih primjera sa HTML-om na 794 × 1123 px. Prosječna apsolutna RGB razlika naslovnica je 0,67–2,96 na skali 0–255; ovo nije procenat identičnih piksela.
- Dodatne provjere rasterizovanog PDF-a potvrđuju odsječene uglove, vidljivu unutrašnjost slika, kružne portrete, izostanak razdjelnih linija i žutu F oznaku. Rezultat: `.tmp/portfolio-rounded/visual-comparison.json`.
- API i web TypeScript provjere i `npm run build` prolaze.
- Lokalni editor je provjeren na 1440 px i 390 px: bez horizontalnog preliva, API upisa ili browser runtime grešaka. Snimci su `live-desktop.png` i `live-mobile.png` u `.tmp/portfolio-rounded/`.
- `git diff --check` za obuhvaćene fajlove prolazi.

**Izmijenjeni fajlovi**

- `packages/portfolio-document-plan/minimal.cjs`, `index.d.ts` — validirani izbor Rounded varijante uz kompatibilnost starih Minimal zapisa.
- `apps/api/src/modules/portfolio-projects/portfolio-minimal.pages.ts` — zajednički renderer sa razlikama iz reference i stvarnim clip putanjama.
- `apps/api/src/modules/portfolio-projects/portfolio-guest.service.ts` — poruka validacije za oba podržana stila; postojeća pravila Guest snapshot-a ostaju ista.
- `apps/web/components/portfolio-builder-editor-shell.tsx` — izbor, čuvanje i ponovno otvaranje Rounded stila i naslovnice, lokalna naslovnica u Guest panelu.
- `apps/web/components/portfolio-design-workspace.tsx`, `portfolio-design-preview-markup.json` — sedam stvarnih Rounded minijatura, QR i modal; ispravne oznake funkcionalnog stila.
- `apps/web/components/portfolio-export-workspace.tsx`, `portfolio-pdf-preview.tsx`, `apps/web/types/api.ts` — oznaka Rounded u preview-u, Izvozu i istoriji prema konkretnom manifestu.
- `apps/web/references/portfolio-rounded.html` — dostavljena referenca.
- `apps/api/test/portfolio-rounded.test.cjs`, `portfolio-collections.api.test.cjs` — novi PDF testovi i proširene vlasničke API provjere.
- `apps/web/test/portfolio-commerce.browser.cjs`, `portfolio-minimal.visual.cjs` — browser provjere oba stila i prošireni zajednički vizuelni test sa `--rounded` opcijom.
- Ovaj izvještaj, `portfolio-minimal-template-20261027.md` i `portfolio-export-commerce-status.md` — aktuelni status i linkovi.

**Obuhvat i preostala ograničenja**

Radna baza, stvarni projekti i R2 objekti nijesu mijenjani. API i commerce testovi koristili su izolovane baze i storage mock. Nije bilo stvarnog plaćanja, trošenja korisničke kvote ili deploya. Header, sidebar, drugi koraci i postojeća poslovna ograničenja nijesu redizajnirani.

Guest izbor i slike ostaju u memoriji trenutne stranice do izričite pripreme kupovine; refresh briše nezavršeni rad. Puni Guest PDF pregled dostupan je u Izvozu; stare male unutrašnje ilustracije desnog Guest panela nijesu stvarni PDF. Minimal je očuvan, a Gradijent, Editorijal, Kartice, Blok i miješanje novih stilova ostaju prototipi.

Razlike rasterizacije browser/PDF fontova i slika ostaju. Primjer kontakta koristi izabranu naslovnu fotografiju, dok statični HTML može koristiti drugačiji originalni fajl istog rada. Brojevi stranica dolaze iz stvarnog dokumenta. Za stvarni čist izvoz i dalje važi postojeći uslov privatnog R2 bucketa; AllSecure nije aktiviran ovim paketom.

Kompletni primjeri: `.tmp/portfolio-rounded/rounded-A.pdf` do `rounded-G.pdf`. Snimci svih referenci i PDF stranica nalaze se u istom direktorijumu.
