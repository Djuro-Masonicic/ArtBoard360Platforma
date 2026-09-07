import { Mail } from "lucide-react";

import { siteRoutes } from "@/lib/site-routes";

const teamMembers = [
  {
    contactHref: "mailto:medenica.ivona@yahoo.com",
    contactLabel: "medenica.ivona@yahoo.com",
    description: [
      "Ivona vodi kreativni pravac Art Studija 360 i razvoj ArtBoard platforme, spajajući vizuelnu umjetnost, dizajn i organizaciju u cjelovite projekte.",
      "U radu joj je važan neposredan odnos sa ljudima, jasno razumijevanje ideje i stvaranje rješenja iza kojih svi učesnici mogu da stanu.",
    ],
    imageUrl:
      "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/686d18c9a743949e2f9f0792_about--tim-card-_0002_Ivona-Medenica.webp",
    name: "Ivona Medenica",
    socials: [
      { href: "https://www.instagram.com/", label: "Instagram" },
      { href: "https://www.linkedin.com/", label: "LinkedIn" },
      { href: "mailto:medenica.ivona@yahoo.com", label: "Email" },
    ],
  },
  {
    contactHref: siteRoutes.contact,
    contactLabel: "djuromas@gmail.com",
    description: [
      "Đuro razvija digitalne proizvode i tehničku infrastrukturu ArtBoard platforme, pretvarajući kreativne ideje u jasne i pouzdane alate.",
      "Fokusiran je na funkcionalnost, iskustvo korisnika i dugoročan razvoj sistema koji umjetnicima olakšava predstavljanje i profesionalni rad.",
    ],
    imageUrl: null,
    name: "Đuro Masoničić",
    socials: [
      { href: "https://www.instagram.com/djuro_masonicic/?hl=en", label: "Instagram" },
      { href: "https://www.linkedin.com/in/djuro-masonicic/", label: "LinkedIn" },
    ],
  },
] as const;

export function HomeTeamStorySection() {
  return (
    <section className="home-team-story" id="o-nama">
      <div className="home-team-story__inner">
        <header className="home-team-story__intro">
          <div>
            <p className="home-team-story__eyebrow">
              <span aria-hidden="true" />
              O nama
            </p>
            <h2>
              Mali tim, velike
              <br />
              ideje i rad iz srca<span>.</span>
            </h2>
          </div>

          <p className="home-team-story__lead">
            Art Studio 360 okuplja kreativce sa različitim znanjima i iskustvima, koje povezuju
            radoznalost, posvećenost i ljubav prema onome što stvaraju. Svakom projektu pristupamo
            lično, kroz blisku saradnju, razumijevanje ideja i želju da napravimo nešto iza čega svi
            možemo da stanemo.
          </p>
        </header>

        <div className="home-team-story__grid">
          {teamMembers.map((member) => (
            <article className="home-team-card" key={member.name}>
              <div className={`home-team-card__portrait${member.imageUrl ? "" : " is-placeholder"}`}>
                {member.imageUrl ? (
                  <img alt={member.name} src={member.imageUrl} />
                ) : (
                  <span aria-label={member.name}>ĐM</span>
                )}
              </div>

              <div className="home-team-card__content">
                <h3>{member.name}</h3>
                <div className="home-team-card__description">
                  {member.description.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                {member.socials.length > 0 ? (
                  <div className="home-team-card__socials">
                    {member.socials.map((social) => {
                      return (
                        <a
                          aria-label={social.label}
                          href={social.href}
                          key={social.label}
                          rel={social.href.startsWith("http") ? "noreferrer" : undefined}
                          target={social.href.startsWith("http") ? "_blank" : undefined}
                          title={social.label}
                        >
                          {social.label === "Instagram" ? <InstagramIcon /> : null}
                          {social.label === "LinkedIn" ? <LinkedinIcon /> : null}
                          {social.label === "Email" ? (
                            <Mail aria-hidden="true" size={15} strokeWidth={2} />
                          ) : null}
                        </a>
                      );
                    })}
                  </div>
                ) : null}

                <a className="home-team-card__contact" href={member.contactHref}>
                  {member.contactLabel}
                </a>
              </div>
            </article>
          ))}
        </div>

        <blockquote className="home-team-story__quote">
          <span className="home-team-story__quote-mark home-team-story__quote-mark--left" aria-hidden="true">
            “
          </span>
          <p>
            ArtBoard je nastao iz potrebe,
            <br />
            ali raste iz ljubavi prema
            <br />
            umjetnosti, autentičnosti
            <br />
            i ljudima koji stvaraju.
          </p>
          <cite>Ivona Medenica</cite>
          <span className="home-team-story__quote-mark home-team-story__quote-mark--right" aria-hidden="true">
            ”
          </span>
        </blockquote>
      </div>
    </section>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" className="home-team-card__brand-icon" fill="none" viewBox="0 0 24 24">
      <rect height="17.5" rx="5" stroke="currentColor" strokeWidth="1.8" width="17.5" x="3.25" y="3.25" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" fill="currentColor" r="1.15" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg aria-hidden="true" className="home-team-card__brand-icon" fill="none" viewBox="0 0 24 24">
      <path d="M7.2 9.2H4.2V19.2H7.2V9.2Z" fill="currentColor" />
      <path
        d="M5.7 7.8C6.65 7.8 7.45 7 7.45 6.05C7.45 5.1 6.65 4.3 5.7 4.3C4.75 4.3 3.95 5.1 3.95 6.05C3.95 7 4.75 7.8 5.7 7.8Z"
        fill="currentColor"
      />
      <path
        d="M10 9.2H12.9V10.55H12.95C13.35 9.8 14.35 9 15.9 9C19.1 9 19.7 11.05 19.7 13.7V19.2H16.7V14.35C16.7 13.2 16.7 11.75 15.15 11.75C13.55 11.75 13.3 13 13.3 14.25V19.2H10V9.2Z"
        fill="currentColor"
      />
    </svg>
  );
}
