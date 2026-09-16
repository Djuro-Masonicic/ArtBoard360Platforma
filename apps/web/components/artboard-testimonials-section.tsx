import { ServicesTestimonialRail } from "@/components/services-testimonial-rail";

export function ArtBoardTestimonialsSection() {
  return (
    <section className="artboard-testimonials" id="utisci" aria-labelledby="artboard-testimonials-title">
      <div className="artboard-testimonials__inner">
        <p className="artboard-testimonials__eyebrow"><span aria-hidden="true" /> Utisci</p>
        <h2 className="artboard-testimonials__title" id="artboard-testimonials-title">
          Klijenti, umjetnici i saradnici.
          <span>Njihova iskustva sa nama.</span>
        </h2>
        <ServicesTestimonialRail variant="artboard" />
      </div>
    </section>
  );
}
