# Portret i Portret Branded — 31. 10. 2026.

Implementiran je dostavljeni Portret šablon (5a/5b), standardni i Branded, za obje boje i strane. Isti renderer koristi se u kartici izbora, live previewu, prikazu sa bleedom i stvarnom PDF/PNG izvozu.

## Odvajanje od Profilne i kompatibilnost

Profilna iz prethodnog priloga je poseban dizajn sa kružnom profilnom fotografijom. Ostaje dostupna pod svojim postojećim ID-jem `portrait`. Novi **Portret** koristi vertikalnu sliku izabranog rada i ID `portrait-artwork`. Time se postojeći Profilna draftovi ne pretvaraju u drugi dizajn. Katalog sada ima šest izbora: Basic, ArtBoard, Classic, Clean, Profilna i Portret.

Novi ID se čuva u postojećem JSON podešavanju, uz proširen dozvoljeni DTO i TypeScript tip. Prisma šema i migracija nijesu potrebne. Novi izvozi koriste postojeći rendererVersion 2, dok već generisani istorijski fajlovi ostaju sačuvani u svom obliku.

## Prenesena geometrija

| Element | HTML referenca |
| --- | --- |
| Vertikalna slika rada | desnih 38 mm, puna visina |
| Tekstualna grupa | lijevo/dolje 9 mm; širina 39 mm |
| Standardni tekstualni razdjelnik | 0,25 mm, u boji prema podlozi |
| Branded tekstualni razdjelnik | 0,4 mm, vertikalni gradijent |
| Razmak razdjelnika i teksta | 2,4 mm |
| Natpis | 1,7 mm; line-height 1,2; letter-spacing 0,18 em |
| Ime | 6,4 mm; line-height 1; letter-spacing −0,03 em |
| Razmak natpisa i imena | 1,6 mm |
| Branded razdjelnik uz sliku | 0,6 mm, puna visina |
| QR poleđine | 24 × 24 mm |
| Branded poleđina | razdjelnik 0,4 × 24 mm i donja traka 4,6 mm |

Ime se prirodno prelama prema širini kolone: „Ivona Medenica” je u dvije linije kao u referenci. Duga imena se dodatno prelamaju, uz smanjenje fonta kada je potrebno; sadržaj se ne skraćuje i ne prelazi u sliku. Naziv i kontakti se bezbjedno kodiraju kao tekst. Standardna poleđina nema vertikalni razdjelnik, dok ga Branded ima.

Izvoz zadržava postojeći fizički format: završna kartica 85 × 55 mm, puni bleed 91 × 61 mm. PNG je 1004 × 650 px / 300 dpi; PDF ima dvije strane, TrimBox/BleedBox i linije reza. Priloženo platno 344 × 231 CSS px normalizovano je na puni štamparski format. Vodiči u editoru nijesu dio eksportovanog artworka.

Portret učitava samo izabranu sliku rada, bez profilne fotografije. Primjenjuje se postojeća provjera da naslovna/izabrana slika pripada prijavljenom umjetniku. Podmetnuti tuđi ID ne prolazi, a tuđi korisnik nema pristup izvozu. Standard/Branded, boja, jezik, naslov poleđine i odabrani kontakti prolaze kroz postojeći draft/snapshot tok.

## Tačno izmijenjeni fajlovi

- `packages/qr-card-renderer/portret.cjs` — novi Portret renderer, prelom imena i Branded geometrija.
- `packages/qr-card-renderer/physical.cjs` — postojeće mjerenje teksta izloženo za novi renderer; izlaz ranijih renderera ostaje nepromijenjen.
- `packages/qr-card-renderer/index.cjs` — šest izbora i odgovarajuće mogućnosti Portret šablona.
- `packages/qr-card-renderer/index.d.ts` — novi dozvoljeni ID u tipu podešavanja.
- `apps/api/src/modules/qr-cards/qr-cards.dto.ts` — dozvoljen novi ID, uz postojeću strogu validaciju ostalih podataka.
- `apps/web/references/qr-portret-artifact-20261031.html` — svih osam originalnih HTML referenci za testiranje.
- `apps/web/test/qr-basic.test.cjs` — geometrija, prelom teksta, slike, kompatibilnost i stvarni PNG/PDF izvoz.
- `apps/web/test/qr-basic.browser.cjs` — referentno poređenje kroz argument `portret`.
- `apps/web/test/qr-cards.browser.cjs` — izbor, slike, Branded kontrole, bleed, save/reload novog drafta.
- `apps/web/test/fixtures/qr-unchanged-render-hashes.json` — snimljeni rezultati svih pet prethodnih dizajna prije ove izmjene.
- `apps/api/test/qr-cards.api.test.cjs` — novi DTO, odbijanje tuđe slike bez upisa, čuvanje, izvoz i privatni pristup.
- `apps/api/docs/qr-portret-20261031.md` — ovaj izvještaj.
- `apps/api/docs/qr-vizit-karta-20261030.md` — ažurirano stanje kataloga.

Editor i API generator ne zahtijevaju posebne nove grane: koriste postojeći zajednički registar i njegove mogućnosti. Nijesu mijenjani header, meni, footer, stilovi drugih stranica ili Portfolio PDF generator.

## Rezultati provjera

| Provjera | Rezultat |
| --- | --- |
| `node --test apps/web/test/qr-basic.test.cjs` | 49/49 |
| `node --test apps/api/test/qr-cards.api.test.cjs` | 21/21, izolovana baza |
| `node apps/web/test/qr-basic.browser.cjs portret` | 9/9, osam poređenja i bez runtime grešaka |
| `node apps/web/test/qr-cards.browser.cjs` | 65/65, bez browser runtime grešaka |
| `npx tsc --noEmit -p apps/web/tsconfig.json` | prolazi |
| `npm run build --workspace @artboard/api` | prolazi |
| `node apps/web/test/build-isolated.cjs` | prolazi, 57/57 stranica |

Testovi čitaju QR iz stvarno generisanih PNG-ova i rasterizovanih PDF stranica za obje boje i obje varijante. API test potvrđuje snapshot izabrane vlasničke slike, odbijanje tuđe slike bez promjene drafta, idempotentnost ponovljenog zahtjeva i odbijanje tuđeg preuzimanja.

Svih pet prethodnih dizajna imaju identične SHA-256 SVG rezultate u odnosu na stanje prije ovog zahvata. HTML/SVG poređenje koristi iste Alcyone fontove, postojeće logo fajlove, iste testne slike i isti stvarni QR link. Prosječna razlika RGB kanala novih prikaza je 2,43–3,36 od 255. Ostaju male razlike rasterizacije teksta i isprekidanih vodiča između HTML-a i SVG-a; ne tvrdi se identičnost svakog piksela. Nedostupna izvorna `/_blob/` slika zamijenjena je istom testnom slikom na obje strane poređenja, bez ugrađivanja demo sadržaja u produkciju.

Rezultati: `.tmp/qr-portret/visual-results.json`, `*-comparison.png` i `*-tests.log`; browser editor `.tmp/qr-browser/results.json`; stvarni testni izvozi `.tmp/qr-basic/portrait-artwork-*`.

Radna baza, stvarni R2 objekti, Prisma šema, migracije i pretplatnička pravila nijesu mijenjani. Testovi koriste izolovane podatke i storage zamjene. Nema deploya. Postojeći draftovi i istorijski fajlovi ostaju sačuvani.
