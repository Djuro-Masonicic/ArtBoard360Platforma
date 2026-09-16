import Link from "next/link";

import { siteRoutes } from "@/lib/site-routes";

const freeFeatures = [
  "Besplatna prijava i profil",
  "Uređivanje profila jednom mjesečno",
  "Prvi Portfolio Builder export",
  "Ograničen broj promotivnih materijala",
  "Prisustvo u pretraživaču umjetnika",
  "Pregled oglasne table",
];

const premiumFeatures = [
  "Neograničeno uređivanje profila i radova",
  "Neograničeni portfolio i CV exporti",
  "Neograničeni promotivni materijali",
  "Digitalna vizit karta sa QR kodom",
  "Prijavljivanje na oglase jednim klikom",
  "Automatsko povezivanje profila i portfolija",
  "Pristup ArtBoard Edu sadržajima",
  "Mogućnost kreiranja i prodaje Edu sadržaja",
];

export function ArtBoardPricingSection() {
  return (
    <section className="artboard-pricing" id="paketi" aria-labelledby="artboard-pricing-title">
      <div className="artboard-pricing__inner">
        <p className="artboard-pricing__eyebrow"><span aria-hidden="true" /> Paketi i cijene</p>
        <h2 className="artboard-pricing__title" id="artboard-pricing-title">
          Počni <span>besplatno</span>. Izaberi<br className="artboard-pricing__desktop-break" /> više kada ti bude potrebno.
        </h2>
        <p className="artboard-pricing__intro">
          Kreiraj profil i koristi osnovne ArtBoard servise besplatno ili otključaj puni pristup alatima kroz Premium članstvo.
        </p>

        <div className="artboard-pricing__plans">
          <article className="artboard-pricing__plan artboard-pricing__plan--free">
            <div className="artboard-pricing__plan-head">
              <h3>Besplatno</h3>
              <strong>0€</strong>
            </div>
            <p className="artboard-pricing__description">Za umjetnike koji žele da predstave svoj rad i istraže ArtBoard mogućnosti.</p>
            <p className="artboard-pricing__included">Uključeno</p>
            <ul>
              {freeFeatures.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <Link className="artboard-pricing__action" href={siteRoutes.artistApplication}>Prijavi se besplatno</Link>
          </article>

          <article className="artboard-pricing__plan artboard-pricing__plan--premium">
            <div className="artboard-pricing__plan-head">
              <h3>Premium</h3>
              <strong>od 5€</strong>
            </div>
            <p className="artboard-pricing__description">Isti Premium pristup. Ti biraš iznos koji ti trenutno odgovara.</p>
            <p className="artboard-pricing__included">Uključeno</p>
            <ul>
              {premiumFeatures.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <Link className="artboard-pricing__action" href={siteRoutes.subscription}>Izaberi svoj iznos</Link>
          </article>
        </div>
      </div>
    </section>
  );
}
