# Kontakt — implementacija i provjera, 29. 10. 2026.

## Isporuka

`/kontakt` sada prikazuje kontakt sadržaj prema dostavljenom Artifact HTML-u. Postojeći `/artboard/kontakt` koristi istu React komponentu. Izbor teme povezuje lijeve kartice i pill dugmad; unos ostaje pri promjeni teme i grešci slanja. Loading blokira dupli submit. Cijela desna kartica prelazi u success tek kada API potvrdi prihvatanje poruke od mail providera. „Nova poruka” čisti polja i vraća Usluge.

Header, hamburger, navigacija, footer, globalni layout i globalni CSS nijesu mijenjani u ovom zadatku. `/kontakt` zadržava postojeći Art Studio chrome, a `/artboard/kontakt` postojeći ArtBoard chrome. Time je poštovano izričito ograničenje da se postojeći zajednički elementi ne mijenjaju.

## Izmijenjeni fajlovi

- `.env.example` — komentari za postojeću mail konfiguraciju i testno preusmjeravanje.
- `apps/api/src/app.module.ts` — registracija ContactModule.
- `apps/api/src/mail/resend-mail.service.ts` — kontakt šablon, Reply-To i opcioni provider idempotency key; postojeći mail servis se ponovo koristi.
- `apps/web/app/kontakt/page.tsx` — sadržaj i SEO metadata.
- `apps/web/app/artboard/kontakt/page.tsx` — isti sadržaj i canonical metadata.
- `apps/web/components/contact-page.tsx` — forma, validacija, teme, loading, success i reset.
- `apps/web/components/contact-page.module.css` — lokalni stilovi prema referenci.
- `apps/web/components/artboard-contact-page.tsx` — re-export zajedničke komponente umjesto druge nezavisne forme.

## Kreirani fajlovi

- `apps/api/src/modules/contact/contact.dto.ts`
- `apps/api/src/modules/contact/contact.controller.ts`
- `apps/api/src/modules/contact/contact.service.ts`
- `apps/api/src/modules/contact/contact.module.ts`
- `apps/api/test/contact.fixture.cjs`
- `apps/api/test/contact.api.test.cjs`
- `apps/web/app/api/contact/route.ts`
- `apps/web/lib/contact-form.ts`
- `apps/web/services/contact.ts`
- `apps/web/references/contact-artifact-20261029.html` — arhiviran samo sadržaj, bez Artifact headera/footera.
- `apps/web/test/contact.browser.cjs`
- `apps/api/docs/contact-page-20261029.md` — ovaj izvještaj.

## Slanje i konfiguracija

Tok je browser → Next `POST /api/contact` → Nest `POST /contact` → postojeći `ResendMailService` → Resend. Nema otvaranja korisnikove mail aplikacije za submit; direktni e-mail link ostaje `mailto:`.

- `RESEND_API_KEY`: postojeći serverski ključ.
- `RESEND_FROM_EMAIL`: postojeća From adresa na verifikovanom domenu. Verifikaciju domena treba provjeriti u Resend nalogu; sama prisutnost konfiguracije je ne dokazuje.
- `EMAIL_TEST_RECIPIENT`: postojeći globalni testni override. Kada je postavljen, i kontakt poruke odlaze na testnog primaoca. Mora biti prazan za stvarnu isporuku na `info@artstudio360.me`.
- Next koristi postojeći `INTERNAL_API_BASE_URL`, zatim `API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` fallback.

Primalac je fiksiran na serveru na `info@artstudio360.me`, osim eksplicitnog postojećeg testnog overridea. Klijent ne određuje To/CC/From. Reply-To je validirani korisnički e-mail. Subject sadrži temu i ime; tekstualni i HTML sadržaj sadrže ime, e-mail, temu, poruku i ISO vrijeme prijema. Korisnički tekst se escapuje u HTML-u.

**Stvarna isporuka na info inbox nije testirana niti potvrđena.** Lokalna konfiguracija ima uključenog testnog primaoca. Nije slata nijedna stvarna testna poruka i nijesu mijenjane stvarne `.env` vrijednosti. Testovi koriste izolovani Nest server i lažni Resend SDK transport, uključujući stvarnu serijalizaciju šablona i HTTP tok. Prihvatanje od providera nije isto što i konačna dostava u inbox; bez provider pristupa nijesu provjereni domen, bounce/spam status ni inbox.

## Validacija, spam i pouzdanost

- Ime: trim, 2–120 Unicode znakova, najmanje jedno slovo, bez kontrolnih znakova i header injectiona.
- E-mail: trim, serverska validacija formata, najviše 254 znaka.
- Tema: isključivo services/support/other.
- Poruka: trim, 10–5.000 Unicode znakova; novi redovi dozvoljeni, nedozvoljeni kontrolni znakovi odbijeni.
- Globalni Nest whitelist odbija nepoznata polja. Nevidljivi honeypot mora biti prazan.
- Next ograničava stream tijela na 24.576 bajtova; API dodatno provjerava veličinu. Next odbija cross-origin browser slanje.
- Najviše 30 pokušaja u 5 minuta po neposrednoj socket adresi, uključujući nevalidne DTO zahtjeve. Proizvoljni X-Forwarded-For se ne koristi kao identitet.
- Najviše 3 slanja u 15 minuta po hash-u normalizovane e-mail adrese. Cache/bucket mape imaju ograničen broj unosa i istek.
- UUID v4 Idempotency-Key veže se za hash normalizovanog sadržaja. Paralelni identični zahtjevi dijele isti promise; replay prihvaćene poruke ne šalje ponovo. Isti ključ sa drugačijim sadržajem vraća 409.
- Isti provider key i receipt timestamp koriste se pri retry-u, uključujući neizvjesnu mrežnu grešku. Bez provider message ID-a nema success odgovora.
- Provider detalji i kredencijali ne šalju se browseru. Forma čuva unos pri grešci.

Nije dodat Prisma model: ponovo se koristi postojeća pouzdana direktna provider integracija, bez nepotrebnog čuvanja ličnih podataka u dodatnoj bazi. Nema nove administratorske evidencije kontakt poruka, trajnog reda ni lokalne istorije isporuke. Baza, šema, migracije i R2 nijesu mijenjani.

## Testovi

- API: **19/19**. Validacija, Unicode/trim, fiksni primalac, Reply-To, nepoznata polja, HTML escaping, honeypot, veličina, paralelnost/replay, konflikt sadržaja, stabilan retry, odbijanje/nedostupnost providera, nedostajuća konfiguracija/message ID, oba limita i testni override.
- Browser: **25/25** provjera u izolovanom Chrome/Next okruženju. Devet širina, teme, očuvanje unosa, validacija, blokiranje duplog slanja, stvarni lokalni HTTP tok do izolovanog mail transporta, success/reset/error/retry, neispravan serverski odgovor, tastatura/fokus, reduced motion, cross-origin blokiranje i odsustvo runtime grešaka.
- Četiri browser regresione provjere unutar navedenih 25 porede kompletan header/footer DOM prije i poslije, na obje stvarne rute pri 1536 i 440 px. DOM je ostao isti.
- API i web TypeScript: prolaze `--noEmit`.
- Izolovani produkcioni Next build Kontakt stranice i proxy rute: prolazi. Glavni aktivni Next dev build nije zamijenjen produkcionim buildom.
- `git diff --check` za obuhvaćene fajlove: prolazi; postojeća upozorenja o LF/CRLF nijesu greške.

Komande:

```text
node --test apps/api/test/contact.api.test.cjs
node apps/web/test/contact.browser.cjs
node node_modules/typescript/bin/tsc -p apps/api/tsconfig.build.json --noEmit
node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false
```

Browser skripta pravi izolovani harness u `.tmp/contact-browser/harness`; `--reuse-build` koristi njegov postojeći build. Ne povezivati ovaj harness sa stvarnim mail transportom. Rezultati, screenshotovi i mjerenja su u `.tmp/contact-browser/`; početno stanje stvarnih ruta u `.tmp/contact/`.

## Vizuelni rezultat

Prije: dvije različite postojeće kontakt forme, sa mailto submitom. Poslije: jedna zajednička implementacija sa izvornim gridom, clamp vrijednostima, tipografijom, ikonama, karticama, gradijentom i funkcionalnim slanjem.

Na viewportu 1536 × 900, nakon učitavanja fonta i završetka ulazne animacije, upoređeni originalni HTML i implementacija imaju iste izmjerene položaje i dimenzije (tolerancija testa 0,2 px):

| Element | HTML i implementacija |
| --- | --- |
| Glavni kontejner | x 128; y 77; širina 1280 px |
| H1 | x 184; y 181; 537,92 × 220,31 px |
| Kontakt kartica | x 814,08; y 181; 537,92 × 655,25 px |
| Input | 455,92 × 48 px |
| Textarea | 455,92 × 146,25 px |
| Submit | 192,88 × 38 px |

| Viewport | Širina kartice | Visina kartice | Širina inputa | Horizontalni overflow |
| --- | --- | --- | --- | --- |
| 1536 | 537,92 | 655,25 | 455,92 | nema |
| 1440 | 540,81 | 655,25 | 458,81 | nema |
| 1280 | 550,42 | 652,03 | 471,64 | nema |
| 1024 | 440,33 | 636,69 | 376,89 | nema |
| 768 | 706,56 | 589,81 | 658,50 | nema |
| 440 | 400 | 619,25 | 354 | nema |
| 390 | 350 | 638,75 | 304 | nema |
| 375 | 335 | 638,75 | 289 | nema |
| 320 | 280 | 684,75 | 234 | nema |

Success zadržava prethodnu visinu kartice, izabranu temu i fokus prebacuje na potvrdu. Preuzet je doslovan zadati tekst, uključujući „na u”. HTML referenca sadrži početno stanje; zasebni screenshotovi success stanja nijesu bili dostupni kao priloženi fajlovi, pa je success rekonstruisan prema pisanoj specifikaciji. Za njega se ne tvrdi izmjereno pixel-perfect poklapanje sa nedostupnom slikom. Na najužim ekranima smanjeni su unutrašnji razmaci kartica/tema; nema overflowa.

## Preostala ograničenja

1. Za potvrdu stvarne isporuke treba provjeriti Resend domen i poslati kontrolisanu poruku stvarnom primaocu, uz svjesno podešen testni override.
2. Rate limiting i lokalni idempotency cache su po API procesu. Kod više instanci potreban je zajednički store/edge limiter. Iza Next proxyja socket limit je zbirni limit za proxy adresu; prije javnog većeg prometa treba definisati pouzdan client-IP lanac ili edge zaštitu. Ne treba samo vjerovati javnom X-Forwarded-For headeru.
3. Restart API-ja gubi lokalni cache/timestamp. Resend idempotency i dalje koristi isti ključ, ali drugačiji timestamp u rekonstruisanom sadržaju može izazvati odbijanje ponovnog zahtjeva. Sistem tada vraća grešku, a ne lažni success. Trajni red/evidencija potrebni su za pouzdan oporavak takvih pokušaja kroz restart i više instanci.
4. Osnovna zaštita nije zamjena za distribuirani anti-spam sistem pri velikom broju zlonamjernih izvora. Nije dodata vidljiva CAPTCHA niti proizvoljan rok čuvanja poruka.
