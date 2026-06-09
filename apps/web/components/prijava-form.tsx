"use client";

import { startTransition, useMemo, useState } from "react";

import { ApiError } from "@/services/api";
import { submitArtistSubmission } from "@/services/artist-submissions";

interface DisciplineOption {
  id: string;
  name: string;
  slug: string;
}

interface PrijavaFormProps {
  disciplines: DisciplineOption[];
}

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  biography: string;
  motto: string;
  blogUrl: string;
  notes: string;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type StepDefinition = {
  title: string;
  eyebrow: string;
  description: string;
};

const emptyPortfolioLink = "";
const emptySocialLink = "";

const steps: StepDefinition[] = [
  {
    eyebrow: "Korak 1",
    title: "Osnovni podaci",
    description: "Predstavi se osnovnim informacijama kako bismo znali ko se prijavljuje.",
  },
  {
    eyebrow: "Korak 2",
    title: "Biografija i disciplina",
    description: "Opisi svoj rad i izaberi do tri discipline koje te najbolje predstavljaju.",
  },
  {
    eyebrow: "Korak 3",
    title: "Portfolio i mreze",
    description: "Dodaj portfolio linkove, PDF i profile na drustvenim mrezama.",
  },
  {
    eyebrow: "Korak 4",
    title: "Materijali za prijavu",
    description: "Posalji izdvojene radove i profilnu fotografiju za pregled selekcije.",
  },
  {
    eyebrow: "Korak 5",
    title: "Potvrda i slanje",
    description: "Dodaj napomene, potvrdi uslove prijave i posalji materijale.",
  },
];

const initialFormValues: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  biography: "",
  motto: "",
  blogUrl: "",
  notes: "",
};

/**
 * The submission form stays guided and animated, but it now stores all values
 * in React state so the final API submit can send one complete payload.
 */
export function PrijavaForm({ disciplines }: PrijavaFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [animationDirection, setAnimationDirection] = useState<"forward" | "backward">("forward");
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [selectedDisciplineSlugs, setSelectedDisciplineSlugs] = useState<string[]>([]);
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([emptyPortfolioLink]);
  const [socialLinks, setSocialLinks] = useState<string[]>([emptySocialLink]);
  const [portfolioPdfFile, setPortfolioPdfFile] = useState<File | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [artworkFiles, setArtworkFiles] = useState<File[]>([]);
  const [confirmedRules, setConfirmedRules] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const artworkCountMessage = useMemo(() => {
    if (artworkFiles.length === 0) {
      return "Odaberite izmedju 6 i 25 JPG radova.";
    }

    if (artworkFiles.length < 6) {
      return `Trenutno je odabrano ${artworkFiles.length} radova. Minimum je 6.`;
    }

    if (artworkFiles.length > 25) {
      return `Trenutno je odabrano ${artworkFiles.length} radova. Maksimum je 25.`;
    }

    return `Odabrano je ${artworkFiles.length} radova, sto je u dozvoljenom opsegu.`;
  }, [artworkFiles.length]);

  const fieldClassName =
    "w-full rounded-[1.4rem] border border-black/10 bg-white px-5 py-4 text-[16px] text-[#2f3138] outline-none transition focus:border-[#2440d8] focus:ring-2 focus:ring-[#2440d8]/10";
  const areaClassName = `${fieldClassName} min-h-40 resize-y`;
  const ghostButtonClassName =
    "inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-[15px] font-medium text-[#434855] transition hover:border-black/20 hover:text-[#1f2430] disabled:cursor-not-allowed disabled:opacity-45";

  function goToStep(nextStep: number) {
    if (nextStep < 0 || nextStep >= steps.length) {
      return;
    }

    setAnimationDirection(nextStep > currentStep ? "forward" : "backward");
    startTransition(() => {
      setCurrentStep(nextStep);
    });
  }

  function updateValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleDisciplineToggle(slug: string) {
    setSelectedDisciplineSlugs((current) => {
      if (current.includes(slug)) {
        return current.filter((item) => item !== slug);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, slug];
    });
  }

  function handlePortfolioLinkChange(index: number, value: string) {
    setPortfolioLinks((current) =>
      current.map((link, currentIndex) => (currentIndex === index ? value : link)),
    );
  }

  function handleSocialLinkChange(index: number, value: string) {
    setSocialLinks((current) =>
      current.map((link, currentIndex) => (currentIndex === index ? value : link)),
    );
  }

  function addPortfolioLink() {
    setPortfolioLinks((current) => [...current, emptyPortfolioLink]);
  }

  function addSocialLink() {
    setSocialLinks((current) => [...current, emptySocialLink]);
  }

  function removePortfolioLink(index: number) {
    setPortfolioLinks((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function removeSocialLink(index: number) {
    setSocialLinks((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (currentStep < steps.length - 1) {
      return;
    }

    if (!profilePhotoFile) {
      setSubmitState({ kind: "error", message: "Profilna fotografija je obavezna." });
      return;
    }

    setSubmitState({ kind: "submitting" });

    try {
      const response = await submitArtistSubmission({
        fullName: formValues.fullName.trim(),
        email: formValues.email.trim(),
        phone: formValues.phone.trim(),
        biography: formValues.biography.trim(),
        motto: formValues.motto.trim(),
        blogUrl: formValues.blogUrl.trim(),
        notes: formValues.notes.trim(),
        confirmedRules,
        disciplines: selectedDisciplineSlugs,
        portfolioLinks: portfolioLinks.map((item) => item.trim()).filter(Boolean),
        socialLinks: socialLinks.map((item) => item.trim()).filter(Boolean),
        portfolioPdf: portfolioPdfFile,
        profilePhoto: profilePhotoFile,
        featuredWorks: artworkFiles,
      });

      setSubmitState({
        kind: "success",
        message: response.message,
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Prijava trenutno ne moze da se posalje. Pokusaj ponovo.";

      setSubmitState({
        kind: "error",
        message,
      });
    }
  }

  const activeStep = steps[currentStep] ?? steps[0]!;
  const stepCardClassName = "translate-x-0 opacity-100";

  return (
    <form
      className="mx-auto max-w-[1180px] space-y-8 rounded-[2rem] bg-white/70 p-5 shadow-[0_20px_65px_rgba(29,45,83,0.08)] backdrop-blur-sm sm:p-7 lg:p-8"
      onSubmit={handleSubmit}
    >
      {submitState.kind !== "idle" ? (
        <div
          className={`rounded-[1.4rem] border px-5 py-4 text-[15px] ${
            submitState.kind === "success"
              ? "border-[#2440d8]/15 bg-[#2440d8]/6 text-[#1d34b7]"
              : submitState.kind === "error"
                ? "border-[#dc1735]/15 bg-[#dc1735]/6 text-[#b3162d]"
                : "border-black/8 bg-white text-[#4e5560]"
          }`}
        >
          {submitState.kind === "submitting" ? "Slanje prijave je u toku..." : submitState.message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
        <aside className="rounded-[2rem] bg-white p-6 shadow-[0_14px_40px_rgba(29,45,83,0.06)]">
          <p className="text-[12px] font-medium uppercase tracking-[0.32em] text-[#7b8391]">
            Prijava za ArtBoard
          </p>
          <h2 className="mt-5 text-[36px] font-bold leading-[0.96] text-[#2f3138]">
            Forma koja vodi korak po korak.
          </h2>
          <p className="mt-4 text-[18px] leading-[1.45] text-[#4e5560]">
            Umjesto dugackog formulara, prolazis kroz prijavu dio po dio. Tako je lakse da sve
            pregledas prije slanja.
          </p>

          <div className="mt-8 space-y-4">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isDone = index < currentStep;

              return (
                <button
                  key={step.title}
                  className={`flex w-full items-start gap-4 rounded-[1.4rem] border px-4 py-4 text-left transition ${
                    isActive
                      ? "border-[#2440d8]/20 bg-[#2440d8]/6"
                      : "border-black/8 bg-white hover:border-black/14"
                  }`}
                  onClick={() => goToStep(index)}
                  type="button"
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${
                      isActive
                        ? "bg-[#2440d8] text-white"
                        : isDone
                          ? "bg-[#dc1735] text-white"
                          : "bg-[#f3f5f8] text-[#667080]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-[16px] font-semibold text-[#2f3138]">{step.title}</span>
                    <span className="mt-1 block text-[14px] leading-6 text-[#6a7280]">
                      {step.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-[2rem] bg-white p-6 shadow-[0_14px_40px_rgba(29,45,83,0.06)] sm:p-7">
          <div className="mb-6 border-b border-black/8 pb-5">
            <p className="text-[12px] font-medium uppercase tracking-[0.32em] text-[#7b8391]">
              {activeStep.eyebrow}
            </p>
            <h3 className="mt-3 text-[34px] font-bold leading-[1] text-[#2f3138]">{activeStep.title}</h3>
            <p className="mt-3 max-w-2xl text-[18px] leading-[1.45] text-[#5a616d]">
              {activeStep.description}
            </p>
          </div>

          <div
            key={currentStep}
            className={`transition duration-300 ease-out ${stepCardClassName} ${
              animationDirection === "forward"
                ? "animate-[slideStepIn_320ms_ease-out]"
                : "animate-[slideStepBack_320ms_ease-out]"
            }`}
          >
            {currentStep === 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-[15px] font-semibold text-[#2f3138]" htmlFor="fullName">
                    Ime i prezime *
                  </label>
                  <input
                    className={fieldClassName}
                    id="fullName"
                    name="fullName"
                    onChange={(event) => updateValue("fullName", event.target.value)}
                    required
                    type="text"
                    value={formValues.fullName}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[15px] font-semibold text-[#2f3138]" htmlFor="email">
                    E-mail *
                  </label>
                  <input
                    className={fieldClassName}
                    id="email"
                    name="email"
                    onChange={(event) => updateValue("email", event.target.value)}
                    required
                    type="email"
                    value={formValues.email}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[15px] font-semibold text-[#2f3138]" htmlFor="phone">
                    Mobilni telefon
                  </label>
                  <input
                    className={fieldClassName}
                    id="phone"
                    name="phone"
                    onChange={(event) => updateValue("phone", event.target.value)}
                    type="tel"
                    value={formValues.phone}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[15px] font-semibold text-[#2f3138]" htmlFor="motto">
                    Moto
                  </label>
                  <input
                    className={fieldClassName}
                    id="motto"
                    name="motto"
                    onChange={(event) => updateValue("motto", event.target.value)}
                    type="text"
                    value={formValues.motto}
                  />
                </div>
              </div>
            ) : null}

            {currentStep === 1 ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[15px] font-semibold text-[#2f3138]" htmlFor="biography">
                    Kratka biografija *
                  </label>
                  <textarea
                    className={areaClassName}
                    id="biography"
                    name="biography"
                    onChange={(event) => updateValue("biography", event.target.value)}
                    required
                    value={formValues.biography}
                  />
                </div>

                <div className="rounded-[1.5rem] border border-black/8 bg-[#f8fbff] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-[18px] font-semibold text-[#2f3138]">Disciplina *</h4>
                    <span className="rounded-full bg-white px-3 py-1 text-[14px] text-[#657080]">
                      {selectedDisciplineSlugs.length}/3
                    </span>
                  </div>
                  <p className="mt-3 text-[15px] leading-7 text-[#5b6472]">
                    Izaberi do tri discipline koje najbolje opisuju tvoj rad.
                  </p>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {disciplines.map((discipline) => {
                      const isChecked = selectedDisciplineSlugs.includes(discipline.slug);
                      const disableUnchecked = !isChecked && selectedDisciplineSlugs.length >= 3;

                      return (
                        <label
                          key={discipline.id}
                          className={`flex items-start gap-3 rounded-[1.2rem] border p-4 text-[15px] transition ${
                            isChecked
                              ? "border-[#2440d8]/25 bg-[#2440d8]/6 text-[#2f3138]"
                              : "border-black/8 bg-white text-[#555e6c] hover:border-black/14"
                          }`}
                        >
                          <input
                            checked={isChecked}
                            disabled={disableUnchecked}
                            name="disciplines"
                            onChange={() => handleDisciplineToggle(discipline.slug)}
                            type="checkbox"
                            value={discipline.slug}
                          />
                          <span>{discipline.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="space-y-6">
                <div className="rounded-[1.5rem] border border-black/8 bg-[#f8fbff] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-[18px] font-semibold text-[#2f3138]">Portfolio linkovi</h4>
                    <button className={ghostButtonClassName} onClick={addPortfolioLink} type="button">
                      Dodaj link
                    </button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {portfolioLinks.map((link, index) => (
                      <div key={`portfolio-link-${index}`} className="flex flex-col gap-3 sm:flex-row">
                        <input
                          className={fieldClassName}
                          name={`portfolioLinks.${index}`}
                          onChange={(event) => handlePortfolioLinkChange(index, event.target.value)}
                          placeholder="https://..."
                          type="url"
                          value={link}
                        />

                        {portfolioLinks.length > 1 ? (
                          <button
                            className={ghostButtonClassName}
                            onClick={() => removePortfolioLink(index)}
                            type="button"
                          >
                            Ukloni
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2 rounded-[1.5rem] border border-black/8 bg-[#f8fbff] p-5">
                    <label className="block text-[15px] font-semibold text-[#2f3138]" htmlFor="portfolioPdf">
                      Portfolio PDF
                    </label>
                    <input
                      accept="application/pdf"
                      className="block w-full text-[15px] text-[#5d6572]"
                      id="portfolioPdf"
                      name="portfolioPdf"
                      onChange={(event) => setPortfolioPdfFile(event.target.files?.[0] ?? null)}
                      type="file"
                    />
                    <p className="text-[14px] text-[#7a8391]">
                      {portfolioPdfFile?.name || "Jos nije odabran PDF dokument."}
                    </p>
                  </div>

                  <div className="space-y-2 rounded-[1.5rem] border border-black/8 bg-[#f8fbff] p-5">
                    <label className="block text-[15px] font-semibold text-[#2f3138]" htmlFor="blogUrl">
                      Blog
                    </label>
                    <input
                      className={fieldClassName}
                      id="blogUrl"
                      name="blogUrl"
                      onChange={(event) => updateValue("blogUrl", event.target.value)}
                      placeholder="https://..."
                      type="url"
                      value={formValues.blogUrl}
                    />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-black/8 bg-[#f8fbff] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-[18px] font-semibold text-[#2f3138]">Drustvene mreze *</h4>
                    <button className={ghostButtonClassName} onClick={addSocialLink} type="button">
                      Dodaj mrezu
                    </button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {socialLinks.map((link, index) => (
                      <div key={`social-link-${index}`} className="flex flex-col gap-3 sm:flex-row">
                        <input
                          className={fieldClassName}
                          name={`socialLinks.${index}`}
                          onChange={(event) => handleSocialLinkChange(index, event.target.value)}
                          placeholder="https://instagram.com/..."
                          required={index === 0}
                          type="url"
                          value={link}
                        />

                        {socialLinks.length > 1 ? (
                          <button
                            className={ghostButtonClassName}
                            onClick={() => removeSocialLink(index)}
                            type="button"
                          >
                            Ukloni
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-black/8 bg-[#f8fbff] p-5">
                  <label className="block text-[15px] font-semibold text-[#2f3138]" htmlFor="featuredWorks">
                    Izdvojeni radovi *
                  </label>
                  <p className="mt-2 text-[15px] leading-7 text-[#5b6472]">
                    Posalji izmedju 6 i 25 reprezentativnih JPG radova.
                  </p>
                  <input
                    accept=".jpg,.jpeg,image/jpeg"
                    className="mt-4 block w-full text-[15px] text-[#5d6572]"
                    id="featuredWorks"
                    multiple
                    name="featuredWorks"
                    onChange={(event) => setArtworkFiles(Array.from(event.target.files ?? []))}
                    required
                    type="file"
                  />
                  <p className="mt-3 text-[14px] text-[#5b6472]">{artworkCountMessage}</p>
                  {artworkFiles.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-[14px] text-[#7a8391]">
                      {artworkFiles.map((file) => (
                        <li key={`${file.name}-${file.size}`}>{file.name}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="rounded-[1.5rem] border border-black/8 bg-[#f8fbff] p-5">
                  <label className="block text-[15px] font-semibold text-[#2f3138]" htmlFor="profilePhoto">
                    Profilna fotografija *
                  </label>
                  <p className="mt-2 text-[15px] leading-7 text-[#5b6472]">
                    Dodaj jednu jasnu profilnu fotografiju za predstavljanje na platformi.
                  </p>
                  <input
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="mt-4 block w-full text-[15px] text-[#5d6572]"
                    id="profilePhoto"
                    name="profilePhoto"
                    onChange={(event) => setProfilePhotoFile(event.target.files?.[0] ?? null)}
                    required
                    type="file"
                  />
                  <p className="mt-3 text-[14px] text-[#7a8391]">
                    {profilePhotoFile?.name || "Jos nije odabrana profilna fotografija."}
                  </p>
                </div>
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[15px] font-semibold text-[#2f3138]" htmlFor="notes">
                    Dodatne napomene ili pitanja
                  </label>
                  <textarea
                    className={areaClassName}
                    id="notes"
                    name="notes"
                    onChange={(event) => updateValue("notes", event.target.value)}
                    value={formValues.notes}
                  />
                </div>

                <div className="rounded-[1.5rem] border border-black/8 bg-[#f8fbff] p-5 text-[15px] leading-7 text-[#555e6c]">
                  <h4 className="text-[18px] font-semibold text-[#2f3138]">Potvrda prijave *</h4>
                  <p className="mt-4">Prijava ce biti razmatrana samo ako ispunjava sljedece kriterijume:</p>
                  <ul className="mt-3 space-y-1">
                    <li>Popunjena sva obavezna polja</li>
                    <li>Portfolio u jednom od sljedecih formata: LINK ili PDF</li>
                    <li>Izmedju 6 i 25 reprezentativnih radova u JPG formatu</li>
                    <li>Profilna fotografija</li>
                  </ul>
                  <p className="mt-4">
                    Napomena: Prijave koje ne sadrze cjelovit i reprezentativan portfolio nece biti
                    prihvacene. To znaci da skice iz sveske, nedovrseni radovi ili premali broj djela ne
                    ispunjavaju kriterijume.
                  </p>
                  <p className="mt-4">
                    Podnosenjem prijave pristajes da radovi budu javno objavljeni na web stranici Art
                    Studio 360 i promovisani putem Instagram stranice Art Studio 360.
                  </p>
                  <p className="mt-4">
                    WeTransfer linkovi nijesu prihvatljivi zbog kratkog roka trajanja. Predlazemo Swiss
                    Transfer kao alternativu.
                  </p>

                  <label className="mt-5 flex items-start gap-3 rounded-[1.2rem] border border-black/8 bg-white p-4">
                    <input
                      checked={confirmedRules}
                      name="confirmedRules"
                      onChange={(event) => setConfirmedRules(event.target.checked)}
                      required
                      type="checkbox"
                    />
                    <span>Procitao/la sam uslove prijave.</span>
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-black/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <button
                className={ghostButtonClassName}
                disabled={currentStep === 0 || submitState.kind === "submitting"}
                onClick={() => goToStep(currentStep - 1)}
                type="button"
              >
                Nazad
              </button>

              {currentStep < steps.length - 1 ? (
                <button
                  className="inline-flex items-center justify-center rounded-full bg-[#2440d8] px-5 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#1d34b7]"
                  disabled={submitState.kind === "submitting"}
                  onClick={() => goToStep(currentStep + 1)}
                  type="button"
                >
                  Nastavi
                </button>
              ) : null}
            </div>

            {currentStep === steps.length - 1 ? (
              <button
                className="inline-flex items-center justify-center rounded-full bg-[#dc1735] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#c41430] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitState.kind === "submitting"}
                type="submit"
              >
                {submitState.kind === "submitting" ? "Slanje..." : "Posalji prijavu"}
              </button>
            ) : (
              <p className="max-w-xl text-[14px] leading-6 text-[#7a8391]">
                Forma sada salje podatke direktno API-ju, uz upload fajlova i email obavjestenje
                administratoru.
              </p>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}
