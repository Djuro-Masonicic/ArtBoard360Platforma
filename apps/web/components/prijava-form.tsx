"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

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

interface PreviewItem {
  key: string;
  url: string;
  file: File;
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
 * The submission form stays guided and animated, but the layout is now
 * horizontal and roomier so applicants can focus on the current step without
 * the narrow sidebar feeling.
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
  const [artworkPreviews, setArtworkPreviews] = useState<PreviewItem[]>([]);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);
  const [activeArtworkPreviewIndex, setActiveArtworkPreviewIndex] = useState(0);
  const [confirmedRules, setConfirmedRules] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const fieldClassName =
    "w-full rounded-[1.35rem] border border-black/10 bg-white px-5 py-4 text-[16px] text-[#2f3138] outline-none transition focus:border-[#2440d8] focus:ring-2 focus:ring-[#2440d8]/10";
  const areaClassName = `${fieldClassName} min-h-40 resize-y`;
  const ghostButtonClassName =
    "inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-[15px] font-medium text-[#434855] transition hover:border-black/20 hover:text-[#1f2430] disabled:cursor-not-allowed disabled:opacity-45";
  const primaryButtonClassName =
    "inline-flex items-center justify-center rounded-full bg-[#2440d8] px-5 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#1d34b7] disabled:cursor-not-allowed disabled:opacity-60";

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

  const activeStep = steps[currentStep] ?? steps[0]!;
  const completionPercent = ((currentStep + 1) / steps.length) * 100;
  const activeArtworkPreview = artworkPreviews[activeArtworkPreviewIndex] ?? null;

  useEffect(() => {
    const nextPreviews = artworkFiles.map((file) => ({
      key: buildFileKey(file),
      url: URL.createObjectURL(file),
      file,
    }));

    setArtworkPreviews(nextPreviews);

    return () => {
      for (const preview of nextPreviews) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [artworkFiles]);

  useEffect(() => {
    if (!profilePhotoFile) {
      setProfilePreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(profilePhotoFile);
    setProfilePreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [profilePhotoFile]);

  useEffect(() => {
    if (artworkPreviews.length === 0) {
      setActiveArtworkPreviewIndex(0);
      return;
    }

    if (activeArtworkPreviewIndex > artworkPreviews.length - 1) {
      setActiveArtworkPreviewIndex(artworkPreviews.length - 1);
    }
  }, [activeArtworkPreviewIndex, artworkPreviews.length]);

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

  function handlePortfolioPdfChange(event: React.ChangeEvent<HTMLInputElement>) {
    setPortfolioPdfFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleProfilePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    setProfilePhotoFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleArtworkSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []).filter(
      (file) => file.type === "image/jpeg" || file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg"),
    );

    if (selectedFiles.length === 0) {
      event.target.value = "";
      return;
    }

    setArtworkFiles((current) => {
      const uniqueFiles = new Map(current.map((file) => [buildFileKey(file), file]));

      for (const file of selectedFiles) {
        uniqueFiles.set(buildFileKey(file), file);
      }

      return Array.from(uniqueFiles.values());
    });

    if (artworkFiles.length === 0) {
      setActiveArtworkPreviewIndex(0);
    }

    event.target.value = "";
  }

  function removeArtwork(index: number) {
    setArtworkFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function clearAllArtworks() {
    setArtworkFiles([]);
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

  return (
    <form className="mx-auto max-w-[1320px] space-y-8" onSubmit={handleSubmit}>
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

      <div className="rounded-[2.2rem] border border-black/8 bg-white/78 p-4 shadow-[0_24px_75px_rgba(29,45,83,0.08)] backdrop-blur-sm sm:p-5 lg:p-6">
        <div className="overflow-x-auto pb-3">
          <div className="flex min-w-max gap-3">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isDone = index < currentStep;

              return (
                <button
                  key={step.title}
                  className={`min-w-[220px] rounded-[1.5rem] border px-4 py-4 text-left transition ${
                    isActive
                      ? "border-[#2440d8]/20 bg-[#2440d8]/7 shadow-[0_16px_35px_rgba(36,64,216,0.10)]"
                      : "border-black/8 bg-white hover:border-black/14"
                  }`}
                  onClick={() => goToStep(index)}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold ${
                        isActive
                          ? "bg-[#2440d8] text-white"
                          : isDone
                            ? "bg-[#dc1735] text-white"
                            : "bg-[#f3f5f8] text-[#667080]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#8a93a1]">
                        {step.eyebrow}
                      </p>
                      <p className="mt-1 text-[16px] font-semibold text-[#2f3138]">{step.title}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf1f8]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#2440d8_0%,#dc1735_60%,#ffc41d_100%)] transition-[width] duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="mt-5 overflow-hidden rounded-[2rem] border border-black/8 bg-white">
          <div className="border-b border-black/8 bg-[linear-gradient(135deg,rgba(248,251,255,0.96)_0%,rgba(255,255,255,0.98)_100%)] px-6 py-6 sm:px-8 lg:px-10">
            <p className="text-[13px] font-medium uppercase tracking-[0.32em] text-[#7b8391]">
              {activeStep.eyebrow}
            </p>
            <h2 className="mt-3 text-[36px] font-bold leading-[0.95] text-[#2f3138] sm:text-[48px]">
              {activeStep.title}
            </h2>
            <p className="mt-3 max-w-[70ch] text-[18px] leading-[1.55] text-[#5a616d]">
              {activeStep.description}
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8 lg:px-10 lg:py-10">
            <div
              key={currentStep}
              className={`transition duration-300 ease-out ${
                animationDirection === "forward"
                  ? "animate-[slideStepIn_320ms_ease-out]"
                  : "animate-[slideStepBack_320ms_ease-out]"
              }`}
            >
              {currentStep === 0 ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Ime i prezime *" htmlFor="fullName">
                    <input
                      className={fieldClassName}
                      id="fullName"
                      name="fullName"
                      onChange={(event) => updateValue("fullName", event.target.value)}
                      required
                      type="text"
                      value={formValues.fullName}
                    />
                  </Field>

                  <Field label="E-mail *" htmlFor="email">
                    <input
                      className={fieldClassName}
                      id="email"
                      name="email"
                      onChange={(event) => updateValue("email", event.target.value)}
                      required
                      type="email"
                      value={formValues.email}
                    />
                  </Field>

                  <Field label="Mobilni telefon" htmlFor="phone">
                    <input
                      className={fieldClassName}
                      id="phone"
                      name="phone"
                      onChange={(event) => updateValue("phone", event.target.value)}
                      type="tel"
                      value={formValues.phone}
                    />
                  </Field>

                  <Field label="Moto" htmlFor="motto">
                    <input
                      className={fieldClassName}
                      id="motto"
                      name="motto"
                      onChange={(event) => updateValue("motto", event.target.value)}
                      type="text"
                      value={formValues.motto}
                    />
                  </Field>
                </div>
              ) : null}

              {currentStep === 1 ? (
                <div className="space-y-6">
                  <Field label="Kratka biografija *" htmlFor="biography">
                    <textarea
                      className={areaClassName}
                      id="biography"
                      name="biography"
                      onChange={(event) => updateValue("biography", event.target.value)}
                      required
                      value={formValues.biography}
                    />
                  </Field>

                  <div className="rounded-[1.6rem] border border-black/8 bg-[#f8fbff] p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-[20px] font-semibold text-[#2f3138]">Disciplina *</h4>
                      <span className="rounded-full bg-white px-3 py-1 text-[14px] text-[#657080]">
                        {selectedDisciplineSlugs.length}/3
                      </span>
                    </div>
                    <p className="mt-3 text-[15px] leading-7 text-[#5b6472]">
                      Izaberi do tri discipline koje najbolje opisuju tvoj rad.
                    </p>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                  <div className="rounded-[1.6rem] border border-black/8 bg-[#f8fbff] p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-[20px] font-semibold text-[#2f3138]">Portfolio linkovi</h4>
                      <button className={ghostButtonClassName} onClick={addPortfolioLink} type="button">
                        Dodaj link
                      </button>
                    </div>
                    <div className="mt-5 space-y-3">
                      {portfolioLinks.map((link, index) => (
                        <div key={`portfolio-link-${index}`} className="flex flex-col gap-3 lg:flex-row">
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

                  <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-[1.6rem] border border-black/8 bg-[#f8fbff] p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <label className="block text-[18px] font-semibold text-[#2f3138]" htmlFor="portfolioPdf">
                            Portfolio PDF
                          </label>
                          <p className="mt-2 text-[15px] leading-7 text-[#5b6472]">
                            Mozes dodati jedan PDF dokument kao alternativu linkovima.
                          </p>
                        </div>
                        {portfolioPdfFile ? (
                          <button
                            className={ghostButtonClassName}
                            onClick={() => setPortfolioPdfFile(null)}
                            type="button"
                          >
                            Ukloni
                          </button>
                        ) : null}
                      </div>

                      <input
                        accept="application/pdf"
                        className="sr-only"
                        id="portfolioPdf"
                        name="portfolioPdf"
                        onChange={handlePortfolioPdfChange}
                        type="file"
                      />

                      <label
                        className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-full bg-[#2440d8] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1d34b7]"
                        htmlFor="portfolioPdf"
                      >
                        Upload PDF
                      </label>

                      <div className="mt-4 rounded-[1.2rem] border border-dashed border-black/10 bg-white px-4 py-4 text-[14px] text-[#6a7280]">
                        {portfolioPdfFile ? (
                          <span>Odabran dokument: {portfolioPdfFile.name}</span>
                        ) : (
                          <span>Jos nije odabran PDF dokument.</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-black/8 bg-[#f8fbff] p-5 sm:p-6">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-[20px] font-semibold text-[#2f3138]">Drustvene mreze *</h4>
                        <button className={ghostButtonClassName} onClick={addSocialLink} type="button">
                          Dodaj mrezu
                        </button>
                      </div>
                      <div className="mt-5 space-y-3">
                        {socialLinks.map((link, index) => (
                          <div key={`social-link-${index}`} className="flex flex-col gap-3 lg:flex-row">
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

                      <div className="mt-5">
                        <Field label="Blog" htmlFor="blogUrl">
                          <input
                            className={fieldClassName}
                            id="blogUrl"
                            name="blogUrl"
                            onChange={(event) => updateValue("blogUrl", event.target.value)}
                            placeholder="https://..."
                            type="url"
                            value={formValues.blogUrl}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div className="space-y-6">
                  <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[1.6rem] border border-black/8 bg-[#f8fbff] p-5 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <label className="block text-[20px] font-semibold text-[#2f3138]" htmlFor="featuredWorks">
                            Izdvojeni radovi *
                          </label>
                          <p className="mt-2 text-[15px] leading-7 text-[#5b6472]">
                            Posalji izmedju 6 i 25 reprezentativnih JPG radova. Nakon odabira mozes ih
                            pregledati, listati i ukloniti prije slanja.
                          </p>
                        </div>

                        {artworkFiles.length > 0 ? (
                          <button className={ghostButtonClassName} onClick={clearAllArtworks} type="button">
                            Ukloni sve
                          </button>
                        ) : null}
                      </div>

                      <input
                        accept=".jpg,.jpeg,image/jpeg"
                        className="sr-only"
                        id="featuredWorks"
                        multiple
                        name="featuredWorks"
                        onChange={handleArtworkSelection}
                        required
                        type="file"
                      />

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <label
                          className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#2440d8] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1d34b7]"
                          htmlFor="featuredWorks"
                        >
                          Upload radove
                        </label>
                        <span className="text-[14px] text-[#6a7280]">
                          {artworkFiles.length > 0
                            ? `${artworkFiles.length} fajlova je odabrano`
                            : "Jos nijesu odabrani fajlovi"}
                        </span>
                      </div>

                      <p className="mt-3 text-[14px] text-[#5b6472]">{artworkCountMessage}</p>

                      {activeArtworkPreview ? (
                        <div className="mt-5 space-y-4">
                          <div className="relative overflow-hidden rounded-[1.5rem] border border-black/8 bg-white">
                            <img
                              alt={activeArtworkPreview.file.name}
                              className="aspect-[1.55/1] w-full object-cover"
                              src={activeArtworkPreview.url}
                            />

                            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/60 via-black/10 to-transparent px-4 py-4 text-white">
                              <div>
                                <p className="text-[15px] font-medium">{activeArtworkPreview.file.name}</p>
                                <p className="mt-1 text-[13px] text-white/80">
                                  {activeArtworkPreviewIndex + 1} / {artworkPreviews.length}
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  className="rounded-full border border-white/30 bg-white/15 px-3 py-2 text-[14px] backdrop-blur-sm transition hover:bg-white/22"
                                  disabled={artworkPreviews.length <= 1}
                                  onClick={() =>
                                    setActiveArtworkPreviewIndex((current) =>
                                      current === 0 ? artworkPreviews.length - 1 : current - 1,
                                    )
                                  }
                                  type="button"
                                >
                                  Prethodni
                                </button>
                                <button
                                  className="rounded-full border border-white/30 bg-white/15 px-3 py-2 text-[14px] backdrop-blur-sm transition hover:bg-white/22"
                                  disabled={artworkPreviews.length <= 1}
                                  onClick={() =>
                                    setActiveArtworkPreviewIndex((current) =>
                                      current === artworkPreviews.length - 1 ? 0 : current + 1,
                                    )
                                  }
                                  type="button"
                                >
                                  Sljedeci
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                            {artworkPreviews.map((preview, index) => (
                              <div
                                key={preview.key}
                                className={`overflow-hidden rounded-[1.2rem] border bg-white ${
                                  index === activeArtworkPreviewIndex
                                    ? "border-[#2440d8]/35 shadow-[0_12px_24px_rgba(36,64,216,0.12)]"
                                    : "border-black/8"
                                }`}
                              >
                                <button
                                  className="w-full"
                                  onClick={() => setActiveArtworkPreviewIndex(index)}
                                  type="button"
                                >
                                  <img
                                    alt={preview.file.name}
                                    className="aspect-square w-full object-cover"
                                    src={preview.url}
                                  />
                                </button>
                                <div className="flex items-center justify-between gap-3 px-3 py-3">
                                  <span className="min-w-0 truncate text-[13px] text-[#5f6876]">
                                    {preview.file.name}
                                  </span>
                                  <button
                                    className="text-[13px] font-medium text-[#dc1735] transition hover:text-[#b9132d]"
                                    onClick={() => removeArtwork(index)}
                                    type="button"
                                  >
                                    Ukloni
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[1.6rem] border border-black/8 bg-[#f8fbff] p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <label className="block text-[20px] font-semibold text-[#2f3138]" htmlFor="profilePhoto">
                            Profilna fotografija *
                          </label>
                          <p className="mt-2 text-[15px] leading-7 text-[#5b6472]">
                            Dodaj jednu jasnu profilnu fotografiju za predstavljanje na platformi.
                          </p>
                        </div>

                        {profilePhotoFile ? (
                          <button
                            className={ghostButtonClassName}
                            onClick={() => setProfilePhotoFile(null)}
                            type="button"
                          >
                            Ukloni
                          </button>
                        ) : null}
                      </div>

                      <input
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="sr-only"
                        id="profilePhoto"
                        name="profilePhoto"
                        onChange={handleProfilePhotoChange}
                        required
                        type="file"
                      />

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <label
                          className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#2440d8] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1d34b7]"
                          htmlFor="profilePhoto"
                        >
                          Upload fotografiju
                        </label>
                        <span className="text-[14px] text-[#6a7280]">
                          {profilePhotoFile ? "Fajl je odabran" : "Jos nije odabran fajl"}
                        </span>
                      </div>

                      {profilePreviewUrl ? (
                        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-black/8 bg-white">
                          <img
                            alt="Profilna fotografija"
                            className="aspect-[1/1.02] w-full object-cover"
                            src={profilePreviewUrl}
                          />
                        </div>
                      ) : null}

                      <p className="mt-3 text-[14px] text-[#7a8391]">
                        {profilePhotoFile?.name || "Jos nije odabrana profilna fotografija."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {currentStep === 4 ? (
                <div className="space-y-6">
                  <Field label="Dodatne napomene ili pitanja" htmlFor="notes">
                    <textarea
                      className={areaClassName}
                      id="notes"
                      name="notes"
                      onChange={(event) => updateValue("notes", event.target.value)}
                      value={formValues.notes}
                    />
                  </Field>

                  <div className="rounded-[1.6rem] border border-black/8 bg-[#f8fbff] p-5 text-[15px] leading-7 text-[#555e6c] sm:p-6">
                    <h4 className="text-[20px] font-semibold text-[#2f3138]">Potvrda prijave *</h4>
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

            <div className="mt-8 flex flex-col gap-4 border-t border-black/8 pt-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-3">
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
                    className={primaryButtonClassName}
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
                <p className="max-w-2xl text-[14px] leading-6 text-[#7a8391]">
                  Forma i dalje salje podatke direktno API-ju, uz upload fajlova i email obavjestenje
                  administratoru. Sada samo imas mnogo bolji pregled prije slanja.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function Field(props: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[15px] font-semibold text-[#2f3138]" htmlFor={props.htmlFor}>
        {props.label}
      </label>
      {props.children}
    </div>
  );
}

function buildFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}
