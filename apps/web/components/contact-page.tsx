"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { contactTopics, emptyContact, validateContact, type ContactErrors, type ContactTopic, type ContactValues } from "@/lib/contact-form";
import { sendContact } from "@/services/contact";
import styles from "./contact-page.module.css";

function ContactGlyph({ kind, size = 20 }: { kind: "briefcase" | "help" | "arrow"; size?: number }) {
  const paths = {
    briefcase: "M216,64H176V56a24,24,0,0,0-24-24H104A24,24,0,0,0,80,56v8H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM96,56a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,80v41.61A184,184,0,0,1,128,144a184.07,184.07,0,0,1-88-22.38V80Zm0,120H40V139.64A200.19,200.19,0,0,0,128,160a200.25,200.25,0,0,0,88-20.37V200Z",
    help: "M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z",
    arrow: "M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z",
  };
  return <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={paths[kind]} /></svg>;
}

export function ContactPage() {
  const [topic, setTopic] = useState<ContactTopic>("services"), [values, setValues] = useState(emptyContact);
  const [errors, setErrors] = useState<ContactErrors>({}), [error, setError] = useState("");
  const [pending, setPending] = useState(false), [submitted, setSubmitted] = useState(false);
  const [successHeight, setSuccessHeight] = useState<number>();
  const formRef = useRef<HTMLFormElement>(null), cardRef = useRef<HTMLDivElement>(null), successTitle = useRef<HTMLHeadingElement>(null);
  const inflight = useRef(false), operation = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => { if (submitted) successTitle.current?.focus(); }, [submitted]);
  function update(field: keyof ContactValues, value: string) {
    setValues(current => ({ ...current, [field]: value })); setError("");
    if (field !== "website") setErrors(current => ({ ...current, [field]: undefined }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (inflight.current) return;
    const validation = validateContact(values); setErrors(validation); setError("");
    const first = Object.keys(validation)[0];
    if (first) { requestAnimationFrame(() => (formRef.current?.elements.namedItem(first) as HTMLInputElement | HTMLTextAreaElement)?.focus()); return; }
    const clean = { fullName: values.fullName.trim(), email: values.email.trim(), message: values.message.trim(), website: values.website.trim() };
    const signature = JSON.stringify({ ...clean, topic });
    if (!operation.current || operation.current.signature !== signature) operation.current = { signature, key: crypto.randomUUID() };
    inflight.current = true; setPending(true); setSuccessHeight(cardRef.current?.getBoundingClientRect().height);
    try { await sendContact(clean, topic, operation.current.key); setSubmitted(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Poruka trenutno nije mogla biti poslata. Pokušaj ponovo."); }
    finally { inflight.current = false; setPending(false); }
  }
  function reset() {
    setValues(emptyContact()); setTopic("services"); setErrors({}); setError(""); setSubmitted(false); setSuccessHeight(undefined); operation.current = null;
    requestAnimationFrame(() => (formRef.current?.elements.namedItem("fullName") as HTMLInputElement)?.focus());
  }
  return <div className={styles.frame}><section className={styles.page} aria-labelledby="contact-title" data-contact-page="">
    <div className={styles.intro}>
      <h1 id="contact-title">Imaš ideju ili pitanje? <span>Piši nam.</span></h1>
      <p className={styles.lead}>Bilo da tražiš kreativnog partnera za novi projekat ili ti je potrebna podrška vezana za ArtBoard platformu, javi nam se putem kontakt forme ili nam piši na e-mail.</p>
      <div className={styles.contactChoices} aria-label="Vrsta upita">
        <button type="button" aria-pressed={topic === "services"} disabled={pending} className={topic === "services" ? styles.selectedService : ""} onClick={() => setTopic("services")}>
          <span className={styles.serviceIcon}><ContactGlyph kind="briefcase" /></span><span className={styles.choiceCopy}><span className={styles.serviceLabel}>Usluge i saradnje</span><strong>Projekat na kojem želiš da radimo zajedno</strong></span><ContactGlyph kind="arrow" size={18} />
        </button>
        <button type="button" aria-pressed={topic === "support"} disabled={pending} className={topic === "support" ? styles.selectedSupport : ""} onClick={() => setTopic("support")}>
          <span className={styles.supportIcon}><ContactGlyph kind="help" /></span><span className={styles.choiceCopy}><span className={styles.supportLabel}>ArtBoard podrška</span><strong>Pitanje o profilu, alatima ili platformi</strong></span><ContactGlyph kind="arrow" size={18} />
        </button>
      </div>
      <div className={styles.directContact}><span>Ili direktno</span><a href="mailto:info@artstudio360.me">info@artstudio360.me</a></div>
    </div>
    <div className={styles.formCard + (submitted ? " " + styles.successCard : "")} ref={cardRef} style={submitted ? { minHeight: successHeight } : undefined} data-contact-card="">
      {submitted ? <section className={styles.success} aria-live="polite" role="status" aria-labelledby="contact-success-title">
        <span className={styles.successIcon} aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6" /></svg></span>
        <h2 ref={successTitle} tabIndex={-1} id="contact-success-title">Hvala, prijatelju!</h2>
        <p>Poruka je stigla. Javićemo ti se na u najkraćem roku.</p>
        <button className={styles.newMessage} type="button" onClick={reset}>Nova poruka</button>
      </section> : <form ref={formRef} onSubmit={submit} noValidate aria-label="Kontakt forma" aria-busy={pending}>
        <div className={styles.formEyebrow}>Kontakt forma</div>
        <label htmlFor="contact-name"><span>Ime i prezime</span><input id="contact-name" name="fullName" autoComplete="name" placeholder="Tvoje ime" required maxLength={240} value={values.fullName} disabled={pending} onChange={e => update("fullName", e.target.value)} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "contact-name-error" : undefined} />{errors.fullName ? <span className={styles.fieldError} id="contact-name-error">{errors.fullName}</span> : null}</label>
        <label htmlFor="contact-email"><span>E-mail</span><input id="contact-email" type="email" name="email" autoComplete="email" placeholder="ime@email.com" required maxLength={254} value={values.email} disabled={pending} onChange={e => update("email", e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "contact-email-error" : undefined} />{errors.email ? <span className={styles.fieldError} id="contact-email-error">{errors.email}</span> : null}</label>
        <div className={styles.topicField}><span id="contact-topic-label">Tema</span><div className={styles.topicButtons} role="group" aria-labelledby="contact-topic-label">{contactTopics.map(item => <button key={item.id} type="button" disabled={pending} aria-pressed={topic === item.id} className={topic === item.id ? styles[item.id] : ""} onClick={() => setTopic(item.id)}>{item.label}</button>)}</div></div>
        <label htmlFor="contact-message"><span>Poruka</span><textarea id="contact-message" name="message" rows={5} placeholder="Ukratko o ideji, projektu ili pitanju…" required maxLength={10000} value={values.message} disabled={pending} onChange={e => update("message", e.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "contact-message-error" : undefined} />{errors.message ? <span className={styles.fieldError} id="contact-message-error">{errors.message}</span> : null}</label>
        <div className={styles.honeypot} aria-hidden="true"><label htmlFor="contact-website">Website<input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={e => update("website", e.target.value)} /></label></div>
        <div className={styles.submitRow}><button className={styles.submitButton} type="submit" disabled={pending}>{pending ? "Šaljemo…" : "Pošalji poruku"}<span><ContactGlyph kind="arrow" size={14} /></span></button><p className={styles.formNote}>{pending ? "Poruka se šalje…" : "Odgovaramo direktno na e-mail koji ostaviš u formi."}</p></div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </form>}
    </div>
  </section></div>;
}
