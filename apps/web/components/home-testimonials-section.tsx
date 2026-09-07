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
          Klijenti, umjetnici i saradnici<span>.</span>
          <strong>Njihova iskustva sa nama.</strong>
        </h2>
      </header>

      <ServicesTestimonialRail />
    </section>
  );
}
