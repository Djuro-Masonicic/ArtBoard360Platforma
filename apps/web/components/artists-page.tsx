import type { Artist } from "@/types/api";

import { ArtistsBrowser } from "./artists-browser";
import styles from "./artists-page.module.css";

interface ArtistsPageProps {
  artists: Artist[];
  totalArtists: number;
}

export function ArtistsPage({ artists, totalArtists }: ArtistsPageProps) {
  return (
    <section className={styles.page}>
      <ArtistsBrowser artists={artists} totalArtists={totalArtists} />
    </section>
  );
}
