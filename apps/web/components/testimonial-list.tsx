import type { Testimonial } from "@/types/api";

interface TestimonialListProps {
  testimonials: Testimonial[];
}

export function TestimonialList({ testimonials }: TestimonialListProps) {
  if (testimonials.length === 0) {
    return (
      <div className="public-surface rounded-[2rem] border-dashed p-8 text-sm text-[var(--foreground-muted)]">
        Trenutno nema dostupnih utisaka.
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {testimonials.map((testimonial) => (
        <article
          key={testimonial.id}
          className="public-surface public-hover-rise flex h-full flex-col gap-5 rounded-[2rem] p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="public-section-label">Utisak</p>
              <h3 className="text-xl font-semibold text-[var(--foreground)]">{testimonial.author}</h3>
              <p className="text-xs uppercase tracking-[0.15em] text-[var(--foreground-muted)]">
                {testimonial.company || "Umjetnik"}
                {testimonial.artist ? ` · ${testimonial.artist.name}` : ""}
              </p>
            </div>

            <div className="hidden rounded-full border border-[var(--border-soft)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)] sm:block">
              Art Studio 360
            </div>
          </div>

          <p className="text-[1.02rem] leading-8 text-[var(--foreground-soft)]">
            {testimonial.content}
          </p>

          {testimonial.artist ? (
            <a
              className="public-link mt-auto inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--accent)]"
              href={`/artists/${testimonial.artist.slug}`}
            >
              Pogledaj profil
              <span aria-hidden="true">→</span>
            </a>
          ) : (
            <p className="mt-auto text-sm text-[var(--foreground-muted)]">
              Povratna informacija sa platforme.
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
