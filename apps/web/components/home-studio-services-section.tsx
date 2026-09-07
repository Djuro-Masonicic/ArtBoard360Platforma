import { NavigationButton } from "@/components/navigation-button";
import { siteRoutes } from "@/lib/site-routes";

const assetRoot = "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe";

const services = [
  {
    color: "blue",
    description: "Vizuelni identiteti, brending, grafički dizajn i web rješenja.",
    title: "Dizajn i vizuelni identitet",
  },
  {
    color: "red",
    description: "Marketing strategije, kampanje i sadržaj za digitalne kanale.",
    title: "Digitalni marketing",
  },
  {
    color: "yellow",
    description: "Kreativni vizuelni sadržaj prilagođen brendovima, kampanjama i pojedincima.",
    title: "Fotografija i video",
  },
] as const;

const images = [
  {
    alt: "Grafički dizajn i vizuelni identitet",
    src: `${assetRoot}/68ac86c0503ee2cb8b45c150_30647fcaa8b2a8367a314d5e5aa53ad2_graficki%20dizajn%201.webp`,
  },
  {
    alt: "Produkcija fotografskog i video sadržaja",
    src: `${assetRoot}/68ac86c07fd60116019b3eba_c4fcf2e315ab2b40a93bcf8434f21ed6_snimanje.webp`,
  },
  {
    alt: "Montaža i obrada video sadržaja",
    src: `${assetRoot}/68ac88dfdb3de7a645c8c971_06e52f295e18bb250ab0f4625e358c4e_04%20video%20edit%201.webp`,
  },
];

export function HomeStudioServicesSection() {
  return (
    <section className="home-studio-services" id="usluge-pregled">
      <span className="home-studio-services__stars" aria-hidden="true" />

      <div className="home-studio-services__inner">
        <header className="home-studio-services__header">
          <div>
            <p className="home-studio-services__eyebrow">
              <span aria-hidden="true" />
              Usluge
            </p>
            <h2>
              Od ideje do
              <br />
              prepoznatljivog
              <br />
              brenda<span>.</span>
            </h2>
          </div>

          <p>
            Kroz dizajn, digitalni marketing, fotografiju, video i web pomažemo kompanijama i
            pojedincima da svoje ideje predstave jasno, kreativno i autentično.
          </p>
        </header>

        <div className="home-studio-services__list">
          {services.map((service, index) => (
            <article className="home-studio-services__row" key={service.title}>
              <span className={`home-studio-services__number home-studio-services__number--${service.color}`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>

        <div className="home-studio-services__gallery">
          {images.map((image) => (
            <figure key={image.src}>
              <img alt={image.alt} src={image.src} />
            </figure>
          ))}
        </div>

        <div className="home-studio-services__actions">
          <NavigationButton
            className="home-studio-services__button home-studio-services__button--primary"
            href={siteRoutes.services}
          >
            Pogledaj sve usluge <span aria-hidden="true">→</span>
          </NavigationButton>
          <NavigationButton
            className="home-studio-services__button home-studio-services__button--secondary"
            href={`${siteRoutes.contact}?forma=studio`}
          >
            Kontaktiraj nas
          </NavigationButton>
        </div>
      </div>
    </section>
  );
}
