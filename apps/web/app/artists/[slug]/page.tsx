import { notFound } from "next/navigation";

import { SocialLinks } from "@/components/social-links";
import { TestimonialList } from "@/components/testimonial-list";
import { ApiError } from "@/services/api";
import { getArtistBySlug } from "@/services/artists";

interface ArtistDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ArtistDetailPage({ params }: ArtistDetailPageProps) {
  const { slug } = await params;

  try {
    const artist = await getArtistBySlug(slug);
    const heroImage = artist.coverImageUrl || artist.profileImageUrl || artist.thumbnailUrl;

    return (
      <div className="space-y-10 sm:space-y-12">
        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6">
            <div className="public-surface rounded-[2.25rem] p-6 sm:p-8">
              <div className="public-image-frame overflow-hidden rounded-[1.75rem]">
                {artist.profileImageUrl ? (
                  <img
                    alt={artist.name}
                    className="aspect-[0.96/1] w-full object-cover"
                    src={artist.profileImageUrl}
                  />
                ) : (
                  <div className="flex aspect-[0.96/1] items-center justify-center bg-[var(--background-strong)] text-sm text-[var(--foreground-muted)]">
                    Fotografija umjetnika uskoro
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <p className="public-section-label">Discipline</p>
                <div className="flex flex-wrap gap-2">
                  {artist.disciplines.length > 0 ? (
                    artist.disciplines.map((discipline) => (
                      <span
                        key={discipline.id}
                        className="public-chip rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em]"
                      >
                        {discipline.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--foreground-muted)]">
                      Discipline nijesu navedene.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="public-surface rounded-[2.25rem] p-6 sm:p-8">
              <p className="public-section-label">Kontakt i mreze</p>
              <div className="mt-5 space-y-5">
                {artist.email ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                      E-mail
                    </p>
                    <a
                      className="public-link mt-2 inline-flex text-base text-[var(--foreground-soft)] hover:text-[var(--accent-deep)]"
                      href={`mailto:${artist.email}`}
                    >
                      {artist.email}
                    </a>
                  </div>
                ) : null}

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                    Linkovi
                  </p>
                  <div className="mt-3">
                    <SocialLinks links={artist.socialLinks} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="public-surface overflow-hidden rounded-[2.5rem]">
            <div className="relative">
              {heroImage ? (
                <img
                  alt={artist.name}
                  className="aspect-[1.5/1] w-full object-cover"
                  src={heroImage}
                />
              ) : (
                <div className="flex aspect-[1.5/1] items-center justify-center bg-[var(--background-strong)] text-sm text-[var(--foreground-muted)]">
                  Naslovna fotografija uskoro
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(21,11,8,0.82)] via-[rgba(21,11,8,0.35)] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9">
                <p className="public-section-label text-white/72">ArtBoard umjetnik</p>
                <h1 className="public-heading mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                  {artist.name}
                </h1>
              </div>
            </div>

            <div className="space-y-8 p-7 sm:p-9">
              {artist.quote ? (
                <blockquote className="border-l-2 border-[var(--accent)] pl-5 text-lg italic leading-8 text-[var(--foreground-soft)]">
                  {artist.quote}
                </blockquote>
              ) : null}

              <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
                <div className="space-y-4">
                  <p className="public-section-label">Biografija</p>
                  {artist.bio ? (
                    <p className="whitespace-pre-line text-base leading-8 text-[var(--foreground-soft)]">
                      {artist.bio}
                    </p>
                  ) : (
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Biografija jos nije dodata.
                    </p>
                  )}
                </div>

                <div className="grid gap-3 rounded-[1.5rem] border border-[var(--border-soft)] bg-[rgba(255,248,241,0.72)] p-5 text-center md:min-w-[180px]">
                  <div>
                    <p className="text-3xl font-semibold text-[var(--accent)]">
                      {artist.artworks.length}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                      Radova
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-[var(--accent)]">
                      {artist.testimonials.length}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                      Utisaka
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <p className="public-section-label">Radovi</p>
            <h2 className="public-heading text-4xl font-semibold sm:text-5xl">Izdvojeni portfolio.</h2>
          </div>

          {artist.artworks.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {artist.artworks.map((artwork) => (
                <article
                  key={artwork.id}
                  className="public-surface public-hover-rise overflow-hidden rounded-[2rem]"
                >
                  <div className="public-image-frame border-x-0 border-t-0">
                    <img
                      alt={artwork.altText || artwork.title || `${artist.name} artwork`}
                      className="aspect-[0.98/1.06] w-full object-cover"
                      src={artwork.imageUrl}
                    />
                  </div>
                  <div className="space-y-2 p-5">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      {artwork.title || "Bez naslova"}
                    </h3>
                    {artwork.description ? (
                      <p className="text-sm leading-7 text-[var(--foreground-soft)]">
                        {artwork.description}
                      </p>
                    ) : (
                      <p className="text-sm leading-7 text-[var(--foreground-muted)]">
                        Izdvojeni rad sa profila umjetnika.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="public-surface rounded-[2rem] border-dashed p-8 text-sm text-[var(--foreground-muted)]">
              Umjetnik jos nema dostupne radove na profilu.
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <p className="public-section-label">Utisci i preporuke</p>
            <h2 className="public-heading text-4xl font-semibold sm:text-5xl">
              Povratne informacije o radu.
            </h2>
          </div>
          <TestimonialList testimonials={artist.testimonials} />
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
