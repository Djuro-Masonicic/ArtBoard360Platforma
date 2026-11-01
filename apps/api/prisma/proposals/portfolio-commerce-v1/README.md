# Kupovine, kvote i evidencija — prijedlog za odobrenje

**Naknadni status:** korisnik je 27. 10. 2026. odobrio ovaj SQL. Identična aktivna migracija `20261027143000_portfolio_commerce_foundation` primijenjena je na lokalnu radnu bazu, uz backup i provjeru; aktivni Prisma modeli sada postoje. [Izvještaj](../../../docs/portfolio-commerce-migration-20261027.md). Originalni tekst prijedloga ispod ostaje kao zapis njegovog obima.

`migration.sql` je tačan, dodatni SQL prijedlog, a ne aktivna Prisma migracija. Nije dozvoljena primjena na radnu bazu bez posebnog odobrenja. Aktivni `schema.prisma` nije mijenjan. Nakon odobrenja treba uskladiti Prisma modele, napraviti aktivnu migraciju istog SQL-a i provjeriti status baze prije primjene.

Korisnik je potvrdio: jedan besplatan Free izvoz po nalogu ukupno; pet Premium izvoza po mjesečnom periodu pretplate bez prenosa; dodatni izvoz 490 centi; Guest kupovina 890 centi. AllSecure/Hipotekarna banka testni pristup nije dostupan. Samostalan CV je poseban dokument/izvoz; ista kupovina ne smije proizvoljno otključavati drugi sadržaj. Cijenu zasebnog Guest CV proizvoda treba prikazati i potvrditi prije pokretanja kupovine, bez automatske naplate.

## Šta se dodaje

- `PortfolioPurchase`: nepromjenjiv sadržaj i cijena započete kupovine, uz nalog kada postoji. Guest nema nalog niti edit token. Upis nastaje tek na checkout-u, a ne u editoru.
- `PortfolioPaymentEvent`: jedinstven provider/deduplication ključ, hash poruke i status provjere. Bez čuvanja kartičnih podataka ili tajnih ključeva.
- `PortfolioDeliveryGrant`: hash ograničenog tokena, istek/opoziv i ograničen broj preuzimanja. Ne daje pravo uređivanja.
- `PortfolioQuotaPeriod`: granice konkretnog mjesečnog perioda pretplate, rezervisani i iskorišćeni izvozi. Nema prenosa. Atomski uslovni UPDATE i SQL CHECK sprečavaju prelazak limita.
- `PortfolioExportUsage`: jedinstvena operacija, snapshot hash, rezervacija/uspjeh/oslobađanje i veza sa verzijom. Djelimični unique index dozvoljava samo jedan aktivan besplatan izvoz po nalogu.
- `PortfolioVersion`: opcioni nepromjenjivi manifest, scope, broj stranica/radova, source revizija i kupovina. Za stare PDF-ove metapodaci ostaju NULL; ne zaključuju se iz aktuelnog drafta.

Predloženi SQL ne briše niti kopira podatke ili R2 objekte. Postojeće tabele umjetnika, radova, projekata i kolekcija ostaju netaknute, uz dodatne opcione kolone na PDF verzijama.

## Šta mora biti povezano poslije odobrenja

1. Transakciona rezervacija izvoza; za isti sadržaj/verziju ponovni download ne rezerviše novo pravo.
2. Generisanje kroz postojeći PDF generator i upload u zaseban privatni bucket. Tek nakon uspješnog storage-a finalizovati verziju i potrošnju. Greške oslobađaju rezervaciju; job za istek obrađuje prekinute procese.
3. Checkout zamrzava validirani manifest i samostalne kopije slika. Guest editor koristi samo memoriju/File/blob i privremeni watermark PDF. Bez `PortfolioProject` upisa za obično Guest uređivanje.
4. AllSecure adapter može potvrditi PAID isključivo prema verifikovanoj serverskoj potvrdi iz ugovorene dokumentacije. Dok nema testnog pristupa, checkout ostaje nedostupan i nijedna kupovina nije lažno plaćena.
5. Ograničena isporuka tek za PAID i gotovu PDF verziju. Admin-only API/dashboard čita narudžbinu, snapshot i provjerene događaje; nema ručnog dugmeta koje simulira bankarsku uplatu.

Privatni PDF bucket se podešava kroz `R2_PRIVATE_PDF_BUCKET_NAME`, mora biti različit od javnog i mora imati isključen javni pristup. Ovaj prijedlog ne kreira bucket niti mijenja Cloudflare dozvole. Stare javne PDF-ove treba obraditi odvojenom odobrenom procedurom; novi proxy ne opoziva već poznat javni URL.
