const assetRoot = "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe";

const orbitArtworks = [
  {
    className: "home-mission-cosmos__planet--art-top-left",
    src: `${assetRoot}/68cd97ded342a415469018a2_Posteri%20bijela%20pozadina.jpg`,
  },
  {
    className: "home-mission-cosmos__planet--art-top",
    src: `${assetRoot}/687cc9e8daebd9a75c7256a0_img--services-hero-01.webp`,
  },
  {
    className: "home-mission-cosmos__planet--art-left",
    src: `${assetRoot}/68cd97e4eb35a203b2210e23_osamu%20dazai%20no%20longer%20human%20book%20(1).jpg`,
  },
  {
    className: "home-mission-cosmos__planet--art-right",
    src: `${assetRoot}/68cd96e6de09f2258b4b2e86_compressed_New%20Cover.jpg`,
  },
  {
    className: "home-mission-cosmos__planet--art-bottom",
    src: `${assetRoot}/68cd96e6fd4c2925933f075d_poster14.jpg`,
  },
];

const colorPlanets = [
  "home-mission-cosmos__planet--yellow-top",
  "home-mission-cosmos__planet--blue-left",
  "home-mission-cosmos__planet--yellow-right",
  "home-mission-cosmos__planet--red-left",
  "home-mission-cosmos__planet--blue-right",
  "home-mission-cosmos__planet--red-bottom",
];

export function HomeCosmosSection() {
  return (
    <section className="home-mission-cosmos" id="home-cosmos">
      <div aria-hidden="true" className="home-mission-cosmos__stars" />

      <div aria-hidden="true" className="home-mission-cosmos__orbit-field">
        <span className="home-mission-cosmos__ring home-mission-cosmos__ring--1" />
        <span className="home-mission-cosmos__ring home-mission-cosmos__ring--2" />
        <span className="home-mission-cosmos__ring home-mission-cosmos__ring--3" />
        <span className="home-mission-cosmos__ring home-mission-cosmos__ring--4" />
      </div>

      <div aria-hidden="true" className="home-mission-cosmos__planets">
        {orbitArtworks.map((artwork) => (
          <span
            className={`home-mission-cosmos__orbiter ${artwork.className}`}
            key={artwork.className}
          >
            <span className="home-mission-cosmos__planet home-mission-cosmos__planet--art">
              <img alt="" src={artwork.src} />
            </span>
          </span>
        ))}

        {colorPlanets.map((className) => (
          <span
            className={`home-mission-cosmos__orbiter ${className}`}
            key={className}
          >
            <span className="home-mission-cosmos__planet home-mission-cosmos__planet--color" />
          </span>
        ))}
      </div>

      <div className="home-mission-cosmos__content">
        <div className="home-mission-cosmos__eyebrow">
          <span aria-hidden="true" />
          Naša misija
        </div>

        <h2>
          <span>Gradimo svijet u</span>
          <span>kojem umjetnost,</span>
          <span>zajednica i inovacije</span>
          <strong>rastu zajedno.</strong>
        </h2>

        <p>
          Kroz umjetnost i tehnologiju razvijamo projekte, platforme i alate koji stvaraju
          infrastrukturu za povezivanje, vidljivost i dugoročni razvoj kreativne zajednice.
        </p>

        <ul aria-label="Vrijednosti Art Studija 360" className="home-mission-cosmos__values">
          <li>Umjetnost</li>
          <li>Zajednica</li>
          <li>Tehnologija</li>
        </ul>
      </div>
    </section>
  );
}
