import type { Artist } from "@/types/api";

import { ArtistCard } from "./artist-card";

interface ArtistGridProps {
  artists: Artist[];
}

export function ArtistGrid({ artists }: ArtistGridProps) {
  if (artists.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-[#d6dce5] bg-white p-8 text-sm text-[#7d8793]">
        Trenutno nema umjetnika za prikaz.
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </div>
  );
}
