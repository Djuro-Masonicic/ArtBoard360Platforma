# Paketi — implementacija i browser poređenje

Implementirana je ruta `/paketi` prema dostavljenoj specifikaciji i HTML-u. Prikaz cijene Guest izvoza je **4,90 €**, prema izričitom odgovoru korisnika. Naknadno, u zadatku Plaćanje, posebno je odobrena i serverska cijena **4,90 € za nove Guest kupovine**. Postojeće narudžbine zadržavaju svoju originalnu cijenu. [Izvještaj o plaćanju](../../api/docs/payment-page-20261029.md).

## Fajlovi

- `app/paketi/page.tsx`: postojeća ruta sada prikazuje novu stranicu i njene metadata podatke.
- `components/packages-page.tsx`: naslov, tačan podnaslov, Free/Premium pogodnosti, pravila alata i obje donje napomene.
- `components/packages-page.module.css`: svi novi stilovi, responsive raspored, gradijenti, hover i reduced motion; bez globalnih selektora izvan stranice.
- `components/site-footer.tsx`: stranica Paketi koristi postojeći footer sa pet kolona i tamnim logom.
- `components/artist-profile-footer.module.css`: svijetla varijanta isključivo za Pakete, prema naknadno dostavljenoj slici.
- `references/paketi-artifact-20261029.html`: originalni glavni sadržaj izdvojen iz priloga, bez kopiranja headera, footera ili blob URL-ova.
- `test/packages-page.browser.cjs`: provjera stvarne lokalne stranice i poređenje sa izvornim HTML-om.
- `test/packages-page-20261029.md`: ovaj izvještaj.

## Postojeće komponente i povezivanje

Zadržani su `RootLayout`, postojeći Alcyone preko `next/font/local`, `SiteChrome` i `ArtBoardSiteHeader`, bez izmjena. `SiteFooter` po naknadnom zahtjevu bira postojeći footer sa pet kolona, uz posebnu svijetlu varijantu samo na `/paketi`. Ostale stranice zadržavaju postojeće footere. Postojeći `ArtBoardPricingSection` na početnoj stranici je očuvan. Stranica koristi Next `Link` i postojeći `siteRoutes`.

| CTA | Postojeće odredište |
| --- | --- |
| Prijavi se besplatno | `/prijava` |
| Izaberi svoj iznos | `/artist/subscribe` |
| Istraži Portfolio Builder | `/portfolio-builder` |
| Upravljaj pretplatom | `/pretplata` → `/artist/subscription` |

Premium izbor i upravljanje pretplatom koriste postojeću zaštitu prijavom. Nijesu uvedene lažne `/placanje?proizvod=premium` ili `/nalog/pretplata` rute. Stvarna AllSecure naplata i mogućnost promjene aktivnog mjesečnog iznosa nijesu dodavani ovim zadatkom.

## Izgled i animacije

Primijenjeni su originalni gradijent i animacija od 10 sekundi sa `cubic-bezier(.45,.05,.55,.95)`, pod lokalnim imenom `packages-flow`: riječ „besplatno.”, Premium cijena, spoljašnji okvir, kružne ikonice alata i hover Premium CTA-a. Kartice se podižu 6 px sa zadatim sjenkama, bez pomjeranja susjedne kartice. Focus je vidljiv; `prefers-reduced-motion` isključuje dekorativne animacije i pomjeranje.

`ab-line` ostaje odgovornost postojećih zajedničkih komponenti. Prilog ne sadrži originalne CSS definicije za `ab-gh-flow`, generisane `scp` klase i sve `data-abh` hover varijante. Njihovo potpuno identično ponašanje nije moguće potvrditi iz dostavljenog izvora; potvrđeni Premium hover gradijent, tajming i podizanje su sprovedeni.

Stranica lokalnim omotačem ostavlja prostor za postojeći fiksni header (77 px desktop, 75 px na užem rasporedu), pa naslov na telefonu ostaje potpuno vidljiv. Izvorni padding sadržaja ostaje 120 px desktop / 56 px mobilni. Header i njegov meni nijesu mijenjani.

## Izmjerene dimenzije

Poređenje je izvedeno u istom browseru, sa istim postojećim fontom i omotačem. Izvorni HTML je renderovan zasebno. To potvrđuje geometriju dostavljenog HTML-a; nije poređenje sa živom Claude aplikacijom.

| Viewport širina | Širina jedne kartice | Free visina | Premium visina |
| --- | ---: | ---: | ---: |
| 1536 px | 526 px | 553,75 px | 553,75 px |
| 440 px | 400 px | 543,64 px | 590,14 px |
| 390 px | 350 px | 543,64 px | 655,39 px |
| 360 px | 320 px | 632,89 px | 677,14 px |
| 320 px | 280 px | 654,64 px | 744,64 px |

Naslov desktop: 68 px, line-height 76,16 px; mobilni: 34 px, line-height 38,08 px. Desktop kontejner je 1080 px, razmak kartica 28 px, dugmad 38 px visine. Naslovi, podnaslovi, kartice, pravila i Premium CTA imaju iste izmjerene dimenzije kao izvorni HTML, uz toleranciju 0,1 px.

Visine iz briefa nijesu prisilno zadate: originalni HTML u postojećem Alcyone kontekstu daje gornje prirodne visine. Postojeći layout skriva scrollbar, pa na viewportu 440 px sadržaj zauzima punih 440 px, a kartice 400 px poslije bočnih paddinga. U prilogu je spomenuto 425 px stvarnog prostora pri 440 px viewportu; ta razlika konteksta scrollbar-a nije rješavana globalnim izmjenama.

## Provjere

- Web TypeScript: prolazi.
- **26/26 browser provjera**: HTTP 200, font, svih 14 pogodnosti, četiri CTA rute, prikazana Guest cijena, pet širina, tačne dimenzije prema HTML-u, tekst bez odsijecanja ili horizontalnog overflowa, razmak od fiksnog headera, hover bez pomjeranja okoline, gradijenti, keyboard focus i reduced motion.
- Četiri odredišta se otvaraju kroz postojeće rute, uz prijavu gdje je potrebna. Nijesu slani zahtjevi za kupovinu ili promjenu pretplate.
- Paketi imaju svijetli footer `#eef0f4`, pet kolona, tamni logo, Instagram/LinkedIn/Behance i kontakt u donjem redu. Footer ne preliva na provjerenim širinama. Postoji jedan zajednički header i footer. Početna stranica zadržava originalni tamni footer, sa HTML-om identičnim početnom zabilježenom stanju.
- Početna `/artboard` zadržava postojeću pricing komponentu. Bez browser runtime izuzetaka.
- Bez novih biblioteka, API promjena, migracija, izmjena baze ili R2 operacija.

Screenshotovi i mjerenja su u `.tmp/paketi/`: `before-desktop.png`, `before-mobile.png`, `after-{width}.png`, `reference-{width}.png` i `results.json`.
