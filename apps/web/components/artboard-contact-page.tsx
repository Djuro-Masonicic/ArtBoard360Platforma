"use client";

import { ArrowRight, BriefcaseBusiness, CircleHelp } from "lucide-react";
import { FormEvent, useRef, useState } from "react";

import styles from "./artboard-contact-page.module.css";

type Topic = "services" | "support" | "other";

const topics: Array<{ id: Topic; label: string }> = [
  { id: "services", label: "Usluge" },
  { id: "support", label: "Podrška" },
  { id: "other", label: "Ostalo" },
];

const topicSubjects: Record<Topic, string> = {
  services: "Upit za usluge i saradnju",
  support: "ArtBoard podrška",
  other: "ArtBoard kontakt upit",
};

export function ArtBoardContactPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [topic, setTopic] = useState<Topic>("support");
  const [submitted, setSubmitted] = useState(false);

  function chooseTopic(nextTopic: Topic) {
    setTopic(nextTopic);
    setSubmitted(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const body = [`Ime i prezime: ${name}`, `Email: ${email}`, `Tema: ${topicSubjects[topic]}`, "", message].join("\n");

    setSubmitted(true);
    window.location.href = `mailto:info@artstudio360.me?subject=${encodeURIComponent(topicSubjects[topic])}&body=${encodeURIComponent(body)}`;
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <section className={`${styles.wrap} ${styles.contactLayout}`}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}><i />Javi nam se</p>
          <h1>Imaš ideju<br />ili pitanje? <span>Piši nam.</span></h1>
          <p className={styles.lead}>Bilo da tražiš kreativnog partnera za novi projekat ili ti je potrebna podrška vezana za ArtBoard platformu, javi nam se putem kontakt forme ili nam piši na email.</p>

          <div className={styles.contactChoices}>
            <button className={topic === "services" ? styles.selectedService : ""} onClick={() => chooseTopic("services")} type="button">
              <span className={styles.serviceIcon}><BriefcaseBusiness size={21} /></span>
              <span><small>Usluge i saradnje</small><strong>Projekat na kojem želiš da radimo zajedno</strong></span>
              <ArrowRight size={20} />
            </button>
            <button className={topic === "support" ? styles.selectedSupport : ""} onClick={() => chooseTopic("support")} type="button">
              <span className={styles.supportIcon}><CircleHelp size={21} /></span>
              <span><small>ArtBoard podrška</small><strong>Pitanje o profilu, alatima ili platformi</strong></span>
              <ArrowRight size={20} />
            </button>
          </div>

          <div className={styles.directContact}>
            <small>Ili direktno</small>
            <a href="mailto:info@artstudio360.me">info@artstudio360.me</a>
          </div>
        </div>

        <div className={styles.formCard}>
          <form onSubmit={submitContact} ref={formRef}>
            <p className={styles.formEyebrow}>Kontakt forma</p>
            <label>
              <span>Ime i prezime</span>
              <input autoComplete="name" name="name" placeholder="Tvoje ime" required />
            </label>
            <label>
              <span>Email</span>
              <input autoComplete="email" name="email" placeholder="ime@email.com" required type="email" />
            </label>
            <fieldset>
              <legend>Tema</legend>
              <div className={styles.topicButtons}>
                {topics.map((item) => (
                  <button className={topic === item.id ? styles[item.id] : ""} key={item.id} onClick={() => setTopic(item.id)} type="button">
                    <i />{item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              <span>Poruka</span>
              <textarea name="message" placeholder="Ukratko o ideji, projektu ili pitanju..." required rows={6} />
            </label>
            <button className={styles.submitButton} type="submit">Pošalji poruku <ArrowRight size={17} /></button>
            <p className={styles.formNote}>{submitted ? "Otvaramo tvoju email aplikaciju sa pripremljenom porukom." : "Odgovaramo direktno na email koji ostaviš u formi."}</p>
          </form>
        </div>
      </section>

    </main>
  );
}
