# Funkcionalnosti za kasnije

Ovaj fajl je centralna evidencija funkcionalnosti koje nedostaju, ali se ne implementiraju dok se ne zavrsi dizajn cijelog sajta.

## Nacin predstavljanja umjetnika u tekstovima

**Status:** djelimicno postoji, zavrsna funkcionalnost nedostaje

### Trenutno postoji

- Na prijavi se mogu izabrati opcije `Umjetnica`, `Umjetnik` i `Bez rodnog oblika`.
- Izbor se cuva u polju `ArtistSubmission.presentationForms`.
- Administrator moze vidjeti i izmijeniti izbor u pregledu prijave.

### Potrebno je dodati

- Prenijeti izbor sa odobrene prijave na trajni profil umjetnika.
- Dodati polje u model umjetnika i odgovarajucu migraciju baze.
- Dodati mogucnost promjene izbora u podesavanjima profila.
- Napraviti zajednicku funkciju za izbor odgovarajuce formulacije u tekstovima.
- Koristiti izabranu formulaciju na javnom profilu, u PDF portfoliju, Instagram materijalima i QR vizit karti.
- Kada izbor nije postavljen, koristiti neutralne formulacije kao sto je `na ArtBoardu`.
- Ne zakljucivati nacin predstavljanja iz imena, fotografije ili drugih podataka.
- Dodati testove za sve tri opcije i neutralni podrazumijevani slucaj.

### Kriterijum zavrsetka

Promjena opcije u podesavanjima profila mora se dosljedno prikazati u svim automatski generisanim tekstovima i materijalima, bez rucnog mijenjanja sadrzaja na svakom mjestu.

## Umjetnicki iskaz na profilu i u PDF portfoliju

**Status:** djelimicno postoji, zavrsna funkcionalnost nedostaje

### Trenutno postoji

- Na prijavi postoji opciono polje `Umjetnicki iskaz` sa brojacem i ogranicenjem od najvise 60 rijeci.
- Info dugme prikazuje objasnjenje razlike izmedju biografije i umjetnickog iskaza.
- Vrijednost se salje API-ju i cuva u polju `ArtistSubmission.artistStatement`.
- Administrator moze vidjeti i izmijeniti umjetnicki iskaz u pregledu prijave.
- `PortfolioProject` i generator PDF-a vec imaju zasebno polje i prikaz za `artistStatement`.

### Trenutni problem

- Pri odobravanju prijave umjetnicki iskaz se ne prenosi na trajni model `Artist`.
- Model `Artist` nema zasebno polje za umjetnicki iskaz.
- Kreiranje portfolija iz ArtBoard profila trenutno postavlja `artistStatement` iz `artist.quote`, odnosno iz mota, umjesto iz umjetnickog iskaza.
- Javni profil zato ne moze prikazati umjetnicki iskaz odvojeno od biografije i mota.

### Potrebno je dodati

- Dodati opciono polje `artistStatement` u model `Artist` i napraviti migraciju baze.
- Pri odobravanju prijave prenijeti `ArtistSubmission.artistStatement` na profil umjetnika.
- Izloziti polje kroz artists API i web tipove.
- Omoguciti izmjenu umjetnickog iskaza u podesavanjima profila umjetnika.
- Prikazati umjetnicki iskaz na javnom profilu kao zaseban sadrzaj, odvojeno od biografije i mota.
- Pri kreiranju Portfolio Builder projekta koristiti `artist.artistStatement`, a ne `artist.quote`.
- Zadrzati moto i autora mota kao zasebne podatke.
- Dodati testove za prenos iz odobrene prijave, izmjenu profila i generisanje PDF-a.

### Kriterijum zavrsetka

Umjetnicki iskaz unesen u prijavi mora nakon odobrenja ostati sacuvan na profilu, biti moguce izmijeniti ga u podesavanjima i automatski se prikazati na strani Profil u PDF portfoliju, bez zamjene sa motom.

## Javne kolekcije na profilu umjetnika

**Status:** vizuelni prikaz postoji, funkcionalnost podataka nedostaje

### Trenutno postoji

- Javni profil ima dizajn sekcije `Serije i projekti` sa tri kolekcijska mozaika.
- Dok ne postoje javne kolekcije, prikaz privremeno grupise postojece radove umjetnika.

### Potrebno je dodati

- Definisati koje kolekcije ili Portfolio Builder projekti smiju biti javno prikazani.
- Izloziti javne kolekcije kroz artists API sa nazivom, opisom, redosljedom i pripadajucim radovima.
- Omoguciti umjetniku da kreira, uredjuje, sortira i objavi kolekciju sa svog naloga.
- Zamijeniti privremeno grupisanje radova stvarnim kolekcijama iz baze.
- Otvoriti zaseban prikaz kolekcije kada posjetilac klikne na mozaik.

### Kriterijum zavrsetka

Sekcija `Serije i projekti` mora prikazivati samo kolekcije koje je umjetnik izricito objavio, sa stvarnim nazivom, opisom i brojem radova.


