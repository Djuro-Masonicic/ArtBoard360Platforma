# Spojeni izvoz slajdova — 2026-11-02

Višeslajdni Gallery, Slider Carousel, Grid Carousel i Panorama Carousel ZIP sada uključuje dodatni `ArtBoard-objava-{verzija}-svi-slajdovi.png`, uz sve postojeće pojedinačne PNG fajlove. Obuhvaćeni su isti šabloni koji imaju prikaz „Svi slajdovi zajedno”. Jedan slajd i dalje se preuzima kao jedan PNG, bez duplikata.

Spajanje se obavlja pri preuzimanju, od postojećih privatnih fajlova istorijske verzije, nakon provjere vlasništva i checksumova. Nema ponovnog renderovanja, dohvaćanja aktuelnog profila, upisa novog R2 objekta, promjene snapshotova ili dodatne potrošnje kvote. Zato i ranije generisani karuseli dobijaju spojeni PNG kroz besplatno ponovno preuzimanje.

Slajdovi se postavljaju horizontalno, bez razmaka, okvira, skaliranja ili promjene kadra. Rezolucija je `broj slajdova × 1080` sa `1440` px visine; npr. Panorama daje `3240 × 1440`, četiri Grid slajda `4320 × 1440`, a maksimalni Slider sa devet radova i uvodnim/završnim slajdom `11880 × 1440`. Ulaz mora imati kompletan manifest i 2–11 PNG-ova dimenzija 1080 × 1440. Brojač uspješnih preuzimanja mijenja se tek kada je cijeli paket pripremljen.

Provjere: 50 API/renderer/unit testova, 146 browser provjera bez runtime grešaka, API/web TypeScript, API build i izolovani Next produkcioni build. Testovi porede piksele svakog segmenta spojenog PNG-a sa originalnim slajdom, potvrđuju neizmijenjene pojedinačne fajlove, istorijske snapshotove, sve Panorama varijante, maksimalni Slider, vlasničku zaštitu i nepromijenjene kvote/storage pri preuzimanju. Browser je preuzeo stvarni ZIP za Grid, Slider i Panorama i provjerio dodatni PNG, uključujući dimenzije 4320 × 1440 za Grid.

Testiranje je koristilo izolovanu Generator bazu i memorijski storage; nema migracija ili direktnih izmjena stvarnih podataka/fajlova. Primjer testnog izlaza: `.tmp/promotion-browser/joined-grid-export.png`.
