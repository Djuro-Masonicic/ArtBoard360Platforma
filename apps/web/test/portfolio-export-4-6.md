# Portfolio Builder — Izvoz (4.6)

Istorijski izvještaj vizuelne podfaze. Preseti „Cijeli portfolio” / „Bez CV-ja” i CV PDF su kasnije povezani; aktuelno stanje je u [funkcionalnom planu](../../api/docs/portfolio-builder-functional-roadmap.md).

Rekonstruisan je samo tab Izvoz prema oba dostavljena HTML priloga. Header, sidebar i zajednički CSS nijesu mijenjani. Široki editor u ovom koraku zamjenjuje raniji raspored sa zasebnim uskim desnim pregledom.

## Fajlovi ovog koraka

- `components/portfolio-builder-editor-shell.tsx`: povezuje novi tab, skriva zasebni preview samo tokom izvoza, prosljeđuje stvarni broj PDF stranica i postojeće akcije. Poređenje nesačuvanog dizajna normalizuje postojeći podrazumijevani preset da stari projekat bez `designConfig` ne bude pogrešno označen kao izmijenjen.
- `components/portfolio-export-workspace.tsx` i `.module.css`: raspored, status pristupa, generisanje, čuvanje, stvarne verzije i dijeljenje.
- `components/portfolio-export-pdf-pages.tsx` i `.module.css`: browser prikaz stranica postojećeg PDF-a preko PDF.js; nije novi PDF generator.
- `references/portfolio-izvoz.html` i `portfolio-izvoz-panel.html`: dostavljene reference.
- `test/portfolio-export.browser.cjs`: izolovana provjera referentnih mjera, responsive prikaza i akcija sa sintetičkim PDF-om i presretnutim API zahtjevima.
- `test/portfolio-profile.browser.cjs`: dozvoljava namjerno proširen editor i premještanje pregleda samo u tabu Izvoz; ostale postojeće provjere ostaju.
- `test/portfolio-design.browser.cjs`: izoluje i GET PDF zahtjev prilikom postojeće provjere navigacije Dizajn → Izvoz → Dizajn.
- `test/portfolio-export-4-6.md`: ovaj izvještaj.

## Vizuelni rezultat

Ranije su postojale kartice akcija u centralnoj koloni i zaseban desni preview. Sada je veliki PDF pregled lijevo, a desno su kartice izvoza, sastava stranica, verzija i linka. Navigacija nazad vodi u Dizajn.

Na viewportu 1536 px pregled i referenca imaju širinu 660 px, panel 440 px, razmak 18 px i radius 22 px. Glavne kartice imaju padding 30 px; naslov 46 px, težinu 800 i line-height 1.1. Na 1280 px kolone su 555.08 / 379.45 px, kao u referenci. Male širine prilagođene su slaganjem panela, prelamanjem dugmadi i prikazom dvije kolone PDF sličica do 440 px.

Prikazuje se stvarni sačuvani PDF sa vodenim žigom, njegova naslovnica i do devet narednih stranica. Ako ima više stranica, ostatak je označen i dostupan kroz detaljni pregled. Broj stranica dolazi iz samog dokumenta; do učitavanja je jasno označena procjena. Sličice ne izmišljaju naslove stranica ako PDF ima drugačiju paginaciju. Istorijske verzije koriste PDF ikonu jer backend nema njihove istorijske naslovne sličice.

## Povezane funkcije i ograničenja

- Postojeći backend adapter i `expectedRevision` ostaju za čuvanje; nesačuvane izmjene blokiraju generisanje zastarjelog PDF-a. Prikaz izričito koristi sačuvane podatke.
- Premium i već plaćeni portfolio koriste postojeći generate endpoint. Zaključani Free/legacy Guest portfolio koristi postojeću payment navigaciju. Nema novih pravila naplate.
- Verzije se sortiraju po broju i otvaraju njihove sačuvane URL-ove; ponovno preuzimanje ne generiše novu verziju.
- Prijavljeni korisnik kopira poseban serverski share token; greška API-ja ili clipboarda prikazuje se bez lažne potvrde. Legacy Guest ponašanje ostaje postojeće.
- Memorijski Guest adapter ne šalje zahtjev za PDF, ne čuva draft, ne dijeli link i ne pokreće checkout. Novi Guest tok nije aktiviran za korisnike.
- PDF fetch se prekida pri izlasku; PDF.js zadaci i observer se zatvaraju, objektni URL oslobađa. Resize ponovo crta već učitani PDF bez ponovnog HTTP zahtjeva.
- Brojevi „2 od 5”, datum obnove i cijena „4,90 €” iz primjera nijesu prikazani kao stvarna korisnička kvota. Kartica pokazuje pravo pristupa koje backend stvarno vraća.
- Preseti stranica su onemogućeni. Označen je stvarni sastav iz postojećeg document plana; izdvojeni radovi i CV nijesu lažno uključeni. CV, novi stilovi i naslovnice i dalje čekaju ranije odloženu PDF integraciju. Privremene izmjene imaju upozorenje.

## Provjere

- Browser harness: 41/41 provjera; 1880, 1536, 1440, 1280, 1024, 768, 440, 375 i 320 px. Nema browser runtime izuzetaka. Svi API odgovori i PDF sadržaj su izolovani testni podaci.
- Funkcionalno: stvarni PDF canvas/count, verzije, generate, save, share token, odbijeno kopiranje, nesačuvane izmjene, zaključan Free, legacy tok, greška PDF transporta, oslobađanje objektnih URL-ova i memorijski Guest.
- Postojeća regresija koraka Podaci: 503 provjere na osam širina, bez browser runtime grešaka.
- Usmjerena regresija Dizajna: 25/25 provjera, uključujući povratak iz Izvoza, lokalne izbore, modal i postojeće čuvanje stvarnih PDF podešavanja.
- Postojeći memorijski Guest i access unit testovi: 28/28.
- Web TypeScript i produkcioni build prolaze; nema deploya.

Artefakti poređenja, prije/poslije mjere i screenshots nalaze se u `.tmp/portfolio-izvoz-4-6`. Nema izmjena backenda, Prisma modela, baze, R2 objekata, checkout implementacije ili server PDF generatora.
