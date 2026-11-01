# Portfolio Builder — CV, vizuelna podfaza

Istorijski izvještaj vizuelne podfaze. CV čuvanje i portfolio PDF integracija su u međuvremenu povezani; aktuelno stanje i testovi su u [funkcionalnom planu](../../api/docs/portfolio-builder-functional-roadmap.md).

Napravljen je centralni tab **04 CV** prema dostavljenom HTML-u i screenshotovima.
Ovo je vizuelna i lokalna priprema forme, a ne završena serverska CV funkcionalnost.
Originalna referenca: `apps/web/references/portfolio-cv.html`.

## Izmijenjeni/dodati fajlovi

- `apps/web/components/portfolio-cv-workspace.tsx` — osam sekcija, lokalni redovi,
  unos, dodavanje/uklanjanje, pregled postojećih CV podataka i navigacija.
- `apps/web/components/portfolio-cv-workspace.module.css` — izolovani stilovi iz reference.
- `apps/web/components/portfolio-builder-editor-shell.tsx` — aktiviranje rezervisanog
  CV taba u šestokoračnom režimu, lokalno stanje forme, status privremenog CV-a
  i sprečavanje lažnog čuvanja.
- `apps/web/components/portfolio-works-workspace.tsx` — parametar narednog koraka;
  Radovi sada vode na CV u šestokoračnom režimu.
- `apps/web/references/portfolio-cv.html` — neizmijenjeni korisnikov HTML.
- `apps/web/test/portfolio-cv.browser.cjs` — reference i izolovani browser testovi.
- `apps/web/test/portfolio-works.browser.cjs` — očekivana navigacija preko CV-a,
  uz zadržavanje provjera Radova; zamjena disabled CV mjesta namjerno utiče na
  visinu sadržaja sidebara prethodne snimljene verzije.
- `apps/web/test/portfolio-profile.browser.cjs` — Topbar dodatni CV status i disabled
  save provjeravaju se geometrijom, umjesto poređenjem cijelog izvornog AST-a.
- `apps/web/test/portfolio-works-4-3.md` — napomena o novoj CV navigaciji.
- Ovaj izvještaj.

Postojeći shell CSS, globals.css i izgled drugih koraka nijesu mijenjani.
Nijesu mijenjani backend, API DTO-i, Prisma šema, baza, storage, PDF generator,
checkout ili Free/Premium pravila. Nije bilo migracija, deploya ili R2 operacija.

## Prikaz i ponašanje

Formu čine Obrazovanje, Radno iskustvo, Izložbe, Nagrade, Vještine, Programi,
Sertifikati i Publikacije. Primijenjeni su originalni naslovi, opisi, placeholderi,
redosljed sekcija, tipografija, širine redova, padding, radiusi, boje i navigacija.
Produkcijska forma počinje praznim redovima — primjeri iz Artifakta nijesu dodati
umjetnicima. Podaci sa primjera koriste se samo u izolovanom browser testu.

„Dodaj” i „×” rade lokalno. Identitet reda ostaje stabilan pri izmjenama i uklanjanju
drugih redova. Unos preživljava navigaciju **Radovi → CV → Dizajn** u istoj stranici.
Refresh ga briše. Nema localStorage/IndexedDB čuvanja CV-a, novih tokena ili mrežnih
upisa tokom uređivanja. Legacy/Guest tok nije proširen; CV tab je povezan u postojećem
šestokoračnom režimu registrovanih projekata.

CV unos je namjerno odvojen od postojećeg `cvSections` JSON-a. Postojeći CV podaci
prikazuju se odvojeno, bez automatske konverzije ili prepisivanja. Njihova sirova
vrijednost se ne mijenja prilikom uređivanja nove privremene forme.

## Šta još nije povezano

Prisma već ima `PortfolioProject.cvSections`, ali postojeći upisni DTO i servis
ne prihvataju CV sadržaj. Aktivni PDF dokumentni tok ne renderuje CV stranice;
postojeća `cvPages()` metoda nije dio tog aktivnog toka. Zato nije izmišljena
serverska podrška u ovoj vizuelnoj izmjeni:

- CV se **ne čuva na serveru**.
- Nema uključivanja CV-a u portfolio PDF niti zasebnog CV izvoza.
- Brojač PDF stranica ne dodaje dvije nepostojeće CV stranice.
- „Sačuvaj draft” je na CV tabu disabled sa objašnjenjem. Header prikazuje
  „CV · privremeno”; ispod forme stoji jasno obavještenje o trenutnoj podršci.
- Ako korisnik sa lokalnim CV izmjenama sačuva druge portfolio podatke na drugom
  tabu, poruka izričito kaže da CV nije sačuvan na serveru. Ne šalju se `cvSections`
  ili `includeCv`, niti se postojeći CV prepisuje.

Originalni podnaslov opisuje ciljani dvostrani PDF i zaseban izvoz. Zadržan je
prema dizajnu, uz vidljiv status da taj funkcionalni dio još nije povezan.
Prije funkcionalne podfaze potrebno je definisati validiranu CV strukturu,
mapiranje postojećih formata, prava pristupa i pravila PDF rasporeda/izvoza.

## Mjerenja

Prije izmjena snimljeni su postojeći TSX i shell CSS. Browser poredi referencu
i novi CV na istoj širini i položaju kolone: 1880, 1536, 1440, 1280, 1024,
768, 440, 375 i 320 px. Mjerene su sve kartice, zaglavlja, redovi, polja i tekst.
Numeričko odstupanje je ispod 1 px zbog browser zaokruživanja; deklarisani stilovi
iz inline HTML-a se poklapaju.

| Element | Original HTML i implementacija |
| --- | --- |
| Razmak sekcija | 18 px |
| Kartica | radius 22 px, padding clamp(20px, 2.4vw, 30px) |
| Naslov sekcije | 17 px, 800 |
| Opis sekcije | 13 px, 500 |
| Redovi | min. kolona 150 px, gap 10 px, radius 14 px |
| Padding reda | 14px 44px 14px 14px |
| Labela | 11.5 px, 700, razmak od inputa 6 px |
| Input | 42 px, padding 0 12 px, radius 10 px |
| Font inputa | 13.5 px, 600, Alcyone |
| Textarea | 14 px / 1.6, padding 12px 14px, radius 12 px |

HTML ne sadrži definicije zajedničkih klasa `ab-add`, `ab-add-c` i `pb-cv-x`.
Njihov izgled je rekonstruisan prema priloženim screenshotovima: crveni tanki
krug od 30 px sa plusom, uppercase naziv i diskretno dugme za uklanjanje.
Za njih nije moguće tvrditi da su upoređeni sa originalnim CSS-om koji nije
dostavljen. Reference harness ima odvojenu dopunu tih nedostajućih klasa;
originalni inline stilovi ostaju izvor mjerenja svih kartica, redova i polja.

Tamna tema prati postojeći studio. Na najmanjim ekranima jedina kolona reda
može se suziti bez izlaska iz viewporta; donja navigacija ima manji horizontalni
padding do 340 px. Status i prikaz postojećeg CV-a su dodatni elementi radi
jasnog označavanja privremenog unosa i zaštite prethodnih podataka.

## Rezultati

- **43/43 CV browser provjere**, devet viewport širina, bez runtime izuzetaka.
- **503 postojeće browser provjere** za Podatke, header/sidebar i ostale korake prolaze.
- **27/27 browser provjera Radova**, uključujući novu navigaciju preko CV-a, prolazi.
- **28/28 unit provjera** Guest adaptera i portfolio pristupa prolazi.
- Web TypeScript i puna web build provjera prolaze.

CV test pokriva dodavanje i uklanjanje bez gubitka preostalih vrijednosti, tekstualna
polja, zadržavanje unosa između koraka, reset nakon refresha, disabled serversko
čuvanje, očuvanje prethodnog CV JSON-a i nepostojanje CV upisa pri čuvanju drugih
podataka. Sve testne API operacije presreće izolovani transport — radna baza i R2
nijesu korišćeni za izmjene. PDF transport u vizuelnom harness-u ima kontrolisan
testni odgovor; stvarni renderer nije mijenjan.

Dokazi: `.tmp/portfolio-cv-4-4/results.json`, `cv-1536.png`, `cv-375.png`,
`cv-320.png`, odgovarajući `reference-*` snimci, snimljeno prethodno stanje,
`podaci-regression.log`, `works-regression.log`, `unit.log` i `web-build.log`.
