# Classic QR šablon — 31. 10. 2026.

Classic i Classic Branded implementirani su u postojećem alatu `/qr-vizit-karta`, prema svih osam dostavljenih HTML prikaza 3a/3b. Oba izbora podržavaju svijetlu i tamnu boju, prednju i zadnju stranu, postojeći draft, preview i zajednički PDF/PNG izvoz.

## Dizajn

- Fotografija zauzima cijelu širinu i gornjih 36,5 mm referentnog platna. Nema profilne fotografije.
- Natpis je „ARTBOARD UMJETNIČKA KARTICA”, odnosno lokalizovani engleski tekst. Ime ostaje stvarni unos umjetnika.
- Tekstualna grupa je 9 mm od lijevog, desnog i donjeg ruba punog platna. Natpis koristi 1,7 mm, line-height 1,2 i letter-spacing 0,18 em. Ime koristi 6,8 mm, line-height 1 i letter-spacing −0,03 em. Razmak između njih je 1,6 mm.
- Classic Branded ima traku 0,6 mm na poziciji 35,9 mm preko donjeg ruba fotografije i traku 4,6 mm na dnu poleđine.
- Poleđina nema vertikalni razdjelnik ni u standardnoj ni u Branded varijanti. To je razlika u odnosu na ArtBoard Branded i Basic.
- Poleđina koristi postojeće logo fajlove, QR od 24 × 24 mm, stvarne odabrane kontakte i postojeću lokalizaciju.

HTML platno 344 × 231 CSS px normalizovano je na postojeći štamparski format 91 × 61 mm. Završni trim ostaje 85 × 55 mm. Vodiči se prikazuju samo kada su uključeni u editoru. PNG ostaje 1004 × 650 px / 300 dpi; PDF je dvostrani, sa stvarnim bleedom, TrimBox/BleedBox vrijednostima i postojećim linijama reza.

Classic koristi native bleed kroz postojeću zajedničku provjeru sposobnosti šablona. Time postojeći editor i API generator automatski koriste puni novi prikaz bez novih ruta ili paralelnog generatora. Novi Classic snapshot ima rendererVersion 2; ranije generisani istorijski fajlovi ostaju netaknuti. Generator ne učitava profilnu fotografiju koju Classic ne prikazuje.

## Tačni fajlovi ove izmjene

- `packages/qr-card-renderer/classic.cjs` — novi Classic prednji prikaz i izbor zajedničke poleđine bez razdjelnika.
- `packages/qr-card-renderer/physical.cjs` — eksplicitna opcija da raspored nema razdjelnik ni u Branded varijanti.
- `packages/qr-card-renderer/index.cjs` — registracija završenog Classic renderera i native bleeda; uklonjena njegova stara privremena grana.
- `apps/web/references/qr-classic-artifact-20261030.html` — osam originalnih HTML prikaza, samo za referentne testove.
- `apps/web/test/qr-basic.test.cjs` — prošireni zajednički testovi za Classic i stvarni PDF/PNG izvoz.
- `apps/web/test/qr-basic.browser.cjs` — vizuelno poređenje sada podržava i argument `classic`.
- `apps/web/test/qr-cards.browser.cjs` — izbor Classic šablona i njegove stvarne bleed/trim provjere.
- `apps/web/test/fixtures/qr-unchanged-render-hashes.json` — snimljeni rezultati Basic/ArtBoard i preostala dva šablona prije izmjene Classic dizajna.
- `apps/api/docs/qr-classic-20261031.md` — ovaj izvještaj.
- `apps/api/docs/qr-vizit-karta-20261030.md` — ažurirano stanje gotovih šablona.

## Provjere

| Provjera | Rezultat |
| --- | --- |
| `node --test apps/web/test/qr-basic.test.cjs` | 27/27 |
| `node --test apps/api/test/qr-cards.api.test.cjs` | 19/19, izolovana baza |
| `node apps/web/test/qr-basic.browser.cjs classic` | 9/9: osam HTML poređenja i bez runtime grešaka |
| `node apps/web/test/qr-cards.browser.cjs` | 49/49, bez browser runtime grešaka |
| `npx tsc --noEmit -p apps/web/tsconfig.json` | prolazi |
| `npm run build --workspace @artboard/api` | prolazi |
| `node apps/web/test/build-isolated.cjs` | prolazi, 57/57 stranica |

Testovi renderera obuhvataju geometriju i tipografiju, odsustvo avatara i razdjelnika, Branded trake, lokalizaciju, odabrane kontakte, uklapanje dugih imena i escaping. QR se čita iz stvarnih PNG-ova i rasterizovanih stvarnih PDF stranica za obje boje i varijante. API testovi provjeravaju postojeća prava pristupa, draft, kvotu, konkurentnost, privatna preuzimanja i greške storagea. Basic, ArtBoard, No Cover i Portret imaju identične SVG SHA-256 rezultate u odnosu na stanje prije ovog zahvata.

Vizuelni test koristi iste testne slike i iste Alcyone fontove u HTML-u i SVG-u, postojeće logo fajlove i isti stvarni testni QR. Prosječna razlika RGB kanala je 2,23–3,36 od 255. Geometrija se zasebno poredi; dopuštena je do 1 CSS px razlika HTML/SVG tekstualnog okvira imena. Postoje manje razlike rasterizacije fonta i isprekidanih vodiča; ne tvrdi se identičnost svakog piksela različitih renderera. Izvorne nedostupne `/_blob/` fotografije nijesu ugrađene u produkcioni šablon.

Rezultati: `.tmp/qr-classic/visual-results.json` i `*-comparison.png`; generisani testni Classic PDF/PNG fajlovi nalaze se u `.tmp/qr-basic/classic-*`. Rezultat editora: `.tmp/qr-browser/results.json`. Web build se provjerava u odvojenom direktorijumu da ostane očuvan aktivni razvojni server.

Prisma šema, migracije, radna baza, stvarni R2 objekti, javni header/meni/footer, pravila pretplate i Portfolio PDF generator nijesu mijenjani. Nema deploya. API/browser testovi koriste izolovane podatke i storage zamjene. No Cover i Portret ostaju privremeni do njihovih preciznih referenci.
