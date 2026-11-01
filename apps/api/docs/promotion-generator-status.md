# Generator promotivnih materijala — 1. 11. 2026.

## Aktuelno: uklanjanje iz izbora i naslov Panorama Collage

Svaki red izbora ima dugme „Ukloni rad”. Dostupno je i kada ostane samo jedan
rad. Uklanja se samo izbor u objavi: ne brišu se izvorni Artwork ili slike.
Preostali redosljed ostaje očuvan, aktivni slajd se ograničava na postojeće
slajdove, a postavke uklonjenog rada ne ulaze u export konfiguraciju. Ako se
ukloni posljednji rad, pregled ostaje bez slajdova i generisanje je blokirano.
Kontrole uklanjanja, strelice i ručica imaju zajednički kompaktan raspored.

Panorama Collage ima zajednički naslov: ručni `publicationTitle` ima prednost,
zatim naziv izabrane kolekcije, zatim Instagram tag, pa „Lorem ipsum” ako nema
ničega. Naziv pojedinačnog rada nije fallback. Kada je tag glavni naslov, ne
ponavlja se u manjem redu ispod. U koracima Šablon/Radovi postoji opciono polje,
a u Prilagodi se zajednički naslov mijenja u kartici Tekst. Kadar ostaje zaseban
za svaki rad. Novi Collage izvozi koriste renderer 9; raniji snapshotovi
zadržavaju svoj naslov, geometriju i besplatno ponovno preuzimanje.

Wheel listener sada je delegiran sa stabilnog korijena editora i ograničen na
region pregleda. Zamjena DOM-a slajda ili teme ne ostavlja listener na prethodnom
grafičkom elementu. Prag i zaštita od momentuma ostaju; vertikalni skrol i pinch
ostaju browseru. Browser provjera koristi ponovljene horizontalne poteze i
uzastopne klikove na istim koordinatama bez pomjeranja kursora između slajdova.

Produkcioni fajlovi: `apps/web/components/promotion-content-controls.tsx`,
`promotion-editor.tsx`, `promotion-editor.css`, `packages/promotion-renderer/index.cjs`,
`apps/api/scripts/prepare-promotion-reference.py` i regenerisani
`reference-light.cjs`, `reference-dark.cjs`, `stages-light.cjs`, `stages-dark.cjs`.
Testovi: `apps/api/test/promotion-renderer.test.cjs`, `promotions.test.cjs`,
`apps/web/test/promotions.browser.cjs`, `promotion-panorama.browser.cjs`.
Nema izmjena Prisma šeme, migracije, stvarnih podataka ili R2 objekata.

Verifikacija: 21 renderer + 25 API testova, API/web TypeScript i izolovani
produkcioni Next build. Kompletan browser tok ima 145 uspješnih provjera i 24
mjerenja rasporeda, bez runtime grešaka. Izričito su provjereni ponovljeni
touchpad potezi naprijed/nazad i ponovljeni klikovi bez pomjeranja kursora,
mobilno uklanjanje, uklanjanje posljednjeg rada, očuvanje izvornika i čuvanje/
ponovno otvaranje naslova. Prolaze i 62 poređenja preview/PNG, 9 istorijskih
Panorama poređenja i 36 poređenja kadra. Testovi koriste izolovanu bazu i lažni
storage. Fizički touchpad različitih proizvođača ostaje ručna provjera.

Snimci: `.tmp/promotion-browser/collage-heading.png` i `remove-work-mobile.png`.
Rezultati su u `.tmp/promotion-browser/results.json`.

## Aktuelno: umanjivanje, pretraga i touchpad

Oba kadra (pojedinačni rad i zajednička Panorama) prihvataju uvećanje
0.25–3.00×. HTML kontrole, DTO i servis imaju iste granice; iste vrijednosti
ulaze u draft i nepromjenjivi export snapshot. Umanjivanje ostavlja prostor
unutar originalnog slikovnog okvira. Postojeći renderer već podržava ovu
transformaciju, pa promjena ne mijenja stare izvoze niti zahtijeva migraciju.

Biblioteka „Radovi iz profila” ima pretragu naziva bez razlike u veličini slova
i dijakriticima, filter po stvarnim kolekcijama i „Van kolekcija”, broj rezultata,
brisanje pretrage i reset filtera. Nulti rezultat ima objašnjenje. Pretraga i
filter su samo stanje stranice: ne stvaraju draft, ne mijenjaju izbor/redosljed,
ne šalju upite za svaki znak i ne zaobilaze izabrani izvor kolekcije. `Artwork`
trenutno nema sopstvenu kategoriju/disciplinu; filter zato ne izmišlja kategorije.
Dugi nazivi u izboru staju u dvije linije, a pun tekst ostaje u `title` atributu.

Horizontalni wheel/touchpad gest iznad glavnog slajda mijenja slajd poslije
45 px akumuliranog pomaka. Momentum ostaje zaključan dok tok ne utihne 180 ms,
pa jedan potez ne preskače više slajdova. Granice ostaju ograničene prvim i
posljednjim slajdom. Vertikalni wheel i pinch/ctrl gestovi ostaju browseru;
postojeće strelice, tastatura i touch swipe ostaju funkcionalni.

Fajlovi ovog koraka: `apps/web/components/promotion-content-controls.tsx`,
`promotion-editor.tsx`, `promotion-editor.css`,
`apps/api/src/modules/promotions/promotions.dto.ts`, `promotions.service.ts`,
`apps/api/scripts/prepare-promotion-reference.py` i regenerisani
`packages/promotion-renderer/reference-light.cjs`, `reference-dark.cjs`.
Testovi: `apps/api/test/promotions.test.cjs`, `apps/web/test/promotions.browser.cjs`,
`promotion-artwork-edits.browser.cjs`. Promjene ne uključuju radnu bazu, R2,
checkout, kvote ili zajednički javni header/footer.

Verifikacija ovog koraka: 24 API + 19 renderer testova; API/web TypeScript;
izolovani Next produkcioni build; 135 browser provjera i 24 mjerenja rasporeda,
bez runtime grešaka. Browser provjerava nazive sa dijakriticima, kolekcijske
filtere i prazan rezultat, očuvanje izbora, duge nazive, obje teme i mobilni
prikaz, horizontalni wheel sa momentumom, povratak/granice, vertikalni skrol,
pinch, čuvanje i stvarni PNG/ZIP izvoz. Dodatnih 62 poređenja preview/PNG
uključuju umanjivanje do 0.60× kroz sve varijante, a API provjerava i granicu
0.25× i odbijanje vrijednosti izvan opsega bez upisa/rezervacije.
Testni podaci su izolovani, a storage lažan. Simulirani wheel/touch događaji
ne zamjenjuju završni ručni osjećaj korišćenja na različitim fizičkim touchpadima.

Snimci: `.tmp/promotion-browser/work-search-light.png`, `work-search-desktop.png`
i `work-search-mobile.png`. Izvještaj je u `.tmp/promotion-browser/results.json`.

## Aktuelno: opisi radova, naslov Slidera i Gallery paginacija

- Grid Carousel na pojedinačnim stranicama koristi naziv i opis aktivnog rada,
  uključujući ručne izmjene. Naslov kolekcije ostaje na uvodnom/završnom rasporedu.
- Slider ima zasebno polje `publicationTitle` (do 180 znakova). Izbor kolekcije
  ga popunjava nazivom kolekcije; bez njega preview prikazuje „Lorem ipsum”.
  Prazan naslov ili taj privremeni tekst blokiraju novi izvoz. Najmanje dva rada
  su obavezna; dva početna thumbnaila imaju jednaku veličinu. Između naslovnog
  i završnog profilnog slajda ostaje po jedan slajd za svaki rad, sa njegovim
  nazivom i opisom. Kratki opisi zadržavaju postojeće ograničenje 120 znakova.
- Gallery zahtijeva najmanje tri rada i grupiše najviše tri po slajdu:
  5/6/7 radova daju 2/2/3 slajda. Posljednja nepotpuna grupa ne ponavlja radove.
  Ovo važi za sve Gallery varijante; Photo Dump sada koristi tri kolone.
- Minimumi, naslov i vlasništvo provjeravaju se i na API-ju prije upisa posla
  ili rezervacije kvote. Nepotpuni draftovi se i dalje mogu izričito sačuvati.
- Lista redosljeda ima thumbnail svakog rada, podignut prikaz tokom prevlačenja
  i FLIP animaciju preslaganja; poštuje `prefers-reduced-motion`. Strelice,
  desktop drag, pointer ručica i mobilni dodir ostaju dostupni.
- Pregled se zasebno skroluje, ali scrollbar nije vidljiv. Kartice šablona i
  verzija ostaju stabilne pri promjeni slajda, uključujući različite opise radova.

Novi Gallery, Slider i Grid izvozi koriste renderer 8. Snapshot sadrži stvarne
opise izabranih radova. Stari izvozi zadržavaju prethodni renderer i raspored;
besplatno ponovno preuzimanje ne mijenja već generisane fajlove. Nema Prisma
promjena, migracije, checkout izmjena ili operacija nad stvarnim R2 objektima.

Izmijenjeni produkcioni fajlovi u ovom koraku: `packages/promotion-renderer/index.cjs`,
`index.d.ts`, `reference-light.cjs`, `reference-dark.cjs`, `stages-light.cjs`,
`stages-dark.cjs`; `apps/api/scripts/prepare-promotion-reference.py`;
`apps/api/src/modules/promotions/promotions.dto.ts`, `promotions.service.ts`;
`apps/web/components/promotion-content-controls.tsx`, `promotion-editor.tsx`,
`promotion-editor.css`. Generisani CJS fajlovi dolaze iz postojećeg compiler skripta.
Testovi: `apps/api/test/promotion-renderer.test.cjs`, `promotions.test.cjs`,
`apps/web/test/promotions.browser.cjs`; istorijske reference u
`promotion-slider.browser.cjs`, `promotion-gallery.browser.cjs` i
`promotion-grid-carousel.browser.cjs` sada izričito koriste prethodni renderer.

Verifikacija: 19 renderer i 23 API testa; API/web TypeScript; izolovani Next
produkcioni build; 119 browser provjera i 24 mjerenja rasporeda, bez runtime
grešaka. Browser je provjerio stvarni PNG/ZIP izvoz, blokadu nepotpunih zahtjeva,
čuvanje/ponovno otvaranje, nepromjenjive kartice, native/pointer/touch prevlačenje
i nezavisan skrol bez scrollbara. Dodatno prolaze 62 poređenja preview/PNG kroz
sve verzije i obje boje, kao i istorijska Slider/Gallery/Grid poređenja sa HTML
referencama. Baza je izolovana, a storage lažan.

Snimci: `.tmp/promotion-browser/grid-work-details.png`, `slider-two-works.png`,
`gallery-seven-works.png`, `drag-animation.png`, `work-order-mobile.png` i
`individual-work-controls.png`. Rezultati: `.tmp/promotion-browser/results.json`.
Prethodni status ispod opisuje ranije korake, a ova pravila imaju prednost.

## Aktuelno: sklapanje, prevlačenje i pojedinačno prilagođavanje

Lista izbora radova može se sklopiti i ponovo otvoriti. Redosljed se mijenja
prevlačenjem cijelog reda na desktopu, ručicom sa Pointer Events podrškom za
dodir, ili postojećim strelicama. Nijedan način ne mijenja redosljed izvorne
galerije. Izbor Panorame Single Work sada automatski zadržava prvi izabrani
rad; ostali se poništavaju. To zamjenjuje ranije pravilo očuvanja prevelikog
izbora pri promjeni šablona u prethodnom izvještaju. Backend i dalje odbija
nedozvoljen broj radova iz ručno podmetnutog zahtjeva.

Pregled uživo je poseban region sa vertikalnim skrolom, ograničen visinom
viewporta. Na desktopu ostaje sticky ispod stvarne visine headera; na mobilnom
ima sopstvenu visinu do 75dvh. Slajd, navigacija, dugmad i zajednički prikaz
ostaju dostupni u tom regionu, nezavisno od skrola kontrola. Header prikazuje
šablon, verziju, boju i broj izabranih radova. Slider nema netačnu oznaku
„4 Slides”; u headeru i izboru verzije piše „Naslovni + radovi + profil”.

U Prilagodi se bira konkretan rad. Naslov, opis, fit, zoom i položaj slike
čuvaju se uz njegov ID u opcionom JSON nizu `artworkEdits`. Biranje rada
otvara odgovarajući slajd; promjena slajda prati aktivni rad. Ime umjetnika,
Instagram i naziv Grid kolekcije ostaju zajednički. Tekst se pojavljuje tamo
gdje ga šablon koristi. Single Work Panorama zadržava zaseban zajednički kadar
svog širokog platna, bez dvostrukog primjenjivanja ranijeg kadra pojedinačne
slike. Kolaži primjenjuju kadar na svako pojavljivanje odgovarajućeg rada.

Uvećanje je ograničeno originalnim slikovnim okvirom, da ne prekriva caption
ili susjedne radove. Preview, overview i izvoz dijele tu logiku. Slike nose
interni ID rada, pa različiti radovi sa istim normalizovanim pikselima ne
dobijaju tuđa podešavanja. Prava i ograničenja nizova/teksta/kadra provjerava
API prije upisa i rezervacije; izvorni Artwork ostaje netaknut.

Novi sadržaji sa pojedinačnim izmjenama koriste renderer 7. Sadržaj bez tih
izmjena zadržava prethodni renderer, a raniji snapshotovi svoj izgled.
`configKey` normalizuje i redosljed ključeva unutar pojedinačnih izmjena,
uključujući crop: PostgreSQL JSONB redosljed više ne daje lažno „Nije sačuvano”.
Nema nove Prisma šeme, migracije, checkout promjene ili fizičkog brisanja.

Izmijenjeni produkcioni fajlovi: `packages/promotion-renderer/index.cjs`,
`index.d.ts`, `apps/api/scripts/prepare-promotion-reference.py`, generisani
`reference-light.cjs`, `reference-dark.cjs`, `stages-light.cjs`, `stages-dark.cjs`,
`apps/api/src/modules/promotions/promotions.dto.ts`, `promotions.service.ts`,
`apps/web/components/promotion-content-controls.tsx`, `promotion-editor.tsx`,
`promotion-editor.css`. Testovi: `apps/api/test/promotion-renderer.test.cjs`,
`promotions.test.cjs`, `apps/web/test/promotions.browser.cjs` i novi
`apps/web/test/promotion-artwork-edits.browser.cjs`.

Verifikacija ovog koraka: 15 renderer + 21 API test, API/web TypeScript i
62 Chrome poređenja preview/PNG kroz sve verzije i obje boje. Testovi koriste
izolovanu bazu i lažni storage. Browser rezultati i snimci su u
`.tmp/promotion-browser`, a PNG poređenja u `.tmp/promotion-artwork-edits`.
Kompletan browser tok prolazi 111 provjera i 24 mjerenja rasporeda bez
runtime grešaka, uključujući native drag, pointer ručicu, stvarni touch drag
na mobilnom prikazu, nezavisan skrol pregleda, ponovno učitavanje zasebnih
podešavanja i stvarni ZIP izvoz. Izolovani Next production build prolazi.

## Aktuelno: prvo šablon, zatim radovi/kolekcija

Generator se otvara na koraku **01 Šablon**, zatim slijede **02 Radovi**,
**03 Prilagodi** i **04 Preuzmi**. Čuvanje drafta ostaje isključivo na klik.
Zajednički header, javni meni/footer, pretplate i naplata nijesu mijenjani.

| Šablon/verzija | Izbor | Novi izvoz |
| --- | --- | --- |
| Slider Carousel | 1–9 radova ili podskup svoje kolekcije | Naslovni + N radova + završni profil; N+2 PNG-a |
| Grid Carousel | 1–9 radova ili podskup svoje kolekcije | Postojeći N slajdova, zaseban naziv kolekcije |
| Panorama / Single Work | Tačno 1 rad, pojedinačno ili iz svoje kolekcije | 3 povezana slajda istog platna |
| Panorama / Collage | 1–6 radova ili podskup svoje kolekcije | 3 povezana slajda; jasno upozorenje o ponavljanju ako je manje od šest |
| Ostali šabloni | Postojeći izbor do 9 radova | Postojeća pravila renderovanja ostaju |

Kolekcije se učitavaju iz postojećeg `Artist.collections` odnosa provjerenog
naloga. API provjerava vlasništvo kolekcije, vlasništvo svih radova i članstvo
svakog izabranog rada u kolekciji. `sourceCollectionId` i `panoramaCrop` su
opciona polja postojećeg JSON drafta/snapshota. Nema nove šeme ili migracije.
Snapshot sadrži izabrane radove; cijela biblioteka kolekcija ne ulazi u njega.
Naslov Grid kolekcije preuzima se prilikom izbora kolekcije i može se ručno
urediti. Redosljed se može promijeniti samo za objavu, bez izmjene galerije.

Kolekcija veća od ograničenja ne skraćuje se automatski: korisnik bira podskup.
Promjena šablona/verzije čuva prethodni izbor i prikazuje upozorenje ako je
prevelik. Takav prelazni draft može se sačuvati, ali backend odbija izvoz
prije rezervisanja prava. Kod Single Work, izbor drugog rada zamjenjuje
prethodni; ostale verzije zadržavaju izbor više radova do svog limita.

Panorama Single Work dobila je kontrole zajedničkog platna 3240 × 1440:
`fit` (cover/contain), `zoom` (1–3), `x` i `y` (0–100). Početni cover
popunjava sva tri slajda; opcija „Prikaži cijeli rad” i dugme za reset
prikazuju cijelu sliku pri 1×, uz prazne rubove gdje odnos stranica to traži.
Vertikalne slike nijesu zabranjene. Prikazuju se približan procenat slike van
kadra i uvećanje u odnosu na rezoluciju koju koristi postojeći worker
(normalizacija duže strane na najviše 4500 px). To su upozorenja o kvalitetu,
a ne zabrana prema orijentaciji. Dimenzije dolaze iz učitane slike; ako se ne
učitaju, korisnik dobija upozorenje. Zahtjev ne može dostaviti proizvoljan
izvor slike. API validira parametre kadra prije upisa/rezervacije.

Pregled pojedinačnog slajda, zajednički prikaz i PNG koriste isti renderer i
iste parametre. Sadašnji preview ne upisuje slike u R2. Novi Slider i Panorama
snapshotovi koriste renderer 6, Grid ostaje na 5; prethodne verzije zadržavaju
svoj izgled, broj slajdova i besplatno ponovno preuzimanje. Stabilni podaci
kartica su sačuvani: promjena aktivnog slajda ne mijenja izbor šablona/verzija.

Produkcioni fajlovi ovog koraka:

- `packages/promotion-renderer/index.cjs`, `index.d.ts`
- `apps/api/scripts/prepare-promotion-reference.py`
- generisani `packages/promotion-renderer/reference-light.cjs`, `reference-dark.cjs`,
  `stages-light.cjs`, `stages-dark.cjs`, `view-light.cjs`, `view-dark.cjs`
- `apps/api/src/modules/promotions/promotions.dto.ts`, `promotions.service.ts`
- `apps/web/components/promotion-editor.tsx`, `promotion-editor.css`,
  novi `promotion-content-controls.tsx`

Prošireni su `apps/api/test/promotions.test.cjs`, `promotion-renderer.test.cjs`,
`apps/web/test/promotions.browser.cjs`, `promotion-slider.browser.cjs`,
`promotion-panorama.browser.cjs`. Ostali fokusirani browser testovi
(`promotion-artist-card`, `promotion-featured-work`, `promotion-profile`,
`promotion-gallery`, `promotion-grid-carousel`, `promotion-picker`) koriste
novi indeks prvog koraka za prikaz šablona.

Verifikacija: 13 renderer + 20 API testova na izolovanoj bazi. Slider: 12
poređenja sa HTML referencom i identičan preview/PNG. Panorama: 36 poređenja
preview/PNG za portretne, horizontalne i široke slike u četiri podešavanja
kadra, uz 9 poređenja istorijskih slajdova sa HTML referencom. Picker: 20
promjena slajda, obje teme, bez izmjene kartica; snimci nakon navigacije
imaju identične hash vrijednosti. Kompletan browser test pokriva 100 provjera
i 24 mjerenja rasporeda, izolovani Next production build i stvarne PNG/ZIP
izvoze. API/web TypeScript prolaze. Rezultati i slike su u
`.tmp/promotion-browser`, `.tmp/promotion-slider`, `.tmp/promotion-panorama`
i `.tmp/promotion-picker`.

Preostala ograničenja: kontrole kadra odnose se na Single Work Panoramu;
Collage koristi postojeći fiksni raspored. Upozorenja ne mogu garantovati
oštrinu izvorne slike. Testovi nijesu koristili radnu bazu ili stvarni R2;
nije izvršen deploy, migracija ili fizičko brisanje.

## Prethodni korak

## Stabilne kartice pri promjeni slajda i zaseban naziv Grid kolekcije

Bug je reprodukovan i snimljen prije ispravke: dok se u glavnom pregledu
mijenjao slajd, rotirani `img`, `title`, `s7` i `sw` prosljeđivani su i svim
karticama šablona/verzija. Kartice sada dobijaju stabilne podatke zasnovane na
prvom slajdu i izvornom redosljedu izbora. Glavni pregled i pregled svih
slajdova i dalje koriste odgovarajući aktivni slajd. Izbor šablona, boje,
verzije, radova ili izmjena teksta i dalje namjerno osvježavaju kartice.

Za Grid je uvedeno nezavisno JSON polje `collectionTitle`. Dostupno je ispod
„Verzije · Grid Carousel” i kao „Naziv kolekcije” u koraku Prilagodi.
Ne prepisuje zajedničko `title` polje za naziv rada. Čuva se u postojećem
draftu i nepromjenjivom snapshotu izvoza, bez izmjene Prisma modela ili
migracije. Novi Grid prikaz ne preuzima naziv rada ako naziv kolekcije
nedostaje. Prazan draft se može sačuvati, a izvoz traži naziv kolekcije.
Server odbija prazan naziv, kontrolne znakove, neispravan tip i više od 180
znakova prije kreiranja posla ili rezervisanja kvote.

Samo novi Grid izlazi koriste renderer verziju 5. Prethodni Grid snapshotovi
zadržavaju ranije prikaze, Slider ostaje na 4, Panorama/Museum Label na 3.
Opciono prazno/nedostajuće novo polje ne mijenja raniji `configKey`, pa drugi
postojeći nacrti i verzije ne gube identitet sadržaja samo zbog ove nadogradnje.

Izmijenjeni produkcioni fajlovi:

- `packages/promotion-renderer/index.cjs` i `index.d.ts`
- `apps/api/src/modules/promotions/promotions.dto.ts` i `promotions.service.ts`
- `apps/api/scripts/prepare-promotion-reference.py`
- generisani `packages/promotion-renderer/reference-light.cjs` i `reference-dark.cjs`
- `apps/web/components/promotion-editor.tsx` i `promotion-editor.css`

Prošireni testovi: `apps/api/test/promotion-renderer.test.cjs`,
`apps/api/test/promotions.test.cjs`, `apps/web/test/promotions.browser.cjs`,
`apps/web/test/promotion-grid-carousel.browser.cjs` i novi
`apps/web/test/promotion-picker.browser.cjs`.

Rezultati: 11 renderer testova i 18 API testova prolaze. Fokusirani picker
test potvrđuje 18 promjena slajda u dvije teme, sa nepromijenjenim svim
karticama šablona i verzija. PNG snimci kartica prije/poslije navigacije nakon
ispravke imaju identične hash vrijednosti. Aplikacioni browser test prolazi
89 provjera i 24 mjerenja rasporeda, uključujući stvarne klikove za Slider,
Grid i Panoramu, čuvanje i ponovno otvaranje naziva kolekcije i stvarni Grid
izvoz. API/web TypeScript i izolovani Next build prolaze. Nema browser grešaka.
Grid poređenje sa novim nazivom i istim testnim slikama/fontovima prolazi.

Snimci su u `.tmp/promotion-picker`: `before-cards-slide-1.png`,
`before-cards-slide-2.png`, `after-cards-slide-1.png`, `after-cards-slide-2.png`,
snimci verzija i cijelog prikaza. Stvarni aplikacioni snimak novog polja je
`.tmp/promotion-browser/grid-collection-title-application.png`. Koriste se
izolovane testne slike; nijesu mijenjani stvarni umjetnici, radovi ili slike.

### Predlog narednog koraka: izbor kolekcije i provjere sadržaja

Ovo je predlog za nastavak; izbor kolekcije i analiza kvaliteta slika nijesu
dio sadašnje ispravke. Prisma već ima `ArtistCollection` i vlasničku vezu
`Artwork.artistCollectionId`, ali Generator trenutno dobija samo vlasnikove
radove (`id`, `title`, `imageUrl`), bez liste kolekcija ili dimenzija slika.

Predlog je izbor „Ručno / Iz kolekcije” koji povlači naziv i radove po
redosljedu kolekcije, a zatim dozvoljava isključivanje i promjenu redosljeda
u objavi. Server mora provjeriti vlasništvo kolekcije i svakog rada. Izbor
u Generatoru ne smije mijenjati izvornu kolekciju.

Strogo blokirati: tuđe/duplirane ID-jeve, prazan izbor, nepostojeći šablon,
neispravnu/nedostupnu sliku, dozvoljene veličine/dekodiranje i prekoračenje
kapaciteta konkretnog rasporeda. Dio ovoga već postoji: vlasništvo, najviše
devet različitih radova, validni tipovi/tekstovi, profilna slika gdje je
potrebna, dozvoljeni izvori i granice dekodiranja slike; novo je obavezno ime
Grid kolekcije. Ostale promjene kapaciteta treba zasebno usaglasiti.

Predloženi izbor po rasporedu: Slider svi izabrani radovi plus profilni
slajd; Grid upozorenje ako nema dovoljno radova za sva tri rasporeda;
Panorama Single Work tačno jedan rad; Panorama Collage do šest radova, sa
jasnim upozorenjem kada manje radova dovodi do ponavljanja. Višak se ne bi
smio neprimjetno ignorisati. Promjena ovih sadašnjih pravila nije implementirana.

Rezoluciju i odsijecanje tretirati kao upozorenja sa stvarnim previewom:
koristiti dimenzije originalne slike i konkretnog isječka, procijeniti
uvećavanje i prikazati šta ispada iz kadra. Sama orijentacija slike nije
dovoljan razlog za zabranu, niti nominalni PNG 1080 × 1440 garantuje kvalitet.
Predložiti uklapanje/prilagođavanje kadra kada je potrebno. Nepopravljivo
neispravna slika blokira izvoz, a legitimno kreativno kadriranje ostaje izbor
korisnika. Za više radova razdvojiti zajednički tekst objave/naziv kolekcije
od opcionalnih izmjena naslova/opisa/kadra pojedinačnih radova.

Nema migracije, izmjena radne baze ili operacija nad stvarnim R2 objektima.

## Ispravke Slider završne strane i zajedničkog carousel pregleda

Prema novoj korisničkoj ispravci, Slider sada sadrži sve izabrane radove i
završni slajd „Pogledaj moj ArtBoard profil”. Nema dodatne uvodne stranice.
Četiri rada daju pet slajdova; jedan rad daje dva, a prazan izbor nula.
Plava strelica prikazuje se na dnu svakog slajda rada, uključujući posljednji
rad koji vodi ka završnoj strani. Završni slajd preuzima dizajn, ime,
Instagram i ArtBoard logo iz postojećeg renderera/reference, u obje boje.

Samo Slider prelazi na renderer verziju 4. Museum Label, Grid i Panorama
ostaju na verziji 3; ostali šabloni na verziji 2. Prethodni snapshotovi i
njihove generisane datoteke ostaju dostupni, sa originalnim brojem slajdova.
Novi Slider zahtjev ne koristi stari PNG/ZIP iz keša. Kvote i naplata nijesu
mijenjani: završni slajd je dio iste objave, bez dodatnog prava izvoza.

Za Slider, Grid i Panorama Carousel dodat je prikaz „Svi slajdovi zajedno”
ispod pojedinačnog pregleda i njegovih kontrola, prema dostavljenoj slici.
Pregled koristi iste modele slajdova i isti `renderGraphic` kao PNG prikaz,
bez zasebne kopije dizajna ili poziva serveru. Panorama se prikazuje kao tri
povezana isječka; Slider uključuje i završnu stranu. Svi prikazi se skaliraju
po širini dostupnog prostora i podržavaju obje UI teme. Ne generišu dodatne
datoteke, ne čuvaju draft i ne troše kvotu.

Izmijenjeni produkcioni fajlovi:

- `packages/promotion-renderer/index.cjs` i `index.d.ts`
- `apps/api/scripts/prepare-promotion-reference.py`
- generisani `packages/promotion-renderer/reference-light.cjs` i `reference-dark.cjs`
- `apps/web/components/promotion-editor.tsx` i `promotion-editor.css`

Prošireni su `apps/api/test/promotion-renderer.test.cjs`,
`apps/api/test/promotions.test.cjs`, `apps/web/test/promotion-slider.browser.cjs`
i `apps/web/test/promotions.browser.cjs`.

Fokusirani Slider browser test potvrđuje svih deset prikaza sa nula različitih
piksela prema referenci uz iste testne slike, fontove i logo. Potvrđeni su
boja plave strelice, završna strana i podudaranje glavnog pregleda sa PNG-om.
Prolazi deset renderer i 17 API testova, kao i API/web TypeScript provjere.
Ponovo prolaze vizuelne provjere Grid i Panorama šablona.

Izolovani Next build i aplikacioni browser test prolaze 84 provjere i 24
mjerenja rasporeda, bez console/runtime grešaka. Obuhvaćeni su broj slajdova,
završna Slider strana, stvarna plava strelica, zajednički prikaz sva tri
carousel dizajna, skaliranje Panorame na 390 px i stvarni Slider ZIP sa
slajdom rada i završnim PNG-om. Snimci `slider-overview.png` i
`panorama-overview-390.png` u `.tmp/promotion-browser` vizuelno su pregledani.

Nema migracije, izmjena radne baze niti operacija nad stvarnim R2 fajlovima.
Prethodni izvještaji ispod opisuju stanje prije ove korisničke ispravke.

## Panorama Carousel: tri povezana slajda — implementirano

Nova referenca je sačuvana u
`apps/web/references/promotion-panorama-artifact-20261031.html`. Sadrži 10a
Single Work Dark, 10b Collage Light i 10c Collage Dark, svaki kao neprekinuto
platno 3240 × 1440 px isječeno u tri PNG-a 1080 × 1440 px.

Korisnik je potvrdio izuzetak od pravila „jedan rad = jedan slajd”: Panorama
uvijek daje tri povezana slajda kada postoji bar jedan izabrani rad. Prazan
izbor ima nula slajdova. Single Work koristi prvi izabrani rad; Collage prvih
šest, u redosljedu izbora. Sa manje od šest radova postojeći raspored ponavlja
izabrane slike. Editor prikazuje ove informacije uz izbor radova.

Adapter sada zadržava iste slike i tekst na platnu 3240 × 1440 px i pomjera
prikaz za 0, −1080 i −2160 px. Navigacija editora koristi broj slajdova iz
zajedničkog renderera, pa strelice, tastatura i swipe rade i sa jednim radom.
Promjena šablona/izbora bezbjedno ograničava trenutni indeks. Ostali šabloni
zadržavaju dosadašnje pravilo o broju slajdova.

Novi Panorama zahtjevi za generisanje koriste renderer verziju 3. Prethodni
snapshotovi verzije 1/2 i njihove privatne datoteke ne prepisuju se. Novi
izlaz se razlikuje u identitetu sadržaja, pa ne dobija stari ponovljeni početak
platna iz keša. Generator koristi postojeći privatni PNG/ZIP tok i evidentira
jednu objavu u kvoti za cijeli skup od tri slike. Ponovno preuzimanje je bez
dodatnog trošenja kvote.

`apps/web/test/promotion-panorama.browser.cjs` sada testira aktuelni renderer
bez forsiranja stare verzije. Devet isječaka provjereno je
sa istim testnim slikama, postojećim logom i Alcyone fontovima na obje strane.
Pet prikaza ima nula različitih piksela; preostala četiri imaju 3–38 različitih
piksela sa maksimalnom razlikom jednog RGB nivoa na antialiasing ivicama
rotiranih slika. Svih devet glavnih pregleda identično je svojim PNG izlazima;
tri spojena platna odgovaraju isječcima iz reference. Neizabrana kartica
provjerena je u obje UI teme. Browser nema console/runtime grešaka. Originalne
`/_blob/` slike nijesu priložene.

Izmijenjeni fajlovi za ovu podfazu:

- `packages/promotion-renderer/index.cjs`
- `apps/web/components/promotion-editor.tsx`
- `apps/api/test/promotion-renderer.test.cjs`
- `apps/api/test/promotions.test.cjs`
- `apps/web/test/promotion-panorama.browser.cjs`
- `apps/web/test/promotions.browser.cjs`
- ovaj izvještaj i prethodno sačuvana Panorama referenca

Prolazi deset renderer testova i 17 API testova na izolovanoj bazi. Nova API
provjera generiše sve tri varijante pravim Chrome rendererom, provjerava tri
različita privatna PNG-a, dimenzije, ZIP redosljed, jednu potrošnju kvote i
ponovno preuzimanje. API i web TypeScript prolaze. Ponovo prolaze zasebna
browser poređenja Grid i Slider šablona. Nema migracije, izmjena radne baze
niti operacija nad stvarnim R2 fajlovima.

Završni aplikacioni browser test i izolovani Next build prolaze: 77 provjera,
24 mjerenja rasporeda i nula browser grešaka. Obuhvaćeni su tri slajda iz
jednog rada, pomjeranje platna uz istu izvornu sliku, tastatura, mobilni swipe,
prazan izbor, povratak na standardni šablon, stvarni ZIP izvoz i jedna kvota.

## Grid Carousel: tri rasporeda, Blue/Red i zasebna referenca

Referenca je sačuvana u
`apps/web/references/promotion-grid-carousel-artifact-20261031.html`. Naslovi u
prilogu nijesu potpuno usklađeni sa sadržajem: pod 9e ponovljen je 9d Blue Dark
HTML, a pod 9f nalazi se 9e Red Light. Poređenje koristi stvarni `data-carousel`
identitet, pa su zasebno potvrđeni 9c, 9d i 9e. Red Dark (9f) ostaje prema ranijem
kompletnom Artifactu; nova zasebna referenca za njega nedostaje.

Raniji adapter ponavljao je prvi Grid raspored na svakom slajdu. Sada prvi
izabrani rad koristi uvodni grid, srednji radovi raspored sa slikom i opisom,
a posljednji rad završni grid sa stvarnim QR kodom kada postoje bar tri rada.
Broj slajdova ostaje jednak broju izabranih radova. Za jedan rad postoji samo
uvodni raspored; za dva rada uvodni i raspored sa opisom. Ne dodaju se posebne
uvodne/završne strane. Aktivni rad uvijek je prva slika na svom slajdu, a
završni grid dopunjavaju sljedeći izabrani radovi kružno, postojećim redosljedom.
Naslov, ime, opis i Instagram koriste stvarne podatke/ručne izmjene; prazan
opis ne uvodi demo tekst.

Nova referenca određuje završni tekstualni blok od 596 × 124 px. Kompajler
primjenjuje tu dimenziju za novi prikaz, uz očuvan raniji prelom teksta u
starijim snapshotovima. Grid sada koristi renderer verziju 3: novi zahtjev ne
vraća prethodni PNG sa ponovljenim prvim rasporedom, dok se stare verzije i
njihove datoteke ne prepisuju. Ostali šabloni i pravila obračuna ostaju isti.

Promijenjeni aplikacioni fajlovi:

- `packages/promotion-renderer/index.cjs`
- `apps/api/scripts/prepare-promotion-reference.py`
- generisani `packages/promotion-renderer/reference-light.cjs`,
  `reference-dark.cjs`, `stages-light.cjs` i `stages-dark.cjs`

Dodati/prošireni testovi:

- `apps/web/test/promotion-grid-carousel.browser.cjs`
- `apps/api/test/promotion-renderer.test.cjs`
- `apps/web/test/promotions.browser.cjs`

Fokusirani browser test potvrđuje devet prikaza sa nula različitih piksela
prema novom HTML-u, uz iste testne slike, QR sadržaj, logo i fontove. Originalne
`/_blob/` slike nijesu priložene. Za sve četiri kombinacije Blue/Red i
Light/Dark potvrđeno je 12 podudaranja glavnog pregleda sa PNG izlazom,
četiri dekodirana QR koda, neizabrana kartica u obje teme i rad sa 1/2/3/5
slika. Za 9f nijesu prijavljeni rezultati poređenja sa nedostajućom referencom.

Prolazi devet renderer testova i 16 Generator API testova na izolovanoj bazi.
Aplikacioni browser test prolazi 68 provjera i 24 mjerenja rasporeda,
uključujući Grid navigaciju, izmjenu sva tri rasporeda i stvarni ZIP sa četiri
PNG-a. API/web TypeScript i izolovani Next build prolaze. Nema browser grešaka.
Ponovo prolaze zasebna vizuelna poređenja Shop i Slider šablona.
Nema migracije, izmjena radne baze niti operacija nad stvarnim R2 fajlovima.

## Shop: zasebne reference 8a/8b, 8c/8d i 8g/8h

Dostavljeni HTML sačuvan je kao
`apps/web/references/promotion-shop-artifact-20261031.html`. Original & Print,
Sold i Full Bleed u svijetloj i tamnoj varijanti već odgovaraju referenci;
promjena produkcionog renderera nije bila potrebna. Reference 8e/8f nijesu
dostavljene niti se dodaju u katalog.

`node apps/web/test/promotion-artist-card.browser.cjs --shop` provjerava svih
šest PNG izlaza na 1080 × 1440 px: nula različitih piksela prema dostavljenom
HTML-u uz iste testne slike i Alcyone fontove. Originalni `/_blob/` fajlovi
nijesu priloženi. Za svih šest verzija glavni pregled jednak je PNG izlazu;
neizabrana Shop kartica provjerena je u obje teme, bez console/runtime grešaka.

Provjereni su drugi slajd, naziv izabranog rada, ručni naslov, Instagram,
dinamično ime u Sold varijanti i engleski tekstovi. Prazan Instagram ne uvodi
demo kontakt, a šablon ne dodaje izmišljene cijene. Svaki izabrani rad i dalje
daje jedan slajd. Oznake „Dostupno”, „Prodato” i „u printu” jesu tekst izabrane
promotivne varijante; nijesu povezane sa provjerom zaliha ili statusom prodaje
u bazi. Ovo ne uvodi webshop ili naplatu.

Zajednička browser provjera ponovo prolazi za Artist Card, Block Poster i
New Artwork (još 18 PNG poređenja i 18 poređenja glavnog pregleda). Izmijenjeni
su samo ova evidencija, zajednički browser test i sačuvana referenca. TypeScript,
API i build nijesu ponavljani jer nema promjene aplikacionog koda. Baza, R2,
kvote i postojeće verzije preuzimanja ostaju nepromijenjeni.

## Slider Carousel: reference 7a/7b i ispravna numeracija

Dostavljeni HTML sačuvan je kao
`apps/web/references/promotion-slider-artifact-20261031.html`. Referenca sadrži
uvod, četiri rada i završnu stranu, ali ostaje ranije potvrđeno pravilo: četiri
izabrana rada daju četiri slajda. Preuzet je raspored stranice pojedinačnog rada
u svijetloj i tamnoj varijanti, bez automatskog uvoda i završne strane.

Ispravljena je numeracija koja je nakon rotiranja izabranih radova ostajala na
„01”. Sada prati položaj slajda, dok je dekorativna strelica skrivena na posljednjem
radu. Funkcionalne kontrole pregleda i dalje prikazuju prethodni/sljedeći slajd
uz swipe i tastaturu. Slider sada koristi renderer verziju 3, pa prethodni
snapshotovi verzije 1/2 i njihove datoteke zadržavaju ranije ponašanje, a novi
zahtjev ne vraća stari PNG sa pogrešnom numeracijom. Ostali dizajni i kvote ostaju
nepromijenjeni.

`apps/web/test/promotion-slider.browser.cjs` potvrđuje osam prikaza radova na
1080 × 1440 px (četiri rada, dvije boje) uz nula različitih piksela prema
referenci sa istim testnim slikama i fontovima; na posljednjem radu referentna
strelica se izostavlja jer više nema završne strane. Provjereni su redosljed,
nazivi, numeracija, glavni pregled jednak PNG-u i neizabrana kartica u obje teme.
Originalni `/_blob/` fajlovi nijesu priloženi.

Prolazi osam renderer testova i 16 Generator API testova na izolovanoj bazi.
Stvarni aplikacioni browser test prolazi 65 provjera i 24 mjerenja rasporeda,
uključujući Slider klikove, promjenu slike/broja/brojača, posljednji slajd i
četiri PNG-a u ZIP-u. Nema browser grešaka. API/web TypeScript i izolovani Next
build prolaze. Nema migracije niti izmjena radne baze ili R2 fajlova.

## New Artwork: zasebne reference 6a–6f

Dostavljeni fajl sačuvan je kao
`apps/web/references/promotion-new-artwork-artifact-20261031.html`. Red Stripe,
Blue Stripe, Yellow Stripe, Black Stripe i Full Bleed u obje boje već odgovaraju
referenci; promjena produkcionog renderera nije bila potrebna.

Zajednička browser provjera proširena je komandom
`node apps/web/test/promotion-artist-card.browser.cjs --new-artwork`.
Svih šest PNG izlaza na 1080 × 1440 px identično je dostavljenom HTML-u uz iste
testne slike, postojeći logo i Alcyone fontove na obje strane; originalni
`/_blob/` fajlovi nijesu priloženi. Glavni pregled i PNG identični su za svih
šest prikaza, a neizabrana kartica provjerena je u obje teme. Izbor nudi pet
verzija: četiri Stripe verzije u svijetloj varijanti i Full Bleed u obje boje.

Provjereni su drugi slajd, automatski i ručni naslov, ime, Instagram i izmjena
opisa. Prazan opis ne uvodi demo tekst iz reference. Nema console/runtime
grešaka. Zajednički test ponovo prolazi i za Artist Card i Block Poster.
Baza, storage, kvote i postojeći produkcioni kod nijesu mijenjani.

## Block Poster: zasebne reference 5a–5f

Dostavljeni HTML sačuvan je kao
`apps/web/references/promotion-block-poster-artifact-20261031.html`. Blue,
Yellow, Red, White, Full Bleed Black i Full Bleed White već odgovaraju referenci;
promjena produkcionog renderera nije bila potrebna.

Postojeći browser test proširen je zajedničkim režimom za Block Poster:
`node apps/web/test/promotion-artist-card.browser.cjs --block-poster`.
Svih šest PNG izlaza na 1080 × 1440 px ima nula različitih piksela u odnosu na
HTML uz iste testne slike, postojeći ArtBoard logo i Alcyone fontove. Originalni
`/_blob/` fajlovi nijesu priloženi. Glavni pregled i PNG odgovaraju u svih šest
slučajeva; umanjena neizabrana kartica provjerena je u obje teme. Jednobojne
verzije ostaju u podržanoj boji i pri suprotnom zahtjevu, prema postojećem katalogu.

Provjereni su drugi slajd i njegov naziv, ručni naslov, ime i Instagram bez
hardkodovanih demo podataka. Nema browser console/runtime grešaka. Zajednički
test provjerava i raniji Artist Card set; baza, storage i kvote nijesu mijenjani.

## Gallery: zasebne reference 4a–4f

Dostavljeni HTML sačuvan je kao
`apps/web/references/promotion-gallery-artifact-20261031.html`. Profile Grid,
Photo Dump 3×3 i Full Bleed već odgovaraju referenci u obje boje; nije bila
potrebna izmjena produkcionog renderera.

`apps/web/test/promotion-gallery.browser.cjs` potvrđuje nula različitih piksela
za svih šest PNG prikaza na 1080 × 1440 px uz iste testne slike, logotipe,
Alcyone fontove i QR podatke na obje strane. Originalni `/_blob/` fajlovi nijesu
priloženi. Svih šest glavnih pregleda identično je PNG izlazu, izbor sadrži tri
verzije, a neizabrana Gallery kartica je provjerena u obje teme.

Provjerene su 54 kombinacije dizajna/slajda sa devet radova i namjerno
izmiješanim izborom: svaki izabrani rad redom postaje prvi u kompoziciji,
ostali prate redosljed izbora. Provjeren je i slučaj jednog rada, kao i dinamički
ime, ručni naslov i Instagram. Oba QR koda Profile Grid varijante dekodiraju se
na odgovarajući profil. Nema console/runtime grešaka. Baza, storage, obračun
kvota i raniji šabloni nijesu mijenjani.

## Profile: zasebne reference 3a–3f

Sačuvan je dostavljeni HTML kao
`apps/web/references/promotion-profile-artifact-20261031.html`. Classic,
Profile Page i Full Bleed već odgovaraju dostavljenom rasporedu u obje boje;
promjena produkcionog renderera nije bila potrebna. Ova provjera ne mijenja
ranije odobrenu Museum Label ispravku.

`apps/web/test/promotion-profile.browser.cjs` provjerava šest varijanti na
1080 × 1440 px. Sve imaju nula različitih piksela u odnosu na reference kada
obje strane koriste iste testne radove, avatar, postojeće ArtBoard logotipe,
Alcyone fontove i QR kod. Originalne `/_blob/` slike nijesu priložene.
Referentni demo QR i URL zamjenjuju se istim testnim profilom na obje strane;
stvarni QR iz svakog PNG izlaza zatim se zasebno dekodira i provjerava odredište.

Svih šest glavnih pregleda iz `renderUi` identično je PNG izlazu. Provjeren je
izbor tri verzije i neizabrana Profile kartica u obje teme prije klika, sa stvarnim
QR podacima. Izbor drugog rada mijenja slajd; izmjene imena, Instagrama i profila
mijenjaju odgovarajući sadržaj i QR. Nema console/runtime grešaka. Dodati su samo
referenca, browser provjera i ova dokumentacija; baza, storage i kvote nijesu
mijenjani.

## Museum Label: umanjeni prikaz prije izbora

Ispravljeno je vezivanje Museum Label prikaza za verziju aktivnog šablona.
`renderUi` sada uvijek prikazuje aktuelni Museum Label raspored u karticama i
izboru verzija, i kada je aktivan Artist Card, Profile ili Gallery Frame.
Privatna istorija i `graphicHTML` i dalje poštuju verziju starog snapshota.

Regresioni test prvo je reprodukovao grešku sa izabranim Artist Card šablonom.
Nakon ispravke svih sedam renderer testova prolazi. Browser provjera obuhvata
šest kombinacija aktivnog dizajna i teme, uključujući neizabranu Featured Work
karticu, kao i prethodne PNG/aspect-ratio provjere. Nema runtime/console grešaka;
web TypeScript prolazi.

## Museum Label: cijela slika, tekst ispod

Na zahtjev korisnika revidirane su samo Museum Label varijante 2a/2b. Slika
koristi `object-fit:contain` bez uvećanja i negativnog vertikalnog pomjeranja.
Tekst i godina su u zasebnom redu ispod prostora slike, uz razmak od 40 px na
izvornom platnu; prostor slike se prilagođava visini naslova. Nema preklopljene
bijele/tamne kartice koja odsijeca donji dio rada. Kompajler primjenjuje promjenu
na thumbnail, preview i export prikaze u obje teme.

Novi Museum Label snapshot koristi renderer verziju 3. Ranije verzije 1/2
zadržavaju originalni raspored; novi identitet sprečava vraćanje starog PNG-a
kao rezultata novog rasporeda. Museum Label i naknadno revidirani Slider koriste
verziju 3; ostali šabloni ostaju na verziji 2 i zadržavaju postojeći identitet
sadržaja, ponovna preuzimanja i izgled. Nema migracije niti
izmjene postojećih fajlova ili obračuna kvota.

Browser provjera obuhvata portretne, pejzažne i kvadratne radove u obje boje:
slika je cijela, tekst ne prelazi preko nje, a naziv i godina staju na platno.
Četiri ostale Featured Work varijante ostaju identične referenci, kao i stari
Museum Label snapshotovi. API/web TypeScript i Generator API/renderer testovi
prolaze. Ranija provjera originalne reference ispod odnosi se na verziju 2.

## Featured Work: provjera zasebnih referenci 2a–2f

Sačuvan je dostavljeni HTML kao
`apps/web/references/promotion-featured-work-artifact-20261031.html`.
Museum Label, Gallery Frame i Full Bleed već su implementirani u obje boje i
odgovaraju dostavljenom rasporedu; promjena render koda nije bila potrebna.

`apps/web/test/promotion-featured-work.browser.cjs` poredi stvarni PNG render sa
svih šest referenci na 1080 × 1440 px. Uz iste testne slike i postojeće Alcyone
fontove, razlika je nula piksela za svaku varijantu. Referenca Gallery Frame
navodi `.ab-bg-ecf9c726` bez CSS pravila; korišćeno je odgovarajuće postojeće
center/cover pravilo iz ranije dostavljenog kompletnog Generator Artifakta, sa
izabranim radom u zamućenoj pozadini. Originalne `/_blob/` slike nijesu priložene.

Provjereno je da drugi slajd prikazuje drugi rad i njegov naziv, a ručni naziv,
ime umjetnika i godina ostaju dinamički. Nema browser console/runtime grešaka.
Ova dopuna dodaje referencu, browser provjeru i dokumentaciju; ne mijenja bazu,
storage, kvote, istoriju niti druge šablone.

## Artist Card: provjera zasebnih referenci 1a–1f

Sačuvan je novi dostavljeni HTML kao
`apps/web/references/promotion-artist-card-artifact-20261031.html`.
Classic, Full Bleed i Center Portrait već su u zajedničkom rendereru, svaki u
svijetloj i tamnoj varijanti; promjena njihovog render koda nije bila potrebna.

`apps/web/test/promotion-artist-card.browser.cjs` upoređuje PNG iz stvarne
`graphicHTML` putanje sa svakom od šest dostavljenih referenci. Uz iste testne
slike, postojeći ArtBoard logo i fontove, svih šest slika dimenzija 1080 × 1440
ima nula različitih piksela. Originalne `/_blob/` slike nijesu priložene, pa se
ova provjera odnosi na raspored i stil uz iste zamjenske slike na obje strane.
Provjereni su zaseban slajd za drugi rad i dinamičko ime/Instagram; nema runtime
grešaka. Profilna fotografija, tekst prema izabranom načinu predstavljanja i
postojeći izbor potpisa ostaju povezani sa stvarnim podacima korisnika.

## Ispravka: React upozorenja pri promjeni kvote

Traka kvote je kombinovala promjenljivi `background` sa `background-size` i
`background-position`. Pri ponovnom renderovanju shorthand je resetovao veličinu
gradijenta na `auto`, uz dva React development upozorenja. Kompajler reference
sada za te segmente koristi `background-color` i `background-image` uz postojeću
veličinu i poziciju; ponovo su generisani `reference-light.cjs` i
`reference-dark.cjs`. Izgled i broj slajdova ostaju isti.

Dodat je `apps/web/test/promotion-style.browser.cjs`: stvarni React development
render, iste montirane DOM trake, osam promjena kvote u dvije teme. Test je
reprodukovao reset veličine prije ispravke; nakon ispravke sve veličine, pozicije
i boje prolaze, bez console/runtime grešaka. Pet renderer testova i web TypeScript
provjera takođe prolaze. Baza, R2 i obračun kvota nijesu mijenjani.

## Dopuna: svaki izabrani rad dobija slajd

Novo generisanje (`rendererVersion: 2`) daje tačno onoliko slajdova koliko je
izabrano radova, redosljedom izbora. Nema dodatnih uvodnih/završnih slajdova.
Artist Card i ostali pojedinačni prikazi koriste odgovarajući rad na svakom slajdu;
kolažni prikazi redom postavljaju aktivni rad prvi i zadržavaju ostale kao kontekst.
Pregled ima prethodni/sljedeći slajd, brojač, lijevo/desno tastere kada je fokusiran
i touch swipe. Vertikalni pokret ostaje skrol stranice. Uklanjanje posljednjeg rada
prilagođava aktivni indeks. Kod jednog rada dodatne kontrole se ne prikazuju.

Isti plan koristi PNG/ZIP generator. Već sačuvani snapshotovi verzije 1 i njihovi
fajlovi zadržavaju ranije značenje i broj slajdova; nema promjene baze ni migracije.
Identitet renderera ulazi u poređenje sadržaja, pa stari rezultat ne zamjenjuje novi.
SVG `shape-rendering` pravilno se prevodi u React `shapeRendering`, a PNG HTML
zadržava standardni SVG atribut. Provjera React development rendera svih 31 verzija
u obje boje prolazi bez upozorenja.

Provjere dopune: 5 renderer testova i postojeći 16-testni Generator API skup,
uključujući stvaran trostrani PNG/ZIP izvoz; 63 browser provjere, bez console/runtime
grešaka. Browser preuzima ZIP sa tačno četiri PNG-a za četiri izabrana rada.
API i web TypeScript provjere prolaze; izolovani Next browser build prolazi.

Izmijenjeni su `packages/promotion-renderer/index.cjs`, `index.d.ts`, ponovo
generisani `reference-light.cjs`, `reference-dark.cjs`, `stages-light.cjs` i
`stages-dark.cjs`; `apps/api/scripts/prepare-promotion-reference.py`,
`apps/api/src/modules/promotions/promotions.service.ts`, `promotion.generator.ts`,
`apps/web/components/promotion-editor.tsx`, `promotion-editor.css`,
`apps/api/test/promotions.test.cjs`, `apps/web/test/promotions.browser.cjs` i ovaj
izvještaj. Dodat je `apps/api/test/promotion-renderer.test.cjs`.

Ispod je izvještaj osnovne implementacije prije ove dopune.

Generator je implementiran na `/generator` i povezan sa dashboardom umjetnika.
Migracija `20261031150000_promotion_generator` primijenjena je na lokalnu radnu
bazu nakon uspješne provjere na praznoj izolovanoj bazi. Nije urađen deploy.
Stvarna AllSecure naplata ostaje nedostupna do dobijanja testnog trgovca i
zvanične integracione dokumentacije. Aplikacija ne simulira plaćanje.

## Implementirano

- Sadržaj, Šablon, Prilagodi i Preuzmi koriste postojeću provjerenu artist sesiju.
- Izbor najviše devet sopstvenih radova; redosljed izbora određuje redosljed slika.
- Tekst, jezik i boja objave nezavisni su od javnog profila i teme aplikacije.
- Draft nastaje isključivo eksplicitnim čuvanjem. Otvaranje nema upis u bazu.
  Istovremeno čuvanje starog drafta vraća 409 umjesto prepisivanja novijih izmjena.
- Katalog ima 10 šablona i 31 verziju iz dostavljenog glavnog HTML Artifakta.
- Pravi PNG izlazi imaju 1080 × 1440 px. Karusel daje numerisane PNG fajlove u ZIP-u.
- Nakon generisanja automatski se pokreće preuzimanje. Postojeći identičan sadržaj
  koristi raniji rezultat. Promjena izvorne slike pravi novi snapshot, a raniji fajl
  ostaje dostupan.
- Privatna istorija ima po 12 zapisa, thumbnail, metapodatke, status i ponovno
  preuzimanje. Pristup ostaje vlasniku i poslije isteka Premiuma.
- Nema demonstracionog izbora plana, Desktop/Mobile kontrola ni Claude oznake.

## Renderer i reference

Originalni svijetli/tamni HTML koriste sopstveni `sc-if`/`sc-for` DSL.
`prepare-promotion-reference.py` ga unaprijed prevodi u obične JS render funkcije.
U produkciji nema `eval`, učitavanja Claude runtime-a niti izvršavanja HTML skripti.
React koristi te funkcije za interfejs i pregled, a server iste grafičke definicije
pretvara u HTML za Chrome screenshot u izvornoj rezoluciji. PNG se ne povećava iz
umanjenog pregleda. CSS je ograničen na Generator pomoću `@scope`.

Preuzeti su postojeći Alcyone fontovi i originalni logotipi. Fontovi za UI koriste
Bold za težine 800/900, a grafički prikazi koriste odgovarajući najdeblji rez, kao u
referenci. Statična demo slika zamućene pozadine zamijenjena je izabranim radom.
Demo ime, radovi, istorija, datum obnove i brojači zamijenjeni su stvarnim podacima.

Glavni Artifact već sadrži prikaze svih verzija. To nije tvrdnja da su pojedinačni
izlazi svih 31 verzija prošli konačno pixel poređenje sa budućim zasebnim grafičkim
referencama. Njih treba dodatno provjeriti kada budu dostavljene.

## Backend, modeli i kvote

Novi modeli su `PromotionDraft`, `PromotionGeneration`, `PromotionGeneratedFile`
i `PromotionCreditLedger`. Postojeći `PortfolioPurchase` i `PortfolioPaymentEvent`
koriste se i za `GENERATOR_PACK`, bez paralelnog sistema narudžbina.

Potvrđena pravila: Free jedno uspješno generisanje ukupno; Premium deset u
mjesečnom periodu pretplate; kupljeni set deset kredita za 490 centi. Kupljeni
krediti ne ističu. Prvo se troši uključena kvota, zatim kupljeni krediti.
Karusel predstavlja jedno generisanje, bez obzira na broj slajdova.

Transakcija zaključava `ArtistAccount` prije rezervacije. Baza dodatno štiti
jednokratno Free pravo, aktivni identični sadržaj i ključ idempotentnosti.
`QUEUED`/`PROCESSING` predstavlja rezervisano pravo; `READY` potrošeno pravo;
`FAILED` oslobođeno pravo. Mjesečni period računa postojeći
`subscriptionQuotaWindow`, uključujući kraće mjesece.

Trajni red se obrađuje u API procesu, najviše jedan render po procesu. Više procesa
koristi `FOR UPDATE SKIP LOCKED`, lease token, heartbeat i provjeru tokena prije
objavljivanja. Posao se nastavlja poslije zatvaranja taba ili restarta procesa.
Poslije tri prekida radnika posao prelazi u FAILED. Sve slike moraju biti sačuvane
prije atomskog upisa manifesta i prelaska u READY. Kasni rezultat starog radnika
ne može objaviti fajlove niti ponovo potrošiti pravo.

Datoteke i snapshotovi uspješnih generisanja su nepromjenjivi. SHA-256 se provjerava
pri isporuci. Neuspjeh čitanja ne povećava brojač uspješnih preuzimanja.

## Rute i autorizacija

Sve API rute ispod `/artist/promotions` koriste `ArtistAuthGuard` i provjeru
autentifikovanog vlasnika u servisu:

| Metoda | Putanja | Namjena |
|---|---|---|
| GET | `/artist/promotions?page=1` | Podaci profila, draft, kvota i istorija |
| PUT | `/artist/promotions/draft` | Eksplicitno čuvanje sa provjerom revizije |
| POST | `/artist/promotions/generations` | Idempotentna rezervacija i red poslova |
| GET | `/artist/promotions/generations/:id` | Privatni status |
| GET | `/artist/promotions/generations/:id/download/:format` | PNG, ZIP ili thumbnail |
| POST | `/artist/promotions/purchases` | Idempotentna evidencija započete kupovine |

Next posrednik `/api/artist/promotions/[[...path]]` ima eksplicitnu listu metoda i
putanja, provjeru sesije, origin zaštitu i ograničenje tijela. Vlasnički ID nije
dozvoljeno DTO polje. URL fajla ili UUID generisanja ne daju pravo pristupa.

## Plaćanje i storage

Postojeća stranica `/placanje?proizvod=dopuna-generatora` prikazuje stvarnu kvotu
Generatora i cijenu 4,90 €. AllSecure dugme ostaje onemogućeno; ne prikupljaju se
podaci kartice i nema lažnih uspješnih narudžbina.

Postojeći serverski hook `confirmVerifiedPayment` atomskom transakcijom povezuje
potvrđeni payment događaj i deset kredita. Provjeravaju se proizvod, vlasnik,
iznos, valuta, PAID status i potvrđen događaj. Jedna kupovina može dati samo jedan
ledger zapis. Ponovljeni uspješan ili kasni neuspješan događaj ne dodaje nove kredite.
Ne postoji javni callback ili admin prekidač koji vjeruje tvrdnji browsera.

Izlazi idu u odvojeni privatni R2 bucket. U development režimu, kada privatni
bucket nije podešen, koristi se `.data/private-promotions`, izvan web `public/`.
U produkciji se izvoz blokira ako privatni storage nije podešen. Chrome ne pristupa
mreži: dobija samo serverski provjerene i normalizovane slike sopstvenih radova.
Potreban je Chrome/Chromium; Docker API slika ga sada uključuje, a druga okruženja
mogu zadati `PROMOTION_CHROME_EXECUTABLE`.

Fizičko brisanje nije dodato. Objekti nastali prije neuspjelog ili preuzetog lease-a
mogu ostati bez manifesta; njihovo buduće čišćenje zahtijeva posebnu storage fazu.

## Provjere

- Generator API: 16/16 testova, izolovana baza i testni storage. Pokriveni su
  vlasništvo, lažni ID-jevi, draftovi, granice, Free/Premium/kupljena prava,
  paralelne rezervacije i radnici, oporavak, neuspjelo čuvanje dijela karusela,
  mjesečna obnova, izmjena izvornika, potvrđeno plaćanje i idempotentnost.
- Stvarni Chrome render: PNG 1080 × 1440, tri različita slajda i uređen ZIP.
- Browser: 56/56 provjera, bez runtime/console grešaka; eksplicitno čuvanje i
  ponovno otvaranje, live preview, pravi download, besplatno ponovno preuzimanje,
  Free početno/iskorišćeno stanje, Next auth/origin zaštita.
- Referenca: 24 poređenja = četiri koraka × dvije teme × tri širine
  (1536 × 650, 440 × 956 i 390 × 956). Nema horizontalnog overflow-a.
- QR regresije: 21/21. Portfolio Commerce regresije: 22/22.
- API TypeScript build i web `tsc --noEmit`: uspješno.
- Puni izolovani Next produkcioni build: uspješno, uključuje novu `/generator` rutu.
- Lokalni development smoke: API bez prijave vraća 401, web preusmjerava na
  `/artist/login` sa 307. Ispravljen je i Turbopack uvoz novog zajedničkog paketa.

Mjerenja desktopa u oba prikaza i sva četiri koraka: header 61 px, sidebar x=32 px,
širina sidebara 240,64 px, glavni sadržaj x=300,64 px. Razlika glavnog x položaja i
širine u odnosu na otvorenu referencu je 0 px. Headless Chrome u ovoj provjeri ima
clientWidth=1536 bez rezervisanog scrollbara; zato je glavni sadržaj 1203,36 px.
Mjerenje 1188 px iz specifikacije odnosi se na dokument širine 1521 px uz scrollbar.
Stvarni URL profila, kvote, datumi i dužina teksta mogu promijeniti visinu pojedinih
redova; ti podaci se namjerno ne zamjenjuju demonstracionim vrijednostima.

Dokazi su u `.tmp/promotion-browser/results.json`, screenshotovima istog direktorijuma
i `.tmp/promotion/local-migration.json`. Testni fajlovi nijesu poslati na stvarni R2.

## Lokalna baza i preostalo

Prije i poslije migracije: Artist 76, ArtistAccount 3, Artwork 1115,
ArtistCollection 3, PortfolioProject 4, PortfolioPurchase 0. Nijedan postojeći
zapis ili fajl nije obrisan. Header, hamburger i footer komponente nijesu mijenjani;
Generator samo dobija sopstveni prikaz kroz postojeći SiteChrome izbor rute.

Preostaju stvarni AllSecure merchant/testni pristup, provjera provider potpisa,
refund/chargeback pravilo za eventualno već potrošene kupljene kredite i
produkcijska provjera privatnog R2 bucket-a/Chrome procesa na ciljnom hostu.
Rate limiting je po API procesu; produkcijski ingress treba da ograniči i zbirni
saobraćaj. Posebni budući grafički Artifacti mogu precizirati postojeće prikaze.

## Tačni fajlovi ovog zadatka

Postojeći izmijenjeni fajlovi:

```text
.env.example
package.json
package-lock.json
apps/api/package.json
apps/api/Dockerfile
apps/api/prisma/schema.prisma
apps/api/src/app.module.ts
apps/api/src/storage/storage.types.ts
apps/api/src/storage/r2-storage.service.ts
apps/api/src/modules/artist-subscriptions/subscription-overview.service.ts
apps/api/src/modules/portfolio-projects/portfolio-commerce.service.ts
apps/api/src/modules/portfolio-projects/portfolio-payment-context.service.ts
apps/web/package.json
apps/web/Dockerfile
apps/web/components/site-chrome.tsx
apps/web/components/artist-dashboard-overview.tsx
apps/web/components/artist-dashboard-plan.tsx
apps/web/components/payment-workspace.tsx
apps/web/lib/site-surface.ts
apps/web/lib/subscription-overview.ts
apps/web/app/admin/portfolio-purchases/[id]/page.tsx
```

Novi fajlovi:

```text
apps/api/prisma/migrations/20261031150000_promotion_generator/migration.sql
apps/api/src/modules/promotions/promotions.module.ts
apps/api/src/modules/promotions/promotions.controller.ts
apps/api/src/modules/promotions/promotions.service.ts
apps/api/src/modules/promotions/promotions.dto.ts
apps/api/src/modules/promotions/promotion.access.ts
apps/api/src/modules/promotions/promotion.generator.ts
apps/api/src/modules/promotions/promotion.storage.ts
apps/api/src/modules/promotions/promotion-purchase.service.ts
apps/api/scripts/prepare-promotion-reference.py
apps/api/scripts/prepare-promotion-tests.cjs
apps/api/scripts/deploy-promotion-local.cjs
apps/api/scripts/promotion-status.cjs
apps/api/test/promotions.fixture.cjs
apps/api/test/promotions.test.cjs
apps/api/docs/promotion-generator-status.md
apps/web/app/generator/page.tsx
apps/web/app/api/artist/promotions/[[...path]]/route.ts
apps/web/components/promotion-editor.tsx
apps/web/components/promotion-editor.css
apps/web/lib/promotions.ts
apps/web/services/promotions.ts
apps/web/test/promotions.browser.cjs
apps/web/public/generator-fonts/Alcyone-Regular.woff2
apps/web/public/generator-fonts/Alcyone-Medium.woff2
apps/web/public/generator-fonts/Alcyone-SemiBold.woff2
apps/web/public/generator-fonts/Alcyone-Bold.woff2
apps/web/public/generator-fonts/Alcyone-Black.woff2
packages/promotion-renderer/package.json
packages/promotion-renderer/index.cjs
packages/promotion-renderer/index.d.ts
packages/promotion-renderer/catalog.json
packages/promotion-renderer/logos.json
packages/promotion-renderer/reference-light.cjs
packages/promotion-renderer/reference-dark.cjs
packages/promotion-renderer/reference-light.css
packages/promotion-renderer/reference-dark.css
packages/promotion-renderer/stages-light.cjs
packages/promotion-renderer/stages-dark.cjs
packages/promotion-renderer/view-light.cjs
packages/promotion-renderer/view-dark.cjs
```

`.tmp` sadrži samo lokalne reference, rezultate testova i buildove. Postojeći
nepovezani izmijenjeni fajlovi u radnom direktorijumu nijesu prepisivani.
