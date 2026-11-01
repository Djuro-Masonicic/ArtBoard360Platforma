# Izvoz, privatna isporuka i osnova kupovina — 27. 10. 2026.

**2. 11. — Testno plaćanje i u produkciji:** [Mock checkout i uputstvo za testiranje](mock-payments.md). Premium, Generator dopuna i Guest/vlasnički PDF/CV koriste simulaciju uspjeha, odbijanja i otkazivanja bez naplate. Po posebnom odobrenju mock je privremeno podrazumijevano uključen i u produkciji; `MOCK_PAYMENTS_ENABLED=false` ga isključuje. Testna prava se čuvaju kroz postojeće modele i označena su kao mock; AllSecure ostaje odvojena naredna faza. API i web moraju biti deployovani iz novog commita.

**29. 10. — Upravljanje pretplatom:** [Prikaz pet stanja, stvarna PDF potrošnja i bezbjedne lokalne operacije](subscription-management-20261029.md). Istek ne briše posljednji poznati period. Promjena iznosa/kartice i udaljene pretplate čekaju AllSecure; Instagram/QR potrošnja nije izmišljena. Ova funkcionalnost nije označena kao završen produkcioni billing sistem.

**29. 10. — Placanje:** [Nova zajednicka stranica i provjere](payment-page-20261029.md). Nove Guest kupovine su 4,90 EUR po posebnom odobrenju; stare cijene ostaju nepromijenjene. AllSecure i backend Generatora jos nijesu integrisani; stvarna naplata na novoj stranici je onemogucena.

**29. 10. — Prvo cuvanje i testni izvoz:** [Izvjestaj i provjere](portfolio-explicit-save-test-export-20261029.md). Generisanje iz profila otvara nesacuvan editor; razvojni PDF izvoz radi bez kvote ili PDF verzije.

**28. 10. — Blok:** [Blok, naslovnice A–G i dostavljene Minimal unutrašnje stranice](portfolio-blocks-template-20261028.md) sada koriste stvarni PDF generator, čuvanje izbora, Guest snapshot i istoriju verzija. Svih šest kartica dizajna je aktivno. Kombinovanje stilova po sekcijama ostaje prototip.

**28. 10. — Kartice:** [Kartice, naslovnice A–G i sve unutrašnje stranice](portfolio-cards-template-20261028.md) sada koriste stvarni PDF generator, vlasničko čuvanje, Guest snapshot i istoriju verzija. Aktivni su Minimal, Rounded, Gradijent, Editorijal i Kartice; Blok ostaje nedovršen.

**28. 10. — Editorijal:** [Editorial, naslovnice A–G i sve unutrašnje stranice](portfolio-editorial-template-20261028.md), uključujući naknadno dostavljeni uvod kolekcije, sada koristi stvarni PDF generator, čuvanje izbora, Guest snapshot i istoriju verzija. Minimal, Rounded, Gradijent i Editorijal su aktivni; Kartice i Blok ostaju nedovršeni.

**28. 10. — Gradijent:** [Gradijent, naslovnice A–G i unutrašnje stranice](portfolio-gradient-template-20261028.md) sada su povezani sa stvarnim PDF-om, editorom, Guest snapshot-om i istorijom verzija.

**28. 10. — Rounded:** [Rounded (Tačke), naslovnice A–G i unutrašnje stranice](portfolio-rounded-template-20261028.md) sada su povezani sa stvarnim PDF-om, čuvanjem, Guest snapshot-om i istorijom verzija.

**Novi PDF templejt:** [Minimal — naslovnice A–G i sve unutrašnje stranice](portfolio-minimal-template-20261027.md). Povezani su editor, čuvanje izbora i Guest snapshot; ostali novi vizuelni stilovi ostaju prototipi.

**Aktuelni nastavak:** [Guest ulaz, narudžbine, admin, kvote i istorija — aplikaciona implementacija](portfolio-commerce-application-20261027.md). Novi Guest ulaz je sada aktivan, a serverske kvote se sprovode. AllSecure i privatni R2 bucket i dalje zahtijevaju navedenu integraciju/podešavanje. Tekst ispod opisuje prethodni paket.

Naknadno odobreno i izvršeno: [aktiviranje migracije/modela i brisanje svih portfolio zapisa na lokalnoj radnoj bazi](portfolio-commerce-migration-20261027.md). Tvrdnje ispod o neprimijenjenom SQL-u opisuju prethodni paket, prije tog odobrenja.

## Završeno u ovom paketu

- Funkcionalan izbor svih sedam sekcija: naslovna, profil, izdvojeni radovi, kolekcije, radovi, CV i kontakt. Isti document plan određuje redosljed u preview-u i finalnom PDF-u. Izbor se čuva u verzionisanom `designConfig.documentSelection` JSON-u, bez migracije.
- „Samo CV” čuva scope i generiše dokument koji sadrži samo CV, kroz isti generator i ista prava čistog izvoza. Nema dodavanja naslovne/profila/kontakta mimo izbora. Dugi CV ima automatsku paginaciju i watermark na svim preview stranama.
- Izdvojeni radovi imaju stvarne PDF grid stranice, po devet radova po strani. Izbor PDF sekcija ne briše kolekcije, radove, ručne metapodatke niti njihove pojedinačne izbore.
- Opoziv javnog share tokena je vlasnički zaštićen DELETE. Stari link nakon opoziva daje 404; sljedeće dijeljenje dobija novi token. Opoziv ne može povući dokument koji je ranije već preuzet.
- Cijela istorija postojećih PDF verzija može se listati kroz paginaciju i dugme „Prikaži starije verzije”. Broj u kartici je stvarni ukupan broj, ne broj posljednje tri vraćene stavke. Ponovni download tačno te verzije ne generiše novi PDF niti novu naplatu.
- Verzije i posljednji PDF koriste backend download putanju sa provjerom prijavljenog vlasnika. Tuđi project/version UUID ne omogućava preuzimanje. Privatni objekti se čitaju preko R2 SDK-a i ne daju javni storage URL browseru. Preview i dalje ima watermark.
- Novi PDF upload je usmjeren u zaseban privatni bucket, uz `no-store` isporuku i provjeru namespace-a, veličine i PDF potpisa. Ne postoji tihi fallback na javni bucket.

## Šta nije aktivno ili završeno

**Privatni bucket nije kreiran ili podešen ovom izmjenom.** Potreban je `R2_PRIVATE_PDF_BUCKET_NAME`, različit od javnog bucketa, sa isključenim javnim pristupom i odgovarajućim R2 token dozvolama. Bez toga UI i backend odbijaju novo generisanje; draft i watermarked preview ostaju dostupni. Nije mijenjan lokalni `.env` niti su pravljeni stvarni storage objekti.

Stari javni PDF fajlovi nijesu kopirani, prepisani ili obrisani. Autorizovani download preko API-ja radi i za njih, ali njihov već poznat javni URL ne postaje privatan. Za taj prelaz treba posebna odobrena storage procedura. Novi Guest download bez naloga zahtijeva ograničeni pristup narudžbini; stari Guest UUID više nije prihvatljiva osnova za generisanje novih čistih PDF-ova.

Guest editor bez trajnih draftova, checkout, admin evidencija stvarnih kupovina i aplikaciono sprovođenje kvota nijesu označeni kao završeni. Postojeći memorijski adapter je očuvan, ali novi Guest ulaz nije uključen u produkcioni tok. AllSecure testni trgovac i integraciona dokumentacija nijesu dostupni; nijedna uplata nije simulirana kao stvarna.

Potvrđena poslovna pravila su: Free jedan besplatan izvoz po nalogu ukupno; Premium pet po mjesečnom periodu pretplate, bez prenosa; dodatni izvoz 490 centi; Guest kupovina 890 centi. Ta pravila još ne mijenjaju pravo izvoza na radnoj bazi, jer ledger nije aktiviran. Brojevi u SQL testovima predstavljaju provjeru osnove, a ne naplatu stvarnih korisnika.

## Tačan SQL za naredni paket

[SQL prijedlog](../prisma/proposals/portfolio-commerce-v1/migration.sql) i [obrazloženje](../prisma/proposals/portfolio-commerce-v1/README.md) pripremljeni su za pregled. SQL dodaje kupovinu, verifikovane payment događaje, ograničeni delivery token, quota period, export usage i opcione manifest/metapodatke PDF verzije. Stare verzije ne dobijaju izmišljeni scope, broj radova ili snapshot.

SQL je primijenjen i testiran **samo na novoj izolovanoj bazi**. Brojevi postojećih umjetnika, radova, projekata i verzija ostali su isti. Aktivna Prisma šema nije mijenjana; na radnoj bazi nije pokrenuta migracija.

Poslije odobrenja SQL-a slijede aktivni Prisma modeli i transakciona aplikaciona logika: rezervacija/oslobađanje prava, zamrznut checkout snapshot, admin pregled, ograničena isporuka, te finalni Guest ulaz. Period pretplate i cijena moraju se izvoditi na serveru; korisnik ne bira period ili vlasnika kroz zahtjev. Prije primjene na radnu bazu treba napraviti backup, provjeriti status/diff i primijeniti samo odobreni SQL. AllSecure adapter ostaje nedostupan za stvarnu naplatu dok ne stigne testni pristup i zvanična dokumentacija.

## Rute

- `PATCH public/:id`: novi validirani `documentSelection`; postojeći owner/revision obrazac.
- `DELETE me/:id/share`: opoziv share tokena, `ArtistAuthGuard` + vlasništvo.
- `GET me/:id/versions`: validirana paginacija, `ArtistAuthGuard` + vlasništvo.
- `GET me/:id/versions/:versionId/pdf`: tačna sačuvana verzija, uz roditeljsko vlasništvo.
- `GET me/:id/download-pdf`: posljednji sačuvani PDF istog vlasnika.
- Next actions posrednik prihvata samo eksplicitne operacije, UUID-eve i provjerenu serversku sesiju. DELETE takođe prolazi postojeću origin provjeru.

## Fajlovi ovog paketa

- `.env.example`.
- `packages/portfolio-document-plan/selection.cjs`, `index.cjs`, `index.d.ts`.
- `apps/api/src/config/env.ts`, `storage/r2-storage.service.ts`.
- `apps/api/src/modules/portfolio-projects/portfolio-projects.controller.ts`, `portfolio-projects.dto.ts`, `portfolio-projects.service.ts`, `portfolio-pdf.generator.ts`.
- `apps/web/types/api.ts`, `services/portfolio-projects.ts`, `lib/portfolio-proxy.ts`.
- `apps/web/components/portfolio-builder-editor-shell.tsx`, `portfolio-cv-workspace.tsx`, `portfolio-export-workspace.tsx`, `portfolio-export-workspace.module.css`, `portfolio-export-pdf-pages.tsx`.
- `apps/web/components/portfolio-pdf-preview.tsx`, `portfolio-pdf-canvas-viewer.tsx`: procjena iz stvarnog plana, ispravne generičke oznake umjesto izmišljene naslovne/profila, link za cijeli PDF i PDF.js import tek u browseru.
- `apps/web/app/api/portfolio-projects/[id]/actions/[...operation]/route.ts`, `[id]/pdf/route.ts`.
- `apps/api/prisma/proposals/portfolio-commerce-v1/migration.sql`, `README.md`.
- API testovi: `portfolio-cv.test.cjs`, `portfolio-private-pdf.test.cjs`, `portfolio-commerce-proposal.test.cjs`, `portfolio-collections.api.test.cjs`, `artist-collections.fixture.cjs`.
- Web testovi: `portfolio-access.test.cjs`, `portfolio-export.browser.cjs`.
- Ovaj izvještaj i obavještenje u prethodnom funkcionalnom planu.

## Provjere

- 79/79 izolovanih unit/API provjera: generator, privatni SDK transport, prava pristupa, proxy rute, Guest memorija i postojeće storage kopiranje.
- 33/33 API integracionih provjera na izolovanom PostgreSQL-u: CV scope/preview, sačuvan izbor, opoziv, paginacija cijele istorije, besplatan download postojeće verzije i invalidacija starog PDF pokazivača u V1 pri promjeni scope-a.
- 4/4 SQL provjere na zasebnoj izolovanoj bazi: jedan aktivan Free izvoz ukupno, deset paralelnih zahtjeva dobija tačno pet Premium rezervacija, nepromjenjiva kupovina/dupli događaji i ograničeno preuzimanje tek za PAID.
- 46/46 browser provjera na devet širina provjerava izbor sekcija, „Samo CV”, opoziv, starije verzije, greške, memorijski adapter i odsustvo demo kartične forme u produkciji. Dodatni završni prolaz ima 23/23 provjere, uključujući SSR i PDF.js render zasebnog detaljnog CV pregleda. Svi API/PDF transporti su izolovani testni odgovori; stvarni PDF sadržaj je odvojeno provjeren na API/generator testovima.
- API/web TypeScript i produkcioni web build prolaze. Nema deploya, primjene migracije na radnu bazu ili stvarnih R2 upload/delete operacija.

Backend, frontend i privatna isporuka su kodom povezani za naloge. Novi bucket, commerce šema, stvarne kvote i Guest kupovine zahtijevaju opisane preostale korake; ovaj izvještaj ih ne predstavlja kao aktivan završen proizvod.
