# Kolekcije u produkciji — 2. novembar 2026.

Poruka `Kolekcijski tok još nije uključen.` dolazila je iz
`PortfolioCollectionsEnabledGuard`: odsutna varijabla
`PORTFOLIO_COLLECTIONS_ENABLED` tumačena je kao isključena funkcionalnost,
iako su kolekcijski modeli i tok već implementirani. Isti stari opt-in je
ostao za izvorne kolekcije umjetnika.

`ARTIST_COLLECTIONS_ENABLED` i `PORTFOLIO_COLLECTIONS_ENABLED` sada se
podrazumijevano uključuju kada nijesu podešeni, uključujući produkciju.
Eksplicitno `false` i nepoznate vrijednosti i dalje isključuju odgovarajući
tok. `.env.example` prikazuje aktivna podešavanja. Ako deploy ima eksplicitno
`false`, potrebno je promijeniti varijablu na `true` i redeployovati API;
Git push ne mijenja varijable hostinga.

Nijesu mijenjani autentifikacija, vlasničke provjere, transakcije, snapshot
pravila, PDF dizajn ili storage. Izvorni servis zadržava provjeru dostupnosti
tabela i kolona. Nema novih modela ili migracija i nijesu primjenjivane
migracije na radnu ili produkcionu bazu.

Javni produkcioni API je prije izmjene uspješno učitao profil umjetnika
zajedno sa kolekcijskim poljima. Privatne produkcione kolekcije nijesu
otvarane bez vlasničke sesije i testiranje nije pravilo produkcione zapise.

Provjere na izolovanim bazama i storageu:

- 72/72 API testa: izvorne kolekcije, portfolio snapshot, memorijski editor,
  čuvanje, vlasništvo, paralelne izmjene i PDF preview. Nova regresija
  izričito provjerava produkcione podrazumijevane vrijednosti bez zastavica
  i odbijanje zahtjeva bez izmjena drafta kada je tok eksplicitno isključen.
- 31/31 browser provjera stvarnog Portfolio Buildera i Next posrednika,
  bez browser runtime grešaka; produkcioni browser build prolazi.
- API i web TypeScript prolaze.

Logovi su `.tmp/collections-production-20261102.log` i
`.tmp/collections-production-browser-20261102.log`.

Usput je konekcija sa lozinkom iz postojećeg `.env.example` zamijenjena
lokalnim primjerom. Lokalni `.env` i stvarne hosting konekcije nijesu
mijenjani; uklanjanje iz primjera ne uklanja raniju Git istoriju.
