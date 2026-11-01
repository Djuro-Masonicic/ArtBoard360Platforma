# Portfolio Builder — funkcionalno dovršavanje

Novije stanje: [izbor svih sekcija, zaseban CV, opoziv, istorija i osnova commerce modela](portfolio-export-commerce-status.md). Naredni tekst dokumentuje prethodni CV paket i širi plan.

Stanje pregleda: 27. 10. 2026. Vizuelno rekonstruisan editor nije isto što i potpuno povezan proizvod. Ovaj dokument razlikuje postojeće funkcije, implementaciju ovog koraka i preostale pakete.

## Postojeća osnova

Podaci i izmjene radova čuvaju se preko vlasnički zaštićenog API-ja. Izvorne kolekcije, njihovi portfolio snapshotovi, redosljed, pojedinačni izbor i pregled izvornih promjena već imaju implementaciju. Snapshot slike dobijaju nezavisne objekte u novom kolekcijskom toku. PDF koristi postojeći generator, shared document plan i watermark. Postoje generisane verzije, odvojeni share token i ograničenje čistog preuzimanja prema postojećem pravu pristupa.

Memorijski Guest adapter postoji, ali konačni Guest tok nije uključen. Produkcioni Guest entry još koristi stari sačuvani projekat. Novi dizajn sa šest stilova i sedam naslovnica još je lokalni vizuelni prototip; stvarni generator ima tri ranija template identifikatora. Nema stvarnog AllSecure plaćanja ni evidencije mjesečnih export kvota.

## Implementirano sada: CV od forme do PDF-a

Koristi postojeći `PortfolioProject.cvSections Json?` i `includeCv Boolean`. Nema promjene Prisma šeme ili migracije. Verzija 1 čuva svih osam sekcija, stabilne ID-jeve i redosljed stavki. Server i klijent koriste isti parser: dozvoljena polja, 20 stavki po sekciji, dužina polja, ukupno 30000 znakova i HTTP/HTTPS linkovi bez kredencijala. Identitet vlasnika dolazi iz postojeće provjerene sesije; JSON ne određuje vlasništvo.

Free/Premium korisnik može sačuvati CV, ponovo otvoriti draft i uključiti/isključiti CV u PDF-u. Stariji CV JSON se ne konvertuje ili prepisuje automatski: prikazuje se odvojeno i traži izričit izbor zamjene prije čuvanja novog unosa. Nevezano čuvanje ga ostavlja kakav jeste. Neuspjelo čuvanje i konflikt zadržavaju unos. Kucanje tokom čuvanja ne briše novije CV izmjene.

CV koristi postojeći PDF generator i njegove fontove, naslove, podnožje i watermark. Sadržaj prelazi u sljedeću kolonu ili stranu; nema ranijeg rezanja na osam stavki. Stvarni broj PDF stranica ima prednost nad procjenom plana. Prazan ili isključen CV ne stvara prazne stranice. Preseti „Cijeli portfolio” / „Bez CV-ja” čuvaju postojeći `includeCv` kroz vlasnički API. „Samo CV” još nije aktiviran.

Guest memorijski adapter zadržava CV samo u memoriji. Novi trajni CV upis zahtijeva nalog; ne aktivira se novi Guest entry niti checkout.

### Dodatna zaštita demo plaćanja

Pronađena je ruta `POST /portfolio-projects/public/:id/demo-payment` koja bez banke postavlja `PAID`. Sada backend odbija ovu simulaciju u `NODE_ENV=production`, bez upisa ili otključavanja. Produkciona payment stranica ne prikazuje lažnu kartičnu formu. Development/test simulacija ostaje dostupna. Ova zaštita nije stvarno plaćanje.

## Preostali paketi, redom

| Paket | Konkretan rezultat | Glavni fajlovi / modeli | Uslov završetka |
|---|---|---|---|
| 1. Stvarni dizajni i naslovnice | Izabrani stil A–G i Premium miks sačuvani su u draftu i zaista određuju PDF | `portfolio-design-workspace.tsx`, editor shell, shared dokument konfiguracija, DTO/service, `portfolio-pdf.generator.ts` | Ista sačuvana konfiguracija daje isti preview i izvoz; šest kompletnih stilova imaju sve podržane stranice i testove. Postojeća tri identifikatora ostaju kompatibilna. JSON konfiguracija mora imati verziju. |
| 2. Potpun sastav dokumenta i zaseban CV | Pojedinačne sekcije, izdvojeni radovi, PDF/CV scope i tačan redosljed | shared document plan, export workspace, controller/service, generator, download proxy | UI, preview i finalni PDF koriste isti plan. Zaseban CV poštuje vlasništvo, watermark i naplatna prava; ne otključava čist PDF mimo pravila. Potrebnu trajnu konfiguraciju izbora čuvati u jasno validiranom modelu, bez brisanja izbora radova. |
| 3. Nepromjenjive PDF verzije | Istorijski broj radova, stil, naslovnica, sastav, broj stranica i naslovna sličica pripadaju baš toj verziji | `PortfolioVersion`, service, export history | Ne oslanjati se na trenutno stanje drafta. Vjerovatno je potrebna odobrena migracija za manifest/snapshot/hash i metapodatke. Istorija sada vraća najviše tri verzije; treba paginacija. Paralelni exporti moraju dobiti dosljedne brojeve, uz retry bez duplikata. |
| 4. Konačni Guest tok | Editor u otvorenoj stranici → privremeni watermark preview → kupovina bez naloga → isporuka | postojeći adapter/shell, nova privremena PDF ruta, model kupovine/narudžbine | Bez drafta, Guest naloga, edit tokena, localStorage ili IndexedDB. Slike su `File`/blob tokom rada. Privremeni preview prima validirane binarne fajlove, bez R2 upisa i bez proizvoljnog serverskog fetch-a URL-ova. Persistencija snapshotova i slika počinje tek pri kupovini. Za modele narudžbine traži se posebno odobrenje migracije. |
| 5. AllSecure / Hipotekarna banka | Stvarno serverom potvrđeno plaćanje i ograničena PDF isporuka | novi payment adapter, purchase/payment modeli, callback/webhook, fulfillment i admin | Potrebni su ugovorena integraciona dokumentacija i testni pristup banke/procesora. Browser povratak nije dokaz naplate. Potvrda, iznos/valuta, identitet transakcije, ponovljene poruke, neuspjeh i retry moraju biti pokriveni. Narudžbina ima nepromjenjiv sadržaj, a ograničeni token daje samo status/isporuku, bez editora. |
| 6. Free/Premium kvote i obračun | Stvarno stanje preostalih izvoza i potvrđena cijena | novi usage/entitlement ledger, subscription/purchase veze, export UI | Brojevi „5 mjesečno”, prvi besplatni export i dodatna cijena iz vizuelnih stanja nijesu implementirana backend kvota. Prvo definisati konačna pravila. Potrošnju evidentirati atomarno i idempotentno; greška PDF-a/storagea ne smije pogrešno trošiti pravo. Ponovno preuzimanje iste verzije ne naplaćuje se ponovo. Za nove modele odobriti SQL prije primjene. |
| 7. Admin, linkovi i storage životni ciklus | Kupovine sa sadržajem, statusom i ponovnom isporukom; opoziv linka; bezbjedna politika objekata | admin controller/UI, share service, storage i job obrada | Admin uloge, audit, pretraga/paginacija, refund/failure statusi prema stvarnom provideru, rotacija/opoziv share tokena i dokumentovana retencija. Fizičko brisanje R2 ostaje isključeno do zasebno odobrene storage faze. |
| 8. Završno povezivanje i regresije | Reprezentativan korisnički tok od početka do finalnog dokumenta | API, web, PDF i browser testovi | Free/Premium save/reopen, Guest gubitak rada na refresh, prekinut upload, rate limit, nedozvoljen pristup, bankarski timeout, dupli callback, paralelni exporti, dugačak CV i svi viewporti. Tek tada builder može biti označen kao potpun. |

Ne treba ponovo praviti kolekcijske modele ili paralelni PDF generator. Naredni praktični paket je trajno povezivanje dizajna sa jednim stvarnim templateom i svim njegovim stranicama, pa ostali stilovi; ne predstavljati šest istih ili djelimičnih renderera kao završene templateove.

## Izmijenjeni fajlovi ovog koraka

- `packages/portfolio-document-plan/cv.cjs`, `index.cjs`, `index.d.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-projects.dto.ts`, `portfolio-projects.service.ts`, `portfolio-pdf.generator.ts`.
- `apps/web/components/portfolio-cv-workspace.tsx`, `portfolio-builder-editor-shell.tsx`, `portfolio-export-workspace.tsx`, `portfolio-demo-payment-form.tsx`.
- `apps/web/services/portfolio-projects.ts`, `apps/web/lib/guest-portfolio-memory.ts`.
- `apps/api/test/portfolio-cv.test.cjs`, `portfolio-authorization.test.cjs`, `portfolio-collections.api.test.cjs`.
- `apps/web/test/portfolio-cv.browser.cjs`, `portfolio-export.browser.cjs`, `guest-portfolio-memory.test.cjs`.
- Istorijski izvještaji `apps/web/test/portfolio-cv-4-4.md` i `portfolio-export-4-6.md` imaju obavještenje o novoj funkcionalnoj fazi.
- Ovaj izvještaj.

Nijesu mijenjani Prisma šema, radna baza, postojeći umjetnički radovi, R2 fajlovi, header/sidebar CSS ili realizovani dizajn drugih koraka. Testovi baze koriste nove nasumično imenovane izolovane baze i zabranjuju stvarni R2 transport. Nema automatskog deploya.

## Rezultati provjera

- 64/64 izolovanih API/unit provjera: CV format i validacija, stvarni PDF, vlasništvo, zaštita produkcione demo naplate, Guest memorija i Next posrednici.
- 29/29 API integracionih provjera na izolovanim PostgreSQL bazama: uključuju trajni CV JSON, ponovno čitanje, paralelne izmjene sa jednim 409 odgovorom, nepromijenjene originalne radove i preview bez upisa. Postojeće kolekcijske i PDF regresije takođe prolaze.
- CV browser: 48/48 provjera na devet širina; uključuje Free/Premium save/reload, potvrdu zamjene starog formata, neispravan link, grešku servera, kucanje tokom čuvanja i retry sa novom revizijom.
- Izvoz browser: 18/18 usmjerenih provjera, uključujući čuvanje CV preseta, PDF pregled/verzije/link i produkcionu payment stranicu bez kartičnih polja.
- Podaci / zajednički editor: 503 regresione provjere na osam širina, bez browser runtime izuzetaka.
- API i web TypeScript prolaze. Produkcioni web build prolazi. Lokalni web i API odgovaraju HTTP 200. Nije izvršeno testno čuvanje na radnoj bazi.

## Preostali tehnički rizici

Procjena document plana računa CV kao jednu logičku sekciju; fizički CV može zauzeti više stranica. Preview/izvoz javlja stvarni broj iz PDF-a. Zaseban CV dokument i proizvoljan izbor sekcija još nijesu implementirani.

Projekti kolekcijskog formata V2 koriste postojeći `expectedRevision` protokol, provjeren i sa paralelnim CV izmjenama. Stari V1 projekti zadržavaju raniji protokol izmjena; potpuno ujednačavanje njihovih konkurentnih upisa zahtijeva zaseban kompatibilan prelaz, bez automatskog prepisivanja starih projekata.

Postojeći PDF objekti i istorija imaju javne storage URL-ove. Vlasničke rute kontrolišu dobijanje tih URL-ova, ali URL koji je već podijeljen nije opoziva privatna isporuka. Za konačni ograničeni download narudžbina treba privatni PDF storage/proxy ili kratkotrajno potpisana isporuka, u okviru odobrene storage arhitekture. Slike javnih umjetničkih profila imaju zasebne potrebe.

Legacy Guest trajni draftovi i demo režim nijesu stvarni novi Guest proizvod. Demo je blokiran u produkciji, ali bankarska naplata, kupovina bez naloga, idempotentna potvrda i admin evidencija kupovina tek treba da se implementiraju. Portfolio Builder zbog toga nije označen kao funkcionalno završen.
