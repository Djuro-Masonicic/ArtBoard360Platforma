import { PrijavaArtworkRails } from "@/components/prijava-artwork-rails";
import { PrijavaFlow } from "@/components/prijava-flow";
import styles from "@/components/prijava-page.module.css";
import { ARTBOARD_DISCIPLINES } from "@/lib/artboard-disciplines";
import { getArtists } from "@/services/artists";

export default async function PrijavaPage() {
  const artistsResponse = await getArtists({ page: 1, pageSize: 100, includeNsfw: true });

  const disciplines = ARTBOARD_DISCIPLINES.map((discipline) => ({
    id: discipline.slug,
    ...discipline,
  }));

  const allArtworkImageUrls = Array.from(
    new Set(
      artistsResponse.items.flatMap((artist) =>
        artist.isNsfw ? [] : artist.artworks.map((artwork) => artwork.imageUrl),
      ),
    ),
  );
  const artworkImageUrls = pickRandom(allArtworkImageUrls, 12);

  return (
    <div className={styles.page}>
      <PrijavaArtworkRails imageUrls={artworkImageUrls} />

      <div className={styles.content}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Besplatna prijava</p>
          <h1 className={styles.title}>
            Postani dio ArtBoard <span className={styles.gradientText}>zajednice.</span>
          </h1>
          <p className={styles.intro}>
            Prijava je jednostavna i traje svega nekoliko minuta. Unesi osnovne podatke, dodaj
            radove i linkove, a mi ćemo pregledati profil prije objave.
          </p>
        </section>

        <PrijavaFlow disciplines={disciplines} />
      </div>
    </div>
  );
}

function pickRandom<T>(items: T[], count: number) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex]!, shuffled[index]!];
  }

  return shuffled.slice(0, count);
}
