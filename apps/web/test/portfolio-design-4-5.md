# Portfolio Builder — Dizajn, vizuelna podfaza

Napravljen je centralni tab **05 Dizajn** prema dostavljenom HTML-u i screenshotovima.
Pravi šabloni i njihovo povezivanje sa PDF generatorom ostaju za narednu funkcionalnu
podfazu, prema izričitom zahtjevu korisnika.

## Izmijenjeni/dodati fajlovi

- `apps/web/components/portfolio-design-workspace.tsx` — šest kartica stilova,
  sedam naslovnica, izbor po sekcijama, uvećani pregled i navigacija.
- `apps/web/components/portfolio-design-workspace.module.css` — izolovani stilovi
  iz reference, responsive ponašanje i modal prema screenshotu.
- `apps/web/components/portfolio-design-preview-markup.json` — 17 jedinstvenih
  statičkih minijaturnih prikaza izdvojenih iz originalnog HTML-a.
- `apps/web/components/portfolio-builder-editor-shell.tsx` — povezivanje novog
  prikaza, lokalno stanje izbora i postojeća PDF podešavanja u zasebnom disclosure-u.
- `apps/web/references/portfolio-dizajn.html` — neizmijenjeni korisnikov HTML.
- `apps/web/test/portfolio-design.browser.cjs` — poređenje sa referencom i izolovani
  testovi kontrola, modala, ograničenja i postojećeg čuvanja.
- `apps/web/test/portfolio-profile.browser.cjs` — postojeća podešavanja sada se
  otvaraju kroz disclosure; namjerno promijenjena visina Design kolone izuzeta je
  iz stare provjere, dok položaj/širina i okolni layout ostaju provjereni.
- Ovaj izvještaj.

Nijesu mijenjani `globals.css`, postojeći shell CSS, backend, Prisma, baza, R2,
PDF generator, prava Free/Premium, Guest checkout ili drugi koraci. Nije bilo
migracija, brisanja ili deploya.

## Šta radi u novom prikazu

- Kartice **Minimal, Tačke, Gradijent, Editorijal, Kartice i Blok** sa po dva
  minijaturna lista, originalnim paddingom, izabranim/neizabranim stanjem i radio oznakom.
- Horizontalni izbor **A–G**: Velika slika, Ime gore, Centrirano, Portret,
  Vertikalno, QR kartica i Magazin; početni izbor je E kao u dostavljenoj referenci.
- Dugme **Uvećaj** otvara pravi modal sa listom, izborom A–G, strelicama,
  tastaturom, kružnim prelaskom G→A, Escape zatvaranjem i vraćanjem fokusa.
  Pozadina ne skroluje dok je modal otvoren.
- **Jedan stil / Po sekcijama**, sa šest lokalnih izbora za Premium. Free i legacy
  korisnici zadržavaju zaključano kombinovanje po sekcijama.
- Izbor novog izgleda preživljava navigaciju između tabova u istoj stranici,
  ali se resetuje nakon refresha. Ne šalje se backendu i ne čuva se u storage-u.
- Navigacija **CV → Dizajn → Izvoz**; legacy režim zadržava prethodni korak Radovi.

## Postojeće PDF funkcije i granica podfaze

Backend trenutno podržava tri postojeća `PortfolioTemplate` tipa, dok referenca
ima šest novih stilova i varijante naslovnica. Nije uvedeno proizvoljno mapiranje
novih naziva na pogrešne postojeće šablone.

Dosadašnji izbor tri šablona, format, jezik, font, ArtBoard potpis i postojeći
Premium custom mix ostaju funkcionalni pod **Aktuelna PDF podešavanja**.
Njihov postojeći adapter, payload i serverske provjere ostaju nepromijenjeni.
Nova vizuelna podešavanja su zasebno lokalno stanje: nijesu `designConfig`
poslat serveru i ne mijenjaju aktuelni PDF ili desni stvarni PDF preview.

Poslije lokalnog izbora header prikazuje „Dizajn · prikaz”. Vidljiva napomena
objašnjava da se radi o budućim šablonima. Ako korisnik sačuva postojeća PDF
podešavanja ili druge portfolio podatke, poruka razlikuje sačuvane podatke od
privremenog novog izgleda. CV privremeni status ostaje očuvan.

Originalni tekstovi u dizajnu opisuju ciljnu PDF funkcionalnost. Njihova veza sa
stvarnim dokumentom još nije uvedena. Nema novog generatora ili izmjene PDF dizajna.

## Minijature i reference

Prikazi kartica i naslovnica koriste dostavljeni HTML sa `cqw` mjerama, a ne
novi proizvoljni crtež ili novi PDF renderer. Originalni blob URL-ovi zamijenjeni
su kontrolisanim tokenima za portfolio naslovnu sliku, portret i postojeće ArtBoard
logotipe. Ako slike nema, prikazuje se jednostavna ilustrativna zamjena. QR je
označen kao vizuelni uzorak, bez lažnog skenirajućeg linka.

Markup je statički pregledan i provjeren da ne sadrži skripte, event handlere
ili originalne blob izvore. Dinamični tekst i URL vrijednosti se HTML-escape-uju.
Ilustrativni `h1` elementi pretvoreni su u `div` kako ne bi bili stvarni naslovi
dokumenta i da globalni studio stil ne prepiše njihove originalne mjere.

Referenca sadrži sve Minimal A–G prikaze i po dva prikaza za ostale stilove.
Za nedostajuće kombinacije koristi se referentni Minimal raspored, uz vidljivo
objašnjenje da završni izgled tog stila dolazi kasnije. Ne tvrdi se da su svi
budući šabloni već implementirani. Modal je rekonstruisan prema screenshotu,
jer njegov HTML/CSS nije uključen u dostavljeni centralni `<main>`.

## Mjerenja i rezultati

Prije izmjena snimljeni su TSX i postojeći shell CSS. Poređenje se vrši sa
originalnim HTML-om na istoj širini i položaju kolone, na **1880, 1536, 1440,
1280, 1024, 768, 440, 375 i 320 px**.

Provjereni su položaji i dimenzije naslova, grida, kartica, papirnih minijatura,
oznaka izbora, naslovnica, slidera i Premium panela. Stilovi iz inline HTML-a
se poklapaju; numerička tolerancija je ispod 1 px zbog browser zaokruživanja.

| Element | Referenca i implementacija |
| --- | --- |
| Razmak sekcija | 18 px |
| Grid stilova | do 3 kolone, min. 150 px, gap 16 px |
| Kartica stila | padding 14 px, radius 22 px, gap 14 px |
| Prikaz dva lista | 4:3, radius 14 px, razmak 7% |
| List minijature | visina 86%, odnos 794:1123 |
| Naziv stila | 16 px, 800 |
| Radio | 22 px, unutrašnja oznaka 8 px |
| Naslovna/Premium kartica | padding clamp(20px, 2.4vw, 30px), radius 22 px |
| Cover slider | gap 14 px, opcija 124 px |
| Naslovnica | padding 3 px, gradient selekcija, papir radius 5 px |
| Uvećaj | visina 34 px, font 12 px / 800 |
| Mix kontrola | padding 4 px, gap 4 px, dugmad 34 px |

- **49/49 novih browser provjera**, devet viewport širina, bez runtime grešaka.
- **503 postojeće browser provjere** Podataka i okolnog layouta prolaze.
- **28/28 unit provjera** Guest adaptera i pristupa privatnim projektima prolaze.
- Web TypeScript i puna web build provjera prolaze.

Novi skup testira lokalni izbor, navigaciju, modal i fokus, Premium ograničenja,
čuvanje postojeća tri šablona i jezika, odsustvo novih prototipskih polja u API
payload-u, reset nakon refresha, modal na uskim ekranima i escaping dinamičnog teksta.
Sve upise u testu presreće izolovani transport — nijesu mijenjani stvarni podaci
ili R2 fajlovi. PDF odgovor u vizuelnom testu je kontrolisani testni odgovor;
postojeći renderer nije mijenjan ovom podfazom.

Dokazi: `.tmp/portfolio-dizajn-4-5/results.json`, `design-1536.png`, `design-375.png`,
`design-320.png`, `reference-*` snimci, originalni TSX/CSS, `podaci-regression.log`,
`unit.log` i `web-build.log`. Lokalni projekat ostaje na `http://localhost:3000`.
