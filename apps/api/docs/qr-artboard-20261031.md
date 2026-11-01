# ArtBoard QR šablon — 31. 10. 2026.

Implementirani su ArtBoard i ArtBoard Branded prema svih osam dostavljenih HTML prikaza (2a–2d), u postojećem editoru `/qr-vizit-karta`. Isti renderer koriste preview, PNG i PDF. Šablon više nema oznaku privremenog dizajna.

## Tumačenje reference

- 2a: standardni tamni fotografski prednji prikaz + svijetla poleđina.
- 2b: isti standardni prednji prikaz + tamna poleđina.
- 2c: Branded tamni fotografski prednji prikaz + svijetla poleđina.
- 2d: isti Branded prednji prikaz + tamna poleđina.

Izbor boje, prema HTML-u, utiče na poleđinu; prednja strana u obje boje ostaje ista. Standardna poleđina nema vertikalni razdjelnik. Branded poleđina ima gradijentni razdjelnik i donju traku. Branded prednji prikaz ima gradijentni prsten, podvlaku ispod imena i tanku donju traku.

## Dimenzije i integracija

Referentnih 344 × 231 CSS px normalizovano je na postojeći fizički format 91 × 61 mm sa bleedom; završna kartica ostaje 85 × 55 mm.

| Element | Vrijednost iz reference |
| --- | --- |
| Fotografija | cijela površina, opacity 0,5 preko #0b0c12 |
| Profilna fotografija | 16 × 16 mm |
| Spoljašnji avatar okvir | 18,4 × 18,4 mm; prsten 0,3 mm |
| Naziv na prednjoj strani | 6,6 mm; razmak slova −0,03 em |
| Prednji natpis | 1,7 mm; razmak slova 0,18 em |
| Branded podvlaka | 12 × 0,4 mm |
| Branded donja prednja traka | 0,6 mm na dnu punog platna |
| Logo na poleđini | visina 4,4 mm; početak na 9 mm |
| QR na poleđini | 24 × 24 mm |
| Branded razdjelnik | 0,4 × 24 mm |
| Branded zadnja traka | 4,6 mm |

Pozicije centralne grupe preračunate su iz flex centriranja i oba nivoa razmaka dostavljenog HTML-a. Duža stvarna imena se uklapaju u raspoloživu širinu, kontakti se prelamaju po postojećim pravilima bez izostavljanja sadržaja. Podržani su odabrani kontakti, ME/EN i postojeći naslov poleđine.

Preview ima stvarni bleed prikaz 91 × 61 mm i opcione vodiče. PNG ostaje 1004 × 650 px / 300 dpi. Dvostrani PDF ima MediaBox/BleedBox 91 × 61 mm, TrimBox 85 × 55 mm, postojeće linije reza i stvarni profil link. ArtBoard koristi puni referentni bleed, bez razvlačenja ivica završnog PNG-a.

Tanka prednja Branded traka je u samom spoljašnjem rubu referentnog platna: vidi se u prikazu sa bleedom, a završni trim je odsijeca. To je doslovno mjesto trake iz HTML-a; nije samostalno premještana unutar reza.

Novi ArtBoard export snapshot bilježi rendererVersion 2. Već generisani istorijski fajlovi ostaju sačuvani u svom postojećem obliku. Basic ostaje na verziji 2, ostala tri privremena šablona na verziji 1.

## Tačni fajlovi ove izmjene

Implementacija:

- `packages/qr-card-renderer/artboard.cjs` — novi prednji ArtBoard prikaz i specifične definicije.
- `packages/qr-card-renderer/physical.cjs` — izdvojeni postojeći fizički raspored, poleđina, kontakti, font metrike i štamparski vodiči; podržava razliku standardnih poleđina.
- `packages/qr-card-renderer/basic.cjs` — postojeći Basic prednji prikaz koristi izdvojene zajedničke funkcije; SVG rezultat ostaje identičan.
- `packages/qr-card-renderer/index.cjs` — registracija završenog ArtBoard šablona, uklanjanje njegove prethodne privremene grane i zajednička provjera native bleeda.
- `packages/qr-card-renderer/index.d.ts` — tip postojeće provjere native bleeda.
- `apps/web/components/qr-card-editor.tsx` — primjena native bleed previewa i na ArtBoard.
- `apps/api/src/modules/qr-cards/qr-card.generator.ts` — native ArtBoard bleed za PDF.
- `apps/api/src/modules/qr-cards/qr-cards.service.ts` — verzija novog ArtBoard renderera u snapshotu izvoza.

Reference i testovi:

- `apps/web/references/qr-artboard-artifact-20261030.html` — arhiva osam korisnikovih HTML referenci, koristi se samo u testovima.
- `apps/web/test/qr-basic.test.cjs` — proširene provjere zajedničkog renderera, novog ArtBoard dizajna i stvarnog izvoza.
- `apps/web/test/qr-basic.browser.cjs` — zajednički vizuelni test; argument `artboard` bira novu referencu, bez argumenta provjerava Basic.
- `apps/web/test/qr-cards.browser.cjs` — proširen postojeći test editora na ArtBoard bleed/trim i vodiče.
- `apps/web/test/fixtures/qr-unchanged-render-hashes.json` — ranije snimljeni SHA-256 rezultati za neizmijenjeni Basic i ostala tri šablona.
- `apps/api/docs/qr-artboard-20261031.md` — ovaj izvještaj.
- `apps/api/docs/qr-vizit-karta-20261030.md` — ažurirano stanje završenih šablona.

## Rezultati provjere

| Provjera | Rezultat |
| --- | --- |
| `node --test apps/web/test/qr-basic.test.cjs` | 19/19 |
| `node --test apps/api/test/qr-cards.api.test.cjs` | 19/19, izolovana testna baza |
| `node apps/web/test/qr-basic.browser.cjs artboard` | 9/9, osam HTML poređenja + bez runtime grešaka |
| `node apps/web/test/qr-basic.browser.cjs` | 9/9, Basic regresiono poređenje |
| `node apps/web/test/qr-cards.browser.cjs` | 47/47, bez runtime grešaka |
| `npx tsc --noEmit -p apps/web/tsconfig.json` | prolazi |
| `npm run build --workspace @artboard/api` | prolazi |
| `node apps/web/test/build-isolated.cjs` | prolazi, 57/57 stranica |

Testovi stvarnog generatora čitaju QR iz generisanih PNG-ova i rasterizovanih stvarnih PDF stranica za obje boje i obje varijante. API regresija provjerava autentifikaciju, vlasništvo, draft, privatno preuzimanje, kvotu, konkurentne zahtjeve, neuspjeh storagea i istoriju. Browser provjere obuhvataju pravi Next posrednik, čuvanje, izbor šablona, preview, ZIP i različite širine ekrana.

Uspoređivanje HTML/SVG koristi iste testne slike, iste Alcyone fontove, postojeće stvarne logo fajlove i isti stvarni QR link. Nedostupne `/_blob/` fotografije nijesu ugrađene kao produkcioni sadržaj. Prosječna razlika RGB kanala je 1,71–3,36 od 255 za ArtBoard prikaze. Odvojeno se porede dimenzije/pozicije i čitljivost QR-a. Screenshotovi i mjere: `.tmp/qr-artboard/*-comparison.png`, `.tmp/qr-artboard/visual-results.json`; rezultat editora: `.tmp/qr-browser/results.json`.

Basic i ostala tri renderera imaju identične SHA-256 SVG rezultate prema snimljenom stanju prije ove izmjene. Postoje manje razlike HTML/SVG rasterizacije fontova i isprekidanih vodiča; ne tvrdi se identičnost svakog piksela između različitih renderera. Build ima postojeće informativne poruke o dinamičkom renderovanju javnih stranica i uspješno se završava.

## Granice zahvata

Nijesu mijenjani Prisma šema, migracije, radna baza, stvarni R2 objekti, pretplatnička pravila, javni header/meni/footer ni Portfolio PDF generator. Nije pokretan deploy. API/browser testovi koriste izolovanu testnu bazu, testne identitete i storage zamjene. Zadržana su ranija infrastrukturna ograničenja privatnog storagea; nova promjena ih ne proširuje.

Classic, No Cover i Portret još čekaju svoje precizne reference. Basic i ArtBoard su sada završeni šabloni u postojećem alatu.
