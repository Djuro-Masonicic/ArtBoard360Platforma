import type { Artist } from "@/types/api";

import { SiteCtaButton } from "./site-cta-button";

interface HomeArtboardArtistsSectionProps {
  artists: Artist[];
}

interface ArtistShowcaseImage {
  alt: string;
  imageUrl: string;
}

/**
 * Homepage showcase for ArtBoard artists.
 * The two marquee rows intentionally move in opposite directions to echo the
 * original Webflow feeling without coupling this code to Webflow internals.
 */
export function HomeArtboardArtistsSection({ artists }: HomeArtboardArtistsSectionProps) {
  const showcaseImages = getArtistShowcaseImages(artists);

  if (showcaseImages.length === 0) {
    return null;
  }

  const largeImages = repeatImages(showcaseImages, 2);
  const smallImages = repeatImages([...showcaseImages].reverse(), 2);

  return (
    <section className="relative -mx-5 overflow-hidden bg-[#f8fbff] py-20 sm:-mx-8 sm:py-24 lg:-mx-10 lg:py-28">
      <div className="mx-auto flex max-w-[1080px] flex-col items-center px-5 text-center sm:px-8 lg:px-10">
        <h2 className="text-[3.2rem] font-normal leading-[0.94] text-[#555b64] sm:text-[4.2rem] lg:text-[5rem]">
          Umjetnici
          <strong className="block font-bold text-[#2f3138]">
            ArtBoard platforme<span className="text-[#dc1735]">.</span>
          </strong>
        </h2>

        <p className="mt-7 max-w-[960px] text-[22px] font-medium leading-[1.16] text-[#2f3138] sm:text-[26px]">
          Predstavljamo crnogorske umjetnike koji su nam ukazali povjerenje.
          <br className="hidden sm:block" />
          Pogledajte njihove portfolije i umjetnicke price.
        </p>

        <SiteCtaButton className="mt-10" href="/artists" label="Vidi sve umjetnike" />
      </div>

      <div className="mt-20 -rotate-[3deg] space-y-5">
        <MovingImageRow direction="left" images={largeImages} size="large" />
        <MovingImageRow direction="right" images={smallImages} size="small" />
      </div>
    </section>
  );
}

function MovingImageRow({
  direction,
  images,
  size,
}: {
  direction: "left" | "right";
  images: ArtistShowcaseImage[];
  size: "large" | "small";
}) {
  const trackClassName =
    direction === "left"
      ? "home-artists-marquee__track home-artists-marquee__track--left"
      : "home-artists-marquee__track home-artists-marquee__track--right";

  return (
    <div className="home-artists-marquee" aria-hidden="true">
      <div className={trackClassName}>
        {images.map((image, index) => (
          <div
            className={
              size === "large"
                ? "home-artists-marquee__card home-artists-marquee__card--large"
                : "home-artists-marquee__card home-artists-marquee__card--small"
            }
            key={`${image.imageUrl}-${index}`}
          >
            <img alt={image.alt} className="h-full w-full object-cover" src={image.imageUrl} />
          </div>
        ))}
      </div>
    </div>
  );
}

function getArtistShowcaseImages(artists: Artist[]) {
  const images: ArtistShowcaseImage[] = [];
  const seenUrls = new Set<string>();

  for (const artist of artists) {
    const candidateUrls = [
      ...artist.artworks
        .filter((artwork) => artwork.isFeatured)
        .map((artwork) => artwork.imageUrl),
      ...artist.artworks.map((artwork) => artwork.imageUrl),
      artist.coverImageUrl,
      artist.thumbnailUrl,
      artist.profileImageUrl,
    ].filter(Boolean);

    for (const imageUrl of candidateUrls) {
      if (!imageUrl || seenUrls.has(imageUrl)) {
        continue;
      }

      seenUrls.add(imageUrl);
      images.push({
        alt: artist.name,
        imageUrl,
      });

      break;
    }
  }

  return images.slice(0, 18);
}

function repeatImages(images: ArtistShowcaseImage[], minimumRepeats: number) {
  const repeatedImages: ArtistShowcaseImage[] = [];
  const repeatCount = Math.max(minimumRepeats, Math.ceil(16 / Math.max(images.length, 1)));

  for (let index = 0; index < repeatCount; index += 1) {
    repeatedImages.push(...images);
  }

  return repeatedImages;
}
