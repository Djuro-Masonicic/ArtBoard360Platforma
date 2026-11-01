# Lokalno testno plaćanje

Implementirano 1. novembra 2026. Nema bankarske integracije, kartičnih podataka ni stvarne naplate.

## Uključivanje

API čita `MOCK_PAYMENTS_ENABLED=true` iz lokalnog `.env` pri pokretanju. Potreban je restart API-ja ako se podešavanje promijeni. Lokalni `.env` je uključen radi odobrenog testiranja; `.env.example` ostaje `false`.

Simulator radi samo kada je API `NODE_ENV=development` ili `test`. U `production` okruženju je uvijek zatvoren, čak i uz uključenu zastavicu. Query parametri i browser ne mogu uključiti simulator. Isključivanje zastavice zatvara nove potvrde, ali ne briše prethodno dodijeljena testna prava ili narudžbine.

## Kako testirati

- Premium: prijavi se Free nalogom i otvori `/pretplata/placanje?proizvod=premium`. Izaberi iznos i ishod uplate. Uspjeh aktivira postojeća Premium prava na jedan kalendarski mjesec: 5 PDF izvoza, 10 Generator objava i postojeća QR prava. Već aktivno članstvo se ne produžava novim klikovima.
- Generator: `/pretplata/placanje?proizvod=generator`. Uspjeh dodaje 10 trajnih kupljenih kredita za 4,90 €. Postojeći redosljed potrošnje ostaje uključena kvota, pa kupljeni krediti.
- Guest PDF/CV: u memorijskom editoru unesi validan sadržaj, izaberi PDF sekcije ili zaseban CV i pripremi narudžbinu. Klikni „Detalji plaćanja”; uspjeh otključava privatni PDF. Obično uređivanje ne pravi draft.
- Prijavljeni PDF/CV: nakon potrošene Free/Premium kvote otvori dodatni izvoz u koraku Izvoz. Pripremi narudžbinu ili otvori checkout sa postojećim projektom. Uspjeh otključava PDF; preuzimanje evidentira postojeću privatnu PDF verziju, bez ponovnog trošenja kvote.
- Na checkoutu postoje „Simuliraj uspješnu uplatu”, „Odbij uplatu” i „Otkaži plaćanje”. Poslije odbijanja/otkazivanja može se ponoviti uspješan pokušaj iste narudžbine.
- Admin: `/admin/portfolio-purchases` prikazuje PDF/CV i Generator kupovine, sa oznakom „Testna uplata · bez naplate”. Detalj sadrži snapshot, `provider=mock` i odvojene testne događaje. Postojeći admin preview i opoziv isporuke ostaju važeći.

Testna aktivacija zaista mijenja prava naloga u lokalnoj bazi; testiraj nalogom namijenjenim tome. Testne PDF/Generator narudžbine ostaju u evidenciji i ne čiste se automatski. Premium simulacija koristi postojeći `ArtistSubscription` zapis sa `provider=mock`; ne predstavlja punu evidenciju Premium računa i naplatnih pokušaja. Nema automatske obnove, kartičnog instrumenta niti slanja računa/linka e-mailom.

## Integritet i pristup

- Backend iz provjerene sesije izvodi vlasnika Premium/Generator zahtjeva i provjerava vlasništvo PDF projekta. UUID i ID vlasnika iz tijela nijesu ovlašćenje.
- PDF potvrda zahtijeva postojeći ograničeni delivery grant, u Next.js HTTP-only cookieju. UUID bez granta, opozvan ili istekao grant ne dozvoljava potvrdu ili isporuku. Nema novog Guest edit tokena.
- Iznos i valuta PDF/Generator kupovine dolaze iz serverske narudžbine. Premium prihvata samo postojeće ponuđene iznose.
- Mock kupovine koriste postojeću transakciju za settlement, odvojene `mock` događaje i zaključavanje zapisa. Dupla/paralelna potvrda ne daje duple kredite, pretplatu ili PDF verziju. Kasniji neuspjeh ne vraća plaćenu narudžbinu u neplaćenu.
- Simulator odbija zapise već vezane za stvarni procesor. Produkcioni settlement odbija `mock` potvrde.
- Next posrednik provjerava origin, sesiju ili delivery cookie i ograničava veličinu zahtjeva. API koristi postojeći limit paralelnih i učestalih zahtjeva.
- PDF generator, pravila kvota i privatni storage ostaju postojeći. Nema migracije ili fizičkog brisanja R2 objekata. Ručno testiranje stvarnog preuzimanja koristi postojeći storage; automatizovani testovi koriste isključivo izolovanu bazu i storage u memoriji.

## Fajlovi

- `.env.example`, lokalni `.env` (samo zastavica).
- `apps/api/src/config/env.ts`, `config/mock-payments.ts`.
- `apps/api/src/modules/portfolio-projects/mock-payments.controller.ts`, `mock-payments.service.ts`, `portfolio-projects.module.ts`, `portfolio-commerce.service.ts`, `portfolio-payment-context.service.ts`.
- `apps/api/src/modules/artist-subscriptions/subscription-access.ts`.
- `apps/web/app/api/portfolio-commerce/[...operation]/route.ts`, `app/admin/portfolio-purchases/page.tsx`.
- `apps/web/app/placanje/page.tsx`: postojeći `dopuna-generatora` link vodi na ispravan Generator checkout.
- `apps/web/lib/payment-context.ts`, `components/payment-workspace.tsx`, `payment-workspace.module.css`, `portfolio-export-workspace.tsx`, `portfolio-guest-checkout.tsx`.
- `apps/api/test/mock-payments.api.test.cjs`, `promotions.fixture.cjs`, `artist-collections.fixture.cjs`; fixture podrazumijevano isključuje simulator.
- `apps/web/test/mock-payments.browser.cjs` i ovaj dokument.

## Provjere

- 8/8 novih API integracionih testova na izolovanoj bazi: isključena zastavica/produkcija, autentifikacija i DTO, duple/paralelne potvrde, odbijanje/otkazivanje, Guest PDF, zaseban CV, opoziv, admin pristup, dodatni vlasnički PDF, privatna verzija i rollback storage greške.
- 14/14 novih browser provjera preko stvarnog Next posrednika i testnog API-ja: Premium, Generator, Guest PDF, dodatni PDF poslije Free kvote, privatni cookie, zaštita origin-a, mobilni overflow i odsustvo runtime grešaka.
- Postojeće provjere: 25/25 Generator API, 25/25 checkout browser i 4/4 checkout unit testa.
- API i web TypeScript i API build prolaze. Cijeli web produkcioni build prolazi odvojeno od aktivnog dev servera; rezultat i snimci su u `.tmp/mock-payment-browser/`.

AllSecure/Hipotekarna sandbox, potpisivanje i provjera webhookova, stvarna naplata, obnova i računi ostaju naredna integraciona faza. Mock uspjeh nije dokaz da bankarski tok radi.
