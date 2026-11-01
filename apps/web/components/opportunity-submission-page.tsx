"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Upload } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import {
  OpportunityApplicationMethod,
  OpportunityOrganizerType,
  OpportunityType,
  submitPublicOpportunity,
} from "@/services/opportunities";

import { OpportunityDetailsFields, initialOpportunityDetails, opportunityDetailsPayload, type OpportunityDetailsFormValue } from "./opportunity-details-fields";
import { compensationKindLabels, money } from "@/lib/opportunity-presentation";

import styles from "./opportunity-submission-page.module.css";

const opportunityTypes = [
  "Posao",
  "Izložba",
  "Honorarni angažman",
  "Konkurs",
  "Saradnja",
  "Rezidencija",
  "Grant",
  "Stipendija",
  "Radionica / edukacija",
] as const;

const organizerTypes = [
  "Fizičko lice",
  "Neformalna grupa",
  "NVO / udruženje",
  "Preduzetnik",
  "Kompanija",
  "Institucija",
  "Obrazovna ustanova",
] as const;

const opportunityTypeValues: Record<(typeof opportunityTypes)[number], OpportunityType> = {
  "Posao": "JOB",
  "Izložba": "EXHIBITION",
  "Honorarni angažman": "FREELANCE",
  "Konkurs": "OPEN_CALL",
  "Saradnja": "COLLABORATION",
  "Rezidencija": "RESIDENCY",
  "Grant": "GRANT",
  "Stipendija": "SCHOLARSHIP",
  "Radionica / edukacija": "WORKSHOP",
};

const organizerTypeValues: Record<(typeof organizerTypes)[number], OpportunityOrganizerType> = {
  "Fizičko lice": "INDIVIDUAL",
  "Neformalna grupa": "INFORMAL_GROUP",
  "NVO / udruženje": "NGO",
  "Preduzetnik": "ENTREPRENEUR",
  "Kompanija": "COMPANY",
  "Institucija": "INSTITUTION",
  "Obrazovna ustanova": "EDUCATIONAL_INSTITUTION",
};

const countries = [
  ["", "Izaberi državu"],
  ["ME", "Crna Gora"],
  ["RS", "Srbija"],
  ["HR", "Hrvatska"],
  ["BA", "Bosna i Hercegovina"],
  ["MK", "Sjeverna Makedonija"],
  ["SI", "Slovenija"],
  ["XK", "Kosovo"],
  ["AL", "Albanija"],
  ["REG", "Online · cijeli region"],
  ["OTHER", "Druga država"],
] as const;

type ApplyMode = "email" | "link";
type FormValues = {
  title: string;
  type: string;
  description: string;
  conditions: string;
  payment: string;
  country: string;
  city: string;
  deadline: string;
  openEnded: boolean;
  applyMode: ApplyMode;
  applyValue: string;
  extra: string;
  organizerName: string;
  contactEmail: string;
  organizerType: string;
  consent: boolean;
};

const initialValues: FormValues = {
  title: "",
  type: "",
  description: "",
  conditions: "",
  payment: "",
  country: "",
  city: "",
  deadline: "",
  openEnded: false,
  applyMode: "email",
  applyValue: "",
  extra: "",
  organizerName: "",
  contactEmail: "",
  organizerType: "",
  consent: false,
};

type ErrorMap = Partial<Record<keyof FormValues | "image", string>>;

export function OpportunitySubmissionPage() {
  const [details, setDetails] = useState(() => initialOpportunityDetails());
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const previousImageUrl = useRef<string | null>(null);

  useEffect(() => () => {
    if (previousImageUrl.current) URL.revokeObjectURL(previousImageUrl.current);
  }, []);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function selectImage(file: File | undefined) {
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({ ...current, image: "Dodaj JPG, PNG ili WEBP sliku do 5 MB." }));
      return;
    }
    if (previousImageUrl.current) URL.revokeObjectURL(previousImageUrl.current);
    const nextUrl = URL.createObjectURL(file);
    previousImageUrl.current = nextUrl;
    setImageUrl(nextUrl);
    setImageName(file.name);
    setImageFile(file);
    setErrors((current) => ({ ...current, image: undefined }));
  }

  function validate() {
    const next: ErrorMap = {};
    if (values.title.trim().length < 10) next.title = "Naziv je prekratak. Opiši priliku u nekoliko riječi.";
    if (!values.type) next.type = "Izaberi vrstu prilike.";
    if (!values.description.trim()) next.description = "Opiši priliku.";
    if (!values.conditions.trim()) next.conditions = "Navedi uslove i kriterijume.";
    if (!values.country) next.country = "Izaberi državu.";
    if (!values.city.trim()) next.city = "Unesi grad, lokaciju ili Online.";
    if (!values.openEnded && !values.deadline) next.deadline = "Izaberi rok ili označi da je poziv otvoren.";
    if (!values.applyValue.trim()) next.applyValue = values.applyMode === "email" ? "Unesi e-mail za prijave." : "Unesi link za prijave.";
    if (values.applyMode === "email" && values.applyValue && !/^\S+@\S+\.\S+$/.test(values.applyValue)) next.applyValue = "Unesi ispravnu e-mail adresu.";
    if (values.applyMode === "link" && values.applyValue && !/^https?:\/\//i.test(values.applyValue)) next.applyValue = "Link treba da počinje sa http:// ili https://.";
    if (!values.organizerName.trim()) next.organizerName = "Unesi ime ili naziv organizatora.";
    if (!/^\S+@\S+\.\S+$/.test(values.contactEmail)) next.contactEmail = "Unesi ispravnu kontakt e-mail adresu.";
    if (!values.organizerType) next.organizerType = "Izaberi tip organizatora.";
    if (!values.consent) next.consent = "Potvrdi tačnost podataka i prihvati pravila.";
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-field-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }

    const type = opportunityTypeValues[values.type as keyof typeof opportunityTypeValues];
    const organizerType = organizerTypeValues[values.organizerType as keyof typeof organizerTypeValues];
    if (!type || !organizerType) return;

    const formData = new FormData();
    formData.set("title", values.title.trim());
    formData.set("type", type);
    formData.set("description", values.description.trim());
    formData.set("conditions", values.conditions.trim());
    formData.set("compensation", values.payment.trim());
    formData.set("countryCode", values.country);
    formData.set("city", values.city.trim());
    if (values.deadline) formData.set("deadlineAt", values.deadline);
    formData.set("isOpenEnded", String(values.openEnded));
    formData.set("applicationMethod", values.applyMode.toUpperCase() as OpportunityApplicationMethod);
    formData.set("applyValue", values.applyValue.trim());
    formData.set("additionalInformation", values.extra.trim());
    formData.set("organizerName", values.organizerName.trim());
    formData.set("contactEmail", values.contactEmail.trim());
    formData.set("organizerType", organizerType);
    formData.set("consent", String(values.consent));
    for (const [key, value] of Object.entries(opportunityDetailsPayload(details))) {
      if (value !== null && value !== undefined) formData.set(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
    }
    if (imageFile) formData.set("coverImage", imageFile, imageFile.name);

    setIsSubmitting(true);
    try {
      await submitPublicOpportunity(formData);
      setSubmitted(true);
      window.requestAnimationFrame(() => document.querySelector("#forma")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Oglas nije mogao biti poslat.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    if (previousImageUrl.current) URL.revokeObjectURL(previousImageUrl.current);
    previousImageUrl.current = null;
    setImageUrl(null);
    setImageName("");
    setImageFile(null);
    setErrors({});
    setSubmitError("");
    setValues(initialValues);
    setDetails(initialOpportunityDetails());
    setSubmitted(false);
  }

  const countryName = countries.find(([code]) => code === values.country)?.[1] ?? "";
  const previewLocation = values.city.trim() || (values.country === "REG" ? "Online" : countryName);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Link className={styles.backLink} href="/oglasi"><ArrowLeft size={14} />Oglasna tabla</Link>
          <h1>Objavi oglas <span>besplatno.</span></h1>
          <p>Predstavi konkurs, posao, rezidenciju ili saradnju umjetnicima iz regiona. Popuni kratku formu, a nakon provjere oglas postaje dostupan na Oglasnoj tabli.</p>
          <div className={styles.heroPoints}>
            <span><Check size={14} />Besplatno</span>
            <span><Check size={14} />Bez naloga</span>
            <span><Check size={14} />Provjera prije objave</span>
          </div>
        </div>
      </section>

      <section className={styles.formSection} id="forma">
        <div className={styles.formGrid}>
          <div className={styles.formCard}>
            {submitted ? (
              <SuccessState onReset={reset} />
            ) : (
              <form noValidate onSubmit={submit}>
                <FormSection description="Šta nudiš i kome je namijenjeno." number="01" title="Prilika">
                  <Field error={errors.title} label="Naziv oglasa" required>
                    <input className={fieldClass(errors.title)} onChange={(event) => update("title", event.target.value)} placeholder="npr. Poziv za ilustratore dječje knjige" value={values.title} />
                  </Field>

                  <ChoiceField error={errors.type} label="Vrsta prilike">
                    {opportunityTypes.map((item) => <ChoiceButton active={values.type === item} key={item} onClick={() => update("type", item)}>{item}</ChoiceButton>)}
                  </ChoiceField>

                  <Field error={errors.description} label="Opis prilike" required>
                    <textarea className={fieldClass(errors.description)} onChange={(event) => update("description", event.target.value)} placeholder="Šta nudiš, kome je poziv namijenjen i šta umjetnik dobija." rows={5} value={values.description} />
                  </Field>

                  <Field error={errors.conditions} label="Uslovi i kriterijumi" required>
                    <textarea className={fieldClass(errors.conditions)} onChange={(event) => update("conditions", event.target.value)} placeholder="Ko može da se prijavi i šta treba poslati: portfolio, CV, skice, motivaciono pismo…" rows={4} value={values.conditions} />
                  </Field>

                  <div className={styles.twoColumns}>
                    <Field help="Volonterski pozivi su dozvoljeni ako je jasno navedeno da su bez honorara. Oglasi koji traže besplatan rad „za vidljivost” nijesu dozvoljeni." label="Naknada / honorar" optional>
                      <input onChange={(event) => update("payment", event.target.value)} placeholder="npr. 800 €, nagrada, stipendija ili bez honorara" value={values.payment} />
                    </Field>
                    <div className={styles.field} data-field-error={Boolean(errors.image)}>
                      <span className={styles.label}>Fotografija ili vizual <small>· opciono</small></span>
                      <label className={`${styles.fileInput} ${errors.image ? styles.invalid : ""}`}>
                        <Upload size={18} />
                        <b>{imageName || "Dodaj sliku"}</b>
                        <span>{imageName ? "· promijeni sliku" : "· JPG, PNG ili WEBP, do 5 MB"}</span>
                        <input accept="image/jpeg,image/png,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} type="file" />
                      </label>
                      {errors.image ? <ErrorText>{errors.image}</ErrorText> : <span className={styles.help}>Prikazuje se kao naslovna slika oglasa.</span>}
                    </div>
                  </div>
                </FormSection>

                <Divider />

                <FormSection description="Gdje se prilika odvija i kako se umjetnici prijavljuju." number="02" title="Rok, mjesto i prijava">
                  <div className={styles.twoColumns}>
                    <Field error={errors.country} label="Država" required>
                      <select className={fieldClass(errors.country)} onChange={(event) => update("country", event.target.value)} value={values.country}>
                        {countries.map(([code, name]) => <option key={code || "empty"} value={code}>{name}</option>)}
                      </select>
                    </Field>
                    <Field error={errors.city} label="Grad ili lokacija" required>
                      <input className={fieldClass(errors.city)} onChange={(event) => update("city", event.target.value)} placeholder="npr. Podgorica ili Online" value={values.city} />
                    </Field>
                  </div>

                  <div className={styles.twoColumns}>
                    <div className={styles.field} data-field-error={Boolean(errors.deadline)}>
                      <span className={styles.label}>Rok za prijavu <Required /></span>
                      <input className={fieldClass(errors.deadline)} disabled={values.openEnded} onChange={(event) => update("deadline", event.target.value)} type="date" value={values.deadline} />
                      <label className={styles.checkRow}><input checked={values.openEnded} onChange={(event) => { update("openEnded", event.target.checked); setErrors((current) => ({ ...current, deadline: undefined })); }} type="checkbox" />Otvoreno do popunjavanja</label>
                      {errors.deadline ? <ErrorText>{errors.deadline}</ErrorText> : null}
                    </div>
                  </div>

                  <div className={styles.field} data-field-error={Boolean(errors.applyValue)}>
                    <span className={styles.label}>Način prijavljivanja <Required /></span>
                    <div className={styles.applyRow}>
                      <div className={styles.segmented} role="radiogroup">
                        <button aria-checked={values.applyMode === "email"} className={values.applyMode === "email" ? styles.segmentActive : ""} onClick={() => { update("applyMode", "email"); update("applyValue", ""); }} role="radio" type="button">E-mail</button>
                        <button aria-checked={values.applyMode === "link"} className={values.applyMode === "link" ? styles.segmentActive : ""} onClick={() => { update("applyMode", "link"); update("applyValue", ""); }} role="radio" type="button">Link</button>
                      </div>
                      <input aria-label={values.applyMode === "email" ? "E-mail za prijave" : "Link za prijave"} className={fieldClass(errors.applyValue)} onChange={(event) => update("applyValue", event.target.value)} placeholder={values.applyMode === "email" ? "prijave@primjer.me" : "https://primjer.me/prijava"} type={values.applyMode === "email" ? "email" : "url"} value={values.applyValue} />
                    </div>
                    {errors.applyValue ? <ErrorText>{errors.applyValue}</ErrorText> : <span className={styles.help}>Umjetnici se prijavljuju direktno tebi, na ovaj e-mail ili link. ArtBoard ne prikuplja prijave.</span>}
                  </div>

                  <details className={styles.additionalDetails}>
                    <summary>Dodatni podaci za umjetnike <span>Discipline, naknada, jezici i dokumenta</span></summary>
                    <OpportunityDetailsFields value={details} onChange={setDetails} />
                  </details>

                  <Field label="Dodatne informacije" optional>
                    <textarea onChange={(event) => update("extra", event.target.value)} placeholder="Važni datumi, linkovi, dokumentacija ili napomene za umjetnike." rows={3} value={values.extra} />
                  </Field>
                </FormSection>

                <Divider />

                <FormSection description="Ko objavljuje oglas i kako da te kontaktiramo." number="03" title="Organizator">
                  <div className={styles.twoColumns}>
                    <Field error={errors.organizerName} label="Ime ili naziv organizatora" required>
                      <input className={fieldClass(errors.organizerName)} onChange={(event) => update("organizerName", event.target.value)} placeholder="npr. Galerija Kvadrat ili Ana Petrović" value={values.organizerName} />
                    </Field>
                    <Field error={errors.contactEmail} help="Ne prikazuje se javno. Na ovu adresu šaljemo potvrdu i obavještenje o objavi." label="Kontakt e-mail" required>
                      <input className={fieldClass(errors.contactEmail)} onChange={(event) => update("contactEmail", event.target.value)} placeholder="ime@primjer.me" type="email" value={values.contactEmail} />
                    </Field>
                  </div>

                  <ChoiceField error={errors.organizerType} help="Oglas može objaviti svako: pojedinac, grupa ili organizacija." label="Tip organizatora">
                    {organizerTypes.map((item) => <ChoiceButton active={values.organizerType === item} key={item} onClick={() => update("organizerType", item)}>{item}</ChoiceButton>)}
                  </ChoiceField>
                </FormSection>

                <div className={styles.submitArea}>
                  <div className={styles.consent} data-field-error={Boolean(errors.consent)}>
                    <label><input checked={values.consent} onChange={(event) => update("consent", event.target.checked)} type="checkbox" /><span>Podaci u oglasu su tačni i prihvatam <Link href="/uslovi-koriscenja">Uslove korišćenja</Link> i <Link href="/uslovi-koriscenja#privatnost">Politiku privatnosti</Link>. <Required /></span></label>
                    {errors.consent ? <ErrorText>{errors.consent}</ErrorText> : null}
                  </div>
                  {submitError ? <div className={styles.submitError} role="alert">{submitError}</div> : null}
                  <div className={styles.submitRow}>
                    <button className={styles.submitButton} disabled={isSubmitting} type="submit">
                      {isSubmitting ? "Šaljem oglas..." : "Pošalji oglas na provjeru"} <ArrowRight size={14} />
                    </button>
                    <span>Objava je besplatna. Oglas se pojavljuje na tabli nakon što ga ArtBoard tim odobri.</span>
                  </div>
                </div>
              </form>
            )}
          </div>

          <PreviewAside details={details} imageUrl={imageUrl} location={previewLocation} values={values} />
        </div>
      </section>
    </div>
  );
}

function FormSection({ children, description, number, title }: { children: React.ReactNode; description: string; number: string; title: string }) {
  return <section className={styles.formBlock}><div className={styles.formHeading}><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></div>{children}</section>;
}

function Field({ children, error, help, label, optional, required }: { children: React.ReactNode; error?: string; help?: string; label: string; optional?: boolean; required?: boolean }) {
  return <label className={styles.field} data-field-error={Boolean(error)}><span className={styles.label}>{label} {required ? <Required /> : null}{optional ? <small>· opciono</small> : null}</span>{children}{error ? <ErrorText>{error}</ErrorText> : help ? <span className={styles.help}>{help}</span> : null}</label>;
}

function ChoiceField({ children, error, help, label }: { children: React.ReactNode; error?: string; help?: string; label: string }) {
  return <div className={styles.field} data-field-error={Boolean(error)}><span className={styles.label}>{label} <Required /></span><div className={styles.pills} role="radiogroup">{children}</div>{error ? <ErrorText>{error}</ErrorText> : help ? <span className={styles.help}>{help}</span> : null}</div>;
}

function ChoiceButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button aria-checked={active} className={active ? styles.pillActive : ""} onClick={onClick} role="radio" type="button">{children}</button>;
}

function Required() { return <b className={styles.required}>*</b>; }
function ErrorText({ children }: { children: React.ReactNode }) { return <span className={styles.error}><i />{children}</span>; }
function Divider() { return <div className={styles.divider} />; }
function fieldClass(error?: string) { return error ? styles.invalid : undefined; }

function formatDeadline(value: string, openEnded: boolean) {
  if (openEnded) return "Otvoreno";
  if (!value) return "Rok za prijavu";
  const [year, month, day] = value.split("-");
  return `Rok ${day}. ${month}. ${year}.`;
}

function formatPayment(value: string) {
  const payment = value.trim();
  if (!payment) return "Nije navedeno";
  return /^[0-9.,]+$/.test(payment) ? `${payment} €` : payment;
}

function PreviewAside({ details, imageUrl, location, values }: { details: OpportunityDetailsFormValue; imageUrl: string | null; location: string; values: FormValues }) {
  return <aside className={styles.aside}>
    <span className={styles.asideLabel}>Pregled oglasa</span>
    <article className={styles.previewFrame}>
      <div className={styles.previewCard}>
        <div className={`${styles.previewMedia} ${imageUrl ? styles.hasImage : ""}`}>
          {imageUrl ? <img alt="Pregled naslovne slike oglasa" src={imageUrl} /> : <span className={styles.abstractVisual} aria-hidden="true" />}
          <div className={styles.previewBadges}>
            <span className={styles.previewType}><i /><span>{values.type || "Vrsta prilike"}</span></span>
            <span className={styles.previewDeadline}>{formatDeadline(values.deadline, values.openEnded)}</span>
          </div>
        </div>
        <div className={styles.previewBody}>
          <h3 className={values.title ? "" : styles.placeholder}>{values.title || "Naziv oglasa"}</h3>
          <p>{values.organizerName || "Organizator"} · {location || "Lokacija"}</p>
          <div className={styles.previewBottom}><div><small>{details.compensationKind ? compensationKindLabels[details.compensationKind] : "Naknada"}</small><strong className={values.payment || details.compensationAmount || details.compensationKind === "NONE" ? "" : styles.placeholder}>{details.compensationKind === "NONE" ? "Bez naknade" : details.compensationAmount ? money(details.compensationAmount, details.compensationCurrency) : formatPayment(values.payment)}</strong></div><span>Prijava {values.applyMode === "email" ? "e-mailom" : "putem linka"} <ArrowRight size={11} /></span></div>
        </div>
      </div>
    </article>
    <div className={styles.afterSubmit}>
      <span>Nakon slanja</span>
      <ProcessStep number="01" title="Provjera.">ArtBoard tim pregleda oglas prije objave.</ProcessStep>
      <ProcessStep number="02" title="Objava.">Dobijaš e-mail kada oglas bude na tabli.</ProcessStep>
      <ProcessStep number="03" title="Prijave.">Umjetnici ti se javljaju na navedeni e-mail ili link.</ProcessStep>
    </div>
  </aside>;
}

function ProcessStep({ children, number, title }: { children: React.ReactNode; number: string; title: string }) {
  return <div className={styles.processStep}><span>{number}</span><p><strong>{title}</strong>{children}</p></div>;
}

function SuccessState({ onReset }: { onReset: () => void }) {
  return <div className={styles.success}>
    <span><Check size={32} /></span>
    <h2>Hvala!</h2>
    <p>Pregledaćemo tvoj oglas i javiti ti se na navedenu e-mail adresu.</p>
    <div><Link href="/oglasi">Nazad na Oglasnu tablu</Link><button onClick={onReset} type="button">Objavi još jedan oglas</button></div>
  </div>;
}
