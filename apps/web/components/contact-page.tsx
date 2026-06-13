"use client";

import { useState } from "react";

type ContactFormMode = "artists" | "partners";

/**
 * The contact page keeps one shared contact card and one shared profile card,
 * while the form switches between artist and partner variants with simple tabs.
 */
export function ContactPage() {
  const [activeMode, setActiveMode] = useState<ContactFormMode>("artists");

  const isArtistMode = activeMode === "artists";
  const submitButtonClassName = isArtistMode
    ? "contact-submit-button"
    : "contact-submit-button contact-submit-button--blue";

  return (
    <section className="contact-page-frame -mx-5 -mt-8 pb-20 sm:-mx-8 sm:-mt-10 lg:-mx-10 lg:-mt-12">
      <div className="px-5 pb-14 pt-[22vh] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1040px] text-center">
          <h1 className="text-[2.85rem] font-normal leading-[0.98] tracking-[-0.05em] text-[#3b404b] sm:text-[3.65rem]">
            Imaš pitanja ili želiš saznati više
            <span className="text-[#2440d8]">?</span>
          </h1>
          <p className="text-[2.85rem] font-bold leading-[0.98] tracking-[-0.05em] text-[#1f2430] sm:text-[3.65rem]">
            Rado ćemo ti pomoći.
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-[1220px]">
          <img
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-[-5%] z-0 w-[140px] -translate-x-[42%] -translate-y-[6%] sm:w-[108px] lg:w-[140px]"
            src="https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/6855b37ce31b3240b6620975_40b669083e2135e51076d040745c7187_Contact_Yellow_Graphic.svg"
          />
          <img
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-3%] right-[-2%] z-20 w-[140px] translate-x-[18%] translate-y-[18%] sm:w-[92px] lg:w-[140px]"
            src="https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/6855b37e820bce5bb4a223d1_a70017c212edc786fd239f614d429e22_Contact_Red_Graphic.svg"
          />

          <div className="relative rounded-[34px] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(37,51,73,0.08)] sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-14">
              <div className="flex flex-col items-start justify-start space-y-7 pt-2 text-left text-[#2f3138]">
                <div>
                  <p className="text-[14px] text-[#8f97a4]">Adresa</p>
                  <p className="mt-2 text-[22px] font-medium leading-[1.28]">
                    Vuka Karadžića 29,
                    <br />
                    Podgorica,
                    <br />
                    81000 Crna Gora
                  </p>
                </div>

                <div>
                  <p className="text-[14px] text-[#8f97a4]">Kontakt za umjetnike</p>
                  <a
                    className="mt-2 inline-flex text-[22px] font-medium transition hover:text-[#dc1735]"
                    href="mailto:artboardproject2025@gmail.com"
                  >
                    artboardproject2025@gmail.com
                  </a>
                </div>

                <div>
                  <p className="text-[14px] text-[#8f97a4]">Kontakt za saradnike</p>
                  <a
                    className="mt-2 inline-flex text-[22px] font-medium transition hover:text-[#182fc7]"
                    href="mailto:medenica.ivona@yahoo.com"
                  >
                    medenica.ivona@yahoo.com
                  </a>
                </div>

                <div>
                  <p className="text-[14px] text-[#8f97a4]">Društvene mreže</p>

                  <div className="mt-2 flex flex-col gap-2 text-[22px] font-medium">
                    <SocialTextLink href="https://www.instagram.com/" label="Instagram" />
                    <SocialTextLink href="https://www.behance.net/" label="Behance" />
                    <SocialTextLink href="https://www.linkedin.com/" label="Linkedin" />
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-center">
                <div className="w-full max-w-[590px]">
                  <div className="flex items-center justify-center gap-5 border-b border-[#dde3eb] pb-5 text-center sm:gap-7">
                  <button
                    className={`contact-form-tab ${isArtistMode ? "contact-form-tab--active" : ""}`}
                    onClick={() => setActiveMode("artists")}
                    style={{ ["--tab-accent" as string]: "#dc1735" }}
                    type="button"
                  >
                    Forma za umjetnike
                  </button>

                  <span aria-hidden="true" className="h-10 w-px bg-[#d7dde6]" />

                  <button
                    className={`contact-form-tab ${!isArtistMode ? "contact-form-tab--active" : ""}`}
                    onClick={() => setActiveMode("partners")}
                    style={{ ["--tab-accent" as string]: "#182fc7" }}
                    type="button"
                  >
                    Forma za saradnike
                  </button>
                  </div>

                  <form className="mt-8 space-y-5 text-left" onSubmit={(event) => event.preventDefault()}>
                    <Field
                      label="Ime"
                      name="name"
                      placeholder={isArtistMode ? "Ime umjetnika" : "Ime saradnika"}
                    />
                    <Field
                      label="Email adresa"
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                    />
                    <Field
                      label="Poruka"
                      multiline
                      name="message"
                      placeholder={
                        isArtistMode
                          ? "Napiši nam više o svom pitanju ili prijavi."
                          : "Napiši nam više o saradnji koju imaš na umu."
                      }
                    />

                    <div className="pt-2">
                      <button className={submitButtonClassName} type="submit">
                        Pošalji
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-[1220px]">
          <section className="relative overflow-hidden rounded-[30px] bg-[#2133d3] px-6 py-8 text-white shadow-[0_22px_60px_rgba(28,45,160,0.22)] sm:px-10 sm:py-10 lg:min-h-[640px] lg:px-14 lg:py-14">
            <div className="grid gap-10 lg:min-h-[540px] lg:grid-cols-[minmax(0,1fr)_540px] lg:items-end lg:gap-4">
              <div className="relative z-10 max-w-[720px] self-center">
                <h2 className="text-[2.1rem] font-bold leading-none tracking-[-0.04em] sm:text-[2.6rem]">
                  Ivona Medenica
                </h2>

                <div className="mt-6 space-y-5 text-[18px] leading-[1.5] text-white/92 sm:text-[19px]">
                  <p>
                    Vizuelna sam umjetnica i diplomirana ekonomistkinja sa dugogodišnjim iskustvom
                    u fotografiji, videografiji, grafičkom dizajnu i digitalnom marketingu.
                    Umjetnost je oduvijek bila moj prostor slobode, mjesto na kojem istražujem,
                    bilježim i prenosim ono što osjećam i primjećujem.
                  </p>
                  <p>
                    Vjerujem u moć vizuelne komunikacije, ali i u važnost praktičnog pristupa
                    svakoj ideji koju realizujem. Upravo taj spoj me vodi kroz projekte koje
                    pokrećem, kao umjetnicu, dizajnerku i koordinatorku.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-5">
                  <IconLink href="https://www.behance.net/" label="Behance">
                    <BehanceIcon />
                  </IconLink>
                  <IconLink href="https://www.instagram.com/" label="Instagram">
                    <InstagramIcon />
                  </IconLink>
                  <IconLink href="https://www.linkedin.com/" label="Linkedin">
                    <LinkedinIcon />
                  </IconLink>
                </div>

                <a
                  className="mt-5 inline-flex text-[22px] font-medium text-white transition hover:text-[#ffc41d]"
                  href="mailto:medenica.ivona@yahoo.com"
                >
                  medenica.ivona@yahoo.com
                </a>
              </div>

              <div className="relative mx-auto flex w-full max-w-[440px] items-end justify-center lg:max-w-none lg:justify-end">
                <div className="pointer-events-none absolute left-[2%] top-[16%] h-8 w-8 rounded-full border-[3px] border-[#ffc41d]" />
                <div className="pointer-events-none absolute left-[6%] top-[27%] h-16 w-16 rotate-[14deg] border-t-[4px] border-[#ffc41d]" />
                <div className="pointer-events-none absolute right-[12%] top-[7%] h-10 w-16 rotate-[8deg] border-t-[4px] border-[#ffc41d]" />
                <div className="pointer-events-none absolute right-[6%] top-[20%] h-12 w-12 rounded-full border-[3px] border-[#ffc41d]" />
                <div className="pointer-events-none absolute left-[28%] top-[4%] text-[72px] font-bold leading-none text-[#ffc41d]">
                  ★
                </div>

                <img
                  alt="Ivona Medenica"
                  className="relative z-10 w-full max-w-[520px] translate-y-6 object-contain lg:max-w-[560px] lg:translate-y-10"
                  src="https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/686d18c9a743949e2f9f0792_about--tim-card-_0002_Ivona-Medenica.webp"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

interface FieldProps {
  label: string;
  multiline?: boolean;
  name: string;
  placeholder?: string;
  type?: string;
}

function Field({ label, multiline = false, name, placeholder, type = "text" }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-medium text-[#7f8794]">{label}</span>
      {multiline ? (
        <textarea
          className="contact-form-input min-h-[170px] resize-y px-5 py-4"
          name={name}
          placeholder={placeholder}
        />
      ) : (
        <input
          className="contact-form-input h-[58px] px-5"
          name={name}
          placeholder={placeholder}
          type={type}
        />
      )}
    </label>
  );
}

function SocialTextLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      className="inline-flex w-fit items-center gap-2 transition hover:translate-x-1 hover:text-[#182fc7]"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <span>{label}</span>
      <span aria-hidden="true" className="inline-flex h-[18px] w-[18px]">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 12L12 4M6 4H12V10"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </span>
    </a>
  );
}

function IconLink({
  children,
  href,
  label,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <a
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center text-white transition duration-300 hover:-translate-y-1 hover:scale-110 hover:text-[#ffc41d]"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

function InstagramIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" className="h-9 w-9">
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" />
    </svg>
  );
}

function BehanceIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" className="h-9 w-9">
      <path
        d="M4 6.2H10.7C13.3 6.2 14.7 7.35 14.7 9.35C14.7 10.8 13.9 11.78 12.55 12.12C14.2 12.38 15.2 13.5 15.2 15.25C15.2 17.7 13.45 19 10.4 19H4V6.2ZM9.95 11.1C11.35 11.1 12.1 10.55 12.1 9.5C12.1 8.45 11.35 7.95 9.95 7.95H6.55V11.1H9.95ZM10.2 17.2C11.85 17.2 12.75 16.55 12.75 15.25C12.75 13.95 11.85 13.25 10.2 13.25H6.55V17.2H10.2Z"
        fill="currentColor"
      />
      <path d="M17.2 6.5H22" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" className="h-9 w-9">
      <path d="M7.2 9.2H4.2V19.2H7.2V9.2Z" fill="currentColor" />
      <path d="M5.7 7.8C6.65 7.8 7.45 7 7.45 6.05C7.45 5.1 6.65 4.3 5.7 4.3C4.75 4.3 3.95 5.1 3.95 6.05C3.95 7 4.75 7.8 5.7 7.8Z" fill="currentColor" />
      <path
        d="M10 9.2H12.9V10.55H12.95C13.35 9.8 14.35 9 15.9 9C19.1 9 19.7 11.05 19.7 13.7V19.2H16.7V14.35C16.7 13.2 16.7 11.75 15.15 11.75C13.55 11.75 13.3 13 13.3 14.25V19.2H10V9.2Z"
        fill="currentColor"
      />
    </svg>
  );
}
