import { ServicesTestimonialRail } from "@/components/services-testimonial-rail";

export function HomeTestimonialsSection() {
  return (
    <section className="home-testimonials" id="utisci">
      <header className="home-testimonials__heading">
        <p>
          <span aria-hidden="true" />
          Utisci
        </p>
        <h2>
          Cijenjeni od strane ljudi
          <br />
          kojima je <strong>stalo do kvaliteta.</strong>
        </h2>
      </header>

      <ServicesTestimonialRail variant="home" />
    </section>
  );
}
