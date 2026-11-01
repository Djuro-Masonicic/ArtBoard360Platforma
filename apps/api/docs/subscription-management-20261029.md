# Upravljanje pretplatom — 29. 10. 2026.

Status: implementiran prikaz i bezbjedne operacije nad postojećim lokalnim članstvima. **Kompletna specifikacija naplate nije završena**: AllSecure/Hipotekarna testni trgovac, integraciona dokumentacija i postojeći billing adapter nijesu dostupni. Promjena iznosa, kartice, stvarne obnove/naplate i Generator dopune nijesu predstavljene kao funkcionalne.

## Aktivne rute i ponašanje

- `/artist/subscription`, postojeći alias `/pretplata`: serversko učitavanje autentifikovanog pregleda, bez privremenog lažnog Free prikaza. Posebna loading/error stanja.
- `GET /artist-subscriptions/overview`: `ArtistAuthGuard`, vlasnik iz sesije, privatni `no-store` odgovor. Jedan RepeatableRead snapshot i isti serverski trenutak za status, datume i stvarnu Portfolio kvotu. Čitanje ne kreira pretplatu.
- `POST /artist-subscriptions/cancel` i `/reactivate`: prazni validirani DTO-i, bez proizvoljnog vlasnika, plana, iznosa ili datuma. Transakcija i isti advisory lock kao quota/finalizacija PDF-a. Ponavljanje iste operacije je idempotentno.
- Next posrednik `/api/artist/subscription/{cancel,reactivate}` koristi HTTP-only sesiju, allowlist operacija, provjeru porijekla i odbija dodatne podatke. Postojeći posrednik takođe dobija origin provjeru za mutacije.
- Lokalno ili ranije demo članstvo bez udaljenih payment identifikatora može isključiti/uključiti lokalnu obnovu. Ostaju isti subscription ID, tekući period i njegov kraj; nema nove naplate, kupovine ili resetovanja kvote.
- Svako članstvo koje ima udaljeni provider ili provider identifikator odbija izmjene sa 503 dok ne postoji stvarna provider potvrda. Ovo važi i za staru DELETE rutu, da ne bude zaobilaznice. Lokalna zastavica ne može zaustaviti udaljenu naplatu.

## Pet stanja

| Stanje | Efektivni pristup |
|---|---|
| ACTIVE | Premium unutar evidentiranog perioda |
| CANCELED_PENDING_EXPIRY | Premium do kraja perioda, obnavljanje isključeno |
| PAYMENT_FAILED | PAST_DUE sa Premium pristupom do postojećeg evidentiranog roka |
| EXPIRED | Free; sačuvani posljednji poznati Premium podaci |
| FREE | Free i stvarni datum kreiranja naloga |

Rok je isključiv: u trenutku `currentPeriodEnd` više nema Premium pristupa. Status sam za sebe ne daje trajni Premium. Ista provjera se koristi za Portfolio kvotu, postojeće Premium mogućnosti projekta i kreiranje snapshot-a iz profila. Ovo nije dodavanje novog grace perioda niti produžavanje pristupa poslije neuspjele naplate.

Uklonjeno je prethodno prepisivanje istekle pretplate u BASIC koje je brisalo period i provider reference pri čitanju. Čuvaju se posljednji poznati podaci; **potpuna višeciklusna istorija pretplate još ne postoji**. Ranije obrisane informacije ne mogu se rekonstruisati bez provjerenog izvora. Nema brisanja PDF verzija, materijala ili potrošenog lifetime Free prava.

Portfolio potrošnja čita postojeći ledger: jedan Free izvoz ukupno ili pet po mjesečnom prozoru sa postojećim anchorom i end-of-month korekcijom, bez prenosa. Prikazuju se i rezervisani izvozi. Instagram i QR nemaju odgovarajuću evidenciju: vraća se eksplicitno nepoznato stanje, bez izmišljenog salda. Backend ne izvodi karticu ili plaćeni iznos iz činjenice da je članstvo Premium.

## Vizuelna provjera

Originalni `<main>` je arhiviran u `apps/web/references/subscription-artifact-20261029.html`. Zaglavlje, navigacija, hamburger, footer, globalni layout/CSS, Paketi i Plaćanje nijesu mijenjani u ovom zadatku.

Svi podaci originalnog demo primjera postoje isključivo u izolovanom browser testu, bez produkcijske rute ili kontrole za promjenu stanja.

Na 1536 px, ista HTML referenca i implementacija u istom Alcyone/Next okruženju daju:

| Element | Referenca | Implementacija |
|---|---|---|
| H1 x/y, širina/visina | 224 / 163,5; 1088 / 64,80 | isto |
| Lijeva kartica | 652,30 × 576,63 | isto |
| Desna kartica | 407,70 × 342,44 | isto |
| Gornja pozicija kartica | 315,09 | isto |

Visine se razlikuju od ranijih numeričkih mjerenja iz Claude hosta u specifikaciji; izvorni HTML u trenutnom fontskom okruženju daje vrijednosti iz tabele. Nijesu zaključavane visine. Pravi nepoznati podaci, nedostupne akcije i objašnjenja mijenjaju sadržaj i prirodnu visinu kartica. Mobilna širina je fluidna; zadržana je postojeća globalna politika sakrivenog scrollbara, pa 440 px ne gubi 15 px na scrollbar originalnog hosta.

Provjereni viewporti: 1536, 1440, 1024, 768, 440, 390, 375 i 320 px. Inline panel ne koristi modal, overlay ili navigaciju; ima fokus, odustajanje, jednu prijavu pri duplom kliku, loading i grešku.

## Testovi

- 98/98 API testova: 17 novih pretplatničkih i 81 postojeća payment/commerce/collections/editor regresija. Nove provjere uključuju pet stanja, autentifikaciju, podmetanje vlasnika, ponavljanje/paralelizam, odbijanje nepovezanog providera i nedostajuće provider oznake uz udaljeni ID, očuvanje kvote/perioda/istorije i mjesečne granice.
- 50/50 browser provjera: pet stanja × osam širina, poređenje sa HTML-om, stvarni Next → API tok na izolovanoj bazi, inline potvrda, odustajanje, greška, dupli klik, obnova, origin/payload/session provjere i bez runtime grešaka.
- API i web TypeScript prolaze. Izolovani Next produkcioni build prolazi; aktivni root dev server nije prepisan buildom.
- Testovi koriste nove izolovane PostgreSQL baze i simulirani storage. Nema stvarnih uplata, radnih podataka ili R2 operacija.

Artefakti: `.tmp/subscription-api-regression.log`, `.tmp/subscription-browser/results.json`, `reference-comparison.json`, PNG snimci i build logovi u `.tmp/subscription-browser/`.

## Šta nedostaje za punu specifikaciju

1. AllSecure ugovor/testni pristup i zvanični tok za recurring naplatu, promjenu iznosa, otkazivanje/reaktivaciju, promjenu tokenizovane kartice i provjerene webhook/callback događaje. Nije dodat javni endpoint koji prihvata tvrdnju browsera da je uplata uspjela.
2. Kompatibilno proširenje modela: nullable `activatedAt`, `monthlyAmountCents`, `currency`, `pendingAmountCents`, `pendingAmountEffectiveAt`, provjereni `paymentMethodBrand/Last4`, `lastPaymentFailedAt`, `failedAmountCents`, `nextRetryAt`; odvojena nepromjenjiva istorija subscription perioda/faktura i jedinstveni provider event ID. Stare redove ostaviti sa null vrijednostima; nema backfill-a cijene ili kartice nagađanjem. Nema PAN/CVV polja.
3. Promjene iznosa moraju biti potvrđene od providera za naredni ciklus uz idempotency key, bez paralelne pretplate ili prorate. Provider poziv ne treba držati otvorenu DB transakciju: pending command/outbox, potvrda providera i idempotentna finalizacija pod istim zaključavanjem kao kvote.
4. Sprovedena provider politika retry-ja, redosljed/verzija događaja i jedinstvena obrada webhook-a. Tek potvrđena naplata otvara novi period. Novi period ne resetuje lifetime Free potrošnju.
5. Generator/QR vlasnička evidencija potrošnje i kupljenih setova; idempotentna dodjela dopune nakon potvrđene naplate, bez isteka kupljenog seta. Trenutni top-up linkovi vode na postojeći payment tok koji ne omogućava stvarnu naplatu prije integracije.
6. Potpuna istorija pretplata zahtijeva zasebne istorijske redove; postojeći singleton model može sačuvati samo posljednji poznati period. Povezati migraciju i provjerene provider događaje zajedno, zatim testirati na testnom trgovcu prije aktiviranja pravih radnji.

Prisma šema i radna baza nijesu mijenjane. Nema migracije ili deploya. Finansijske funkcije iz ove liste ostaju otvorene; stranica nije označena kao kompletan produkcioni sistem naplate.

## Tačno izmijenjeni/dodati fajlovi

API (`apps/api/`):

- `src/modules/artist-subscriptions/artist-subscriptions.controller.ts`
- `src/modules/artist-subscriptions/artist-subscriptions.dto.ts`
- `src/modules/artist-subscriptions/artist-subscriptions.module.ts`
- `src/modules/artist-subscriptions/artist-subscriptions.service.ts`
- `src/modules/artist-subscriptions/subscription-access.ts`
- `src/modules/artist-subscriptions/subscription-overview.service.ts`
- `src/modules/portfolio-projects/portfolio-commerce.service.ts`
- `src/modules/portfolio-projects/portfolio-collections.service.ts`
- `src/modules/portfolio-projects/portfolio-projects.module.ts`
- `src/modules/portfolio-projects/portfolio-projects.service.ts`
- `test/artist-collections.fixture.cjs`
- `test/subscription-management.api.test.cjs`
- `docs/subscription-management-20261029.md`
- `docs/portfolio-export-commerce-status.md`

Web (`apps/web/`):

- `app/artist/subscription/page.tsx`
- `app/artist/subscription/loading.tsx`
- `app/artist/subscription/error.tsx`
- `app/api/artist/subscription/route.ts`
- `app/api/artist/subscription/[action]/route.ts`
- `components/artist-subscription-panel.tsx`
- `components/artist-subscription-panel.module.css`
- `lib/subscription-overview.ts`
- `services/artist-subscriptions.ts`
- `references/subscription-artifact-20261029.html`
- `test/subscription-management.browser.cjs`
