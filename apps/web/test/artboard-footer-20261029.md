# Zajednički svijetli ArtBoard footer

Po zahtjevu korisnika nakon isporuke pravne stranice, odobrena svijetla Paketi varijanta postala je zajednički ArtBoard footer: isti logo, pet kolona, gradijentna linija, linkovi, copyright i kontakt e-mail.

- `SiteFooter` sada bira brend prema postojećem `getSiteSurface`, bez paralelnih tamnih ArtBoard varijanti. Art Studio footer ostaje isti.
- Prikazuje se i na pravnoj stranici i stranicama prijave/oporavka naloga. Zasebni `LegalFooter` je uklonjen iz prikaza; globalni layout daje jedan zajednički footer.
- Na pravnoj stranici footer koristi `artboard-footer` kao ID, da ne duplira postojeći sadržaj `#kontakt`.
- URL klasifikacija prepoznaje i payment/delivery rute `/placanje` i `/portfolio-purchase` kao ArtBoard.
- Portfolio Builder landing koristi isti footer. Puni editor i PDF prikazi zadržavaju postojeći raspored bez dodavanja sajtskog footera unutar radnog prostora ili PDF stranica.
- Postojeći headeri, pravni tekst, backend, baza i R2 nijesu mijenjani.

Provjere: 45/45 browser provjera kroz 13 ruta na 1536/440/320 px, plus 61/61 regresija pravne stranice i web TypeScript. Izolovani build pravne stranice prolazi. Originalne dimenzije Paketi footera ostaju iste; Art Studio footer DOM ostaje isti na `/`, `/kontakt` i `/usluge`.

Rute obuhvaćene browser provjerom: `/uslovi-koriscenja`, `/paketi`, `/umjetnici`, `/oglasi`, `/oglasi/objavi`, `/portfolio-builder`, `/prijava`, `/artist/login`, `/artist/forgot-password`, `/login`, `/pretplata/placanje?proizvod=premium`, `/artboard/kontakt`, `/artboard`.

Fajlovi:

- `apps/web/components/site-footer.tsx`
- `apps/web/components/artist-profile-footer.module.css`
- `apps/web/components/site-chrome.tsx`
- `apps/web/lib/site-surface.ts`
- `apps/web/app/uslovi-koriscenja/page.tsx`
- `apps/web/test/artboard-footer.browser.cjs`
- `apps/web/test/legal-policy.browser.cjs`
- `apps/web/test/legal-policy-20261029.md`
- `apps/web/test/artboard-footer-20261029.md`

Artefakti: `.tmp/artboard-footer/results.json`, footer PNG snimci u istom direktorijumu, `.tmp/artboard-footer-browser.log` i `.tmp/legal-browser.log`.
