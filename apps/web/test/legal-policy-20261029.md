# Uslovi korišćenja i privatnost — isporuka 29. 10. 2026.

**Naknadna izmjena po odobrenju:** svijetli zajednički ArtBoard footer sada zamjenjuje raniji zasebni tamni footer i na ovoj ruti. [Izvještaj objedinjavanja](artboard-footer-20261029.md). Navodi o nepromijenjenom footeru ispod opisuju prvobitnu isporuku pravne stranice; header i pravni sadržaj su i dalje očuvani.

## Ruta i izvor

Unaprijeđena je postojeća ruta `/uslovi-koriscenja`. Verzija dokumenta je **2026-10-10**, sa prikazanim datumom **10. oktobra 2026.**, nezavisno od današnjeg datuma.

Primarni izvor je dostavljeni Claude Artifact HTML. Njegov sadržaj između headera i footera arhiviran je u `apps/web/references/legal-artifact-20261010.html`. Nije uvezen kao produkcijski `dangerouslySetInnerHTML`: koristi se serverski React prikaz sa zasebnim komponentama za članove, summary, kartice, dijelove i navigaciju.

Preneseni su svi pasusi, liste, naglašeni dijelovi, „Ukratko:“ blokovi, linkovi i podaci firme. HTML ima **četiri** kartice plaćenih usluga, uključujući QR vizit kartu, iako prateći opis zadatka govori o tri; prenesene su sve četiri jer HTML ima prednost. Sačuvane su i četiri kartice u članu o privatnosti.

## Implementacija i očuvane komponente

- Svih 14 članova: `uslovi`, `nalog`, `autorstvo`, `licenca`, `odrasli`, `zabranjeno`, `prijava`, `oglasi`, `placanje`, `odgovornost`, `gasenje`, `izmjene`, `privatnost`, `kolacici`.
- Dodatni ciljevi: `odgovornosti`, `dio-uslovi`, `dio-privatnost`, `kontakt`.
- Tri cijele kartice odgovornosti vode na članove 3/4/5; kontakt ima funkcionalni mailto, `/` kao povratak na početnu i sve podatke firme iz reference.
- Novi svijetli hero, radijalni gradijenti, tipografija, sticky sidebar, numerisani gradijentni naslovi, oba dijela i kartice prema originalu. Reduced-motion zaustavlja nove animacije.
- Sadržaj je prisutan u serverskom HTML-u. Postavljeni su naslov, opis i index/follow metapodaci.
- Postojeći `LegalHeader` i `LegalFooter` ove rute, njihova navigacija, funkcije i CSS ostaju nepromijenjeni. Globalni `SiteChrome`, header, hamburger, footer i layout nijesu mijenjani. Stara CSS datoteka ima identičan SHA256 prije i poslije zadatka.
- Postojeći footer linkovi sa drugih stranica već vode na `/uslovi-koriscenja`, `#privatnost` i `#kolacici`; nije bio potreban redizajn ili izmjena footera. Stvarni klik iz Paketa provjeren je u browseru.
- Sa stranice je uklonjen prikaz prethodnog `LegalConsentDemo`; nije dodat drugi onboarding ili obrazac prihvatanja na pravnoj stranici. Postojeća datoteka demo komponente nije brisana.

Podrazumijevani anchor odmak je 96 px. Na mobilnom postojeći header može biti viši: mali lokalni `ResizeObserver` postavlja odmak samo na pravnom sadržaju, bez promjene headera. Klikovi unutar sadržaja koriste postojeći Lenis kada je prisutan; cilj se računa iz stvarnog browser scroll položaja, tako da nativno skrolovanje/fokus i prethodni Lenis kadar ne pomjere naslov iza headera. Modifikovani klikovi i linkovi van sadržaja ostaju u postojećem toku.

## Izmjereno poređenje

Na 1536 px, pri istom Alcyone fontu i nepromijenjenom postojećem headeru, HTML referenca i implementacija imaju iste pozicije i dimenzije (tolerancija testa 0,15 px):

| Element | Referenca i implementacija |
|---|---|
| Hero | 1536 × 427,53 px; y 87 px |
| H1 | 753,53 × 164,16 px; x 128, y 243 px; font 76 px |
| Layout | širina 1280 px; x 128 px |
| Sidebar | širina 240 px; x 184 px |
| Pravni sadržaj | širina 780 px; x 500,80 px |
| Odgovornosti | 780 × 532,64 px |
| Član 09 | 780 × 803,75 px |
| Član 13 | 780 × 894,38 px |
| Kontakt | 780 × 362,56 px |

Poređenje geometrije isključuje samo dodatnu kontrolu podešavanja kolačića, koja ne postoji u izvornoj statičkoj referenci. Njeno prisustvo dodaje prirodnu visinu članu 14. Izvorne liste zadržavaju uobičajene HTML bullet/decimal oznake uprkos Tailwind resetu. Naslovi dijelova i unutrašnjih kartica dobili su semantičke h2/h3 elemente uz iste vizuelne dimenzije.

Provjerene širine: 1536, 1440, 1280, 1024, 768, 440, 390, 375 i 320 px. Na uskim ekranima sidebar je iznad teksta i nije sticky; nema horizontalnog overflowa. Podaci firme na najužim ekranima prelaze u jednu kolonu. Postojeći mobilni header nije prepravljan da bi ličio na header iz novog Artifacta.

## Kolačići

Prethodno nije postojao cookie-consent sistem niti uključen analitički SDK. Član 14 sada ima funkcionalna inline podešavanja:

- Analitika je podrazumijevano odbijena; nepoznata, neispravna ili stara verzija izbora takođe znači odbijanje.
- Korisnik može dozvoliti analitiku ili izabrati samo neophodne kolačiće, vratiti se kroz postojeći footer link i povući prethodnu saglasnost.
- Izbor se čuva u prvostranom `artboard_cookie_consent` kolačiću: samo verzija, boolean izbora i vrijeme promjene, bez naloga, e-maila ili IP-a. Path `/`, SameSite=Lax, 180 dana, Secure na HTTPS-u.
- Čitanje nakon upisa potvrđuje da je browser stvarno sačuvao izbor; blokirano čuvanje prikazuje grešku.
- Postoje `analyticsAllowed()` i događaj `artboard:cookie-consent` za buduću analitičku integraciju. Nijedan analitički alat nije dodat ili učitan ovim zadatkom. Kada se bude uvodio, mora koristiti ovaj izbor prije učitavanja i reagovati na povlačenje; samo postojanje kolačića nije implementacija budućeg SDK-a.
- Neophodni session kolačići se ne brišu ili mijenjaju izborom analitike. Nema paralelnog consent sistema, API-ja ili Prisma modela.

## Prijava, checkout i preostala neslaganja

1. Prijava već ima jedno obavezno polje sa izjavom „Imam 18 ili više godina i prihvatam Uslove korišćenja i Politiku privatnosti”, odgovarajuće linkove i serversko odbijanje `confirmedRules=false`. Nije duplirano. Postojeći model čuva boolean; **namjenska verzija pravila i vrijeme prihvatanja nijesu evidentirani kao zasebna polja**. Ova stranica ne dodaje migraciju ili retroaktivno popunjava takve dokaze.
2. Guest plaćanje već ima required checkbox, podrazumijevano isključen, sa istim uslovima/privatnošću. Nije mijenjan dizajn checkouta. Stvarna naplata je trenutno onemogućena; serverska evidencija saglasnosti kupovine treba da se poveže pri završavanju payment integracije. Postojeća UI potvrda nije predstavljena kao potpuna verzionisana serverska evidencija.
3. Član 09 opisuje kartično plaćanje, slanje računa i linka e-mailom, automatsku obnovu i promjenu Premium iznosa. AllSecure, te radnje nad stvarnim pretplatama i automatski transakcioni e-mail još nijesu kompletno povezani. Generator i QR pravila iz teksta takođe nemaju završenu evidenciju potrošnje/isporuke. **Tekst je sačuvan doslovno; ova stranica ne aktivira te finansijske funkcije.** Free jedan izvoz ukupno, Premium pet po periodu i novi Guest/dodatni export 4,90 € odgovaraju trenutno potvrđenim portfolio pravilima.
4. Član 11 navodi zahtjev za brisanje kroz „Lozinka i nalog” ili e-mail. Namjenski self-service tok zahtjeva i administratorskog odobrenja nije pronađen; kontakt e-mail radi, ali ta aplikaciona procedura nije implementirana ovim zadatkom.
5. Član 13 navodi trajno brisanje u roku od 30 dana. Automatska retention procedura nije implementirana ovim zadatkom, a fizičko R2 brisanje je i dalje odloženo po ranijim ograničenjima. Potrebna je posebno definisana procedura koja čuva obaveznu finansijsku evidenciju.
6. Formulaciju da Guest ostavlja „samo e-mail” treba pregledati u odnosu na postojeći serverski portfolio snapshot kupovine, koji čuva i sadržaj/slike potrebne za PDF. Tekst nije samostalno prepravljen.
7. Pravni tekst nije proglašen pravno odobrenim ili usklađenim. Podatke firme, rokove i navedene poslovne postupke treba potvrditi odgovorno lice. Nijesu dodavane nove pravne odredbe.

## Provjere i artefakti

- 4/4 unit testa: verzija/datumi, 14 jedinstvenih članova, default-deny/malformed consent, validna eksplicitna dozvola, čuvanje, povlačenje i odbijeno čuvanje.
- 61/61 browser provjera: pun tekst svih članova i dodatnih sekcija, liste i linkovi prema HTML-u; geometrija; devet širina; svi anchor ciljevi; tastatura; cookie izbor i povlačenje kroz refresh; reduced-motion; postojeći footer linkovi; identičan header/footer DOM prije/poslije; stvarni Lenis tok na 1536/440/320 px; bez runtime grešaka.
- Web TypeScript i izolovani Next produkcioni build prolaze. Root produkcioni build nije pokretan preko aktivnog dev servera. Backend nije mijenjan, pa API/baza testovi nijesu nepotrebno pokretani.
- `.tmp/legal/before-*.png`, `before.json`, `style-before.css`: početno stanje.
- `.tmp/legal-browser/`: snimci, poređenje sa referencom, `results.json` i izolovani build logovi.
- `.tmp/legal-unit.log`, `.tmp/legal-live.log`: dodatni rezultati.

## Fajlovi

Izmijenjen postojeći:

- `apps/web/app/uslovi-koriscenja/page.tsx` — prikaz novog sadržaja, metapodaci; postojeći header/footer ostaju isti.

Novi:

- `apps/web/components/legal-policy-document.tsx`
- `apps/web/components/legal-policy-articles.tsx`
- `apps/web/components/legal-policy-document.module.css`
- `apps/web/components/legal-anchor-offset.tsx`
- `apps/web/components/cookie-preferences.tsx`
- `apps/web/lib/legal-policy.ts`
- `apps/web/lib/cookie-consent.ts`
- `apps/web/references/legal-artifact-20261010.html`
- `apps/web/test/legal-policy.test.cjs`
- `apps/web/test/legal-policy.browser.cjs`
- `apps/web/test/legal-policy-20261029.md`

Backend, Prisma šema, baza, storage i postojeći payment/onboarding kod nijesu mijenjani. Nema migracije, brisanja podataka/fajlova ili deploya.
