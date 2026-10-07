"use client";

import { useRef, useState } from "react";

const contactEmail = "info@artstudio360.me";

export function ArtStudioContactCtaSection() {
  const [topic, setTopic] = useState("Usluge");
  const formRef = useRef<HTMLFormElement>(null);

  function chooseTopic(nextTopic: string) {
    setTopic(nextTopic);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const subject = `[${topic}] Upit sa Art Studio 360 sajta - ${name}`;
    const body = [`Ime i prezime: ${name}`, `Email: ${email}`, `Tema: ${topic}`, "", message].join("\n");

    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <section className="home-contact" id="kontakt">
      <div className="home-contact__panel">
        <div className="home-contact__intro">
          <div className="home-contact__stars" aria-hidden="true" />

          <div className="home-contact__intro-content">
            <p className="home-contact__eyebrow">
              <span className="home-contact__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              Javi nam se
            </p>

            <h2>
              Imaš ideju ili
              <br />
              pitanje? <strong>Piši nam.</strong>
            </h2>

            <p className="home-contact__lead">
              Bilo da tražiš kreativnog partnera za novi projekat ili ti je potrebna podrška vezana
              za ArtBoard platformu, javi nam se putem kontakt forme ili nam piši na email.
            </p>

            <div className="home-contact__choices">
              <button onClick={() => chooseTopic("Usluge i saradnje")} type="button">
                <span>
                  <small>Usluge i saradnje</small>
                  Projekat na kojem želiš da radimo zajedno
                </span>
                <i aria-hidden="true">→</i>
              </button>

              <button onClick={() => chooseTopic("ArtBoard podrška")} type="button">
                <span>
                  <small>ArtBoard podrška</small>
                  Pitanje o profilu, alatima ili platformi
                </span>
                <i aria-hidden="true">→</i>
              </button>
            </div>

            <div className="home-contact__email-wrap">
              <span>ili nam piši na e-mail</span>
              <a className="home-contact__email" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
            </div>
          </div>
        </div>

        <div className="home-contact__form-side">
          <form className="home-contact__form" onSubmit={handleSubmit} ref={formRef}>
            <p className="home-contact__form-label">Kontakt forma</p>

            <label>
              <span>Ime i prezime</span>
              <input autoComplete="name" name="name" placeholder="Tvoje ime" required type="text" />
            </label>

            <label>
              <span>Email</span>
              <input autoComplete="email" name="email" placeholder="ime@email.com" required type="email" />
            </label>

            <label>
              <span>Tema</span>
              <select name="topic" onChange={(event) => setTopic(event.target.value)} value={topic}>
                <option value="Usluge">Usluge</option>
                <option value="ArtBoard">ArtBoard</option>
                <option value="Saradnja">Saradnja</option>
                <option value="Usluge i saradnje">Usluge i saradnje</option>
                <option value="ArtBoard podrška">ArtBoard podrška</option>
              </select>
            </label>

            <label>
              <span>Poruka</span>
              <textarea
                name="message"
                placeholder="Ukratko o ideji, projektu ili pitanju..."
                required
                rows={5}
              />
            </label>

            <button className="home-contact__submit" type="submit">
              Pošalji poruku <span aria-hidden="true">→</span>
            </button>

            <p className="home-contact__form-note">
              Forma priprema poruku u tvom email programu.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
