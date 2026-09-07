const assetRoot = "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe";
const portfolioUrl = "https://www.behance.net/artstudio360";

const projects = [
  {
    categories: ["Branding", "Vizuelni identitet"],
    description:
      "Novi vizuelni identitet koji jasno komunicira vrijednosti brenda i gradi dosljedan nastup na svim kanalima.",
    imageAlt: "Vizuelni identitet za Ardado Consulting",
    imageUrl: `${assetRoot}/68ac87edeab5cd27ab9c23b2_386f498dd40bb0d746329bac7e608734_Branding%2C%20Dizajn%20%282%29%201.webp`,
    title: "Ardado Consulting",
  },
  {
    categories: ["Web dizajn", "Vizuelne priče"],
    description:
      "Digitalno iskustvo oblikovano kroz snažan karakter, jasnu strukturu i prepoznatljiv vizuelni ritam.",
    imageAlt: "Kreativni digitalni projekat SKITZA",
    imageUrl: `${assetRoot}/68cd96e6de09f2258b4b2e86_compressed_New%20Cover.jpg`,
    title: "SKITZA / Gazda Gradilišta",
  },
  {
    categories: ["Digitalni marketing", "Social media"],
    description:
      "Promotivni vizuelni sadržaj i komunikacija prilagođeni projektu, publici i njegovim dugoročnim ciljevima.",
    imageAlt: "Digitalna kampanja za HELP Montenegro",
    imageUrl: `${assetRoot}/68cd99d9de2f761450019f76_compressed_8325870%20copy.jpg`,
    title: "HELP Montenegro",
  },
  {
    categories: ["Social media", "Vizuelni identitet"],
    description:
      "Topao i pristupačan vizuelni sistem koji stručnu komunikaciju približava roditeljima i široj publici.",
    imageAlt: "Vizuelni identitet za Pediatrics Natal Kids",
    imageUrl: `${assetRoot}/68cd96e6bd78268dd268e150_compressed_3aa42524-604f-41a4-8ca7-74aa5aa20dd3%20copy.jpg`,
    title: "Pediatrics Natal Kids",
  },
] as const;

export function HomeProjectsSection() {
  return (
    <section className="home-projects" id="projekti">
      <div className="home-projects__inner">
        <header className="home-projects__header">
          <div>
            <p>
              <span aria-hidden="true" />
              Naš rad
            </p>
            <h2>
              Ideje koje smo
              <br />
              {" "}pretvorili u
              <br />
              {" "}stvarnost<span>.</span>
            </h2>
          </div>

          <p>
            Izdvajamo nekoliko projekata koji najbolje pokazuju različite oblasti našeg rada, od
            vizuelnih identiteta i digitalnih kampanja do web dizajna.
          </p>
        </header>

        <div className="home-projects__grid">
          {projects.map((project) => (
            <article className="home-project-card" key={project.title}>
              <a
                aria-label={`Pogledaj projekat ${project.title}`}
                className="home-project-card__image"
                href={portfolioUrl}
                rel="noreferrer"
                target="_blank"
              >
                <img alt={project.imageAlt} src={project.imageUrl} />
              </a>

              <div className="home-project-card__content">
                <p className="home-project-card__categories">
                  {project.categories.map((category) => (
                    <span key={category}>{category}</span>
                  ))}
                </p>
                <h3>{project.title}</h3>
                <p className="home-project-card__description">{project.description}</p>
                <a className="home-project-card__link" href={portfolioUrl} rel="noreferrer" target="_blank">
                  Pogledaj projekat <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>

        <a className="home-projects__all" href={portfolioUrl} rel="noreferrer" target="_blank">
          Pogledaj sve projekte <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
