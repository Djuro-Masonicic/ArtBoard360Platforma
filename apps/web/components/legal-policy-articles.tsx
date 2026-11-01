import type { ReactNode } from "react";
import { CookiePreferences } from "./cookie-preferences";
import styles from "./legal-policy-document.module.css";

// Supplied policy version 2026-10-10. Text is intentionally kept verbatim.
function LegalArticle({ id, number, title, delay, children }: { id: string; number: string; title: string; delay: number; children: ReactNode }) {
  return <section className={styles.article} id={id} aria-labelledby={id + "-title"}>
    <h2 id={id + "-title"}><span className={styles.number} aria-hidden="true" style={{ animationDelay: delay + "s" }}>{number}</span>{title}</h2>
    {children}
  </section>;
}
function Summary({ children }: { children: ReactNode }) { return <p className={styles.summary}>{children}</p>; }
function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className={styles.infoCard}><h3>{title}</h3><div>{children}</div></section>;
}

export function TermsArticles() {
  return <>
    <LegalArticle id="uslovi" number="01" title="Opšte odredbe" delay={0}>
      <Summary><strong>Ukratko:</strong> pravila važe za svakoga ko koristi ArtBoard.</Summary>
      <p>ArtBoard je digitalna platforma za predstavljanje umjetnika, izradu portfolija i promotivnih materijala i oglašavanje prilika u kulturi. Platformom upravlja „ART STUDIO 360“ D.O.O. Podgorica, PIB 03792994, Dalmatinska 152, Podgorica (u daljem tekstu: ArtBoard, mi).</p>
      <p>Izrazi koji se u ovim pravilima koriste u muškom gramatičkom rodu (npr. umjetnik, korisnik, kupac) odnose se jednako na sve osobe, bez obzira na rod. U tekstovima koji se prave automatski (profil, PDF portfolio, Instagram objave, QR vizit karta) koristimo oblik koji umjetnik izabere u profilu: umjetnica, umjetnik ili neutralnu formulaciju.</p>
      <p>Uz ove <em>Uslove korišćenja</em> važi i <em>Politika privatnosti</em> (Dio II). Pravila se prihvataju ovako:</p>
      <ul>
        <li>umjetnik: jednom, u posljednjem koraku prijave, prije objave profila;</li>
        <li>kupac bez naloga: pri plaćanju, čekiranjem polja „Prihvatam Uslove korišćenja i Politiku privatnosti”;</li>
        <li>posjetilac: pregledanje je slobodno, a zabrane iz člana 6 važe i za posjetioce bez naloga.</li>
      </ul>
    </LegalArticle>
    <LegalArticle id="nalog" number="02" title="Nalog, uzrast i odobrenje profila" delay={-11}>
      <Summary><strong>Ukratko:</strong> nalog mogu otvoriti samo punoljetne osobe (18+).</Summary>
      <ul>
        <li>Nalog može otvoriti samo osoba koja ima najmanje 18 godina. Nalog za koji se utvrdi da pripada maloljetnoj osobi gasi se.</li>
        <li>Svaku prijavu pregleda tim ArtBoarda. Profil postaje javan tek kad prijava bude odobrena; tada stiže e-mail sa linkom za postavljanje lozinke.</li>
        <li>Podaci u nalogu moraju biti tačni. Umjetničko ime je dozvoljeno.</li>
        <li>Sigurnost lozinke i aktivnosti na nalogu su tvoja odgovornost. Neovlašćen pristup prijavi odmah na <a className={styles.emailLink} href="mailto:info@artstudio360.me">info@artstudio360.me</a>.</li>
        <li>Odobrenje profila znači da je tim ArtBoarda pregledao osnovne podatke i radove. Ne potvrđuje kvalitet niti autentičnost svakog pojedinačnog djela.</li>
      </ul>
    </LegalArticle>
    <LegalArticle id="autorstvo" number="03" title="Autorska prava i originalnost" delay={-4}>
      <Summary><strong>Ukratko:</strong> objavljuješ samo svoja djela, a autorska prava ostaju tvoja.</Summary>
      <p>Za svako djelo koje objavi na ArtBoardu umjetnik potvrđuje da:</p>
      <ul>
        <li>je autor djela ili ima pisanu saglasnost autora i svih nosilaca prava;</li>
        <li>djelo ne krši autorska, žigovna ili druga prava trećih lica, niti pravo na privatnost i lik prikazanih osoba;</li>
        <li>ima saglasnost prepoznatljivih osoba na fotografijama i portretima, a za maloljetne osobe saglasnost roditelja;</li>
        <li>u opisu djela navodi ako je djelo nastalo uz pomoć alata vještačke inteligencije.</li>
      </ul>
      <p>Sva autorska imovinska i moralna prava ostaju umjetniku, u skladu sa Zakonom o autorskom i srodnim pravima Crne Gore; ArtBoard ne stiče vlasništvo nad djelima. Ako treće lice podnese zahtjev zbog povrede svojih prava djelom koje je umjetnik objavio, odgovornost snosi umjetnik.</p>
    </LegalArticle>
    <LegalArticle id="licenca" number="04" title="Licenca za prikaz i promotivnu upotrebu" delay={-16}>
      <Summary><strong>Ukratko:</strong> djelo prikazujemo i promovišemo uvijek uz tvoje ime. Ne prodajemo ga i ne ustupamo dalje bez posebnog ugovora s tobom.</Summary>
      <p>Objavom djela umjetnik ArtBoardu daje neisključivu, besplatnu i teritorijalno neograničenu licencu da djelo:</p>
      <ul>
        <li>prikazuje na platformi;</li>
        <li>koristi za promociju umjetnika i platforme: na društvenim mrežama, u prezentacijama, štampanim materijalima, na izložbama, u medijima i u izvještajima partnerima i institucijama koje podržavaju projekat;</li>
        <li>tehnički prilagođava za prikaz (izrez, smanjenje, kompresija, kolaž), bez mijenjanja suštine djela.</li>
      </ul>
      <p>Uz svaku promotivnu upotrebu navodi se ime umjetnika i, gdje je moguće, naziv djela. ArtBoard ne prodaje djela, ne izrađuje komercijalne proizvode s njima i ne ustupa licencu trećim licima bez posebnog pisanog ugovora s umjetnikom.</p>
      <p>Licenca prestaje brisanjem djela ili naloga. Materijali objavljeni prije brisanja mogu ostati u arhivi, ali se djelo više ne koristi u novim materijalima. Izuzimanje djela iz budućih promocija možeš zatražiti u svakom trenutku na <a className={styles.emailLink} href="mailto:info@artstudio360.me">info@artstudio360.me</a>.</p>
    </LegalArticle>
    <LegalArticle id="odrasli" number="05" title="Sadržaj za odrasle (18+)" delay={-8}>
      <Summary><strong>Ukratko:</strong> umjetnički akt i zahtjevne teme su dozvoljeni, uz oznaku 18+ na profilu.</Summary>
      <p>Oznaku <strong>18+</strong> dobija profil koji sadrži bar jedno djelo sa:</p>
      <ul>
        <li>nagošću ili umjetničkim aktom;</li>
        <li>seksualno sugestivnim ili eksplicitnim prizorima;</li>
        <li>izraženim nasiljem, krvlju, povredama ili uznemirujućim prizorima;</li>
        <li>prikazom upotrebe droga ili samopovređivanja.</li>
      </ul>
      <p>Oznaku postavlja umjetnik, a može je dodati i tim ArtBoarda pri pregledu prijave. Prije otvaranja profila sa oznakom 18+ posjetilac potvrđuje da ima 18 ili više godina; nalog za to nije potreban, a potvrda važi do kraja posjete. Profili sa oznakom 18+ ne prikazuju se na naslovnoj strani i ne koriste se u javnim promocijama.</p>
      <p>Ako profil nije označen, ArtBoard ga može označiti sam, a sporni sadržaj privremeno sakriti ili ukloniti. Ponovljeno izostavljanje oznake može dovesti do ograničenja ili gašenja naloga.</p>
    </LegalArticle>
    <LegalArticle id="zabranjeno" number="06" title="Zabranjen sadržaj i ponašanje" delay={-19}>
      <p>Bez obzira na oznaku 18+, na ArtBoardu nije dozvoljeno:</p>
      <ul>
        <li>objavljivati bilo kakav seksualizovan prikaz maloljetnih osoba; takav sadržaj se odmah uklanja i prijavljuje nadležnim organima;</li>
        <li>objavljivati intimne snimke ili fotografije osoba bez njihove saglasnosti, uključujući izmijenjene i generisane prikaze stvarnih osoba;</li>
        <li>objavljivati govor mržnje ili pozivati na nasilje, diskriminaciju ili terorizam;</li>
        <li>predstavljati tuđa djela kao svoja i objavljivati kopije ili plagijate;</li>
        <li>objavljivati spam, prevare, lažne oglase i obmanjujuće ponude poslova;</li>
        <li>širiti zlonamjerni kod, automatski prikupljati podatke (scraping) ili pokušavati neovlašćen pristup sistemu;</li>
        <li>preuzimati, kopirati ili koristiti djela drugih umjetnika bez njihove izričite dozvole, uključujući korišćenje za treniranje modela vještačke inteligencije.</li>
      </ul>
    </LegalArticle>
    <LegalArticle id="prijava" number="07" title="Prijava povrede i moderacija" delay={-2}>
      <p>Ako smatraš da djelo na platformi krši tvoja prava ili ova pravila, da je neko djelo zloupotrijebljeno ili da se neko predstavlja tvojim imenom, piši na <a className={styles.emailLink} href="mailto:info@artstudio360.me">info@artstudio360.me</a>. Navedi:</p>
      <ol>
        <li>svoje ime i kontakt;</li>
        <li>link do spornog sadržaja;</li>
        <li>opis povrede i dokaz o autorstvu ili pravu;</li>
        <li>izjavu da su podaci tačni.</li>
      </ol>
      <p>Na prijavu odgovaramo u roku od 7 radnih dana, a očigledne povrede i sadržaj koji ugrožava maloljetnike uklanjamo odmah. Umjetnik čije je djelo uklonjeno dobija obavještenje i može podnijeti prigovor sa dokazima; o prigovoru odlučujemo u roku od 14 dana.</p>
    </LegalArticle>
    <LegalArticle id="oglasi" number="08" title="Oglasna tabla i saradnje" delay={-13}>
      <ul>
        <li>Oglas mora jasno navesti organizatora, vrstu prilike, rok i način prijave, a naknadu i kotizaciju ako postoje.</li>
        <li>Nijesu dozvoljeni oglasi koji traže besplatan rad „za vidljivost” ili uplatu od umjetnika kao uslov angažmana. Volonterski pozivi (na primjer neprofitni projekti i festivali) dozvoljeni su ako je u oglasu jasno navedeno da su bez honorara.</li>
        <li>Objava oglasa je besplatna i ne traži nalog. Tim ArtBoarda pregleda svaki oglas prije objave i može odbiti ili ukloniti oglas koji krši ova pravila.</li>
        <li>Za tačnost oglasa, uslove angažmana i isplatu honorara odgovara oglašivač. ArtBoard nije strana u ugovoru između umjetnika i organizatora i ne garantuje ishod saradnje; preporučujemo pisani ugovor.</li>
        <li>Na oglas se prijavljuješ direktno organizatoru, putem e-maila ili linka navedenog u oglasu. ArtBoard ne prikuplja prijave i ne prosljeđuje tvoje podatke organizatoru.</li>
      </ul>
    </LegalArticle>
    <LegalArticle id="placanje" number="09" title="Plaćene usluge i plaćanje" delay={-6}>
      <Summary><strong>Ukratko:</strong> osnovne usluge su besplatne. Prvi export i prva Instagram objava su besplatni za svaki nalog, a <em>Premium</em> (od 8,90 € mjesečno) uključuje 5 exporta i 10 Instagram objava mjesečno.</Summary>
      <p>Plaćene usluge su <em>Premium</em> članstvo, pojedinačni <em>Portfolio Builder</em> export i dodatni set od 10 Instagram objava. Cijene su u eurima i prikazane su prije plaćanja; račun stiže na e-mail. Plaća se platnom karticom preko ovlašćenog pružaoca platnih usluga, a ArtBoard ne čuva podatke o kartici.</p>
      <div className={styles.infoGrid}>
        <InfoCard title="Portfolio Builder export">Export je generisanje nove verzije PDF-a, uključujući PDF samo sa CV-jem. Svaki nalog ima jedan besplatan export, jednokratno; svaki sljedeći košta 4,90 €. Gost bez naloga plaća svaki export 4,90 € i ostavlja samo e-mail, na koji stižu račun i link za preuzimanje. Pregled, uređivanje, čuvanje drafta i ponovno preuzimanje istog PDF-a su besplatni, a neuspješno generisanje se ne naplaćuje.</InfoCard>
        <InfoCard title="Premium članstvo">Naplaćuje se mjesečno, u iznosu koji izabereš (od 8,90 € do 30 €), i automatski se obnavlja dok ga ne otkažeš. Uključuje 5 exporta i 10 Instagram objava u svakom obračunskom periodu; neiskorišćeni se ne prenose. Iznos možeš promijeniti, a članstvo otkazati u svakom trenutku na stranici <em>Moj nalog → Pretplata</em>; pogodnosti važe do kraja plaćenog perioda.</InfoCard>
        <InfoCard title="Instagram objave">Nastaju u <em>Generatoru promotivnih materijala</em>. Svaki nalog ima jednu besplatnu objavu, jednokratno. Dodatne objave kupuju se u setu od 10 za 4,90 € i ne ističu; karusel sa više slajdova računa se kao jedna objava. Ponovno preuzimanje generisane objave je besplatno.</InfoCard>
        <InfoCard title="QR vizit karta">Svaki nalog jednom besplatno preuzima svoju <em>QR vizit kartu</em> (PDF i PNG iste verzije). Nova verzija, poslije promjene sadržaja ili dizajna, preuzima se uz <em>Premium</em>. Ponovno preuzimanje iste verzije je besplatno.</InfoCard>
      </div>
      <p>Dodatni export ili set objava naplaćuje se samo uz tvoju izričitu potvrdu, nikad automatski. Exporti, objave i <em>QR vizit karta</em> su digitalni sadržaj koji se isporučuje odmah nakon plaćanja.</p>
    </LegalArticle>
    <LegalArticle id="odgovornost" number="10" title="Ograničenje odgovornosti" delay={-17}>
      <p>Trudimo se da platforma radi bez prekida i da čuva sadržaj, ali ne možemo garantovati neprekidnu dostupnost; preporučujemo da originale djela čuvaš i van platforme. ArtBoard ne odgovara za sadržaj koji objavljuju korisnici, za odnose između umjetnika i organizatora, niti za indirektnu štetu, osim ako je prouzrokovana namjerno ili krajnjom nepažnjom.</p>
    </LegalArticle>
    <LegalArticle id="gasenje" number="11" title="Suspenzija i gašenje naloga" delay={-10}>
      <p>Brisanje naloga možeš zatražiti u svakom trenutku na stranici <em>Moj nalog → Lozinka i nalog</em> ili e-mailom na <a className={styles.emailLink} href="mailto:info@artstudio360.me">info@artstudio360.me</a>. Iz bezbjednosnih razloga zahtjev pregleda i odobrava tim ArtBoarda, kako bismo provjerili da ga je poslao vlasnik naloga; do odobrenja nalog ostaje aktivan, a o odluci te obavještavamo e-mailom u roku od 30 dana. Razlog brisanja nije obavezan. ArtBoard može upozoriti, privremeno ograničiti ili ugasiti nalog koji krši ova pravila, uz obavještenje o razlogu; kod teških povreda, posebno onih iz člana 6, nalog se gasi bez upozorenja.</p>
    </LegalArticle>
    <LegalArticle id="izmjene" number="12" title="Izmjene pravila i mjerodavno pravo" delay={-1}>
      <p>O bitnim izmjenama pravila obavještavamo korisnike e-mailom najmanje 15 dana prije stupanja na snagu; nastavak korišćenja nakon tog roka znači prihvatanje izmjena. Na ova pravila primjenjuje se pravo Crne Gore. Sporove nastojimo riješiti sporazumno, a u suprotnom je nadležan sud u Podgorici, osim kad propisi o zaštiti potrošača određuju drugačije.</p>
    </LegalArticle>
  </>;
}

export function PrivacyArticles() {
  return <>
    <LegalArticle id="privatnost" number="13" title="Kako obrađujemo lične podatke" delay={-14}>
      <Summary><strong>Ukratko:</strong> prikupljamo samo ono što je potrebno za rad platforme i ne prodajemo tvoje podatke.</Summary>
      <p>Rukovalac ličnim podacima je „ART STUDIO 360“ D.O.O. Podgorica. Podatke obrađujemo u skladu sa Zakonom o zaštiti podataka o ličnosti Crne Gore i, gdje je primjenljivo, Opštom uredbom EU o zaštiti podataka (GDPR).</p>
      <div className={styles.infoGrid}>
        <InfoCard title="Šta prikupljamo">Iz prijave i naloga: ime i prezime, e-mail, broj telefona (opciono), moto, biografiju i umjetnički iskaz, discipline, linkove i društvene mreže, portfolio, radove, profilnu fotografiju i potvrdu uzrasta. Pri plaćanju: podatke o kupovini i računu; podatke o kartici obrađuje pružalac platnih usluga. Pri kupovini bez naloga: samo e-mail. Pri objavi oglasa: podatke iz forme za oglas i kontakt e-mail organizatora.</InfoCard>
        <InfoCard title="Zašto i na kom osnovu">Za nalog, profil, alate i plaćene usluge (izvršenje ugovora); za račune (zakonska obaveza); za sigurnost platforme i statistiku (legitimni interes); za analitičke kolačiće (saglasnost).</InfoCard>
        <InfoCard title="Kome ih dajemo">Pružaocima usluga koji omogućavaju rad platforme (hosting, e-pošta, plaćanje), uz obavezu povjerljivosti; partnerima i institucijama koje podržavaju projekat samo zbirno i anonimizovano. Ako se podaci obrađuju van Crne Gore, biramo pružaoce iz EU ili zemalja sa odgovarajućim nivoom zaštite.</InfoCard>
        <InfoCard title="Koliko dugo">Dok je nalog aktivan. Nakon brisanja naloga podaci se trajno brišu u roku od 30 dana, osim računa i knjigovodstvenih isprava, koje čuvamo onoliko koliko propisuju računovodstveni i poreski propisi.</InfoCard>
      </div>
      <p>Javni profil (ime, biografija, discipline, radovi i linkovi) vidljiv je svima, jer je predstavljanje umjetnika svrha platforme. Lične podatke ne prodajemo i ne koristimo za oglašavanje trećih lica.</p>
      <p>Imaš pravo na pristup, ispravku, brisanje i prenos podataka, na ograničenje obrade, prigovor i povlačenje saglasnosti. Zahtjev šalješ na <a className={styles.emailLink} href="mailto:info@artstudio360.me">info@artstudio360.me</a>, a odgovor dobijaš u roku od 30 dana. Pritužbu možeš podnijeti Agenciji za zaštitu ličnih podataka i slobodan pristup informacijama.</p>
    </LegalArticle>
    <LegalArticle id="kolacici" number="14" title="Kolačići" delay={-5}>
      <p>Kolačići su male datoteke koje sajt čuva u tvom pregledaču. ArtBoard koristi:</p>
      <ul>
        <li>neophodne kolačiće, za prijavu, sigurnost i pamćenje podešavanja (na primjer potvrde uzrasta 18+ i izbora u vezi s kolačićima); bez njih platforma ne radi, pa za njih nije potrebna saglasnost;</li>
        <li>analitičke kolačiće, samo uz tvoju saglasnost, da bismo razumjeli kako se platforma koristi.</li>
      </ul>
      <p>Reklamne kolačiće ne koristimo. Saglasnost možeš dati, promijeniti ili povući u svakom trenutku putem linka <em>Politika kolačića</em> u podnožju stranice, a kolačiće možeš obrisati i u podešavanjima pregledača.</p>
      <CookiePreferences />
    </LegalArticle>
  </>;
}
