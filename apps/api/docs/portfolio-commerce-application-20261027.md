# Portfolio Builder: Guest kupovine, admin i kvote — 27. 10. 2026.

Aplikacioni tok je povezan sa već odobrenim commerce modelima. Ovo nije izvještaj o aktiviranoj AllSecure naplati: testni trgovac i zvanični ugovorni integracioni parametri nijesu dostupni, a privatni R2 bucket još nije podešen.

## Implementirano

- `/portfolio-builder/new` otvara postojeći editor preko memorijskog adaptera. Nema kreiranja `PortfolioProject`, autosave-a, localStorage/IndexedDB stanja, Guest edit tokena ili ponovnog otvaranja drafta. File i blob URL reference ostaju u trenutnoj stranici; adapter i preview oslobađaju svoje URL-ove.
- Guest može unositi podatke, dodati slike, urediti radove i CV, izabrati postojeći PDF preset i sastav dokumenta. Live prikaz koristi privremene slike. Eksplicitni PDF preview u Izvozu koristi postojeći generator i watermark, bez trajnog upisa. Novi ulaz je sada aktivan; ranija B.1 je bila samo priprema.
- Stara Guest create ruta je zatvorena. Stored Guest/orphan UUID ne daje pristup čitanju, uploadu, izmjenama ili izvozu. Prijavljeni vlasnici zadržavaju svoje postojeće draftove i rute.
- Dugme za pripremu Guest narudžbine šalje dozvoljeni sadržaj i slike serveru. Cijena dolazi sa servera: 890 centi za portfolio ili zaseban CV. Kreira se `PortfolioPurchase`, a ne Guest draft. UI izričito kaže da AllSecure još nije dostupan i ništa nije naplaćeno.
- Dodatni izvoz prijavljenog vlasnika ima isti transakcioni tok i serversku cijenu 490 centi. Backend sam čita vlasnika i sadržaj projekta; ne prima snapshot ili vlasnički ID iz browsera. Priprema je odbijena dok postoji raspoloživa kvota ili izvoz u toku. Narudžbina ne daje pravo uređivanja.
- Kupovina čuva zamrznut sadržaj, hash, proizvod, cijenu i kupca. Postojeći SQL trigger odbija izmjene tih vrijednosti. Isti operation key i isti ograničeni pristup vraćaju istu kupovinu; promijenjen sadržaj ili tuđi pristup ne prepisuju postojeću kupovinu.
- Prije čuvanja narudžbine server probno generiše i validira PDF. Čisti probni bajtovi se odbacuju na serveru i nikada se ne vraćaju neplaćenom korisniku.
- Interni servis prima buduće verifikovane payment događaje, provjerava iznos/valutu, jedinstvenost događaja i payment reference. Ponovljeni događaj ne duplira kupovinu. FAILED/PENDING ne daju finalni PDF. Kasni neuspješan događaj ne poništava već potvrđeni PAID.
- Namjerno nema HTTP rute za „mark paid”, browser success callback-a, admin override-a ili javnog testnog otključavanja. Stari portfolio demo endpoint odbija potvrđivanje plaćanja u svim okruženjima; demo pretplata je dodatno zabranjena u produkciji.

## Slike, PDF i ograničena isporuka

Guest multipart ugovor prihvata najviše 33 slike, po najviše 1 MB pri slanju. Browser umanjuje velike fajlove za transport. Server provjerava stvarne slike pomoću sharp-a, ograničava ulaz na 40 miliona piksela, uklanja metapodatke i normalizuje JPEG do 2400 px. Ukupan obrađeni sadržaj slika ograničen je na 10 MB, a tekstualni multipart dokument na 128 KB. Preview ne upisuje ni bazu ni R2.

Najmanja implementacija bez nove migracije čuva obrađene Guest slike unutar privatnog JSONB snapshota kupovine, kao data URI. To znači do približno 13,4 MB kodiranih slika po narudžbini i veće backup-e; ovaj sadržaj nije javni API odgovor. Anonimni renderer ne prihvata proizvoljne URL-ove, storage ključeve, vlasnike ili kolekcije. Slike postojećeg account portfolija ostaju reference na njegove nezavisne, neprepisive snapshot objekte; fizičko brisanje je i dalje isključeno.

Privremeni i finalni PDF koristi isti postojeći generator. Dodata je samo podrška za server-normalizovane JPEG data URI slike; PDF dizajn i novi vizuelni prototipovi nijesu mijenjani.

Kupovina dobija ograničen delivery secret sa 256 bita slučajnosti. Baza čuva njegov hash; browser dobija HTTP-only cookie ograničen na API putanju te narudžbine. Tajna nije dio URL-a, localStorage-a ili editora. Status/isporuka mogu preživjeti refresh i služe isključivo narudžbini. Sam UUID ne daje pristup. Važenje je sedam dana i najviše pet pokušaja preuzimanja. Admin može opozvati sve grantove kupovine.

Na prvo dozvoljeno preuzimanje PAID kupovine server generiše i kešira finalni PDF pod determinističkim ključem u zasebnom privatnom bucketu. Sljedeća preuzimanja koriste iste bajtove. Nema javnog URL-a ni fallback-a na javni bucket. Zaključavanje kupovine obuhvata provjeru PAID statusa, opoziva i limita, te storage operaciju; greška ne troši download brojač. Ne postoji uređivanje narudžbine.

Kod dodatne account kupovine prva isporuka istovremeno kreira jednu `PortfolioVersion` i jednu COMMITTED/PAID usage stavku. Ponovljena isporuka ih ne duplira. Verzija čuva kupljeni snapshot i ostaje u istoriji; novije izmjene drafta se ne prepisuju. Ako PDF već postoji u privatnom storageu nakon ranijeg DB rollback-a, nedostupan fizički page count ostaje null umjesto izmišljene vrijednosti.

## Kvote i istorija

- Free: jedan besplatan izvoz po nalogu ukupno, kroz sve projekte i oba scope-a.
- Premium: pet izvoza po mjesečnom periodu pretplate, bez prenosa. Period dolazi isključivo iz serverske pretplate. Godišnji period se dijeli na mjesečne prozore sa očuvanjem početnog dana i pravilnim krajem mjeseca.
- Rezervacija traje 15 minuta. Posao oporavka svakih 60 sekundi oslobađa istekle rezervacije. Zakasnjeli worker ne može finalizovati isteklo pravo.
- Account advisory lock i DB constraints štite paralelne rezervacije. Finalizacija uzima account lock prije project lock-a kako FK upisi i paralelno generisanje ne bi obrnuli redosljed zaključavanja.
- Render i privatni upload prethode finalnoj transakciji. Ona ponovo provjerava sadržaj/vlasništvo, kreira verziju i tek tada potvrđuje usage. Greška oslobađa rezervaciju. Fizičko uklanjanje eventualnog orphan PDF-a ostaje odloženo.
- Operation key se prenosi kroz Next proxy. Browser zadržava ključ poslije mrežne/5xx greške, tako da izgubljen odgovor nakon commit-a ne stvara novi izvoz. Definitivan odbijen zahtjev omogućava novi pokušaj.
- Istorija ima stvarni scope, manifest sadržaja, hash, revision i fizički broj strana/radova za nove generisane verzije. Stare nepoznate vrijednosti nijesu izmišljene.
- `canGeneratePdf` razlikuje novo trošenje kvote od besplatnog čitanja već sačuvane verzije. Istorijski download i otvaranje postojećeg čistog PDF-a iz preview-a ne generišu novi PDF i ne troše kvotu.
- Draft sa usage evidencijom se ne briše kroz običan draft delete; servis vraća jasan konflikt i zadržava obračun/istoriju.

## Admin

`/admin/portfolio-purchases` prikazuje paginiranu evidenciju narudžbina, stvarni iznos, status i datum. Detalj prikazuje zamrznute podatke/radove/CV, payment događaje, delivery brojače i opoziv. Preview narudžbine je watermarked. API zahtijeva provjerenu admin sesiju; artist sesija ne daje admin pravo. Hash delivery tajne nije dio admin odgovora. Admin review ne generiše čisti PDF na račun tuđe kvote.

## Nove rute

| API ruta | Pravo / ponašanje |
| --- | --- |
| `POST /portfolio-commerce/guest/preview` | Ograničen anonimni multipart, watermark, bez upisa |
| `POST /portfolio-commerce/guest/purchase` | Validacija, preflight, zamrznuta PENDING kupovina za 890 centi |
| `POST /portfolio-commerce/projects/:id/purchase` | ArtistAuthGuard + vlasništvo, server snapshot, 490 centi |
| `GET /portfolio-commerce/purchases/:id` | Delivery grant, samo ograničeni status |
| `GET /portfolio-commerce/purchases/:id/pdf` | Važeći grant + PAID + limit, privatna isporuka |
| `GET /admin/portfolio-purchases` | Samo admin, paginacija |
| `GET /admin/portfolio-purchases/:id` | Samo admin, snapshot i audit |
| `GET /admin/portfolio-purchases/:id/preview-pdf` | Samo admin, watermark |
| `DELETE /admin/portfolio-purchases/:id/delivery` | Samo admin, opoziv svih grantova |

Next catch-all posrednik dozvoljava samo navedene korisničke operacije, provjerava origin za upis i vlasničku sesiju izvodi iz cookie-ja. Admin PDF posrednik i server action za opoziv koriste zasebnu admin sesiju. Nijesu uvedene rute za payment potvrdu iz browsera.

## Tačni fajlovi ovog paketa

API aplikacija:

- `apps/api/src/modules/portfolio-projects/portfolio-commerce.service.ts` — novo.
- `apps/api/src/modules/portfolio-projects/portfolio-guest.service.ts` — novo.
- `apps/api/src/modules/portfolio-projects/portfolio-commerce.controller.ts` — novo.
- `apps/api/src/modules/portfolio-projects/portfolio-projects.module.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-projects.controller.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-projects.dto.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-projects.service.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-access.guard.ts` — ažuriran komentar ugovora.
- `apps/api/src/modules/portfolio-projects/admin-portfolio-projects.controller.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-pdf.generator.ts`.
- `apps/api/src/modules/artist-subscriptions/artist-subscriptions.service.ts`.
- `apps/api/src/storage/r2-storage.service.ts`.

Web aplikacija:

- `apps/web/components/guest-portfolio-builder-form.tsx`.
- `apps/web/components/portfolio-builder-editor-shell.tsx`.
- `apps/web/components/portfolio-cv-workspace.tsx`.
- `apps/web/components/portfolio-export-workspace.tsx`.
- `apps/web/components/portfolio-guest-checkout.tsx` — novo.
- `apps/web/components/portfolio-account-purchase.tsx` — novo.
- `apps/web/components/portfolio-purchase-status.tsx` — novo.
- `apps/web/components/portfolio-print-toolbar.tsx`.
- `apps/web/components/portfolio-generate-pdf-button.tsx`.
- `apps/web/components/portfolio-pdf-preview.tsx`.
- `apps/web/lib/guest-portfolio-memory.ts`.
- `apps/web/lib/portfolio-editor-adapter.ts` — ažuriran komentar ugovora.
- `apps/web/lib/portfolio-guest-transport.ts` — novo.
- `apps/web/lib/portfolio-proxy.ts`.
- `apps/web/services/portfolio-projects.ts`.
- `apps/web/types/api.ts`.
- `apps/web/app/api/portfolio-commerce/[...operation]/route.ts` — novo.
- `apps/web/app/api/admin/portfolio-purchases/[id]/preview-pdf/route.ts` — novo.
- `apps/web/app/portfolio-purchase/[id]/page.tsx` — novo.
- `apps/web/app/portfolio-builder/[id]/payment/page.tsx`.
- `apps/web/app/admin/portfolio-purchases/page.tsx` — novo.
- `apps/web/app/admin/portfolio-purchases/[id]/page.tsx` — novo.
- `apps/web/app/admin/portfolios/page.tsx`.
- `apps/web/app/admin/portfolios/[id]/page.tsx`.

Testovi i dokumentacija:

- `apps/api/test/portfolio-commerce.api.test.cjs` — novo.
- `apps/api/test/portfolio-private-pdf.test.cjs`.
- `apps/api/test/portfolio-authorization.test.cjs`.
- `apps/api/test/portfolio-collections.api.test.cjs` — ranija Free zabrana zamijenjena potvrđenim pravilom prvog besplatnog izvoza.
- `apps/web/test/guest-portfolio-memory.test.cjs`.
- `apps/web/test/portfolio-commerce.browser.cjs` — novo.
- `apps/api/docs/portfolio-export-commerce-status.md` — veza ka aktuelnom stanju.
- Ovaj izvještaj.

## Provjere

- 81/81 unit i mock API provjera: autorizacija, CV/document plan, storage, privatno determinističko keširanje i Guest memorijski adapter.
- 51/51 stvarnih API/DB integracionih provjera: novi commerce testovi i postojeće kolekcije/PDF regresije. Uključene su paralelne Free i Premium rezervacije/finalizacije, pet sačuvanih Premium verzija, storage greška, promjena sadržaja tokom izvoza, oporavak, FAILED/PAID, idempotentni događaji, privatni limit, dodatni plaćeni izvoz i admin opoziv.
- 18/18 browser provjera, bez browser runtime grešaka: Guest unos/upload/preview/narudžbina, ograničeni cookie, PENDING/PAID isporuka, tuđi UUID, admin pregled/opoziv, reset Guest stranice, stvarne Free/Premium kvote, dodatna narudžbina, besplatno otvaranje sačuvanog PDF-a, ponavljanje poslije izgubljenog odgovora i PDF.js canvas prikaz. Desktop 1440 px i dodatni mobilni ulaz 390 px su zabilježeni screenshotovima.
- Browser provjera koristi produkciono izgrađen izolovani Next frontend, stvarne Next posrednike i stvarni izolovani Nest/PostgreSQL API. R2 je lažan. Potvrde plaćanja se u testu pozivaju direktno kao interna servisna funkcija; nijesu AllSecure bankarski testovi.
- API i web TypeScript, kao i lokalni API/web produkcioni build: prolaze. Build ima ranije postojeće homepage dynamic-render poruke; izlazni kod je 0.
- Dokazi: `.tmp/portfolio-commerce-unit.log`, `.tmp/portfolio-commerce-integration.log`, `.tmp/portfolio-commerce-build.log`, `.tmp/portfolio-commerce-browser/results.json` i browser screenshotovi u istom direktorijumu.

Radna baza je provjerena samo čitanjem: **0 projekata, 0 kupovina i 0 usage stavki** poslije izolovanih testova. Nema nove migracije, promjene Prisma šeme, brisanja, stvarnog R2 upload/copy/delete-a ili deploya. Nije mijenjan CSS headera/sidebara niti PDF dizajn.

Lokalni projekat je pokrenut poslije provjera: web `http://localhost:3000/portfolio-builder/new` i API `http://localhost:4000/artists?page=1&pageSize=1` vraćaju HTTP 200. Runtime metapodaci i logovi su u `.tmp/local-runtime/commerce-runtime.json`.

## Preostali konkretni uslovi i rizici

1. Stvarni AllSecure checkout, bankarski callback/signatura, merchant provjera, refund i produkcioni test naplate čekaju testnog trgovca i zvaničnu dokumentaciju Hipotekarne/AllSecure. Interni payment hook nije zamjena za tu verifikaciju. `checkoutAvailable` ostaje false; PENDING narudžbina nije uplata.
2. Potreban je odvojen `R2_PRIVATE_PDF_BUCKET_NAME`, sa isključenim javnim pristupom i odgovarajućim dozvolama. Nije kreiran niti mijenjan bucket ili `.env`. Bez njega je nova stvarna PDF isporuka/generisanje blokirano.
3. Na lokalnoj radnoj bazi postoje dvije ACTIVE/PLATINUM pretplate čiji su datumi perioda istekli. Nijesu produžavane niti im je izmišljena kvota. Quota servis takvom periodu ne dodjeljuje pet novih izvoza.
4. JSONB slike povećavaju bazu i backup. Za veći promet treba odvojena faza privatnih purchase asset objekata i politike zadržavanja PENDING narudžbina. Sada se ništa ne čisti automatski.
5. Proces ograničava obradu na dva istovremena zahtjeva i deset zahtjeva po IP/minutu. Produkcioni ingress mora ograničiti ukupnu veličinu upload-a i promet kroz sve replike; lokalni limiter nije globalni distribuirani limiter.
6. Grant važi sedam dana od pripreme narudžbine. Finalni PDF se kešira pri prvoj dozvoljenoj isporuci. Puna e-mail isporuka, ponovno izdavanje isteklog pristupa i queue/retention politika ostaju dio završne payment operativne integracije.
7. Stari javni R2 fajlovi i eventualni novi orphan objekti se fizički ne brišu. Poznat stari javni URL nije opozvan uklanjanjem DB zapisa. To ostaje posebna storage procedura.

Ovim paketom nije označena završena bankarska naplata niti puna produkciona spremnost commerce sistema. Funkcionalni editor, evidencija, prava i obračun mogu se pregledati prije povratka na dizajn.
