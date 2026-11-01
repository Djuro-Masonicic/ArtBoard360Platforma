# QR vizit karta — implementacija 30. 10. 2026.

Naknadne dopune: **Editor ima pet glavnih kartica**: Basic, ArtBoard, Classic, No Cover i Portret. No Cover objedinjuje precizne dizajne Clean / Profilna kroz izbor varijante. Basic, ArtBoard, Classic i Portret imaju i Branded varijantu. Detalji su u [Basic izvještaju](qr-basic-20261030.md), [ArtBoard izvještaju](qr-artboard-20261031.md), [Classic izvještaju](qr-classic-20261031.md), [Clean/Profilna izvještaju](qr-clean-20261031.md), [Portret izvještaju](qr-portret-20261031.md) i [No Cover grupisanju](qr-no-cover-group-20261031.md). Clean/Profilna zadržavaju stare ID-jeve `no-cover`/`portrait`; Portret koristi `portrait-artwork` radi očuvanja postojećih draftova. Izvorni izvještaj ispod opisuje prvobitnu implementaciju.

Alat je integrisan u postojeću aplikaciju na `/qr-vizit-karta`, za prijavljene umjetnike. Dashboard sada otvara ovu rutu umjesto oznake „Uskoro”. Nema zasebnog demoa, demo naloga, selektora pretplatničkog stanja ni novih javnih navigacionih komponenti.

## Integracija sa projektom

- Web: postojeći Next.js 16 / React 19, sesija u HTTP-only cookieju i privatni Next posrednici.
- API: NestJS, postojeći `ArtistAuthGuard`, Prisma/PostgreSQL i `ArtistAccount` kao vlasnik drafta/verzija.
- Podaci: `Artist` za ime, kontakt email, avatar, naslovnu sliku i slug; `SocialLink` za Instagram/Behance; telefon iz postojeće odobrene prijave umjetnika. Nije dodavano duplo polje telefona niti novi sistem identiteta.
- Pretplata: postojeći `hasPremiumAccess` i `subscriptionState`. Otkazani Premium koji još ima pristup zadržava QR pravo do isteka, kao i ostali alati projekta.
- Izvoz: postojeće biblioteke PDFKit, Sharp, node-qrcode i lokalni Alcyone fontovi. Nije mijenjan Portfolio PDF generator.
- Storage: postojeći R2 servis i zaseban privatni bucket. Za lokalni razvoj bez tog bucketa postoji privatni disk adapter, opisan ispod.

## Funkcionalnosti

Četiri koraka: Podaci, Šablon, Pregled, Preuzmi. Ime/kontakti, izbor slike, šablon, varijanta, boja, jezik i naslov poleđine se čuvaju isključivo eksplicitnom akcijom „Sačuvaj draft”. Samo otvaranje alata ne kreira zapis. Promjene drafta ne mijenjaju javni profil.

Draft ima reviziju; dvije istovremene izmjene ne prepisuju jedna drugu bez upozorenja. Čuvanje zastarjele revizije vraća 409 i zadržava unos na stranici. Reload učitava posljednji sačuvani draft. Maksimalno tri kontakta validiraju se i na serveru. Neispravni URL-ovi, nepoznata polja i tuđe slike se odbijaju.

QR se generiše na serveru iz `SITE_BASE_URL` i stvarnog sluga, kroz postojeću javnu rutu `/umjetnik/:slug`. Ne postoji slobodan unos QR odredišta. Ako je profil arhiviran/neobjavljen, draft ostaje dostupan, a novi izvoz se odbija. Stare verzije se preuzimaju nezavisno od trenutnog profila.

Postojeći dashboard nema uređivanje sluga. Link zato vodi na stvarni dashboard, uz objašnjenje da promjenu adrese trenutno obavlja podrška; nema lažnog lokalnog editovanja sluga.

Live preview prikazuje obje strane. Veliki pregled ima 3D flip, izbor strane i zaseban bleed overlay. Tema interfejsa koristi postojeću sačuvanu temu naloga i ne mijenja boju same kartice. Mobile ima horizontalnu navigaciju koraka, jednu kolonu šablona, kontakt kontrole jednu ispod druge i preview poslije glavnog sadržaja.

## Privremeni šabloni

Registry u `packages/qr-card-renderer` sadrži Basic, ArtBoard, Classic, No Cover i Portret. Jedan SVG renderer koriste thumbnail, live preview, flip i serverski izvoz. Render model odvaja podatke od vizuala.

- Basic: slika, donja traka, avatar i ime.
- ArtBoard: slika preko cijelog fronta, zatamnjenje, centriran avatar i ime.
- Classic: slika gore, tekstualna traka dolje.
- No Cover: tekst i postojeći ArtBoard znak; ne učitava naslovnu sliku.
- Portret: tekst lijevo, slika desno.

Branded varijante imaju dodatni postojeći ArtBoard znak ili naglašenu traku. Svijetla/tamna boja se odnosi na podloge i tekst; ArtBoard front zadržava tamni preliv radi čitljivosti fotografije, a poleđina prati izabranu boju. Jezik i naslov poleđine imaju stvaran efekat. Precizna geometrija/artwork pet šablona i konačna tipografska obrada čekaju sljedeći Artifact, kako je traženo. Ovi vizuali nijesu označeni kao konačni pixel-perfect šabloni.

## PDF, PNG i preuzimanje

- Jedan ZIP: dvostrani print PDF i zasebni `prednja.png` / `zadnja.png`.
- PDF MediaBox/BleedBox: 91 × 61 mm; TrimBox: 85 × 55 mm, uvučen 3 mm sa svake strane.
- Bleed produžava rubne piksele slike; linije reza nalaze se u bleed prostoru. PDF zadržava link ka javnom profilu.
- PNG: 1004 × 650 px, metadata 300 dpi. Zaokruživanje piksela daje približno 85 × 55 mm pri 300 dpi.
- Alcyone tekst se pri izvozu pretvara u konture pomoću fontkit zavisnosti postojećeg PDFKit-a. Ne zavisi od instaliranih sistemskih fontova. PDF sadrži rasterizovane strane pri 300 dpi, sa vektorskim linijama reza.
- ZIP koristi STORE i CRC32; provjeren je standardnim Python `zipfile` čitačem. Jedno preuzimanje izbjegava browser blokadu više automatskih download-a.
- Iz istorije su dostupni i pojedinačni PDF/PNG fajlovi.

Snapshot konfiguracije, QR adrese i izvora slika vezan je za svaku verziju. Sačuvani izlazni fajlovi se ne renderuju ponovo pri redownload-u. Istorija ima paginaciju, status, datum, broj uspješno posluženih download zahtjeva i vrijeme posljednjeg. Brojač nije potvrda da je klijent zaista sačuvao fajl na svoj disk.

## Prava, konkurentnost i greške

| Stanje | Nova verzija | Stare spremne verzije |
| --- | --- | --- |
| Aktivan Premium | Neograničeno | Dostupne |
| Free, pravo dostupno | Jedna uspješna generacija | Dostupne |
| Free, pravo potrošeno | Potreban Premium | Dostupne besplatno |
| Bivši Premium | Potrebna obnova | Dostupne besplatno |
| Generisanje | Dodatni submit blokiran | Dostupne |
| Greška | Bezbjedan retry; Free nije potrošen | Dostupne |

Identitet dolazi samo iz provjerene sesije. Nema `ownerId` parametra koji daje pristup. Tuđi UUID vraća 404. Mutacije kroz Next provjeravaju Origin / cross-site zaglavlje, a API svaku operaciju autorizuje.

Rezervacija se radi pod PostgreSQL zaključavanjem reda naloga. Parcijalni unique indeksi dozvoljavaju jednu aktivnu pripremu po nalogu i jednu Free rezervaciju/uspjeh. Idempotency ključ je jedinstven po nalogu; drugačiji sadržaj pod istim ključem vraća 409. Free je potrošen tek kada sva tri fajla postoje i verzija pređe u READY. Storage/generator greška ostavlja FAILED i mogućnost retry-a. QR pravo se računa iz ovih istih zapisa, bez dodatnog kontradiktornog flag-a, i prikazuje se u pretplati/dashboardu.

Rezervacija traje dva minuta. Prekinuta priprema se pri sljedećem čitanju/zahtjevu označava kao neuspjela. Vrijeme rezervacije je i fencing vrijednost: stari pokušaj ne može završiti preko obnovljenog pokušaja. Po API procesu dozvoljene su najviše dvije aktivne generacije. Generisanje je ograničeno na osam zahtjeva po nalogu u minuti, download na 60. Ograničenje zahtjeva je procesno; zaključavanje, jedinstvenost i entitlement su u bazi i važe preko više instanci.

Nema trajnog queue workera. Pri restartu prekinuti posao neće automatski nastaviti; korisnik ponavlja zahtjev kada rezervacija istekne. Za veći saobraćaj ostaje trajni job queue i zajednički rate limiter. Nepovezani R2 objekti iz djelimično neuspjelog izvoza zadržavaju se za zasebnu odobrenu storage proceduru; nema fizičkog brisanja.

## Storage i okruženje

`R2_PRIVATE_PDF_BUCKET_NAME` već postoji u projektu. Za produkciju mora označavati zaseban bucket sa isključenim javnim pristupom i odgovarajućim dozvolama tokena. QR PDF/PNG čuvaju se pod `qr-cards/:exportId/`; javni URL-ovi se ne vraćaju. Preuzimanje prolazi kroz provjerenog vlasnika na backendu. Izvori slika se uzimaju iz njegovih zapisa, a čitač dozvoljava konfigurisan R2 i postojeće dozvoljene CDN hostove, uz veličinske/pikselne limite i zabranu proizvoljnih preusmjerenja.

Lokalni `.env` trenutno nema privatni R2 bucket. Zato razvojni API (`NODE_ENV=development`) čuva QR fajlove u `.data/private-qr-cards`, izvan `public/`, sa nasumičnim imenima i preko istog autorizovanog download API-ja. Direktorijum je isključen iz Git-a i Docker konteksta. Produkcija nema ovaj fallback: bez privatnog bucketa odbija nove izvoze prije rezervacije prava. Lokalni fajlovi nijesu automatski prenosivi na drugi server.

Nije kreiran bucket, nije mijenjan `.env`, nijesu slani stvarni fajlovi u R2 i nije provjerena isporuka iz stvarnog privatnog bucketa. Integracioni testovi koriste memorijski transport; zaseban test provjerava stvarno privatno pisanje/čitanje na izolovanom disku.

`SITE_BASE_URL` trenutno je `http://localhost:3000`. Lokalni QR zato vodi na lokalni profil. Za skeniranje drugim uređajem/produkciju treba konfigurisan javno dostupan domen; kod ga ne hardkodira. Nema novih obaveznih env varijabli.

Premium CTA vodi na postojeće `/placanje?proizvod=premium`. AllSecure/Hipotekarna integracija i stvarna kartična naplata nijesu dodavane ili zaobilažene ovim zadatkom.

## Baza

Migracija `20261030190000_qr_cards` dodaje `QrCardDraft`, `QrCardExport`, strane ključeve, CHECK/unique indekse i veze sa nalogom. Nema izmjene postojećih poslovnih zapisa, brisanja, CV/Portfolio modela ili R2 operacija. Prvo je testirana na novoj praznoj bazi, zatim primijenjena na lokalnu radnu bazu kroz skriptu koja odbija bilo koju drugu pending migraciju.

Brojevi prije i poslije: 76 umjetnika, 3 naloga, 1115 radova, 3 kolekcije, 4 portfolija i 0 portfolio kupovina. Svi brojevi ostali isti. Migracija je aktivna lokalno; nije rađen deploy na udaljeni server. Buduća procedura stvarnog brisanja naloga mora eksplicitno obuhvatiti QR zapise; RESTRICT veze sada čuvaju istoriju od slučajnog brisanja.

## Provjere

- 19 QR integracionih testova; unutar njih izvoz i dekodiranje za svih 20 kombinacija pet šablona × dvije boje × dvije varijante.
- 32 regresije radova/storage zaštite, 19 Contact API i 16 Guest memory testova: zajedno sa QR testovima **86/86**.
- 22 Dashboard API regresije i 17 Subscription API regresija: **39/39**.
- Ukupno **125 Node testova**. Testni zapisi i storage zamjene nalaze se u izolovanim bazama/procesima.
- **43 browser provjere**, uključujući svih šest poslovnih stanja, sve korake/obje teme, draft reload, limit kontakata, flip, bleed, stvarni download kroz privatni proxy, grešku/retry i dashboard link. Bez JavaScript runtime grešaka.
- Dodatnih **50 browser regresija postojećeg dashboarda** prolazi nakon aktiviranja QR linka. Ukupno 93 browser provjere u dvije testne skripte.
- Širine 1536, 1280, 1024, 900, 768, 390 i 320 px: bez horizontalnog overflow-a na sva četiri koraka.
- Desktop 1536 × 960, original i implementacija: toolbar 61 px; sidebar x=32/w=240.28125; main x=300.28125/w=795.4375; preview x=1123.71875/w=380.28125. Razlika od mjera iz prompta potiče od širine scrollbara u referentnom okruženju; poređenje je rađeno na istom viewportu sa stvarnim HTML-om. Visine sadržaja se razlikuju zbog stvarnih podataka, dodatnih objašnjenja i privremenih renderera.
- API build, web TypeScript i puni web build u izolovanom direktorijumu prolaze. Aktivni web `.next` nije prepisivan buildom.
- Nema konfigurisanog lint skripta u workspace paketima; lint nije prijavljen kao izvršen.

Puni web build otkrio je dvije postojeće Next.js 16 tipske greške: union Promise/object u login `searchParams` i kontekstu rute za prijavu na oglas. Ispravljene su samo deklaracije na Promise, bez promjene ponašanja. Build log bilježi postojeće informativne poruke o dinamičkom renderovanju stranica koje koriste no-store fetch. U integracionim testovima postoji pg upozorenje o starom paralelnom query obrascu u postojećem quota servisu; provjere prolaze.

Artefakti/logovi: `.tmp/qr-cards/` i `.tmp/qr-browser/`. `sample.pdf`, `sample.front.png`, `sample.back.png`, `sample.zip` sadrže samo izolovane testne podatke. Browser screenshotovi uključuju light/dark sve korake i mobile 390 px.

Komande:

```powershell
node apps/api/scripts/prepare-qr-tests.cjs
node --test apps/api/test/qr-cards.api.test.cjs apps/api/test/artworks.patch.test.cjs apps/api/test/contact.api.test.cjs apps/web/test/guest-portfolio-memory.test.cjs
node apps/web/test/qr-cards.browser.cjs
npm run build --workspace @artboard/api
npx tsc --noEmit -p apps/web/tsconfig.json
node apps/web/test/build-isolated.cjs
npm run dev
```

`prepare-qr-tests` zahtijeva lokalni Postgres kontejner projekta. Priloženi HTML-ovi se opciono čitaju iz Downloads; alternativno `ARTBOARD_QR_REFERENCE_DIR`. Browser provjere stvarne reference preskaču se samo ako ona nije dostupna. U ovoj isporuci oba priložena fajla su dostupna i desktop referenca je pregledana. Test skripte ne brišu baze niti fajlove.

Ručna provjera šest stanja: legitimni izolovani `qrHarness().artist('PREMIUM'|'FREE'|'EXPIRED')` fixture-i, stvarna generacija za FREE_USED, `storage.gate` za trajanje generisanja i `storage.fail` za grešku. Ove kontrole postoje samo u test procesu, ne u produkcionom UI-ju. Ne mijenjati stvarne pretplate radi testiranja.

## Tačni fajlovi ovog zadatka

Novi:

- `packages/qr-card-renderer/package.json`, `index.cjs`, `index.d.ts`, `brand.cjs`.
- `apps/api/prisma/migrations/20261030190000_qr_cards/migration.sql`.
- `apps/api/src/modules/qr-cards/qr-cards.module.ts`, `qr-cards.controller.ts`, `qr-cards.service.ts`, `qr-cards.dto.ts`.
- `apps/api/src/modules/qr-cards/qr-card.access.ts`, `qr-card.generator.ts`, `qr-card.storage.ts`, `qr-card.text.ts`, `qr-card.zip.ts`.
- `apps/api/scripts/prepare-qr-tests.cjs`, `deploy-qr-local.cjs`.
- `apps/api/test/qr-cards.fixture.cjs`, `qr-cards.api.test.cjs`.
- `apps/web/app/qr-vizit-karta/page.tsx`, `loading.tsx`, `error.tsx`.
- `apps/web/app/api/artist/qr-cards/[[...path]]/route.ts`.
- `apps/web/components/qr-card-editor.tsx`, `qr-card-editor.module.css`.
- `apps/web/lib/qr-cards.ts`, `apps/web/services/qr-cards.ts`.
- `apps/web/test/qr-cards.browser.cjs`, `build-isolated.cjs`.
- Ovaj izvještaj.

Izmijenjeni:

- `package.json`, `package-lock.json`, `apps/api/package.json`, `apps/web/package.json`: lokalni renderer workspace; jsQR samo kao razvojni testni dekoder.
- `apps/api/Dockerfile`, `apps/web/Dockerfile`: manifest novog workspace paketa prije npm ci.
- `.gitignore`, `.dockerignore`, `.env.example`: privatni lokalni fajlovi i dokumentovana konfiguracija.
- `apps/api/prisma/schema.prisma`, `apps/api/src/app.module.ts`.
- `apps/api/src/storage/r2-storage.service.ts`, `storage.types.ts`: privatni QR formati, čitanje artefakata i bezbjedno čitanje izvora.
- `apps/api/src/modules/artist-subscriptions/subscription-overview.service.ts`: stvarno QR pravo.
- `apps/web/components/artist-dashboard-editor.tsx`, `artist-dashboard-overview.tsx`, `artist-dashboard-plan.tsx`: aktivni QR link i stvaran prikaz dostupnosti.
- `apps/web/components/site-chrome.tsx`: izostavljanje javnog chrome-a samo na novoj privatnoj QR ruti. Zajednički javni header, hamburger i footer komponente nijesu mijenjane ovim zadatkom.
- `apps/web/lib/site-surface.ts`: prepoznavanje nove ArtBoard rute.
- `apps/web/app/artist/login/page.tsx`, `apps/web/app/api/artist/opportunities/[id]/apply/route.ts`: dvije tipske kompatibilnosti za puni build.
- `apps/api/test/artist-collections.fixture.cjs`, `subscription-management.api.test.cjs`: aktivna izolovana testna šema i očekivanje stvarnog QR prava.
- `apps/web/test/artist-dashboard.browser.cjs`: oznaka „Uskoro” ostaje samo za neimplementirani Generator, jer je QR sada aktivan.

## Preostalo

Precizni dizajni pet šablona; konfiguracija i stvarni test privatnog produkcionog R2 bucketa; javni produkcioni domen; potvrda štamparije za papir, rez i duplex orijentaciju. PDF nije CMYK/PDF-X probni otisak. Za skaliranje ostaju trajni worker, distribuirani limiter i odobrena politika zadržavanja/čišćenja artefakata. AllSecure i promjena sluga ostaju postojeće nezavršene integracije, bez lažnih akcija.

`npm audit --json` nad cijelim projektom prijavio je **27 postojećih dependency nalaza: 4 critical, 16 high, 6 moderate i 1 low**. Critical grupe su `next`, `proxy-addr`, `concurrently` i `shell-quote` (posljednje dvije pripadaju razvojnom lancu). Za dodatni testni `jsqr` nije prijavljen nalaz. Nije rađen `audit fix`, promjena major verzija ili nadogradnja ostatka stacka. Ovo je zaseban posao prije produkcionog puštanja; prolazak funkcionalnih testova ne znači da su ti nalazi riješeni. Tačni advisory URL-ovi i putanje zavisnosti su u `.tmp/qr-cards/dependency-audit.json`.

Tehničke reference korišćene pri provjeri: [jsQR](https://github.com/cozmo/jsQR), [Sharp extend](https://sharp.pixelplumbing.com/api-resize/#extend), [PDFKit](https://pdfkit.org/docs/getting_started.html).
