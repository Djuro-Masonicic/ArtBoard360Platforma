# ArtBoard - kompletna checklista za rucno testiranje

Oznaci zavrsenu stavku sa `[x]`. Za svaki pronadjeni problem zapisi rutu, korake,
ocekivani rezultat, stvarni rezultat, uredjaj/browser i dodaj screenshot.

## 0. Priprema testiranja

- [ ] Web aplikacija se otvara na `http://localhost:3000`.
- [ ] API odgovara na `http://localhost:4000`.
- [ ] U konzoli weba i API-ja nema gresaka pri pokretanju.
- [ ] Testna baza ima umjetnike, radove, oglase, FAQ i testimonials podatke.
- [ ] Pripremljen je jedan admin nalog.
- [ ] Pripremljen je jedan Free artist nalog.
- [ ] Pripremljen je jedan Premium artist nalog.
- [ ] Pripremljen je artist nalog koji mora postaviti prvu lozinku.
- [ ] Sacuvani su pocetni podaci testnih naloga kako bi se mogli vratiti nakon testiranja.
- [ ] `EMAIL_TEST_RECIPIENT` je postavljen na testni email.
- [ ] Testni email je jedini primalac svih automatskih poruka.
- [ ] Testirati u Chrome-u i Edge-u.
- [ ] Testirati desktop na 1920x1080 i 1440x900.
- [ ] Testirati tablet na 1024x768 i 768x1024.
- [ ] Testirati mobilni prikaz na 390x844 i 360x800.
- [ ] Ponoviti kljucne tokove u privatnom/incognito prozoru.

## 1. Globalni izgled i navigacija

- [ ] Logo na svakoj stranici vodi na odgovarajucu pocetnu stranicu.
- [ ] Desktop navigacija prikazuje sve stavke i nijedna se ne preklapa.
- [ ] Mobilni meni se pravilno otvara i zatvara.
- [ ] Mobilni meni se zatvara nakon izbora linka.
- [ ] Aktivna stavka navigacije je jasno oznacena.
- [ ] Header ostaje citljiv tokom skrolovanja.
- [ ] Footer linkovi vode na ispravne stranice.
- [ ] Back i Forward dugmad browsera rade bez gubitka stanja.
- [ ] Direktno otvaranje svake rute i refresh ne daju 404 ili praznu stranicu.
- [ ] Nepostojeca ruta prikazuje urednu 404 stranicu.
- [ ] Nema horizontalnog scrolla na podrzanim sirinama.
- [ ] Naslovi, tekst i dugmad ne izlaze iz svojih kontejnera.
- [ ] Dugi naziv, email, URL i neprekinuta rijec ne lome layout.
- [ ] Hover, active, focus, disabled i loading stanja su vidljiva i dosljedna.
- [ ] Dugme se ne moze poslati vise puta dok zahtjev traje.
- [ ] Toast i error poruke se vide i ne prekrivaju vazne kontrole.
- [ ] Fontovi se ucitavaju bez vidljivog skakanja layouta.
- [ ] Slike imaju pravilan odnos stranica i nijesu deformisane.
- [ ] Pokvarena ili nedostupna slika ima prihvatljiv fallback.
- [ ] Nema pogresnih karaktera, mojibake teksta ili nedosljednog jezika.

## 2. Art Studio javne stranice

- [ ] `/` se ucitava sa svim sekcijama pocetne stranice.
- [ ] Hero dugmad vode na ArtBoard i Usluge.
- [ ] Sekcije projekata, usluga, tima, FAQ i kontakt prikazuju podatke.
- [ ] Vanjski Instagram, Behance i Calendly linkovi otvaraju ispravnu adresu.
- [ ] Vanjski linkovi se otvaraju u novom tabu gdje je to predvidjeno.
- [ ] `/usluge` prikazuje sve usluge i pozive na akciju.
- [ ] `/kontakt` prikazuje tacne kontakt podatke.
- [ ] Kontakt forma jasno pokazuje da li koristi `mailto:` ili backend slanje.
- [ ] Klik na email otvara mail klijent sa ispravnim primaocem i subjectom.
- [ ] `/uslovi-koriscenja` ima sekcije za uslove, privatnost i kolacice.
- [ ] Anchor linkovi za privatnost i kolacice vode na tacnu sekciju.

## 3. ArtBoard pocetna stranica

- [ ] `/artboard` se ucitava bez gresaka u konzoli.
- [ ] Hero sadrzaj i glavna dugmad su vidljivi u prvom viewportu.
- [ ] Brojevi/statistika odgovaraju podacima iz baze.
- [ ] Istaknuti umjetnici imaju sliku, ime, disciplinu i ispravan link.
- [ ] Klik na umjetnika otvara njegov javni profil.
- [ ] Discipline i ostali filter linkovi vode na odgovarajuci prikaz.
- [ ] Portfolio Builder CTA vodi na `/portfolio-builder`.
- [ ] Oglasi CTA vodi na `/oglasi`.
- [ ] Paketi prikazuju tacne Free, Premium i Platinum informacije.
- [ ] FAQ pitanja se otvaraju i zatvaraju bez pomjeranja layouta.
- [ ] Kontakt CTA i kontakt podaci su ispravni.
- [ ] Animacije su glatke i ne blokiraju navigaciju.

## 4. Lista umjetnika

- [ ] `/umjetnici` prikazuje samo javne, aktivne profile.
- [ ] Alias `/artists` prikazuje isti sadrzaj ili ispravno preusmjerava.
- [ ] Pretraga radi po imenu umjetnika.
- [ ] Pretraga ne zavisi od velikih i malih slova.
- [ ] Filter discipline vraca odgovarajuce umjetnike.
- [ ] Kombinacija pretrage i filtera radi ispravno.
- [ ] Brisanje pretrage vraca kompletan rezultat.
- [ ] Prazan rezultat ima jasnu poruku i opciju resetovanja.
- [ ] Paginacija ne preskace i ne duplira umjetnike.
- [ ] Kartice imaju dosljedne dimenzije i pravilno kropovane slike.
- [ ] Premium oznaka se prikazuje samo odgovarajucim umjetnicima.
- [ ] NSFW sadrzaj se ponasa u skladu sa dogovorenim pravilima.

## 5. Javni profil umjetnika

- [ ] `/umjetnik/[slug]` otvara odgovarajuceg umjetnika.
- [ ] Alias `/artists/[slug]` prikazuje isti profil ili ispravno preusmjerava.
- [ ] Nepostojeci slug prikazuje 404 bez pucanja aplikacije.
- [ ] Ime, discipline, biografija, moto i profilna slika su tacni.
- [ ] Cover/hero slika se prikazuje samo kada je postavljena.
- [ ] Featured radovi imaju predvidjeni poseban prikaz.
- [ ] Svi radovi su u ispravnom redosljedu.
- [ ] Klik na rad otvara predvidjeni detalj ili veci prikaz.
- [ ] Alt tekst radova je prisutan i smislen.
- [ ] Drustveni linkovi vode na tacne profile.
- [ ] Email link koristi email tog umjetnika.
- [ ] Premium oznaka odgovara stvarnom planu.
- [ ] Profil bez biografije, linkova, hero ili radova ima uredno prazno stanje.

## 6. Prijava umjetnika

- [ ] `/prijava` se otvara i svi koraci forme su dostupni.
- [ ] `/registracija` i `/prijava-umjetnika` vode na ispravnu prijavu.
- [ ] Forma ne prelazi na sljedeci korak bez obaveznih polja.
- [ ] Ime, email, telefon, bio, moto i napomene prihvataju dozvoljen unos.
- [ ] Neispravan email i URL prikazuju jasnu validaciju.
- [ ] Moguce je izabrati samo dozvoljeni broj disciplina.
- [ ] Portfolio link ili PDF ispunjava uslov za portfolio.
- [ ] Moguce je dodati i ukloniti vise drustvenih linkova.
- [ ] Profilna fotografija prihvata podrzane tipove i velicinu.
- [ ] Radovi prihvataju podrzane tipove i dozvoljeni broj fajlova.
- [ ] Prevelik ili nepodrzan fajl daje jasnu poruku.
- [ ] Potvrda pravila je obavezna.
- [ ] Dupli klik ne kreira dvije prijave.
- [ ] Uspjesna prijava se cuva u bazi i prikazuje confirmation stanje.
- [ ] Nova prijava se pojavljuje u admin listi.
- [ ] Admin notification email stize samo na testni email.
- [ ] U subjectu testnog emaila pise originalni primalac.
- [ ] Pad email servisa ne brise vec sacuvanu prijavu.

## 7. Artist autentifikacija

- [ ] `/artist/login` radi sa tacnim podacima.
- [ ] Pogresan email ili lozinka prikazuje neutralnu poruku.
- [ ] Prazna polja se ne mogu poslati.
- [ ] `returnTo` vraca korisnika na prvobitno trazenu stranicu.
- [ ] Ulogovan artist ne moze ponovo otvoriti login bez preusmjerenja.
- [ ] Admin login vodi u admin, a artist login na artist dashboard.
- [ ] Logout brise sesiju i vraca korisnika na javnu stranicu.
- [ ] Istekla ili izmijenjena sesija trazi ponovni login.
- [ ] `/artist/forgot-password` uvijek daje neutralnu poruku.
- [ ] Reset email stize samo na testni email.
- [ ] Reset link radi prije isteka.
- [ ] Neispravan, istekao i vec iskoriscen token se odbija.
- [ ] Nova lozinka mora zadovoljiti sva pravila.
- [ ] Nova lozinka ne moze biti ista kao prethodna.
- [ ] Nakon resetovanja radi samo nova lozinka.
- [ ] Setup-password token radi za novoodobreni artist nalog.
- [ ] Setup token se ne moze ponovo koristiti.

## 8. Artist dashboard - pregled i profil

- [ ] `/artist/dashboard` nije dostupan neulogovanom korisniku.
- [ ] Sidebar prikazuje tacno ime, username, sliku i plan.
- [ ] Svaka sidebar stavka otvara odgovarajuci tab.
- [ ] Aktivni tab je jasno oznacen.
- [ ] Pregled prikazuje tacan broj radova, featured i hero status.
- [ ] Progress spremnosti profila odgovara stvarno popunjenim stavkama.
- [ ] Dugme za javni profil otvara pravi profil.
- [ ] Promjena profilne slike radi i ostaje nakon refresha.
- [ ] Profil prihvata kontakt email, moto i biografiju.
- [ ] Brojac biografije je tacan i limit se postuje.
- [ ] Cover slika se moze dodati, zamijeniti i ukloniti ako je podrzano.
- [ ] Save/autosave prikazuje saving, saved i error stanje.
- [ ] Refresh poslije cuvanja prikazuje nove podatke.
- [ ] Neuspjelo cuvanje ne prikazuje laznu potvrdu uspjeha.

## 9. Artist dashboard - linkovi i radovi

- [ ] Postojeci drustveni linkovi se pravilno ucitavaju.
- [ ] Novi link se moze dodati.
- [ ] Platforma se moze promijeniti.
- [ ] Neispravan URL se odbija.
- [ ] Link se moze ukloniti i ostaje uklonjen nakon refresha.
- [ ] Broj radova u zaglavlju odgovara listi.
- [ ] Novi rad se moze uploadovati.
- [ ] Naziv, alt tekst i opis rada se mogu sacuvati.
- [ ] Slika rada se prikazuje bez deformacije.
- [ ] Hover kartica se moze ukljuciti i iskljuciti.
- [ ] Hero pozadina se moze ukljuciti i iskljuciti.
- [ ] Samo jedan rad moze biti hero u istom trenutku.
- [ ] Featured i hero brojevi se odmah azuriraju.
- [ ] Redosljed radova se cuva ako je promjena redosljeda dostupna.
- [ ] Brisanje trazi potvrdu i uklanja samo izabrani rad.
- [ ] Otkazivanje potvrde brisanja ne mijenja podatke.
- [ ] Free limit radova se pravilno sprovodi.
- [ ] Premium korisnik ima obecane dodatne mogucnosti.
- [ ] Prekid uploada ili API greska ostavlja postojeci rad netaknutim.

## 10. Artist dashboard - portfolio, lozinka i pretplata

- [ ] Portfolio tab prikazuje tacan broj draftova i generisanih PDF-ova.
- [ ] Nastavi otvara odgovarajuci draft u builderu.
- [ ] Pregled otvara odgovarajuci portfolio preview.
- [ ] Brisanje drafta trazi potvrdu i uklanja pravi projekat.
- [ ] Generisani PDF se moze otvoriti i preuzeti.
- [ ] Promjena lozinke trazi trenutnu lozinku.
- [ ] Nova i potvrdjena lozinka moraju biti iste.
- [ ] Eye dugmad pravilno prikazuju i skrivaju lozinku.
- [ ] Poslije promjene lozinke radi nova, a ne stara lozinka.
- [ ] Subscription tab prikazuje stvarni plan i status.
- [ ] Datum naredne obnove/isteka je tacan.
- [ ] Free i Premium pogodnosti su tacno navedene.
- [ ] Demo upgrade radi samo sa dogovorenim testnim podacima.
- [ ] Dozvoljeni mjesecni iznos je pravilno ogranicen.
- [ ] Otkazivanje pretplate trazi potvrdu.
- [ ] Otkazana pretplata ostaje aktivna do prikazanog datuma.
- [ ] Premium funkcije se gase nakon isteka plana.

## 11. Oglasi

- [ ] `/oglasi` prikazuje samo objavljene i neistekle oglase prema pravilima.
- [ ] Search i filter tipa oglasa rade pojedinacno i zajedno.
- [ ] Featured oglas ima odgovarajucu oznaku.
- [ ] Rok, lokacija, organizacija i placeni status su pravilno formatirani.
- [ ] Oglas sa vanjskim apply URL-om otvara tacan link.
- [ ] Oglas sa internom prijavom trazi artist login.
- [ ] Nakon logina korisnik se vraca na zapocetu prijavu.
- [ ] Arhiviran ili draft oglas ne prihvata prijavu.
- [ ] Oglas bez contact emaila prikazuje razumljivu poruku.
- [ ] Prijava salje profil, discipline, linkove i odabrane radove.
- [ ] Email prijave stize samo na testni email, ne izdavaocu.
- [ ] U testnom emailu je vidljiv originalni email izdavaoca.
- [ ] Dupli klik ne salje dvije prijave.

## 12. Portfolio Builder landing

- [ ] `/portfolio-builder` se ucitava u tamnoj svemirskoj temi.
- [ ] Background pokriva cijelu stranicu, ukljucujuci donju sekciju.
- [ ] Gost ne vidi sacuvane artist draftove.
- [ ] Ulogovan artist vidi samo svoje draftove.
- [ ] Broj draftova odgovara broju prikazanih projekata.
- [ ] Filter Svi prikazuje sve projekte.
- [ ] Filteri template-a prikazuju samo odgovarajuce projekte.
- [ ] Progress procenat i status Spremno odgovaraju popunjenosti projekta.
- [ ] Otvori vodi na tacan projekat.
- [ ] Novi portfolio za gosta vodi na guest formu.
- [ ] Novi portfolio za artista moze povuci podatke sa profila.
- [ ] Prazno stanje draftova izgleda uredno.
- [ ] Dugi naziv portfolija ne lomi listu.

## 13. Novi portfolio i cuvanje projekta

- [ ] `/portfolio-builder/new` validira obavezne podatke.
- [ ] Kreiranje gosta pravi samo jedan projekat.
- [ ] Kreiranje iz artist profila povlaci pravi profil i radove.
- [ ] Novi projekat otvara `/portfolio-builder/[id]`.
- [ ] Neispravan ID prikazuje kontrolisanu gresku ili 404.
- [ ] Save draft radi iz svakog taba.
- [ ] Saved indikator se prikazuje tek nakon uspjesnog API odgovora.
- [ ] Refresh cuva posljednju uspjesno sacuvanu verziju.
- [ ] Browser Back ne gubi nesacuvane podatke bez upozorenja.
- [ ] Dva projekta otvorena u dva taba ne prepisuju jedan drugog.
- [ ] Projekat jednog artista se ne pojavljuje drugom artistu.
- [ ] Neulogovan korisnik ne moze mijenjati tudji projekat samo pomocu UUID-a.

## 14. Portfolio Builder - Podaci

- [ ] Sidebar prikazuje tacan avatar, ime i plan korisnika.
- [ ] Koraci 01-04 su citljivi i pravilno poravnati.
- [ ] Aktivni korak Podaci je jasno oznacen.
- [ ] Broj ukljucenih radova i broj stranica su tacni.
- [ ] Ime, email, lokacija, website i Instagram se mogu urediti.
- [ ] Validacija emaila i URL-a daje jasnu poruku.
- [ ] Discipline se pravilno ucitavaju sa profila.
- [ ] Dodavanje i uklanjanje disciplina postuje limit.
- [ ] Biografija prikazuje tacan brojac i maksimalnu duzinu.
- [ ] Readiness indikator se mijenja prema popunjenim poljima.
- [ ] Profilna slika se moze zamijeniti.
- [ ] Nova profilna slika se odmah vidi u previewu.
- [ ] Naziv kolekcije, godina i opis se mogu urediti.
- [ ] Cover kolekcije se moze zamijeniti.
- [ ] Donje kartice Profilna slika i Kolekcija odgovaraju referentnom dizajnu.
- [ ] Sva polja ostaju sacuvana poslije refresha.
- [ ] Dalje: Radovi otvara drugi korak.

## 15. Portfolio Builder - Radovi

- [ ] Aktivni korak Radovi je jasno oznacen.
- [ ] Svi dostupni radovi imaju sliku, naziv, medij i godinu.
- [ ] Kartice imaju isti odnos stranica i ne mijenjaju velicinu pri hoveru.
- [ ] Redni brojevi odgovaraju redosljedu u PDF-u.
- [ ] Prvi ukljuceni rad dobija oznaku Naslovna.
- [ ] Ukljucivanje i iskljucivanje rada mijenja broj radova u PDF-u.
- [ ] Free i Premium limiti broja radova se pravilno primjenjuju.
- [ ] Radovi se mogu prevuci i poredjati.
- [ ] Redosljed ostaje sacuvan nakon refresha.
- [ ] Uredi otvara odgovarajuce podatke rada.
- [ ] Dodaj rad uploaduje novu sliku i dodaje je samo ovom projektu.
- [ ] Nepodrzan ili prevelik fajl se odbija bez prazne kartice.
- [ ] Preview se azurira nakon ukljucivanja, iskljucivanja i reorder-a.
- [ ] Ne moze se nastaviti sa nulom radova ako PDF zahtijeva makar jedan.
- [ ] Nazad: Podaci i Dalje: Dizajn vode na prave korake.

## 16. Portfolio Builder - Dizajn

- [ ] Aktivni korak Dizajn je jasno oznacen.
- [ ] Institutional Minimal kartica ima tacan preview i opis.
- [ ] ArtBoard Editorial kartica ima tacan preview i opis.
- [ ] Sales / Pro kartica ima tacan preview i opis.
- [ ] Samo jedan kompletni template moze biti izabran.
- [ ] Izabrani template ima jasnu oznaku i border.
- [ ] Promjena template-a odmah mijenja live preview.
- [ ] Format A4 i Letter mijenjaju format dokumenta.
- [ ] Crnogorski i English izbor mijenjaju jezik gdje je implementirano.
- [ ] Sans i Serif izbor mijenjaju font PDF-a.
- [ ] ArtBoard potpis se moze ukljuciti i iskljuciti.
- [ ] Preset mode koristi jedan kompletan template.
- [ ] Custom mix je onemogucen ili ogranicen prema planu.
- [ ] U Custom mix modu svaka sekcija moze dobiti svoj template.
- [ ] Nedostupna opcija ima jasno disabled stanje i objasnjenje.
- [ ] Sacuvaj podesavanja prikazuje uspjeh samo nakon API odgovora.
- [ ] Podesavanja ostaju sacuvana nakon refresha.
- [ ] Live preview odgovara izabranom formatu, fontu i potpisu.
- [ ] Nazad: Radovi i Dalje: Izvoz vode na prave korake.

## 17. Portfolio Builder - live preview

- [ ] Preview panel je sticky na desktopu i ne prekriva editor.
- [ ] Preview ima sopstveni vertikalni scroll.
- [ ] Skrolovanje previewa ne skroluje nekontrolisano cijelu stranicu.
- [ ] Naslovna stranica ima cover, ime, discipline i profilnu sliku.
- [ ] Profil, kolekcija i stranice radova su pravilnim redosljedom.
- [ ] Thumbnaili nijesu rastegnuti, odsjeceni ili zamijenjeni.
- [ ] Broj prikazanih stranica odgovara projektu.
- [ ] Preview se azurira bez punog refresha gdje je to predvidjeno.
- [ ] Loading previewa ima stabilnu visinu i ne pomjera layout.
- [ ] Greska ucitavanja previewa ima retry ili jasnu poruku.
- [ ] Preview je upotrebljiv na tabletu i mobilnom prikazu.

## 18. Portfolio Builder - Izvoz i placanje

- [ ] Aktivni korak Izvoz je jasno oznacen.
- [ ] Premium korisniku se prikazuje da je cist PDF ukljucen.
- [ ] Free korisnik dobija tacan payment/upgrade tok.
- [ ] Otvori pregled vodi na `/portfolio-builder/[id]/preview`.
- [ ] Pregled ima ArtBoard vodeni zig kada je predvidjen.
- [ ] Nazad u builder vraca na isti projekat.
- [ ] Generisi PDF ne moze biti kliknut vise puta paralelno.
- [ ] Uspjesno generisanje kreira novu PDF verziju.
- [ ] Neuspjelo generisanje daje jasnu gresku i dozvoljava retry.
- [ ] Generisani PDF se otvara i moze preuzeti.
- [ ] PDF ima ispravan broj stranica i redosljed.
- [ ] Sve slike u PDF-u imaju dobar kvalitet i nijesu deformisane.
- [ ] Tekst ne izlazi iz margina PDF-a.
- [ ] PDF nema Lorem Ipsum, placeholder QR ili testne podatke.
- [ ] ArtBoard potpis odgovara izabranom podesavanju i planu.
- [ ] Kopiraj link kopira validan link i prikazuje potvrdu.
- [ ] Privatni link otvara tacan projekat u novom/incognito prozoru.
- [ ] Verzije PDF-a prikazuju datum i vode na pravi fajl.
- [ ] Demo payment prihvata samo dogovorene testne podatke.
- [ ] Payment refresh ne naplacuje ili ne evidentira placanje dva puta.
- [ ] Nakon uspjesnog placanja download stranica postaje dostupna.
- [ ] Neplaceni korisnik se preusmjerava sa download stranice na payment.
- [ ] Download stranica vizuelno odgovara tamnom Portfolio Studio dizajnu.

## 19. Admin autentifikacija i dashboard

- [ ] `/admin` nije dostupan neulogovanom korisniku.
- [ ] Artist nalog ne moze otvoriti admin stranice.
- [ ] Admin login sa tacnim podacima vodi na dashboard.
- [ ] Pogresni podaci ne otkrivaju da li email postoji.
- [ ] Admin logout brise admin sesiju.
- [ ] Dashboard brojevi odgovaraju podacima iz baze.
- [ ] Recent admissions, portfolios i opportunities vode na pravi detalj.
- [ ] Sve admin navigacione kartice otvaraju ispravnu stranicu.
- [ ] Admin layout je citljiv na laptop sirini i manjem ekranu.

## 20. Admin - prijave i umjetnici

- [ ] `/admin/admissions` prikazuje sve prijave.
- [ ] Search, status filter i paginacija rade zajedno.
- [ ] Detalj prijave prikazuje sva polja i uploadovane fajlove.
- [ ] PDF portfolio i radovi se mogu otvoriti.
- [ ] Admin moze urediti dozvoljene podatke prijave.
- [ ] Reject mijenja status samo izabrane prijave.
- [ ] Approve kreira samo jedan artist profil i jedan artist nalog.
- [ ] Ponovljeni approve ne duplira profil, nalog ili radove.
- [ ] Odobreni profil sadrzi prave discipline, linkove i radove.
- [ ] Setup email stize samo na testni email.
- [ ] Privremena lozinka iz emaila radi za prvi login.
- [ ] Pad emaila ne ponistava vec odobrenu prijavu.
- [ ] `/admin/artists` prikazuje novoodobrenog umjetnika.
- [ ] Link iz admin liste otvara odgovarajuci javni profil.
- [ ] Draft i archived profili nijesu javno vidljivi.

## 21. Admin - oglasi

- [ ] `/admin/opportunities` prikazuje draft, objavljene i arhivirane oglase.
- [ ] Novi oglas zahtijeva naslov i opis.
- [ ] Slug se pravilno generise i ostaje jedinstven.
- [ ] Contact email i apply URL imaju validaciju.
- [ ] Draft oglas se ne vidi javno.
- [ ] Objavljivanje ga prikazuje na `/oglasi`.
- [ ] Izmjena se odmah vidi na javnoj stranici.
- [ ] Featured, paid i archived status rade nezavisno.
- [ ] Brisanje trazi potvrdu i uklanja samo pravi oglas.
- [ ] Oglas sa internim contact emailom prima prijavu samo na testni email.

## 22. Admin - portfolio projekti

- [ ] `/admin/portfolios` prikazuje guest i artist projekte.
- [ ] Filteri i paginacija ne dupliraju projekte.
- [ ] Detalj prikazuje vlasnika, template, status placanja i radove.
- [ ] Otvori builder vodi na pravi projekat.
- [ ] Otvori preview vodi na pravi pregled.
- [ ] Admin generisanje PDF-a kreira novu verziju.
- [ ] Postojeci PDF i sve verzije se mogu otvoriti.
- [ ] Admin ne moze greskom generisati PDF za drugi projekat.
- [ ] Messages stranica jasno pokazuje da inbox jos nije implementiran.
- [ ] Settings stranica jasno razlikuje aktivna i placeholder podesavanja.

## 23. Emailovi i kontakt podaci

- [ ] Nova artist prijava salje jednu poruku.
- [ ] Artist setup salje jednu poruku.
- [ ] Forgot password salje jednu poruku za aktivan nalog.
- [ ] Prijava na oglas salje jednu poruku.
- [ ] Sve automatske poruke stizu samo na `EMAIL_TEST_RECIPIENT`.
- [ ] Nijedna automatska poruka ne stize Ivoni, artistu ili izdavaocu tokom testa.
- [ ] Testni subject prikazuje originalnog primaoca.
- [ ] Linkovi u emailu koriste `http://localhost:3000` tokom lokalnog testa.
- [ ] Linkovi u emailu vode na pravi nalog ili akciju.
- [ ] HTML i plain-text verzije emaila sadrze iste vazne podatke.
- [ ] Email nema neispravne karaktere i izgleda citljivo na telefonu.
- [ ] Kontakt `mailto:` linkovi imaju tacan prikazani email i subject.
- [ ] Potvrdjeno je da projekat trenutno nema zaseban sistem rezervacija.

## 24. Upload, storage i podaci

- [ ] JPEG, PNG, WebP i AVIF rade gdje su podrzani.
- [ ] PDF radi samo na mjestima koja prihvataju PDF.
- [ ] Izvrsni, HTML i drugi nepodrzani fajlovi se odbijaju.
- [ ] Fajl preko maksimalne velicine se odbija prije ili tokom uploada.
- [ ] Naziv fajla sa razmacima i posebnim karakterima ne pravi problem.
- [ ] Prekinut internet tokom uploada daje gresku bez ostecenog zapisa.
- [ ] Ponovljeni upload ne pravi neocekivane duplikate.
- [ ] Zamjena slike ne ostavlja pogresan URL u bazi.
- [ ] Brisanje zapisa pokrece dogovoreno brisanje fajla iz storage-a.
- [ ] R2 javni URL-ovi se otvaraju preko HTTPS-a u produkciji.
- [ ] Privatni ili osjetljivi dokumenti nijesu javno dostupni bez namjere.

## 25. Sigurnost i privatnost - kriticno prije produkcije

- [ ] Neulogovan korisnik ne moze kreirati ili mijenjati artist profil preko API-ja.
- [ ] Neulogovan korisnik ne moze uploadovati, mijenjati, reorderovati ili brisati radove.
- [ ] Artist moze mijenjati samo svoj profil i svoje radove.
- [ ] Artist A ne moze otvoriti ili mijenjati draft artista B.
- [ ] Poznavanje portfolio UUID-a nije dovoljno za izmjenu tudjeg projekta.
- [ ] Neulogovan korisnik ne moze pristupiti admin API rutama.
- [ ] Artist cookie ne daje admin pristup.
- [ ] Izmijenjen ili istekao auth cookie se odbija.
- [ ] Return URL ne dozvoljava open redirect na vanjski domen.
- [ ] HTML/script unos u ime, bio, opis, link i naslov se prikazuje kao tekst.
- [ ] API ne vraca password hash, reset token ili druge tajne.
- [ ] Lozinke, API kljucevi i `.env` nijesu dostupni kroz web bundle.
- [ ] Error poruke ne otkrivaju database URL, kljuceve ili stack trace korisniku.
- [ ] CORS dozvoljava samo ocekivane web origin adrese.
- [ ] Rate limit ili druga zastita postoji za login, forgot password i upload prije produkcije.
- [ ] `/upload` developerska stranica je uklonjena ili zasticena prije produkcije.
- [ ] Demo payment rute su uklonjene ili jasno odvojene prije pravog placanja.
- [ ] Cover test PDF endpoint je uklonjen ili zasticen prije produkcije.

## 26. Pristupacnost

- [ ] Cijeli javni sajt se moze koristiti samo tastaturom.
- [ ] Artist dashboard se moze koristiti samo tastaturom.
- [ ] Portfolio Builder se moze koristiti samo tastaturom.
- [ ] Admin se moze koristiti samo tastaturom.
- [ ] Fokus je uvijek vidljiv.
- [ ] Tab redosljed prati vizuelni redosljed elemenata.
- [ ] Modal ili confirmation fokusira prvu vaznu kontrolu i zatvara se na Escape.
- [ ] Ikonska dugmad imaju pristupacan naziv ili tooltip.
- [ ] Svaki input ima povezanu labelu.
- [ ] Validation poruka je povezana sa odgovarajucim poljem.
- [ ] Sve informativne slike imaju smislen alt tekst.
- [ ] Dekorativne slike nijesu citane kao sadrzaj.
- [ ] Kontrast teksta i kontrola je citljiv u light i dark temi.
- [ ] Sadrzaj ostaje upotrebljiv na 200% browser zoomu.
- [ ] Animacije postuju `prefers-reduced-motion` gdje je moguce.

## 27. Responsive i browser regresija

- [ ] Pocetna, ArtBoard, lista umjetnika i artist profil rade na mobilnom.
- [ ] Prijava umjetnika radi na mobilnom, ukljucujuci upload.
- [ ] Artist dashboard sidebar postaje upotrebljiva mobilna navigacija.
- [ ] Portfolio Builder sidebar, editor i preview ne preklapaju jedan drugi.
- [ ] Design template kartice se pravilno prelamaju.
- [ ] Izvoz i payment kontrole ostaju dostupne na maloj visini ekrana.
- [ ] Admin tabele i akcije su dostupne bez odsijecanja.
- [ ] Sticky elementi ne prekrivaju posljednji sadrzaj stranice.
- [ ] Chrome i Edge daju isti osnovni layout i funkcionalnost.
- [ ] Mobilna tastatura ne skriva aktivni input ili save dugme.
- [ ] Promjena portrait/landscape orijentacije ne lomi layout.

## 28. Performanse i stabilnost

- [ ] Pocetna stranica pokazuje koristan sadrzaj bez dugog praznog ekrana.
- [ ] Velike slike koriste odgovarajuce dimenzije i ne blokiraju interakciju.
- [ ] Skrolovanje galerija i buildera je glatko.
- [ ] Nema beskonacnog spinnera nakon API greske.
- [ ] Ponovni online status nakon prekida mreze dozvoljava retry.
- [ ] Brzo mijenjanje tabova ne vraca zastarjele podatke.
- [ ] Vise uzastopnih save akcija ne prepisuje novije podatke starijim odgovorom.
- [ ] Browser konzola nema React hydration, key ili uncontrolled input upozorenja.
- [ ] API log nema neocekivane 500 greske tokom normalnih tokova.
- [ ] Stranice sa mnogo radova ostaju upotrebljive.

## 29. SEO i produkcijski sadrzaj

- [ ] Svaka vazna javna stranica ima jedinstven title i description.
- [ ] Favicon i logo se pravilno prikazuju.
- [ ] Open Graph slika, naslov i opis su ispravni pri dijeljenju linka.
- [ ] Canonical URL sprjecava duplikate `/artists` i `/umjetnici` gdje je potrebno.
- [ ] Draft, dashboard, admin i builder privatne stranice nijesu indeksirane.
- [ ] Sitemap sadrzi samo javne stranice koje treba indeksirati.
- [ ] Robots pravila odgovaraju produkciji.
- [ ] Nema `localhost`, demo kartice, test emaila ili placeholder teksta u produkcijskom UI-ju.
- [ ] Godina, valuta, datumi i lokalizacija su dosljedni.
- [ ] Pravna dokumenta sadrze stvarne podatke firme/organizacije.

## 30. Zavrsna provjera prije objave

- [ ] Pregledan je kompletan `git diff`.
- [ ] Privremeni i developerski fajlovi nijesu ukljuceni u deploy.
- [ ] `.env` i tajni kljucevi nijesu commitovani.
- [ ] `npm run build` prolazi za API i web.
- [ ] Prisma migracije prolaze na praznoj testnoj bazi.
- [ ] Produkcijski `WEB_ORIGIN`, `SITE_BASE_URL` i R2 URL su tacni.
- [ ] Produkcijski admin nalog ima jaku novu lozinku.
- [ ] `EMAIL_TEST_RECIPIENT` ostaje ukljucen dok traje zatvoreno testiranje.
- [ ] Prije pravog pustanja donesena je odluka kada se testni email override uklanja.
- [ ] Napravljen je backup baze prije migracije ili uvoza podataka.
- [ ] Provjeren je plan povratka na prethodnu verziju.
- [ ] Uradjen je finalni smoke test nakon deploya.
- [ ] Javna pocetna, login, artist profil, oglas i Portfolio Builder rade na produkcijskom URL-u.
- [ ] Produkcijski logovi se prate tokom prvog kompletnog testnog prolaza.

## Evidencija pronadjenog problema

- [ ] Ruta/ekran:
- [ ] Uloga i testni nalog:
- [ ] Browser, uredjaj i rezolucija:
- [ ] Koraci za reprodukciju:
- [ ] Ocekivani rezultat:
- [ ] Stvarni rezultat:
- [ ] Prioritet: kriticno / visoko / srednje / nisko
- [ ] Screenshot ili video:
- [ ] Console/network greska:
- [ ] Status: novo / u radu / popravljeno / ponovo testirano

