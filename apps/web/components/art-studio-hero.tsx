import type { CSSProperties } from "react";

import type { Artist } from "@/types/api";

import { NavigationButton } from "./navigation-button";

type HeroArtwork = { alt: string; src: string };
type HeroGraphic = "bars" | "circle" | "corner" | "ring" | "square";

const fallbackArtworkFiles: Array<[string, string]> = [
  ["Ilustrovani posteri", "68cd97ded342a415469018a2_Posteri%20bijela%20pozadina.jpg"],
  ["Vizuelni identitet", "68cd99d9de2f761450019f76_compressed_8325870%20copy.jpg"],
  ["Dizajn magazina", "68cd97dde8f1a160138d7f0f_Magazin.jpg"],
  ["Dizajn majice", "68cd97dd70c726c01e92fa49_Majica%202.jpg"],
  ["Brend aplikacije", "68cd96e6de09f2258b4b2e86_compressed_New%20Cover.jpg"],
  ["Dizajn ambalaže", "68cd96e6bd78268dd268e150_compressed_3aa42524-604f-41a4-8ca7-74aa5aa20dd3%20copy.jpg"],
  ["Kreativni poster", "68cd96e6fd4c2925933f075d_poster14.jpg"],
  ["Dizajn knjige", "68cd97e4eb35a203b2210e23_osamu%20dazai%20no%20longer%20human%20book%20(1).jpg"],
  ["Digitalna ilustracija", "687cc9e8daebd9a75c7256a0_img--services-hero-01.webp"],
  ["Kreativni projekat", "687cc9e86da8dd5b2a7c9446_img--services-hero-05.webp"],
  ["Umjetnički projekat", "687cc9e841cc245f5ce1aaee_img--services-hero-03.webp"],
  ["Grafički dizajn", "68ac86c0503ee2cb8b45c150_30647fcaa8b2a8367a314d5e5aa53ad2_graficki%20dizajn%201.webp"],
];

const fallbackArtworks: HeroArtwork[] = fallbackArtworkFiles.map(([alt, fileName]) => ({
  alt,
  src: `https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/${fileName}`,
}));

export function ArtStudioHero({ artists }: { artists: Artist[] }) {
  const artworks = collectHeroArtworks(artists);
  const columns = Array.from({ length: 4 }, (_, columnIndex) =>
    artworks.filter((_, artworkIndex) => artworkIndex % 4 === columnIndex),
  );
  const graphics: [HeroGraphic[], HeroGraphic[], HeroGraphic[], HeroGraphic[]] = [
    ["circle", "corner"],
    ["square", "ring"],
    ["corner", "bars"],
    ["circle", "square"],
  ];

  return (
    <section className="art-studio-hero" id="studio">
      <div aria-hidden="true" className="art-studio-hero__rail art-studio-hero__rail--left">
        <ArtworkColumn artworks={columns[0] ?? []} direction="up" graphics={graphics[0]} speed="52s" />
        <ArtworkColumn artworks={columns[1] ?? []} direction="down" graphics={graphics[1]} speed="64s" />
      </div>

      <div className="art-studio-hero__content">
        <div className="art-studio-hero__eyebrow">
          <span className="art-studio-hero__eyebrow-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          Upoznaj Art Studio 360
        </div>

        <h1 className="art-studio-hero__title">
          <span>Kreativni studio</span> za dizajn, umjetničke projekte i digitalne alate.
        </h1>

        <p className="art-studio-hero__copy">
          Kreiramo dizajnerska rješenja za kompanije i pojedince, razvijamo ArtBoard kao naš glavni
          umjetnički projekat i gradimo digitalne alate za umjetnike i kreativce.
        </p>

        <div className="art-studio-hero__actions">
          <NavigationButton
            className="art-studio-hero__button art-studio-hero__button--primary"
            href="/artboard"
            withArtBoardTransition
          >
            <span>Istraži ArtBoard</span>
            <span aria-hidden="true">↗</span>
          </NavigationButton>

          <NavigationButton
            className="art-studio-hero__button art-studio-hero__button--secondary"
            href="/usluge"
          >
            <span>Pogledaj usluge</span>
            <span aria-hidden="true">↗</span>
          </NavigationButton>
        </div>
      </div>

      <div aria-hidden="true" className="art-studio-hero__rail art-studio-hero__rail--right">
        <ArtworkColumn artworks={columns[2] ?? []} direction="up" graphics={graphics[2]} speed="58s" />
        <ArtworkColumn artworks={columns[3] ?? []} direction="down" graphics={graphics[3]} speed="70s" />
      </div>
    </section>
  );
}

function ArtworkColumn({
  artworks,
  direction,
  graphics,
  speed,
}: {
  artworks: HeroArtwork[];
  direction: "down" | "up";
  graphics: HeroGraphic[];
  speed: string;
}) {
  return (
    <div className={`art-studio-hero__column art-studio-hero__column--${direction}`}>
      <div
        className="art-studio-hero__track"
        style={{ "--hero-column-speed": speed } as CSSProperties}
      >
        {[0, 1].map((groupIndex) => (
          <div className="art-studio-hero__artwork-group" key={groupIndex}>
            {artworks.map((artwork, artworkIndex) => {
              const graphic = artworkIndex % 3 === 1 ? graphics[artworkIndex % graphics.length] : null;

              return graphic ? (
                <div
                  className={`art-studio-hero__artwork art-studio-hero__graphic art-studio-hero__graphic--${graphic}`}
                  key={`${graphic}-${artworkIndex}`}
                >
                  <span />
                </div>
              ) : (
                <figure className="art-studio-hero__artwork" key={`${artwork.src}-${artworkIndex}`}>
                  <img alt="" loading={groupIndex === 0 ? "eager" : "lazy"} src={artwork.src} />
                </figure>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function collectHeroArtworks(artists: Artist[]) {
  const images: HeroArtwork[] = [];
  const seenUrls = new Set<string>();
  const addImage = (image: HeroArtwork) => {
    if (image.src && !seenUrls.has(image.src)) {
      seenUrls.add(image.src);
      images.push(image);
    }
  };

  for (const artist of artists) {
    const orderedArtworks = [
      ...artist.artworks.filter((artwork) => artwork.isFeatured),
      ...artist.artworks.filter((artwork) => !artwork.isFeatured),
    ];

    orderedArtworks.forEach((artwork) =>
      addImage({
        alt: artwork.altText || artwork.title || `Rad umjetnika ${artist.name}`,
        src: artwork.imageUrl,
      }),
    );
  }

  fallbackArtworks.forEach(addImage);
  return images.slice(0, 24);
}
