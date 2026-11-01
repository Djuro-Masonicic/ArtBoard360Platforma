# Blok — stvarni PDF dizajn, 28. 10. 2026.

**Blok** je aktivan kroz karticu Dizajn → Blok. Svih šest prikazanih stilova sada može da se izabere za stvarni PDF: Minimal, Rounded/Tačke, Gradijent, Editorijal, Kartice i Blok. Izbor naslovnice A–G može se sačuvati, ponovo otvoriti i koristiti kroz postojeći Guest preview/snapshot i istoriju PDF verzija. Kombinovanje stilova po sekcijama ostaje prototip.

Dostavljeni HTML je sačuvan u `apps/web/references/portfolio-blocks.html`. Sadrži sedam `Blok-00-Naslovnica-*` rasporeda i devet unutrašnjih primjera sa `Minimal-*` oznakama. Osam unutrašnjih stranica koje postoje i u prvobitnoj Minimal referenci imaju identične tagove, stilove, tekst i izvore slika; deveti primjer je dodatni „Rad 2”. Zato Blok koristi te Minimal unutrašnje rasporede, bez izmišljanja novih traka ili blokova unutar dokumenta.

Izbor se čuva u postojećem JSON polju, bez Prisma promjene:

```json
{ "minimal": { "version": 1, "cover": "G", "style": "BLOCKS" } }
```

Zajednička validacija prihvata samo poznatu verziju, naslovnicu i stil, a odbija proizvoljne vlasničke/dizajnerske ključeve. Prethodne konfiguracije zadržavaju značenje. Koristi se postojeći PDFKit generator, obrada slika, fontovi, document plan, autorizacija, preview i watermark.

**Naslovnice prema referenci**

Sve mjere su na referentnom formatu 794 × 1123 px; generator ih skalira za izabrani papir.

| Element | Implementacija |
| --- | --- |
| Bočna traka A–G | Plava `#0d74ff`, širina 60,5 px, puna visina; bijela vertikalna oznaka Portfolio sa godinom dokumenta, od y 68 |
| Ime | Bold ime i prezime; duga imena se smanjuju da stanu u referentni okvir |
| A | Ime i logo pomjereni na x 113,4; velika slika i kružni portret |
| B | Ime x 113,4; iza portreta crveni blok `#fe171d`, pomjeren 18,9 px udesno i naniže |
| C | Kružni portret i centralno ime; logo centriran u bijeloj oblasti od 98,3 × 98,3 px |
| D | Portret x 113,4 sa žutim blokom iza, ime x 340,2; velika slika širine 612,6; crveni blok 189 × 189 px sa godinom |
| E | Ime x 113,4; ljubičasti blok `#783cff` iza portreta; četiri trake visine 15,1 px iznad velike slike: plava, žuta, crvena, ljubičasta |
| F | Pravougaona bijela kartica od x 113,4, ime od x 155; žuta kapsula; pravi QR sa radiusom 3,8 px, rotacijom i mekom sjenkom |
| G | Magazin: plavi panel od x 113,4 širine 332,6 px; velika slika od x 446; bijeli tekst; žuti obrub kružnog portreta od 6 px; podnožje počinje na x 113,4 |
| Unutrašnje stranice | Minimal profil, mreža devet izdvojenih radova, radovi, kolekcije, dvije osnovne CV grupe i kontakt, tačno prema dostavljenim unutrašnjim primjerima |

Na G naslovnici spisak sekcija i broj izdvojenih radova dolaze iz stvarnog izbora. Godina na traci, naslovnici i oznakama dolazi iz datuma dokumenta. Široki G naslov ostaje u jednom redu, kao u HTML-u koji dozvoljava da tekst pređe širinu svog CSS okvira.

Slike i njihove reference koriste postojeći učitavač; originalni fajlovi se ne mijenjaju. QR koristi stvarni bezbjedni HTTP(S) link i izostavlja se kada takvog linka nema. Meka QR sjenka nastaje u privremenom baferu, bez upisa u storage.

Redosljed kolekcija/radova, ručni metapodaci, cijene, jezik, format papira, izbor sekcija i zaseban CV ostaju dio postojećeg generatora. Dugački sadržaj nastavlja se na dodatnim stranicama uz watermark na svim preview stranama. Statična numeracija referentnog HTML-a ne prepisuje stvarnu numeraciju dokumenta. Demo sa devet radova, jednom kolekcijom i punim CV-jem ima 16 fizičkih stranica.

**Provjere**

- **43/43 PDF testa**: šest novih Blok testova i 37 prethodnih. Pokriveni su stroga konfiguracija, svih sedam naslovnica, položaji imena, bold fontovi, rotirana traka, godina, pomjereno G podnožje, izbor sekcija, sadržaj/pozicije/linkovi unutrašnjih stranica, duga imena, bezbjedan QR i zaseban dugi CV na Letter papiru sa watermarkom.
- **61/61 API test** na izolovanim bazama: sačuvaj/ponovo otvori, vlasništvo, neispravna konfiguracija, privremeni preview bez prepisivanja, Guest Blok snapshot/preview bez drafta i storage upisa, prethodne kolekcije, kvote i kupovine.
- **39/39 browser provjera**: svih šest aktivnih kartica, sedam Blok minijatura sa pravilno skaliranom trakom i vertikalnim tekstom, modal, Guest preview i snapshot kupovine, vlasničko čuvanje i ponovno otvaranje G naslovnice, Blok manifest/oznaka istorijske verzije, prethodni stilovi i Free/Premium tokovi. Nema runtime izuzetaka.
- Izolovani Next.js production build browser harness-a prolazi.
- API i web `tsc --noEmit` prolaze; scoped `git diff --check` prolazi.
- Stvarna lokalna Guest ruta radi na **1440 × 1000** i **390 × 844**: izbor Bloka i modal, bez horizontalnog preliva, bez runtime grešaka i bez API upisa. Refresh resetuje nezavršeni unos.
- Svih **16 primjera** poređeno je kao HTML u Chrome-u i kao stvarni PDF na **794 × 1123 px**. Provjereni su plava traka i vertikalni tekst (granice teksta unutar **1 px**), crveni/žuti/ljubičasti blokovi iza portreta, E trake, F kartica i oznaka, G panel, žuti obrub i podnožje.
- Prosječna apsolutna RGB razlika naslovnica je **0,77–3,01** na skali 0–255. To nije procenat identičnih piksela. Ostaju razlike rasterizacije fontova, loga i resamplinga slika.
- Svih **devet unutrašnjih primjera** dodatno je upoređeno sa stvarnim Minimal PDF renderom sa istim podacima i viewportom: izmjerena RGB razlika je **0**. Testovi zasebno potvrđuju isti tekst, pozicije i linkove bez mutacije ulaznih podataka.

**Tačni fajlovi ovog nastavka**

- `packages/portfolio-document-plan/minimal.cjs`, `index.d.ts` — dozvoljeni BLOCKS stil i oznaka Blok.
- `apps/api/src/modules/portfolio-projects/portfolio-minimal.pages.ts` — rasporedi naslovnica, traka, vertikalni tekst, blokovi boja, G panel/podnožje, dijeljeni sadržaj G naslovnica i odgovarajuća F QR sjenka.
- `apps/web/components/portfolio-builder-editor-shell.tsx`, `portfolio-design-workspace.tsx`, `portfolio-design-preview-markup.json` — aktivna šesta kartica, sedam minijatura, izbor, čuvanje i ponovno otvaranje.
- `apps/web/references/portfolio-blocks.html` — originalni prilog.
- `apps/api/test/portfolio-blocks.test.cjs`, `portfolio-collections.api.test.cjs`, `portfolio-commerce.api.test.cjs` — PDF i API pokrivenost novog stila.
- `apps/web/test/portfolio-commerce.browser.cjs`, `portfolio-minimal.visual.cjs`, `portfolio-template-live.browser.cjs` — šest aktivnih kartica, vlasnički/Guest tok, `--blocks` vizuelna provjera i lokalni smoke.
- Ovaj izvještaj i link u `portfolio-export-commerce-status.md`.

Radna baza, stvarni umjetnici/portfoliji i R2 objekti nijesu mijenjani. Nema Prisma promjene, migracije na radnoj bazi, brisanja, stvarne naplate ili deploya. API/browser provjere koriste odvojene testne baze i lažni storage. Header, sidebar i drugi koraci nijesu redizajnirani.

Postojeći uslovi privatnog R2 bucketa i AllSecure integracije za produkcionu isporuku/naplatu ostaju dokumentovani u prethodnim paketima. Ova promjena ih ne aktivira. Guest stanje ostaje u memoriji otvorene stranice; pravi Guest PDF preview nalazi se u Izvozu, a male unutrašnje ilustracije njegovog desnog panela ostaju ilustrativne.

Dokazi: `.tmp/portfolio-blocks/blocks-A.pdf` do `blocks-G.pdf`, `reference-metrics.json`, `physical-page-map.json`, `visual-comparison.json`, `pdf-tests.log`, `api-tests.log`, `live-smoke.json`, `live-desktop.png`, `live-mobile.png`, `live-modal.png`. Funkcionalni browser rezultati: `.tmp/portfolio-commerce-browser/results.json`.
