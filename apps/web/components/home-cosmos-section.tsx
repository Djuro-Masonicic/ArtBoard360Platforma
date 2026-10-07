import type { Artist, Artwork } from "@/types/api";

const assetRoot = "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe";

const orbitArtworkSlots = [
  {
    className: "home-mission-cosmos__planet--art-top-left",
    fallbackSrc: `${assetRoot}/68cd97ded342a415469018a2_Posteri%20bijela%20pozadina.jpg`,
  },
  {
    className: "home-mission-cosmos__planet--art-top",
    fallbackSrc: `${assetRoot}/687cc9e8daebd9a75c7256a0_img--services-hero-01.webp`,
  },
  {
    className: "home-mission-cosmos__planet--art-left",
    fallbackSrc: `${assetRoot}/68cd97e4eb35a203b2210e23_osamu%20dazai%20no%20longer%20human%20book%20(1).jpg`,
  },
  {
    className: "home-mission-cosmos__planet--art-right",
    fallbackSrc: `${assetRoot}/68cd96e6de09f2258b4b2e86_compressed_New%20Cover.jpg`,
  },
  {
    className: "home-mission-cosmos__planet--art-bottom",
    fallbackSrc: `${assetRoot}/68cd96e6fd4c2925933f075d_poster14.jpg`,
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

export function HomeCosmosSection({ artists }: { artists: Artist[] }) {
  const orbitArtworks = collectOrbitArtworks(artists);

  return (
    <section className="home-mission-cosmos" id="misija">
      <div aria-hidden="true" className="home-mission-cosmos__orbit-field">
        <span className="home-mission-cosmos__ring home-mission-cosmos__ring--1" />
        <span className="home-mission-cosmos__ring home-mission-cosmos__ring--2" />
        <span className="home-mission-cosmos__ring home-mission-cosmos__ring--3" />
      </div>

      <div aria-hidden="true" className="home-mission-cosmos__planets">
        {orbitArtworks.map((artwork) => (
          <span
            className={`home-mission-cosmos__orbiter ${artwork.className}`}
            key={artwork.className}
          >
            <span className="home-mission-cosmos__planet home-mission-cosmos__planet--art">
              <img alt="" loading="lazy" src={artwork.src} />
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
          <span>Gradimo svijet u kojem</span>
          <span>umjetnost, zajednica i inovacije</span>
          <span>
            <strong>rastu zajedno</strong>.
          </span>
        </h2>

        <p>
          Kroz umjetnost i tehnologiju razvijamo projekte, platforme i alate koji stvaraju
          infrastrukturu za povezivanje, vidljivost i dugoročni razvoj kreativne zajednice.
        </p>

        <ul aria-label="Vrijednosti Art Studija 360" className="home-mission-cosmos__values">
          <li>Umjetnost</li>
          <li>Zajednica</li>
          <li>Inovacije</li>
        </ul>
      </div>
    </section>
  );
}

function collectOrbitArtworks(artists: Artist[]) {
  const selected: Array<{ artist: Artist; artwork: Artwork }> = [];
  const seenUrls = new Set<string>();

  const addArtwork = (artist: Artist, artwork?: Artwork) => {
    if (!artwork?.imageUrl || seenUrls.has(artwork.imageUrl)) {
      return;
    }

    seenUrls.add(artwork.imageUrl);
    selected.push({ artist, artwork });
  };

  // Give the orbit visual variety before filling any remaining positions.
  artists.forEach((artist) => {
    addArtwork(artist, artist.artworks.find((artwork) => artwork.isFeatured) ?? artist.artworks[0]);
  });

  artists.forEach((artist) => {
    artist.artworks.forEach((artwork) => addArtwork(artist, artwork));
  });

  return orbitArtworkSlots.map((slot, index) => ({
    className: slot.className,
    src: selected[index]?.artwork.imageUrl ?? slot.fallbackSrc,
  }));
}
