# Portfolio Builder — vizuelna rekonstrukcija taba Radovi

> Naknadno je povezan vizuelni CV tab: [CV podfaza](./portfolio-cv-4-4.md).
> U šestokoračnom režimu Radovi sada vode na CV, pa zatim na Dizajn. Ranija
> napomena o preskakanju CV-a ispod odnosi se na stanje prilikom ove isporuke.

Implementiran je centralni tab prema dostavljenom HTML-u. Original je sačuvan
u `apps/web/references/portfolio-radovi.html`. Screenshotovi služe kao dodatna
referenca; dimenzije nijesu preuzimane iz browser zoom-a na screenshotovima.

## Izmijenjeni/dodati fajlovi

- `apps/web/components/portfolio-builder-editor-shell.tsx` — povezivanje nove
  površine Radova i postojećeg adaptera; priprema inline izmjena za Sačuvaj draft.
- `apps/web/components/portfolio-works-workspace.tsx` — centralni prikaz iz reference.
- `apps/web/components/portfolio-works-workspace.module.css` — izolovani stilovi.
- `apps/web/references/portfolio-radovi.html` — original korisnikove reference.
- `apps/web/test/portfolio-works.browser.cjs` — izolovano poređenje prije/poslije,
  originalni HTML, unos, čuvanje, greške, navigacija i Guest adapter.
- `apps/web/test/portfolio-profile.browser.cjs` — za namjerno promijenjeni Radovi
  layout porede se položaj i širina kolone; ostale postojeće provjere ostaju.
- Ovaj izvještaj.

Nijesu mijenjani globals.css, postojeći shell CSS, header, sidebar, Kolekcije,
backend, Prisma šema, baza, storage, PDF generator ili checkout. Nije bilo
migracija, brisanja, deploya niti aktiviranja Guest memorijskog toka za korisnike.

## Prikaz

Zamijenjeni su raniji naslov, široke kartice sa prekidačima i modalni unos:

- Naslov „Radovi i detalji” i tačan podnaslov iz reference.
- Sažetak sa brojem efektivno izabranih radova, progresom prema 30 radova,
  preporukom i dugmetom „Izbor radova”.
- Bijela kartica „Radovi u portfoliju”, grid 112 px / gap 14 px, slike 4:5,
  crna ivica izbora i numeracija prema postojećem PDF planu.
- Kartica „Detalji radova” sa stalno otvorenim nazivom, tehnikom, dimenzijama,
  godinom i opcionim opisom za radove koji ulaze u PDF.
- Originalne boje, Alcyone, razmaci, radiusi i donje navigacione kontrole.
  Tamna tema koristi postojeće boje studija; primarna HTML referenca je svijetla.

## Unos i postojeće funkcije

Prijavljeni korisnik uređuje detalje lokalno, zatim ih čuva postojećim dugmetom
**Sačuvaj draft**. Izmjene preživljavaju prelazak na drugi tab unutar otvorenog
editora. Čuvaju se samo promijenjena polja rada kroz postojeći adapter; cijena,
status i drugi metapodaci se ne prazne. V2 zahtjevi slijede posljednju uspješnu
reviziju. Ako zahtjev ne uspije, unos ostaje dostupan za ponovni pokušaj.

Postojeći API čuva pojedinačne zahtjeve zasebno: ako se uređuje više radova,
uspješno sačuvan raniji rad se ne poništava pri grešci kasnijeg zahtjeva. Nije
uvođena nova bulk transakcija ili API ruta u ovoj vizuelnoj izmjeni.

Izbor radova i drag-and-drop zadržavaju postojeće handler-e i pravila Kolekcija.
„Izbor radova” vodi na postojeći korak Kolekcije za prijavljene projekte sa tim
korakom; legacy/privremeni režim koristi postojeći file picker. Nije uvedeno novo
pravilo da klik automatski presloži PDF. Izmjene važe za portfolio, a ne za profil.

Dormantni Guest adapter radi sa istim prikazom. Slike i izmjene su lokalne,
bez mrežnih upisa, i gube se nakon refresha. Preview nakon čuvanja koristi
postojeći tok; nije dodata nova serverska obrada za nesačuvane detalje radova.

## Odstupanja i odloženo

- Referenca ima „Dalje: CV”. CV još nije implementiran, pa navigacija i dalje
  vodi na **Dizajn**. Nije dodato lažno funkcionalno CV dugme.
- Na ekranima do 360 px thumbnail i detalji se slažu vertikalno, jer fiksnih
  84 px + 18 px + minimalnih 150 px iz sirovog HTML-a inače prelazi dostupnu širinu.
  Do 340 px smanjen je horizontalni padding navigacije radi dužeg teksta „Dizajn”.
- „Do 40 riječi” je tekst iz reference; novo tvrdo ograničenje ili izmjena backend
  validacije nijesu uvedeni. Dodatne kontrole za metapodatke kojih nema u referenci
  ostavljene su za zaseban funkcionalni korak; sačuvane vrijednosti ostaju.
- Testne slike su sintetičke. Nijesu rekonstruisani tuđi blob URL-ovi ili ilustracije.

## Mjerenja i provjere

Prije izmjena sačuvani su izvorni TSX i CSS. Browser je renderovao i to prethodno
stanje i novi prikaz, zajedno sa originalnim HTML-om na istoj širini kolone.
Pozicije, fontovi i geometrija poređeni su na 1880, 1536, 1440, 1280, 1024,
768, 440, 375 i 320 px. Odstupanje numeričkih mjera pri poređenju je ispod 1 px
zbog browser zaokruživanja; desktop vrijednosti stila se poklapaju:

| Element | Original HTML | Implementacija |
| --- | --- | --- |
| Padding kartice, desktop | 30 px | 30 px |
| Radius kartice | 22 px | 22 px |
| Razmak sekcija | 18 px | 18 px |
| Grid | min. 112 px, gap 14 px | isto |
| Slika u gridu | 4:5, radius 12 px | isto |
| Oznaka izbora | 24 px | 24 px |
| Thumbnail detalja | 84 × 105 px | 84 × 105 px |
| Polja | 44 px, radius 12 px | 44 px, radius 12 px |
| Padding inputa | 0 14 px | 0 14 px |
| Font inputa | 14 px / 600 | 14 px / 600 |

Na 1536 px kolona je 795.44 px, unutrašnji grid 735.44 px i ima pet kolona
od približno 135.89 px — isto kao original pri toj dostupnoj širini.

- **44/44 browser provjere**, devet širina: referenca, prethodno stanje,
  čuvanje/ponovno učitavanje Free/Premium/legacy, greške i memorijski Guest.
- **27/27 završnih browser provjera**, 1536/375/320 px, poslije dorade navigacije:
  stilovi navigacije, očuvanje nesačuvanog unosa između tabova i prethodne funkcije.
- **504 postojeće browser provjere** prolaze, uključujući Podaci i okolni layout.
- **28/28 unit provjera** Guest adaptera i portfolio pristupa/proxy-ja prolazi.
- Web TypeScript prolazi; puna web build provjera i izolovani završni Next build prolaze.
- Nema browser runtime izuzetaka.

Sve API izmjene u browser testu presreće izolovani testni transport. Nema upisa
u stvarnu bazu ili R2. PDF transport u ovom vizuelnom harness-u je namjerno
zamijenjen kontrolisanim odgovorom; stvarni generator i desni panel nijesu
mijenjani ovom podfazom.

Dokazi su u `.tmp/portfolio-radovi-4-3/`: `results.json`, `results-focused.json`,
snimljeni izvorni fajlovi, `before-*`, `after-*`, `reference-*` screenshotovi,
`podaci-regression.log`, `unit.log` i build logovi. Artefakti su ignorisani u Gitu.
