"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Info, Plus, Upload, X } from "lucide-react";

import { DisciplineIcon } from "@/components/discipline-icon";
import { useUiFeedback, useUiLoadingState } from "@/components/ui-feedback-provider";
import styles from "@/components/prijava-page.module.css";
import {
  clearPrijavaDraft,
  clearPrijavaDraftFiles,
  loadPrijavaDraftFiles,
  loadPrijavaDraftMetadata,
  savePrijavaDraftFiles,
  savePrijavaDraftMetadata,
  type PrijavaDraftFormValues,
} from "@/lib/prijava-draft";
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

type FormValues = PrijavaDraftFormValues;

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

type StepValidationError = {
  fieldId?: string;
  message: string;
};

const emptyPortfolioLink = "";
const emptySocialLink = "";

const steps: StepDefinition[] = [
  {
    eyebrow: "Korak 1",
    title: "Osnovni podaci",
    description: "Za početak, nekoliko osnovnih podataka o tebi.",
  },
  {
    eyebrow: "Korak 2",
    title: "Biografija i disciplina",
    description: "Napiši biografiju i izaberi discipline kojima se baviš.",
  },
  {
    eyebrow: "Korak 3",
    title: "Portfolio i mreže",
    description: "Dodaj linkove ka portfoliju i profilima na kojima se može vidjeti tvoj rad.",
  },
  {
    eyebrow: "Korak 4",
    title: "Materijali za prijavu",
    description: "Izaberi radove koje želiš da predstaviš, dodaj profilnu fotografiju i naslovnu sliku.",
  },
  {
    eyebrow: "Korak 5",
    title: "Potvrda i slanje",
    description: "Još samo da provjeriš prijavu i pošalješ je.",
  },
];

const disciplineTones = ["blue", "red", "gold"] as const;
const disciplineColors = ["#0d74ff", "#fe171d", "#d9a400"] as const;

const initialFormValues: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  biography: "",
  artistStatement: "",
  motto: "",
  mottoAuthor: "",
  blogUrl: "",
  notes: "",
};

/**
 * The submission form stays guided and animated, but the layout is now
 * horizontal and roomier so applicants can focus on the current step without
 * the narrow sidebar feeling.
 */
export function PrijavaForm({ disciplines }: PrijavaFormProps) {
  const { showAlert } = useUiFeedback();
  const draftRestoreStartedRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [animationDirection, setAnimationDirection] = useState<"forward" | "backward">("forward");
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [selectedDisciplineSlugs, setSelectedDisciplineSlugs] = useState<string[]>([]);
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([emptyPortfolioLink]);
  const [socialLinks, setSocialLinks] = useState<string[]>([emptySocialLink]);
  const [portfolioPdfFile, setPortfolioPdfFile] = useState<File | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [artworkFiles, setArtworkFiles] = useState<File[]>([]);
  const [artworkPreviews, setArtworkPreviews] = useState<PreviewItem[]>([]);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [confirmedRules, setConfirmedRules] = useState(false);
  const [showEmailPublic, setShowEmailPublic] = useState(false);
  const [presentationForms, setPresentationForms] = useState<string[]>([]);
  const [showPresentationHelp, setShowPresentationHelp] = useState(false);
  const [showStatementHelp, setShowStatementHelp] = useState(false);
  const [showPortfolioHelp, setShowPortfolioHelp] = useState(false);
  const [showRulesHelp, setShowRulesHelp] = useState(false);
  const [containsNsfw, setContainsNsfw] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [draftPersistenceReady, setDraftPersistenceReady] = useState(false);

  const fieldClassName =
    "w-full rounded-[1.35rem] border border-black/10 bg-white px-5 py-4 text-[16px] text-[#2f3138] outline-none transition focus:border-[#2440d8] focus:ring-2 focus:ring-[#2440d8]/10 aria-[invalid=true]:border-[#ef3340] aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[#ef3340]/10";
  const areaClassName = `${fieldClassName} min-h-40 resize-y`;
  const ghostButtonClassName =
    styles.ghostButton;
  const primaryButtonClassName =
    styles.primaryButton;

  const artworkCountMessage = useMemo(() => {
    if (artworkFiles.length === 0) {
      return "Odaberite izmedju 6 i 25 JPG ili PNG radova.";
    }

    if (artworkFiles.length < 6) {
      return `Trenutno je odabrano ${artworkFiles.length} radova. Minimum je 6.`;
    }

    if (artworkFiles.length > 25) {
      return `Trenutno je odabrano ${artworkFiles.length} radova. Maksimum je 25.`;
    }

    return `Odabrano je ${artworkFiles.length} radova, što je u dozvoljenom opsegu.`;
  }, [artworkFiles.length]);

  const activeStep = steps[currentStep] ?? steps[0]!;
  const completionPercent = ((currentStep + 1) / steps.length) * 100;
  const biographyWordCount = countWords(formValues.biography);
  const statementWordCount = countWords(formValues.artistStatement);
  const confirmationItems = [
    { label: "Ime, e-mail i grad", complete: Boolean(formValues.fullName.trim() && formValues.email.trim() && formValues.city.trim()) },
    { label: "Biografija od 80 do 200 riječi", complete: biographyWordCount >= 80 && biographyWordCount <= 200 },
    { label: "Bar jedna disciplina", complete: selectedDisciplineSlugs.length > 0 },
    { label: "Bar jedna društvena mreža", complete: socialLinks.some((link) => link.trim()) },
    { label: "Od 6 do 25 radova (JPG ili PNG)", complete: artworkFiles.length >= 6 && artworkFiles.length <= 25 },
    { label: "Profilna i naslovna slika", complete: Boolean(profilePhotoFile && coverPhotoFile) },
  ];
  const hasDraftContent = useMemo(
    () =>
      currentStep > 0 ||
      Object.values(formValues).some((value) => value.trim()) ||
      selectedDisciplineSlugs.length > 0 ||
      portfolioLinks.some((value) => value.trim()) ||
      socialLinks.some((value) => value.trim()) ||
      Boolean(portfolioPdfFile || profilePhotoFile || coverPhotoFile || artworkFiles.length) ||
      confirmedRules ||
      showEmailPublic ||
      presentationForms.length > 0 ||
      containsNsfw,
    [
      artworkFiles.length,
      confirmedRules,
      containsNsfw,
      coverPhotoFile,
      currentStep,
      formValues,
      portfolioLinks,
      portfolioPdfFile,
      presentationForms.length,
      profilePhotoFile,
      selectedDisciplineSlugs.length,
      showEmailPublic,
      socialLinks,
    ],
  );

  useUiLoadingState(submitState.kind === "submitting");

  useEffect(() => {
    if (draftRestoreStartedRef.current) {
      return;
    }

    draftRestoreStartedRef.current = true;

    async function restoreDraft() {
      const draft = loadPrijavaDraftMetadata();

      if (!draft) {
        await clearPrijavaDraftFiles().catch(() => undefined);
        setDraftPersistenceReady(true);
        return;
      }

      const storedFiles = await loadPrijavaDraftFiles().catch(() => null);

      setCurrentStep(Math.min(Math.max(Math.trunc(draft.currentStep), 0), steps.length - 1));
      setFormValues({ ...initialFormValues, ...draft.formValues });
      setSelectedDisciplineSlugs(
        Array.isArray(draft.selectedDisciplineSlugs) ? draft.selectedDisciplineSlugs : [],
      );
      setPortfolioLinks(
        Array.isArray(draft.portfolioLinks) && draft.portfolioLinks.length > 0
          ? draft.portfolioLinks
          : [emptyPortfolioLink],
      );
      setSocialLinks(
        Array.isArray(draft.socialLinks) && draft.socialLinks.length > 0
          ? draft.socialLinks
          : [emptySocialLink],
      );
      setConfirmedRules(draft.confirmedRules === true);
      setShowEmailPublic(draft.showEmailPublic === true);
      setPresentationForms(
        Array.isArray(draft.presentationForms) ? draft.presentationForms.slice(0, 1) : [],
      );
      setContainsNsfw(draft.containsNsfw === true);

      if (storedFiles) {
        setPortfolioPdfFile(isStoredFile(storedFiles.portfolioPdfFile) ? storedFiles.portfolioPdfFile : null);
        setProfilePhotoFile(isStoredFile(storedFiles.profilePhotoFile) ? storedFiles.profilePhotoFile : null);
        setCoverPhotoFile(isStoredFile(storedFiles.coverPhotoFile) ? storedFiles.coverPhotoFile : null);
        setArtworkFiles(
          Array.isArray(storedFiles.artworkFiles)
            ? storedFiles.artworkFiles.filter((file): file is File => isStoredFile(file))
            : [],
        );
      }

      setValidationAttempted(false);
      setDraftPersistenceReady(true);
      showAlert({
        kind: "info",
        title: "Nacrt prijave je vraćen",
        message: "Vratili smo podatke sačuvane u posljednjih 30 minuta.",
      });
    }

    restoreDraft().catch(() => {
      setDraftPersistenceReady(true);
    });
  }, [showAlert]);

  useEffect(() => {
    if (!draftPersistenceReady) {
      return;
    }

    if (!hasDraftContent) {
      void clearPrijavaDraft().catch(() => undefined);
      return;
    }

    try {
      savePrijavaDraftMetadata({
        currentStep,
        formValues,
        selectedDisciplineSlugs,
        portfolioLinks,
        socialLinks,
        confirmedRules,
        showEmailPublic,
        presentationForms,
        containsNsfw,
      });
    } catch {
      // Storage failures must never interrupt filling out the application.
    }
  }, [
    artworkFiles,
    confirmedRules,
    containsNsfw,
    coverPhotoFile,
    currentStep,
    draftPersistenceReady,
    formValues,
    hasDraftContent,
    portfolioLinks,
    portfolioPdfFile,
    presentationForms,
    profilePhotoFile,
    selectedDisciplineSlugs,
    showEmailPublic,
    socialLinks,
  ]);

  useEffect(() => {
    if (!draftPersistenceReady || !hasDraftContent) {
      return;
    }

    void savePrijavaDraftFiles({
      portfolioPdfFile,
      profilePhotoFile,
      coverPhotoFile,
      artworkFiles,
    }).catch(() => undefined);
  }, [
    artworkFiles,
    coverPhotoFile,
    draftPersistenceReady,
    hasDraftContent,
    portfolioPdfFile,
    profilePhotoFile,
  ]);

  useEffect(() => {
    const nextPreviews = artworkFiles.map((file, index) => ({
      key: `${buildFileKey(file)}-${index}`,
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
    if (!coverPhotoFile) {
      setCoverPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(coverPhotoFile);
    setCoverPreviewUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [coverPhotoFile]);

  useEffect(() => {
    if (submitState.kind === "success") {
      showAlert({
        kind: "success",
        title: "Prijava je poslata",
        message: submitState.message,
      });
    }

    if (submitState.kind === "error") {
      showAlert({
        kind: "error",
        title: "Prijava nije poslata",
        message: submitState.message,
      });
    }
  }, [showAlert, submitState]);

  function getStepValidationError(stepIndex: number): StepValidationError | null {
    if (stepIndex === 0) {
      if (!formValues.fullName.trim()) {
        return { fieldId: "fullName", message: "Unesi ime i prezime." };
      }

      if (!isValidEmail(formValues.email)) {
        return { fieldId: "email", message: "Unesi ispravnu e-mail adresu." };
      }

      if (!formValues.city.trim()) {
        return { fieldId: "city", message: "Unesi grad." };
      }
    }

    if (stepIndex === 1) {
      if (biographyWordCount < 80) {
        return { fieldId: "biography", message: "Biografija mora imati najmanje 80 riječi." };
      }

      if (biographyWordCount > 200) {
        return { fieldId: "biography", message: "Biografija može imati najviše 200 riječi." };
      }

      if (statementWordCount > 60) {
        return {
          fieldId: "artistStatement",
          message: "Umjetnički iskaz može imati najviše 60 riječi.",
        };
      }

      if (selectedDisciplineSlugs.length === 0) {
        return { fieldId: "discipline-options", message: "Izaberi najmanje jednu disciplinu." };
      }
    }

    if (stepIndex === 2) {
      const invalidPortfolioIndex = portfolioLinks.findIndex(
        (link) => link.trim() && !isValidHttpUrl(link),
      );

      if (invalidPortfolioIndex >= 0) {
        return {
          fieldId: `portfolioLink-${invalidPortfolioIndex}`,
          message: "Unesi ispravan portfolio link.",
        };
      }

      const firstSocialLinkIndex = socialLinks.findIndex((link) => link.trim());

      if (firstSocialLinkIndex < 0) {
        return { fieldId: "socialLink-0", message: "Dodaj najmanje jednu društvenu mrežu." };
      }

      const invalidSocialIndex = socialLinks.findIndex(
        (link) => link.trim() && !isValidHttpUrl(link),
      );

      if (invalidSocialIndex >= 0) {
        return {
          fieldId: `socialLink-${invalidSocialIndex}`,
          message: "Unesi ispravan link društvene mreže.",
        };
      }

      if (formValues.blogUrl.trim() && !isValidHttpUrl(formValues.blogUrl)) {
        return { fieldId: "blogUrl", message: "Unesi ispravan link ličnog sajta ili bloga." };
      }
    }

    if (stepIndex === 3) {
      if (artworkFiles.length < 6) {
        return { fieldId: "featuredWorksDropzone", message: "Dodaj najmanje 6 radova." };
      }

      if (artworkFiles.length > 25) {
        return { fieldId: "featuredWorksDropzone", message: "Možeš dodati najviše 25 radova." };
      }

      if (!profilePhotoFile) {
        return { fieldId: "profilePhotoPicker", message: "Dodaj profilnu fotografiju." };
      }

      if (!coverPhotoFile) {
        return { fieldId: "coverPhotoPicker", message: "Dodaj naslovnu sliku." };
      }
    }

    if (stepIndex === 4 && !confirmedRules) {
      return { fieldId: "confirmedRules", message: "Potvrdi uslove korišćenja i privatnosti." };
    }

    return null;
  }

  const activeStepValidationError = validationAttempted
    ? getStepValidationError(currentStep)
    : null;

  function focusValidationField(fieldId?: string) {
    if (!fieldId) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(fieldId)?.focus();
      });
    });
  }

  function goToStep(nextStep: number) {
    if (nextStep < 0 || nextStep >= steps.length) {
      return;
    }

    if (nextStep > currentStep) {
      for (let stepIndex = currentStep; stepIndex < nextStep; stepIndex += 1) {
        const validationError = getStepValidationError(stepIndex);

        if (validationError) {
          setValidationAttempted(true);

          if (stepIndex !== currentStep) {
            setAnimationDirection("forward");
            setCurrentStep(stepIndex);
          }

          focusValidationField(validationError.fieldId);
          return;
        }
      }
    }

    setAnimationDirection(nextStep > currentStep ? "forward" : "backward");
    setValidationAttempted(false);
    setCurrentStep(nextStep);
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

  function handleCoverPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    setCoverPhotoFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handlePresentationFormToggle(value: string) {
    setPresentationForms((current) => (current.includes(value) ? [] : [value]));
  }

  function handleArtworkSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const pickedFiles = Array.from(event.currentTarget.files ?? []);
    const supportedFiles = pickedFiles.filter(
      (file) =>
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        file.name.toLowerCase().endsWith(".jpg") ||
        file.name.toLowerCase().endsWith(".jpeg") ||
        file.name.toLowerCase().endsWith(".png"),
    );
    const knownFileNames = new Set(artworkFiles.map((file) => normalizeFileName(file.name)));
    const duplicateFileNames: string[] = [];
    const selectedFiles: File[] = [];

    for (const file of supportedFiles) {
      const normalizedName = normalizeFileName(file.name);

      if (knownFileNames.has(normalizedName)) {
        duplicateFileNames.push(file.name);
        continue;
      }

      knownFileNames.add(normalizedName);
      selectedFiles.push(file);
    }

    event.currentTarget.value = "";

    if (selectedFiles.length > 0) {
      setArtworkFiles((current) => [...current, ...selectedFiles]);
    }

    if (duplicateFileNames.length > 0) {
      const uniqueDuplicateNames = Array.from(new Set(duplicateFileNames));
      showAlert({
        kind: "error",
        title: "Duplirani radovi nijesu dodati",
        message:
          uniqueDuplicateNames.length === 1
            ? `Fajl sa imenom „${uniqueDuplicateNames[0]}” već postoji u listi.`
            : `Fajlovi sa imenima ${uniqueDuplicateNames.map((name) => `„${name}”`).join(", ")} već postoje u listi.`,
      });
    }

    const rejectedFileCount = pickedFiles.length - supportedFiles.length;
    if (rejectedFileCount > 0) {
      showAlert({
        kind: "info",
        title: "Dio fajlova nije dodat",
        message: `${rejectedFileCount} ${rejectedFileCount === 1 ? "fajl nije u" : "fajla nijesu u"} JPG ili PNG formatu.`,
      });
    }
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

    for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
      const validationError = getStepValidationError(stepIndex);

      if (validationError) {
        setValidationAttempted(true);
        if (stepIndex !== currentStep) {
          setAnimationDirection("backward");
          setCurrentStep(stepIndex);
        }
        focusValidationField(validationError.fieldId);
        return;
      }
    }

    const cleanedPortfolioLinks = portfolioLinks.map((item) => item.trim()).filter(Boolean);
    const cleanedSocialLinks = socialLinks.map((item) => item.trim()).filter(Boolean);

    setSubmitState({ kind: "submitting" });

    try {
      const response = await submitArtistSubmission({
        fullName: formValues.fullName.trim(),
        email: formValues.email.trim(),
        phone: formValues.phone.trim(),
        city: formValues.city.trim(),
        biography: formValues.biography.trim(),
        artistStatement: formValues.artistStatement.trim(),
        motto: formValues.motto.trim(),
        mottoAuthor: formValues.mottoAuthor.trim(),
        showEmailPublic,
        presentationForms,
        blogUrl: formValues.blogUrl.trim(),
        notes: formValues.notes.trim(),
        confirmedRules,
        containsNsfw,
        disciplines: selectedDisciplineSlugs,
        portfolioLinks: cleanedPortfolioLinks,
        socialLinks: cleanedSocialLinks,
        portfolioPdf: portfolioPdfFile,
        profilePhoto: profilePhotoFile!,
        coverPhoto: coverPhotoFile!,
        featuredWorks: artworkFiles,
      });

      setDraftPersistenceReady(false);
      void clearPrijavaDraft().catch(() => undefined);
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
    <form noValidate onSubmit={handleSubmit}>
      <div className={styles.formShell}>
        <div className={styles.stepsViewport}>
          <div className={styles.steps}>


{steps.map((step, index) => {
  const isActive = index === currentStep;
  const isValid = getStepValidationError(index) === null;

  return (
    <button
      key={step.title}
      className={`${styles.stepButton} ${
        isActive ? styles.stepButtonActive : ""
      } ${isValid ? styles.stepButtonDone : ""}`}
      onClick={(event) => {
        event.preventDefault();
        goToStep(index);
      }}
      type="button"
      aria-current={isActive ? "step" : undefined}
    >
      <div className={styles.stepInner}>
        <span
          className={`${styles.stepNumber} ${
            isActive ? styles.stepNumberActive : ""
          } ${isValid ? styles.stepNumberValid : ""}`}
        >
          {isValid ? (
            <Check
              aria-hidden="true"
              size={20}
              strokeWidth={3}
            />
          ) : (
            index + 1
          )}
        </span>

        <div>
          <p className={styles.stepEyebrow}>
            {step.eyebrow}
          </p>
          <p>{step.title}</p>
        </div>
      </div>
    </button>
  );
})}



            {/* {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isDone = index < currentStep;

              return (
                <button
                  key={step.title}
                  className={`${styles.stepButton} ${isActive ? styles.stepButtonActive : ""} ${
                    isDone ? styles.stepButtonDone : ""
                  }`}
                  onClick={(event) => {
                    event.preventDefault();
                    goToStep(index);
                  }}
                  type="button"
                >
                  <div className={styles.stepInner}>
                    <span
                      className={`${styles.stepNumber} ${
                        isActive || isDone ? styles.stepNumberActive : ""
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className={styles.stepEyebrow}>
                        {step.eyebrow}
                      </p>
                      <p>{step.title}</p>
                    </div>
                  </div>
                </button>
              );
            })} */}
          </div>
        </div>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <p>
              {activeStep.eyebrow} / {steps.length}
            </p>
            <h2>{activeStep.title}</h2>
            <p>{activeStep.description}</p>
          </div>

          <div className={styles.panelBody}>
            <div
              key={currentStep}
              className={`transition duration-300 ease-out ${
                animationDirection === "forward"
                  ? "animate-[slideStepIn_320ms_ease-out]"
                  : "animate-[slideStepBack_320ms_ease-out]"
              }`}
            >
              {currentStep === 0 ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Ime i prezime *" htmlFor="fullName">
                    <input
                      aria-invalid={activeStepValidationError?.fieldId === "fullName"}
                      className={fieldClassName}
                      id="fullName"
                      name="fullName"
                      placeholder="Ime i prezime"
                      onChange={(event) => updateValue("fullName", event.target.value)}
                      required
                      type="text"
                      value={formValues.fullName}
                    />
                  </Field>

                  <Field label="E-mail *" htmlFor="email">
                    <input
                      aria-invalid={activeStepValidationError?.fieldId === "email"}
                      className={fieldClassName}
                      id="email"
                      name="email"
                      onChange={(event) => updateValue("email", event.target.value)}
                      required
                      placeholder="ime@primjer.me"
                      type="email"
                      value={formValues.email}
                    />
                  </Field>

                  <Field label="Grad *" htmlFor="city">
                    <input
                      aria-invalid={activeStepValidationError?.fieldId === "city"}
                      className={fieldClassName}
                      id="city"
                      name="city"
                      onChange={(event) => updateValue("city", event.target.value)}
                      placeholder="npr. Podgorica"
                      required
                      type="text"
                      value={formValues.city}
                    />
                  </Field>

                  <Field label="Mobilni telefon · ne prikazuje se javno" htmlFor="phone">
                    <input
                      className={fieldClassName}
                      id="phone"
                      name="phone"
                      placeholder="+382 6x xxx xxx"
                      onChange={(event) => updateValue("phone", event.target.value)}
                      type="tel"
                      value={formValues.phone}
                    />
                  </Field>

                  <Field label="Moto · opciono" htmlFor="motto">
                    <input
                      className={fieldClassName}
                      id="motto"
                      name="motto"
                      placeholder="Rečenica koja opisuje tvoj rad"
                      onChange={(event) => updateValue("motto", event.target.value)}
                      type="text"
                      value={formValues.motto}
                    />
                  </Field>

                  <Field label="Autor mota · opciono" htmlFor="mottoAuthor">
                    <input
                      className={fieldClassName}
                      id="mottoAuthor"
                      name="mottoAuthor"
                      onChange={(event) => updateValue("mottoAuthor", event.target.value)}
                      placeholder="Ako je moto citat, upiši autora"
                      type="text"
                      value={formValues.mottoAuthor}
                    />
                  </Field>

                  <label className={styles.fullWidthChoice}>
                    <input
                      checked={showEmailPublic}
                      onChange={(event) => setShowEmailPublic(event.target.checked)}
                      type="checkbox"
                    />
                    <span>
                      Prikaži e-mail na javnom profilu kao kontakt
                      <small> · možeš promijeniti u podešavanjima</small>
                    </span>
                  </label>

                  <fieldset className={styles.presentationFieldset}>
                    <legend>
                      Kako da te predstavljamo u tekstovima? <small>· opciono</small>
                      <button
                        aria-controls="presentation-help"
                        aria-expanded={showPresentationHelp}
                        aria-label="Prikaži objašnjenje"
                        className={styles.presentationInfoButton}
                        data-active={showPresentationHelp}
                        onClick={() => setShowPresentationHelp((current) => !current)}
                        type="button"
                      >
                        <Info aria-hidden="true" size={15} strokeWidth={2.5} />
                      </button>
                    </legend>
                    <div>
                      {["Umjetnica", "Umjetnik", "Bez rodnog oblika"].map((option) => (
                        <label key={option}>
                          <input
                            checked={presentationForms.includes(option)}
                            onChange={() => handlePresentationFormToggle(option)}
                            type="checkbox"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    {showPresentationHelp ? (
                      <p className={styles.presentationHelp} id="presentation-help">
                    Koristimo ga u tekstovima koji se prave automatski: na profilu, u PDF portfoliju, Instagram objavama i QR vizit karti (npr. „ArtBoard umjetnica”). Ako ne izabereš, koristimo neutralne formulacije (npr. „Na ArtBoardu”). Ne određujemo ga prema imenu ili fotografiji, a možeš ga promijeniti u podešavanjima profila.
                      </p>
                    ) : null}
                  </fieldset>
                </div>
              ) : null}

              {currentStep === 1 ? (
                <div className={styles.biographyStep}>
                  <CountedField
                    count={`${biographyWordCount} / 200 riječi · min. 80`}
                    htmlFor="biography"
                    label="Biografija *"
                  >
                    <textarea
                      aria-invalid={activeStepValidationError?.fieldId === "biography"}
                      className={`${fieldClassName} ${styles.biographyTextarea}`}
                      id="biography"
                      name="biography"
                      onChange={(event) => updateValue("biography", event.target.value)}
                      placeholder="Ko si, odakle dolaziš, obrazovanje, iskustvo i važni trenuci u radu (80–200 riječi)…"
                      required
                      rows={6}
                      value={formValues.biography}
                    />
                  </CountedField>

                  <CountedField
                    count={`${statementWordCount} / 60 riječi`}
                    htmlFor="artistStatement"
                    label={
                      <span className={styles.countedFieldLabelWithInfo}>
                        Umjetnički iskaz <small>· opciono</small>
                        <button
                          aria-controls="statement-help"
                          aria-expanded={showStatementHelp}
                          aria-label="Razlika između biografije i umjetničkog iskaza"
                          className={styles.statementInfoButton}
                          data-active={showStatementHelp}
                          onClick={() => setShowStatementHelp((current) => !current)}
                          title="Razlika između biografije i iskaza"
                          type="button"
                        >
                          <Info aria-hidden="true" size={14} strokeWidth={2.4} />
                        </button>
                      </span>
                    }
                  >
                    <textarea
                      aria-invalid={activeStepValidationError?.fieldId === "artistStatement"}
                      className={`${fieldClassName} ${styles.statementTextarea}`}
                      id="artistStatement"
                      name="artistStatement"
                      onChange={(event) => updateValue("artistStatement", event.target.value)}
                      placeholder="Kratko o tvom radu: teme, tehnike i pristup (do 60 riječi)…"
                      rows={3}
                      value={formValues.artistStatement}
                    />
                    {showStatementHelp ? (
                      <p className={styles.statementHelp} id="statement-help">
                     Biografija opisuje tebe, a iskaz tvoj rad. Iskaz se prikazuje i u PDF portfoliju, na strani Profil.
                      </p>
                    ) : null}
                  </CountedField>

                  <section className={styles.disciplineSection}>
                    <div className={styles.disciplineHeader}>
                      <h4>
                        Disciplina <span>*</span>
                      </h4>
                      <span className={styles.disciplineCount}>
                        {selectedDisciplineSlugs.length} / 3
                      </span>
                    </div>
                    <p className={styles.disciplineDescription}>
                      Izaberi do tri discipline kojima se baviš. Prikazuju se na tvom profilu i u pretraživaču umjetnika.
                    </p>

                    <div
                      aria-invalid={activeStepValidationError?.fieldId === "discipline-options"}
                      className={styles.disciplineOptions}
                      id="discipline-options"
                      tabIndex={-1}
                    >
                      {disciplines.map((discipline, index) => {
                        const isChecked = selectedDisciplineSlugs.includes(discipline.slug);
                        const disableUnchecked = !isChecked && selectedDisciplineSlugs.length >= 3;
                        const tone = disciplineTones[index % disciplineTones.length];
                        const iconColor = disciplineColors[index % disciplineColors.length];

                        return (
                          <button
                            aria-pressed={isChecked}
                            className={`${styles.disciplinePill} ${
                              isChecked ? styles.disciplinePillActive : ""
                            }`}
                            data-tone={tone}
                            disabled={disableUnchecked}
                            key={discipline.id}
                            onClick={() => handleDisciplineToggle(discipline.slug)}
                            type="button"
                          >
                            <span
                              className={styles.disciplineIcon}
                              style={isChecked ? undefined : { color: iconColor }}
                            >
                              <DisciplineIcon slug={discipline.slug} />
                            </span>
                            <span>{discipline.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div className={styles.portfolioStep}>
                  <section className={styles.portfolioLinksSection}>
                    <div className={styles.portfolioSectionHeader}>
                      <div className={styles.portfolioLabelWithInfo}>
                        <h4>
                          Portfolio linkovi <small>· opciono</small>
                        </h4>
                        <button
                          aria-controls="portfolio-help"
                          aria-expanded={showPortfolioHelp}
                          aria-label="Šta je portfolio?"
                          className={styles.statementInfoButton}
                          data-active={showPortfolioHelp}
                          onClick={() => setShowPortfolioHelp((current) => !current)}
                          title="Šta je portfolio?"
                          type="button"
                        >
                          <Info aria-hidden="true" size={14} strokeWidth={2.4} />
                        </button>
                      </div>
                      <button className={styles.addFieldButton} onClick={addPortfolioLink} type="button">
                        <span aria-hidden="true">
                          <Plus size={16} strokeWidth={2.4} />
                        </span>
                        Dodaj link
                      </button>
                    </div>

                    {showPortfolioHelp ? (
                      <p className={styles.portfolioHelp} id="portfolio-help">
                        Portfolio je izbor tvojih najboljih radova na jednom mjestu, npr. lični sajt,
                        Behance, ArtStation, Dribbble ili PDF. Nije obavezan: ako ga još nemaš, preskoči
                        ovaj dio, a radovi iz sljedećeg koraka postaju tvoj ArtBoard portfolio.
                      </p>
                    ) : null}

                    <div className={styles.portfolioLinkList}>
                      {portfolioLinks.map((link, index) => (
                        <div className={styles.portfolioLinkRow} key={`portfolio-link-${index}`}>
                          <input
                            aria-invalid={
                              activeStepValidationError?.fieldId === `portfolioLink-${index}`
                            }
                            className={fieldClassName}
                            id={`portfolioLink-${index}`}
                            name={`portfolioLinks.${index}`}
                            onChange={(event) => handlePortfolioLinkChange(index, event.target.value)}
                            placeholder="https://..."
                            type="url"
                            value={link}
                          />

                          {portfolioLinks.length > 1 ? (
                            <button
                              aria-label={`Ukloni portfolio link ${index + 1}`}
                              className={styles.removeFieldButton}
                              onClick={() => removePortfolioLink(index)}
                              title="Ukloni link"
                              type="button"
                            >
                              <X aria-hidden="true" size={17} strokeWidth={2.3} />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className={styles.portfolioDetailsGrid}>
                    <section className={styles.portfolioPdfSection}>
                      <label className={styles.portfolioSectionTitle} htmlFor="portfolioPdf">
                        Portfolio PDF <small>· opciono</small>
                      </label>
                      <p className={styles.portfolioSectionDescription}>
                        Imaš portfolio kao dokument? Dodaj PDF umjesto linka.
                      </p>

                      <input
                        accept="application/pdf"
                        className="sr-only"
                        id="portfolioPdf"
                        name="portfolioPdf"
                        onChange={handlePortfolioPdfChange}
                        type="file"
                      />

                      <label
                        className={styles.addFieldButton}
                        htmlFor="portfolioPdf"
                      >
                        <span aria-hidden="true">
                          <Plus size={16} strokeWidth={2.4} />
                        </span>
                        Dodaj PDF
                      </label>

                      <div className={styles.portfolioPdfStatus}>
                        <span>
                          {portfolioPdfFile
                            ? `Odabran dokument: ${portfolioPdfFile.name}`
                            : "Još nije odabran PDF dokument."}
                        </span>
                        {portfolioPdfFile ? (
                          <button
                            aria-label="Ukloni portfolio PDF"
                            onClick={() => setPortfolioPdfFile(null)}
                            type="button"
                          >
                            Ukloni
                          </button>
                        ) : null}
                      </div>
                    </section>

                    <section className={styles.socialSection}>
                      <div className={styles.portfolioSectionHeader}>
                        <h4 className={styles.portfolioSectionTitle}>
                          Društvene mreže <em>*</em>
                        </h4>
                        <button className={styles.addFieldButton} onClick={addSocialLink} type="button">
                          <span aria-hidden="true">
                            <Plus size={16} strokeWidth={2.4} />
                          </span>
                          Dodaj mrežu
                        </button>
                      </div>

                      <div className={styles.portfolioLinkList}>
                        {socialLinks.map((link, index) => (
                          <div className={styles.portfolioLinkRow} key={`social-link-${index}`}>
                            <input
                              aria-invalid={
                                activeStepValidationError?.fieldId === `socialLink-${index}`
                              }
                              className={fieldClassName}
                              id={`socialLink-${index}`}
                              name={`socialLinks.${index}`}
                              onChange={(event) => handleSocialLinkChange(index, event.target.value)}
                              placeholder="https://instagram.com/..."
                              required={index === 0}
                              type="url"
                              value={link}
                            />

                            {socialLinks.length > 1 ? (
                              <button
                                aria-label={`Ukloni društvenu mrežu ${index + 1}`}
                                className={styles.removeFieldButton}
                                onClick={() => removeSocialLink(index)}
                                title="Ukloni mrežu"
                                type="button"
                              >
                                <X aria-hidden="true" size={17} strokeWidth={2.3} />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <label className={styles.blogField} htmlFor="blogUrl">
                        <span>
                          Lični sajt ili blog <small>· opciono</small>
                        </span>
                        <input
                          aria-invalid={activeStepValidationError?.fieldId === "blogUrl"}
                          className={fieldClassName}
                          id="blogUrl"
                          name="blogUrl"
                          onChange={(event) => updateValue("blogUrl", event.target.value)}
                          placeholder="https://..."
                          type="url"
                          value={formValues.blogUrl}
                        />
                      </label>
                    </section>
                  </div>
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div className={styles.materialsGrid}>
                  <section className={styles.artworkUploadSection}>
                    <div className={styles.materialsSectionHeader}>
                      <h4>
                        Izdvojeni radovi <em>*</em>
                      </h4>
                      <span className={styles.materialsCount}>{artworkFiles.length} / 25</span>
                    </div>
                    <p className={styles.materialsDescription}>
                      Dodaj od 6 do 25 radova koji najbolje predstavljaju tvoje umjetničko stvaralaštvo. Prije
                      slanja ih možeš pregledati i ukloniti.
                    </p>

                    <input
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      className="sr-only"
                      id="featuredWorks"
                      multiple
                      name="featuredWorks"
                      onChange={handleArtworkSelection}
                      onClick={(event) => {
                        event.currentTarget.value = "";
                      }}
                      type="file"
                    />
                    <label
                      aria-invalid={activeStepValidationError?.fieldId === "featuredWorksDropzone"}
                      className={styles.artworkDropzone}
                      htmlFor="featuredWorks"
                      id="featuredWorksDropzone"
                      tabIndex={-1}
                    >
                      <span className={styles.uploadIcon}>
                        <Upload aria-hidden="true" size={22} strokeWidth={2} />
                      </span>
                      <strong>Dodaj radove</strong>
                      <small>JPG ili PNG · više fajlova odjednom</small>
                    </label>

                    {artworkPreviews.length > 0 ? (
                      <div className={styles.artworkSelection}>
                        <div className={styles.artworkSelectionHeader}>
                          <p data-valid={artworkFiles.length >= 6 && artworkFiles.length <= 25}>
                            {artworkCountMessage}
                          </p>
                          <button className={styles.clearMaterialsButton} onClick={clearAllArtworks} type="button">
                            Ukloni sve
                          </button>
                        </div>
                        <div className={styles.artworkPreviewGrid}>
                          {artworkPreviews.map((preview, index) => (
                            <figure className={styles.artworkPreviewItem} key={preview.key}>
                              <img alt={preview.file.name} src={preview.url} />
                              <button
                                aria-label={`Ukloni ${preview.file.name}`}
                                onClick={() => removeArtwork(index)}
                                title="Ukloni rad"
                                type="button"
                              >
                                <X aria-hidden="true" size={16} strokeWidth={2.25} />
                              </button>
                            </figure>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className={styles.mediaUploadSection}>
                    <h4>
                      Profilna fotografija <em>*</em>
                    </h4>
                    <p>Fotografija koja će se prikazivati na tvom profilu.</p>
                    <input
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="sr-only"
                      id="profilePhoto"
                      name="profilePhoto"
                      onChange={handleProfilePhotoChange}
                      type="file"
                    />
                    <div
                      aria-invalid={activeStepValidationError?.fieldId === "profilePhotoPicker"}
                      className={styles.mediaPickerRow}
                      id="profilePhotoPicker"
                      tabIndex={-1}
                    >
                      <div className={styles.profilePreviewFrame}>
                        <div>
                          {profilePreviewUrl ? <img alt="Profilna fotografija" src={profilePreviewUrl} /> : null}
                        </div>
                      </div>
                      <label className={styles.addFieldButton} htmlFor="profilePhoto">
                        <span>
                          <Plus aria-hidden="true" size={20} strokeWidth={1.8} />
                        </span>
                        {profilePhotoFile ? "Promijeni profilnu" : "Dodaj profilnu"}
                      </label>
                      {profilePhotoFile ? (
                        <button
                          className={styles.mediaRemoveButton}
                          onClick={() => setProfilePhotoFile(null)}
                          type="button"
                        >
                          Ukloni
                        </button>
                      ) : null}
                    </div>
                    <p className={styles.mediaFileStatus} title={profilePhotoFile?.name}>
                      {profilePhotoFile?.name || "Još nije odabrana profilna fotografija."}
                    </p>
                  </section>

                  <section className={styles.mediaUploadSection}>
                    <h4>
                      Naslovna slika <em>*</em>
                    </h4>
                    <p>Široka slika na vrhu profila.</p>
                    <input
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="sr-only"
                      id="coverPhoto"
                      name="coverPhoto"
                      onChange={handleCoverPhotoChange}
                      type="file"
                    />
                    <div
                      aria-invalid={activeStepValidationError?.fieldId === "coverPhotoPicker"}
                      className={styles.mediaPickerRow}
                      id="coverPhotoPicker"
                      tabIndex={-1}
                    >
                      <div className={styles.coverPreviewFrame}>
                        {coverPreviewUrl ? <img alt="Naslovna slika" src={coverPreviewUrl} /> : null}
                      </div>
                      <label className={styles.addFieldButton} htmlFor="coverPhoto">
                        <span>
                          <Plus aria-hidden="true" size={20} strokeWidth={1.8} />
                        </span>
                        {coverPhotoFile ? "Promijeni naslovnu" : "Dodaj naslovnu"}
                      </label>
                      {coverPhotoFile ? (
                        <button
                          className={styles.mediaRemoveButton}
                          onClick={() => setCoverPhotoFile(null)}
                          type="button"
                        >
                          Ukloni
                        </button>
                      ) : null}
                    </div>
                    <p className={styles.mediaFileStatus} title={coverPhotoFile?.name}>
                      {coverPhotoFile?.name || "Još nije odabrana naslovna slika."}
                    </p>
                  </section>

                  <label className={styles.nsfwChoice}>
                    <input
                      checked={containsNsfw}
                      onChange={(event) => setContainsNsfw(event.target.checked)}
                      type="checkbox"
                    />
                    <span>
                      <strong>Profil sadrži radove sa sadržajem 18+</strong>
                      <small>Posjetioci će prije otvaranja profila potvrditi da imaju 18 ili više godina.</small>
                    </span>
                  </label>
                </div>
              ) : null}

              {currentStep === 4 ? (
                <div className={styles.confirmationStep}>
                  <label className={styles.confirmationNotes} htmlFor="notes">
                    <span>Napomene ili pitanja</span>
                    <textarea
                      className={styles.confirmationTextarea}
                      id="notes"
                      name="notes"
                      onChange={(event) => updateValue("notes", event.target.value)}
                      placeholder="Ako želiš nešto da dodaš, napiši ovdje."
                      rows={5}
                      value={formValues.notes}
                    />
                  </label>

                  <section className={styles.confirmationSection}>
                    <h4>
                      Potvrda prijave <em>*</em>
                    </h4>
                    <p className={styles.confirmationIntro}>Prije objave provjeravamo da li prijava sadrži:</p>
                    <div className={styles.confirmationGrid}>
                      {confirmationItems.map((item) => (
                        <div className={styles.confirmationItem} data-complete={item.complete} key={item.label}>
                          <span aria-hidden="true">
                            <Check size={13} strokeWidth={3.4} />
                          </span>
                          <strong>{item.label}</strong>
                        </div>
                      ))}
                    </div>

                    <p className={styles.confirmationImportant}>
                      <strong>Važno:</strong> Svaku prijavu na ArtBoardu pregledamo kako bi profili bili
                      cjeloviti i kvalitetni, a umjetnice, umjetnici, institucije i saradnici mogli da
                      vjeruju onome što vide. Zato izaberi kompletne radove ili kolekcije koji najbolje
                      pokazuju tvoj izraz. Skice, nedovršeni radovi ili premali broj radova nijesu dovoljni
                      za objavu profila, ali prijavu uvijek možeš poslati ponovo kad dopuniš portfolio.
                    </p>

                    <div className={styles.rulesDisclosure}>
                      <span>
                        Izjave iz Pravila
                        <button
                          aria-controls="rules-help"
                          aria-expanded={showRulesHelp}
                          aria-label={showRulesHelp ? "Sakrij izjave iz Pravila" : "Prikaži izjave iz Pravila"}
                          className={styles.rulesInfoButton}
                          data-active={showRulesHelp}
                          onClick={() => setShowRulesHelp((current) => !current)}
                          title={showRulesHelp ? "Sakrij izjave iz Pravila" : "Prikaži izjave iz Pravila"}
                          type="button"
                        >
                          <Info aria-hidden="true" size={14} strokeWidth={2.2} />
                        </button>
                      </span>
                      {showRulesHelp ? (
                        <p id="rules-help">
                          Prijavu može poslati samo punoljetna osoba (18+). Slanjem prijave potvrđuješ da
                          imaš 18 ili više godina, da su poslati radovi tvoje autorsko djelo ili da imaš
                          pisanu saglasnost svih nosilaca prava, i da radovi ne krše prava trećih lica. Ako
                          profil sadrži radove sa sadržajem 18+, označavaš ga oznakom 18+ na profilu.
                          Pristaješ i da tvoji radovi budu prikazani na ArtBoard platformi i korišćeni za
                          promociju, uvijek uz tvoje ime, kako je opisano u članu 4 Pravila. Autorska prava
                          ostaju tvoja.
                        </p>
                      ) : null}
                    </div>

                    <label className={styles.rulesConsent}>
                      <input
                        aria-invalid={activeStepValidationError?.fieldId === "confirmedRules"}
                        checked={confirmedRules}
                        id="confirmedRules"
                        name="confirmedRules"
                        onChange={(event) => setConfirmedRules(event.target.checked)}
                        required
                        type="checkbox"
                      />
                      <span aria-hidden="true" className={styles.rulesCheck}>
                        <Check size={13} strokeWidth={3.4} />
                      </span>
                      <span className={styles.rulesConsentText}>
                        Imam 18 ili više godina i prihvatam{" "}
                        <a
                          className={styles.rulesLink}
                          href="/uslovi-koriscenja#uslovi"
                          rel="noreferrer"
                          target="_blank"
                        >
                          Uslove korišćenja
                        </a>
                        {" i "}
                        <a
                          className={styles.rulesLink}
                          href="/uslovi-koriscenja#privatnost"
                          rel="noreferrer"
                          target="_blank"
                        >
                          Politiku privatnosti
                        </a>
                        .
                      </span>
                    </label>
                  </section>
                </div>
              ) : null}
            </div>

            <div className={styles.formNav}>
              <div className={styles.formNavActions}>
                <button
                  className={ghostButtonClassName}
                  disabled={currentStep === 0 || submitState.kind === "submitting"}
                  onClick={(event) => {
                    event.preventDefault();
                    goToStep(currentStep - 1);
                  }}
                  type="button"
                >
                  Nazad
                </button>

                {currentStep < steps.length - 1 ? (
                  <button
                    className={primaryButtonClassName}
                    disabled={submitState.kind === "submitting"}
                    onClick={(event) => {
                      event.preventDefault();
                      goToStep(currentStep + 1);
                    }}
                    type="button"
                  >
                    Nastavi →
                  </button>
                ) : (
                  <button
                    className={styles.submitButton}
                    disabled={submitState.kind === "submitting"}
                    type="submit"
                  >
                    {submitState.kind === "submitting" ? "Slanje..." : "Pošalji prijavu"}
                  </button>
                )}

                {activeStepValidationError ? (
                  <p
                    aria-live="polite"
                    className={styles.stepValidationError}
                    id="step-validation-error"
                    role="status"
                  >
                    <span aria-hidden="true" />
                    {activeStepValidationError.message}
                  </p>
                ) : null}
              </div>
              <p>
                Podaci ostaju sačuvani dok prelaziš sa koraka na korak. Prijavu šalješ tek na kraju.
              </p>
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

function CountedField(props: {
  label: React.ReactNode;
  count: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.countedField}>
      <div className={styles.countedFieldHeader}>
        <label htmlFor={props.htmlFor}>
          {props.label}
        </label>
        <span>{props.count}</span>
      </div>
      {props.children}
    </div>
  );
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function buildFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function normalizeFileName(fileName: string) {
  return fileName.trim().toLowerCase();
}

function isStoredFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}
