"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Moon, Pencil, Sun } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "@/components/portfolio-builder-editor-shell.module.css";

import {
  generatePublicPortfolioPdf,
  updatePortfolioArtwork,
  updatePortfolioProject,
  uploadPortfolioCollectionCover,
  uploadPortfolioArtwork,
  uploadPortfolioProfileImage,
  type UpdatePortfolioArtworkPayload,
  type UpdatePortfolioProjectPayload,
} from "@/services/portfolio-projects";
import type {
  PortfolioArtworkAvailability,
  PortfolioDesignConfig,
  PortfolioDesignPageKey,
  PortfolioFooterTemplate,
  PortfolioFontStyle,
  PortfolioLanguage,
  PortfolioPageFormat,
  PortfolioProject,
  PortfolioTemplate,
} from "@/types/api";

type PortfolioBuilderEditorShellProps = {
  project: PortfolioProject;
};

type BuilderStep = "profile" | "works" | "design" | "export";
type StudioTheme = "dark" | "light";

const steps: Array<{
  id: BuilderStep;
  label: string;
  helper: string;
}> = [
  { id: "profile", label: "Podaci", helper: "Ime, bio, kontakt" },
  { id: "works", label: "Radovi", helper: "Izbor i redoslijed" },
  { id: "design", label: "Dizajn", helper: "Šablon, format, jezik" },
  { id: "export", label: "Izvoz", helper: "Pregled, PDF, link" },
];

const templateLabels: Record<PortfolioTemplate, string> = {
  INSTITUTIONAL_MINIMAL: "Institutional Minimal",
  ARTBOARD_EDITORIAL: "ArtBoard Editorial",
  SALES_PRO: "Sales / Pro",
};

const pageDesignLabels: Record<PortfolioDesignPageKey, string> = {
  cover: "Cover",
  profile: "Profile / Bio",
  collection: "Collection",
  artwork: "Artwork pages",
  contact: "Contact",
};

const footerLabels: Record<PortfolioFooterTemplate, string> = {
  MINIMAL: "Minimal",
  ARTBOARD: "ArtBoard",
  SALES: "Sales",
};

function createPresetDesignConfig(template: PortfolioTemplate): PortfolioDesignConfig {
  return {
    mode: "PRESET",
    pages: {
      cover: template,
      profile: template,
      collection: template,
      artwork: template,
      contact: template,
    },
    footer:
      template === "ARTBOARD_EDITORIAL"
        ? "ARTBOARD"
        : template === "SALES_PRO"
          ? "SALES"
          : "MINIMAL",
  };
}

function normalizeDesignConfig(project: PortfolioProject, fallbackTemplate: PortfolioTemplate) {
  return project.designConfig ?? createPresetDesignConfig(fallbackTemplate);
}

function isPremiumProject(project: PortfolioProject) {
  return project.access.reason === "PREMIUM";
}

const studioCardClassName =
  "rounded-[22px] border border-white/[0.08] bg-[#0b0d15]/95 shadow-[0_18px_46px_rgba(0,0,0,0.22)]";

const studioInputClassName =
  "h-12 w-full min-w-0 rounded-xl border border-white/[0.1] bg-white/[0.055] px-4 text-[13px] font-semibold text-[#f3f4f7] outline-none transition placeholder:text-[#6b7184] hover:border-white/20 focus:border-[#1a7cff] focus:bg-white/[0.08] focus:ring-4 focus:ring-[#1a7cff]/10";

const studioTextareaClassName =
  "w-full min-w-0 resize-y rounded-xl border border-white/[0.1] bg-white/[0.055] px-4 py-3 text-[13px] font-semibold leading-6 text-[#f3f4f7] outline-none transition placeholder:text-[#6b7184] hover:border-white/20 focus:border-[#1a7cff] focus:bg-white/[0.08] focus:ring-4 focus:ring-[#1a7cff]/10";

const portfolioDisciplineOptions = [
  "3D umjetnost",
  "Digitalna umjetnost",
  "Eksperimentalno",
  "Film",
  "Fotografija",
  "Graficki dizajn",
  "Grafika",
  "Ilustracija",
  "Instalacija",
  "Mixed-media",
  "Rukotvorine",
  "Skulptura",
  "Slikarstvo",
  "Street art",
  "Strip",
  "Videografija",
];

function getPortfolioDisciplineOptions(currentDiscipline: string) {
  // Existing projects store disciplines as a single text field. We keep that
  // backend shape for now, but split comma-separated values so the editor can
  // behave like a real multi-select.
  const currentValues = parseDisciplineList(currentDiscipline);
  return Array.from(new Set([...currentValues, ...portfolioDisciplineOptions]));
}

function parseDisciplineList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDisciplineList(values: string[]) {
  return values.join(", ");
}

function toggleDisciplineValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function PortfolioBuilderEditorShell({ project }: PortfolioBuilderEditorShellProps) {
  const router = useRouter();
  const [currentProject, setCurrentProject] = useState(project);
  const [activeStep, setActiveStep] = useState<BuilderStep>("profile");
  const [selectedTemplate, setSelectedTemplate] = useState<PortfolioTemplate>(project.template);
  const [designConfig, setDesignConfig] = useState<PortfolioDesignConfig>(() =>
    normalizeDesignConfig(project, project.template),
  );
  const [pageFormat, setPageFormat] = useState<PortfolioPageFormat>(project.pageFormat);
  const [language, setLanguage] = useState<PortfolioLanguage>(project.language);
  const [fontStyle, setFontStyle] = useState<PortfolioFontStyle>(project.fontStyle);
  const [includeBranding, setIncludeBranding] = useState(project.includeBranding);
  const [artistName, setArtistName] = useState(project.artistName);
  const [discipline, setDiscipline] = useState(project.discipline ?? "");
  const [email, setEmail] = useState(project.email ?? "");
  const [location, setLocation] = useState(project.location ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(project.websiteUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(project.instagramUrl ?? "");
  const [profileImageUrl, setProfileImageUrl] = useState(project.profileImageUrl ?? "");
  const [collectionName, setCollectionName] = useState(project.collectionName ?? "");
  const [collectionYear, setCollectionYear] = useState(project.collectionYear ?? "");
  const [collectionDescription, setCollectionDescription] = useState(
    project.collectionDescription ?? "",
  );
  const [collectionCoverUrl, setCollectionCoverUrl] = useState(project.collectionCoverUrl ?? "");
  const [bio, setBio] = useState(project.biography ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isUploadingCollectionCover, setIsUploadingCollectionCover] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [studioTheme, setStudioTheme] = useState<StudioTheme>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("artboard-portfolio-studio-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
      setStudioTheme(savedTheme);
    }
  }, []);

  const selectedArtworks = useMemo(
    () => currentProject.artworks.filter((artwork) => artwork.isSelected),
    [currentProject.artworks],
  );

  const coverImage =
    currentProject.coverImageUrl || selectedArtworks[0]?.imageUrl || currentProject.profileImageUrl;

  async function saveProject(overrides: UpdatePortfolioProjectPayload = {}) {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const savedProject = await updatePortfolioProject(currentProject.id, {
        artistName,
        discipline,
        email,
        location,
        websiteUrl,
        instagramUrl,
        profileImageUrl,
        collectionName,
        collectionYear,
        collectionDescription,
        collectionCoverUrl,
        biography: bio,
        template: selectedTemplate,
        pageFormat,
        language,
        fontStyle,
        includeBranding,
        designConfig:
          designConfig.mode === "CUSTOM"
            ? designConfig
            : createPresetDesignConfig(selectedTemplate),
        ...overrides,
      });

      setCurrentProject(savedProject);
      setProfileImageUrl(savedProject.profileImageUrl ?? "");
      setCollectionName(savedProject.collectionName ?? "");
      setCollectionYear(savedProject.collectionYear ?? "");
      setCollectionDescription(savedProject.collectionDescription ?? "");
      setCollectionCoverUrl(savedProject.collectionCoverUrl ?? "");
      setDesignConfig(normalizeDesignConfig(savedProject, savedProject.template));
      setPageFormat(savedProject.pageFormat);
      setLanguage(savedProject.language);
      setFontStyle(savedProject.fontStyle);
      setIncludeBranding(savedProject.includeBranding);
      setSaveMessage("Draft je sacuvan.");
      return savedProject;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Draft nije mogao biti sacuvan.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadArtworks(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    setIsUploadingArtwork(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      let latestProject = currentProject;

      for (const file of selectedFiles) {
        latestProject = await uploadPortfolioArtwork(latestProject.id, file);
      }

      setCurrentProject(latestProject);
      setSaveMessage(
        selectedFiles.length === 1
          ? "Rad je dodat u portfolio draft."
          : `Dodato je ${selectedFiles.length} radova u portfolio draft.`,
      );
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Rad nije mogao biti uploadovan.");
    } finally {
      setIsUploadingArtwork(false);
    }
  }

  async function uploadProfileImage(files: FileList | null) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    setIsUploadingProfileImage(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const savedProject = await uploadPortfolioProfileImage(currentProject.id, file);

      setCurrentProject(savedProject);
      setProfileImageUrl(savedProject.profileImageUrl ?? "");
      setSaveMessage("Profilna slika portfolija je sacuvana.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Profilna slika nije mogla biti uploadovana.");
    } finally {
      setIsUploadingProfileImage(false);
    }
  }

  async function uploadCollectionCover(files: FileList | null) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    setIsUploadingCollectionCover(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const savedProject = await uploadPortfolioCollectionCover(currentProject.id, file);

      setCurrentProject(savedProject);
      setCollectionCoverUrl(savedProject.collectionCoverUrl ?? "");
      setSaveMessage("Cover kolekcije je sacuvan.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Cover kolekcije nije mogao biti uploadovan.");
    } finally {
      setIsUploadingCollectionCover(false);
    }
  }

  async function saveArtworkSelection(artworkId: string, isSelected: boolean) {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const savedProject = await updatePortfolioArtwork(currentProject.id, artworkId, {
        isSelected,
      });

      setCurrentProject(savedProject);
      setSaveMessage("Rad je azuriran.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Rad nije mogao biti azuriran.");
    } finally {
      setIsSaving(false);
    }
  }

  async function setCoverArtwork(artwork: PortfolioProject["artworks"][number]) {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const savedProject = await updatePortfolioProject(currentProject.id, {
        coverImageUrl: artwork.imageUrl,
      });

      setCurrentProject(savedProject);
      setSaveMessage("Pocetni rad je sacuvan.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Pocetni rad nije mogao biti sacuvan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveArtworkDetails(artworkId: string, payload: UpdatePortfolioArtworkPayload) {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const savedProject = await updatePortfolioArtwork(currentProject.id, artworkId, payload);

      setCurrentProject(savedProject);
      setSaveMessage("Detalji rada su sacuvani.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Detalji rada nisu mogli biti sacuvani.");
    } finally {
      setIsSaving(false);
    }
  }

  async function reorderArtwork(draggedArtworkId: string, targetArtworkId: string) {
    if (draggedArtworkId === targetArtworkId) {
      return;
    }

    const orderedArtworks = [...currentProject.artworks].sort((a, b) => a.orderIndex - b.orderIndex);
    const draggedArtwork = orderedArtworks.find((artwork) => artwork.id === draggedArtworkId);
    const targetExists = orderedArtworks.some((artwork) => artwork.id === targetArtworkId);

    if (!draggedArtwork || !targetExists) {
      return;
    }

    const withoutDraggedArtwork = orderedArtworks.filter((artwork) => artwork.id !== draggedArtworkId);
    const targetIndex = withoutDraggedArtwork.findIndex((artwork) => artwork.id === targetArtworkId);

    if (targetIndex < 0) {
      return;
    }

    const reorderedArtworks = [
      ...withoutDraggedArtwork.slice(0, targetIndex),
      draggedArtwork,
      ...withoutDraggedArtwork.slice(targetIndex),
    ];

    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      let latestProject = currentProject;

      for (const [index, artwork] of reorderedArtworks.entries()) {
        if (artwork.orderIndex === index) {
          continue;
        }

        latestProject = await updatePortfolioArtwork(currentProject.id, artwork.id, {
          orderIndex: index,
        });
      }

      setCurrentProject(latestProject);
      setSaveMessage("Redosljed radova je sacuvan.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Redosljed nije mogao biti sacuvan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function generatePdfVersion() {
    setIsGeneratingPdf(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const generatedProject = await generatePublicPortfolioPdf(currentProject.id);

      setCurrentProject(generatedProject);
      setSaveMessage("Nova PDF verzija je generisana i sacuvana.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "PDF nije mogao biti generisan.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  async function generateAndOpenCleanPdf() {
    setIsGeneratingPdf(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const generatedProject = await generatePublicPortfolioPdf(currentProject.id);

      setCurrentProject(generatedProject);
      router.push(`/portfolio-builder/${currentProject.id}/download`);
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "PDF nije mogao biti generisan.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  function openPreviewPage() {
    router.push(`/portfolio-builder/${currentProject.id}/preview`);
  }

  function openPaymentPage() {
    router.push(`/portfolio-builder/${currentProject.id}/payment`);
  }

  function changePresetTemplate(template: PortfolioTemplate) {
    setSelectedTemplate(template);

    if (designConfig.mode === "PRESET") {
      setDesignConfig(createPresetDesignConfig(template));
    }
  }

  function changeStudioTheme(theme: StudioTheme) {
    setStudioTheme(theme);
    window.localStorage.setItem("artboard-portfolio-studio-theme", theme);
  }

  return (
    <main className={styles.studio} data-theme={studioTheme}>
      <StudioTopbar
        isSaving={isSaving}
        onOpenPreview={openPreviewPage}
        onSave={() => void saveProject()}
        onThemeChange={changeStudioTheme}
        project={currentProject}
        template={selectedTemplate}
        theme={studioTheme}
      />

      <div className={styles.workspaceLayout}>
        <StudioSidebar
          activeStep={activeStep}
          project={currentProject}
          selectedArtworks={selectedArtworks.length}
          setActiveStep={setActiveStep}
        />

        <section className={styles.editorColumn}>
          <MobileSteps activeStep={activeStep} setActiveStep={setActiveStep} />

          <div className={styles.editorContent}>
            <SaveNotice error={saveError} message={saveMessage} />

            {activeStep === "profile" ? (
              <ProfileWorkspace
                artistName={artistName}
                bio={bio}
                collectionCoverUrl={collectionCoverUrl}
                collectionDescription={collectionDescription}
                collectionName={collectionName}
                collectionYear={collectionYear}
                discipline={discipline}
                email={email}
                instagramUrl={instagramUrl}
                isUploadingCollectionCover={isUploadingCollectionCover}
                isUploadingProfileImage={isUploadingProfileImage}
                location={location}
                onArtistNameChange={setArtistName}
                onBioChange={setBio}
                onCollectionCoverUpload={uploadCollectionCover}
                onCollectionDescriptionChange={setCollectionDescription}
                onCollectionNameChange={setCollectionName}
                onCollectionYearChange={setCollectionYear}
                onDisciplineChange={setDiscipline}
                onEmailChange={setEmail}
                onInstagramUrlChange={setInstagramUrl}
                onLocationChange={setLocation}
                onProfileImageUpload={uploadProfileImage}
                onWebsiteUrlChange={setWebsiteUrl}
                profileImageUrl={profileImageUrl}
                websiteUrl={websiteUrl}
              />
            ) : null}

            {activeStep === "works" ? (
              <WorksWorkspace
                artworks={currentProject.artworks}
                coverImageUrl={currentProject.coverImageUrl}
                isBusy={isSaving || isUploadingArtwork}
                isUploadingArtwork={isUploadingArtwork}
                onReorderArtwork={reorderArtwork}
                onSetCoverArtwork={setCoverArtwork}
                onUploadArtworks={uploadArtworks}
                onToggleArtwork={saveArtworkSelection}
                onUpdateArtwork={saveArtworkDetails}
                selectedArtworks={selectedArtworks.length}
              />
            ) : null}

            {activeStep === "design" ? (
              <DesignWorkspace
                designConfig={designConfig}
                fontStyle={fontStyle}
                includeBranding={includeBranding}
                isSaving={isSaving}
                isPremium={isPremiumProject(currentProject)}
                language={language}
                onFontStyleChange={setFontStyle}
                onIncludeBrandingChange={setIncludeBranding}
                onLanguageChange={setLanguage}
                onPageFormatChange={setPageFormat}
                onSave={() => void saveProject()}
                onDesignConfigChange={setDesignConfig}
                pageFormat={pageFormat}
                selectedTemplate={selectedTemplate}
                onTemplateChange={changePresetTemplate}
              />
            ) : null}

            {activeStep === "export" ? (
              <ExportWorkspace
                isGeneratingPdf={isGeneratingPdf}
                onGeneratePdf={() => void generatePdfVersion()}
                onOpenCleanPdf={() => void generateAndOpenCleanPdf()}
                onOpenPayment={openPaymentPage}
                onOpenPreview={openPreviewPage}
                project={currentProject}
              />
            ) : null}

            <StepNavigation activeStep={activeStep} setActiveStep={setActiveStep} />
          </div>
        </section>

        <StudioPreviewPanel
          artistName={artistName}
          bio={bio}
          collectionCoverUrl={collectionCoverUrl}
          collectionDescription={collectionDescription}
          collectionName={collectionName}
          collectionYear={collectionYear}
          coverImage={coverImage}
          discipline={discipline}
          email={email}
          profileImageUrl={profileImageUrl}
          project={currentProject}
          designConfig={designConfig}
          selectedArtworks={selectedArtworks.length}
          selectedArtworkItems={selectedArtworks}
          template={selectedTemplate}
        />
      </div>
    </main>
  );
}

function StudioTopbar({
  isSaving,
  onOpenPreview,
  onSave,
  onThemeChange,
  project,
  template,
  theme,
}: {
  isSaving: boolean;
  onOpenPreview: () => void;
  onSave: () => void;
  onThemeChange: (theme: StudioTheme) => void;
  project: PortfolioProject;
  template: PortfolioTemplate;
  theme: StudioTheme;
}) {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarProject}>
        <Link className={styles.topbarLogo} href="/portfolio-builder" aria-label="Portfolio Builder početna">
          <Image
            alt="ArtBoard"
            height={32}
            priority
            src={
              theme === "dark"
                ? "/artboard-logo/ArtBoard-Horizontal-Gradient-Mark-White-Text.svg"
                : "/artboard-logo/ArtBoard-Horizontal-Gradient-Mark-Black-Text.svg"
            }
            width={148}
          />
        </Link>
        <span className={styles.topbarDivider} aria-hidden="true" />
        <div className={styles.projectMeta}>
          <div className={styles.projectTitleRow}>
            <strong>{project.artistName} - Portfolio</strong>
            <span className={styles.savedBadge}>
              <i aria-hidden="true" />
              {isSaving ? "Čuvanje..." : "Sačuvano"}
            </span>
          </div>
          <span className={styles.projectSubtitle}>
            {templateLabels[template]} <b>{project.status === "DRAFT" ? "Draft" : project.status}</b>
          </span>
        </div>
      </div>

      <div className={styles.topbarActions}>
        <div aria-label="Tema Portfolio Studija" className={styles.themeToggle} role="group">
          <button
            aria-label="Svijetla tema"
            aria-pressed={theme === "light"}
            className={theme === "light" ? styles.activeThemeButton : undefined}
            onClick={() => onThemeChange("light")}
            title="Svijetla tema"
            type="button"
          >
            <Sun aria-hidden="true" size={16} strokeWidth={2.2} />
          </button>
          <button
            aria-label="Tamna tema"
            aria-pressed={theme === "dark"}
            className={theme === "dark" ? styles.activeThemeButton : undefined}
            onClick={() => onThemeChange("dark")}
            title="Tamna tema"
            type="button"
          >
            <Moon aria-hidden="true" size={16} strokeWidth={2.2} />
          </button>
        </div>
        <Link className={styles.studioLink} href="/portfolio-builder">
          Portfolio Studio
        </Link>
        <button className={styles.outlineButton} disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "Čuvam..." : "Sačuvaj draft"}
        </button>
        <button className={styles.gradientButton} onClick={onOpenPreview} type="button">
          Otvori pregled
        </button>
      </div>
    </header>
  );
}

function StudioSidebar({
  activeStep,
  project,
  selectedArtworks,
  setActiveStep,
}: {
  activeStep: BuilderStep;
  project: PortfolioProject;
  selectedArtworks: number;
  setActiveStep: (step: BuilderStep) => void;
}) {
  const estimatedPages = Math.max(4, selectedArtworks + 4);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.profileSummary}>
        <div className={styles.sourceLabel}>
          {project.source === "ARTBOARD_PROFILE" ? "Iz ArtBoard profila" : "Portfolio bez profila"}
        </div>
        <div className={styles.sidebarAvatar}>
          {project.profileImageUrl ? <img alt="" src={project.profileImageUrl} /> : <span>AB</span>}
        </div>
        <h1>{project.artistName}</h1>
        <div className={styles.planBadges}>
          <span>Free korisnik</span>
          <strong>
            <i>✓</i>
            {project.access.reason === "PREMIUM" ? "Premium korisnik" : project.access.reason === "PAID" ? "PDF otključan" : "Basic korisnik"}
          </strong>
        </div>
      </div>

      <nav className={styles.stepNav} aria-label="Koraci izrade portfolija">
        {steps.map((step, index) => {
          const isActive = activeStep === step.id;
          return (
            <button
              className={isActive ? styles.activeStep : undefined}
              data-step={step.id}
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              type="button"
            >
              <span className={styles.stepIcon}><BuilderStepIcon step={step.id} /></span>
              <span className={styles.stepCopy}>
                <strong><i>{String(index + 1).padStart(2, "0")}</i>{step.label}</strong>
                <small>{step.helper}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <div className={styles.sidebarMetrics}>
        <div><strong>{selectedArtworks}<span>/{project.artworks.length}</span></strong><small>Radova iz ArtBoard profila</small></div>
        <div><strong>{estimatedPages}</strong><small>Strana ima tvoj portfolio</small></div>
      </div>
      <button className={styles.sidebarPreviewButton} onClick={() => setActiveStep("export")} type="button">
        Pregled PDF-a
      </button>
    </aside>
  );
}

function BuilderStepIcon({ step }: { step: BuilderStep }) {
  if (step === "profile") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (step === "works") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M4 6h16v12H4V6Zm3 9 3-3 2 2 3-4 2 5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (step === "design") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M4 5h16M7 5v14m10-14v14M4 19h16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 4h8l4 4v12H7V4Zm8 0v4h4M10 14h6M10 17h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CollapsedMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="group relative grid h-10 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.045] text-[12px] font-black text-[#c4b5fd]">
      {value}
      <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 min-w-[140px] -translate-y-1/2 rounded-xl border border-white/[0.1] bg-[#0e1522] px-3 py-2 text-[10px] font-bold text-[#c4b5fd] opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

function MobileSteps({
  activeStep,
  setActiveStep,
}: {
  activeStep: BuilderStep;
  setActiveStep: (step: BuilderStep) => void;
}) {
  return (
    <div className="border-b border-white/[0.08] bg-[#07080d]/95 px-3 py-2 backdrop-blur-xl xl:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {steps.map((step, index) => (
          <button
            className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-bold ${
              activeStep === step.id
                ? "bg-[#111318] text-white shadow-[0_10px_28px_rgba(17,19,24,0.14)]"
                : "border border-white/[0.1] bg-white/[0.04] text-[#8d93a5]"
            }`}
            key={step.id}
            onClick={() => setActiveStep(step.id)}
            type="button"
          >
            {index + 1}. {step.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepNavigation({
  activeStep,
  setActiveStep,
}: {
  activeStep: BuilderStep;
  setActiveStep: (step: BuilderStep) => void;
}) {
  const currentIndex = steps.findIndex((step) => step.id === activeStep);
  const previousStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;

  return (
    <nav className={styles.stepNavigation} aria-label="Navigacija kroz korake">
      {previousStep ? (
        <button onClick={() => setActiveStep(previousStep.id)} type="button">
          ← {previousStep.label}
        </button>
      ) : <span />}
      {nextStep ? (
        <button className={styles.nextStepButton} onClick={() => setActiveStep(nextStep.id)} type="button">
          Dalje: {nextStep.label} →
        </button>
      ) : null}
    </nav>
  );
}

function ProfileWorkspace({
  artistName,
  bio,
  collectionCoverUrl,
  collectionDescription,
  collectionName,
  collectionYear,
  discipline,
  email,
  instagramUrl,
  isUploadingCollectionCover,
  isUploadingProfileImage,
  location,
  onArtistNameChange,
  onBioChange,
  onCollectionCoverUpload,
  onCollectionDescriptionChange,
  onCollectionNameChange,
  onCollectionYearChange,
  onDisciplineChange,
  onEmailChange,
  onInstagramUrlChange,
  onLocationChange,
  onProfileImageUpload,
  onWebsiteUrlChange,
  profileImageUrl,
  websiteUrl,
}: {
  artistName: string;
  bio: string;
  collectionCoverUrl: string;
  collectionDescription: string;
  collectionName: string;
  collectionYear: string;
  discipline: string;
  email: string;
  instagramUrl: string;
  isUploadingCollectionCover: boolean;
  isUploadingProfileImage: boolean;
  location: string;
  onArtistNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onCollectionCoverUpload: (files: FileList | null) => void;
  onCollectionDescriptionChange: (value: string) => void;
  onCollectionNameChange: (value: string) => void;
  onCollectionYearChange: (value: string) => void;
  onDisciplineChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onInstagramUrlChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onProfileImageUpload: (files: FileList | null) => void;
  onWebsiteUrlChange: (value: string) => void;
  profileImageUrl: string;
  websiteUrl: string;
}) {
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const collectionCoverInputRef = useRef<HTMLInputElement>(null);
  const checks = [
    { label: "Ime", done: artistName.trim().length > 2 },
    { label: "Disciplina", done: discipline.trim().length > 2 },
    { label: "Email", done: email.includes("@") },
    { label: "Bio 80+ karaktera", done: bio.trim().length >= 80 },
    { label: "Kolekcija", done: collectionName.trim().length > 2 },
  ];

  return (
    <>
      <WorkspaceHeader
        label="Korak 1 od 4"
        title="Uredi podatke za PDF"
        description="Povukli smo podatke sa tvog ArtBoard profila. Provjeri ih i dopuni — sve izmjene se odmah vide u pregledu."
      />

      <section className={`${studioCardClassName} flex flex-wrap items-center gap-3 px-5 py-3`}>
        <strong className="text-[13px] text-[#f3f4f7]">Spremno za pregled</strong>
        <strong className="text-[12px] text-[#199653]">{checks.filter((check) => check.done).length}/5</strong>
        <span className="h-[18px] w-px bg-white/[0.12]" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {checks.map((check) => (
            <div
              className={`flex items-center gap-1.5 text-[12px] font-semibold ${check.done ? "text-[#c4c8d4]" : "text-[#6b7184]"}`}
              key={check.label}
            >
              <span className={check.done ? "text-[#35d07f]" : "text-[#6b7184]"}>{check.done ? "✓" : "○"}</span>
              <span>{check.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-[18px]">
        <Panel title="Osnovni podaci">
          <div className="grid grid-cols-1 gap-x-[18px] gap-y-4 md:grid-cols-2 lg:grid-cols-3">
            <BuilderInput label="Ime i prezime" value={artistName} onChange={onArtistNameChange} />
            <BuilderInput label="Email" value={email} onChange={onEmailChange} />
            <BuilderInput
              label="Lokacija"
              placeholder="npr. Podgorica, Crna Gora"
              value={location}
              onChange={onLocationChange}
            />
            <BuilderInput
              label="Website"
              placeholder="npr. ivonamedenica.com"
              value={websiteUrl}
              onChange={onWebsiteUrlChange}
            />
            <BuilderInput label="Instagram" value={instagramUrl} onChange={onInstagramUrlChange} />
          </div>

          <div className="mt-[22px]">
            <BuilderMultiSelect
              label="Discipline"
              onToggle={(value) => {
                const nextValues = toggleDisciplineValue(parseDisciplineList(discipline), value);
                onDisciplineChange(formatDisciplineList(nextValues));
              }}
              options={getPortfolioDisciplineOptions(discipline)}
              selectedValues={parseDisciplineList(discipline)}
            />
          </div>

          <label className="mt-[22px] grid gap-2 text-[12px] font-bold text-[#c4c8d4]">
            <span className="flex items-center justify-between gap-3">
              <span>Biografija i umjetniÄki iskaz</span>
              <span className="font-semibold text-[#8d93a5]">{bio.length} / 1200</span>
            </span>
            <textarea
              className={`${studioTextareaClassName} min-h-[210px] text-[14px] font-medium leading-[1.65]`}
              maxLength={1200}
              onChange={(event) => onBioChange(event.target.value)}
              rows={6}
              value={bio}
            />
          </label>
        </Panel>

        <div className={styles.profileBottomRow}>
          <section className={styles.profileImageCard}>
            <div className={styles.profileCardAvatar}>
              {profileImageUrl ? (
                <img alt="Profilna slika" src={profileImageUrl} />
              ) : (
                <span>Profilna</span>
              )}
            </div>
            <div className={styles.profileCardCopy}>
              <h2>Profilna slika</h2>
              <p>
                Koristi se na naslovnoj i kontakt strani.
              </p>
              <input
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(event) => {
                  onProfileImageUpload(event.target.files);
                  event.target.value = "";
                }}
                ref={profileImageInputRef}
                type="file"
              />
              <button
                className={styles.changeProfileImageButton}
                disabled={isUploadingProfileImage}
                onClick={() => profileImageInputRef.current?.click()}
                type="button"
              >
                <Pencil aria-hidden="true" size={12} strokeWidth={2.2} />
                {isUploadingProfileImage ? "Upload..." : "Izmijeni fotografiju"}
              </button>
            </div>
          </section>

          <section className={styles.collectionCard}>
            <input
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(event) => {
                onCollectionCoverUpload(event.target.files);
                event.target.value = "";
              }}
              ref={collectionCoverInputRef}
              type="file"
            />
            <button
              className={styles.collectionCoverButton}
              disabled={isUploadingCollectionCover}
              onClick={() => collectionCoverInputRef.current?.click()}
              title="Izmijeni cover kolekcije"
              type="button"
            >
              {collectionCoverUrl ? (
                <img alt="Cover kolekcije" src={collectionCoverUrl} />
              ) : (
                <span>Cover kolekcije</span>
              )}
            </button>
            <div className={styles.collectionFields}>
              <h2>Kolekcija</h2>
              <div className={styles.collectionFieldRow}>
                <input
                  aria-label="Ime kolekcije"
                  onChange={(event) => onCollectionNameChange(event.target.value)}
                  value={collectionName}
                />
                <input
                  aria-label="Godina kolekcije"
                  onChange={(event) => onCollectionYearChange(event.target.value)}
                  value={collectionYear}
                />
              </div>
              <textarea
                aria-label="Opis kolekcije"
                onChange={(event) => onCollectionDescriptionChange(event.target.value)}
                placeholder="Kratak opis kolekcije za uvodnu stranu (opciono)"
                rows={3}
                value={collectionDescription}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function WorksWorkspace({
  artworks,
  coverImageUrl,
  isBusy,
  isUploadingArtwork,
  onReorderArtwork,
  onSetCoverArtwork,
  onUploadArtworks,
  onToggleArtwork,
  onUpdateArtwork,
  selectedArtworks,
}: {
  artworks: PortfolioProject["artworks"];
  coverImageUrl?: string | null;
  isBusy: boolean;
  isUploadingArtwork: boolean;
  onReorderArtwork: (draggedArtworkId: string, targetArtworkId: string) => void;
  onSetCoverArtwork: (artwork: PortfolioProject["artworks"][number]) => void;
  onUploadArtworks: (files: FileList | null) => void;
  onToggleArtwork: (artworkId: string, isSelected: boolean) => void;
  onUpdateArtwork: (artworkId: string, payload: UpdatePortfolioArtworkPayload) => void;
  selectedArtworks: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedArtworkId, setDraggedArtworkId] = useState<string | null>(null);
  const [dragOverArtworkId, setDragOverArtworkId] = useState<string | null>(null);
  const orderedArtworks = useMemo(
    () => [...artworks].sort((a, b) => a.orderIndex - b.orderIndex),
    [artworks],
  );

  return (
    <>
      <WorkspaceHeader
        label="Korak 2 od 4"
        title="Izbor radova i redosljed"
        description="Uključi radove koji ulaze u PDF i poređaj ih prevlačenjem. Prvi rad se koristi kao naslovna slika."
      />

      <section>
        <input
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          multiple
          onChange={(event) => {
            onUploadArtworks(event.target.files);
            event.target.value = "";
          }}
          ref={fileInputRef}
          type="file"
        />
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-[20px] border border-white/[0.1] bg-[#0b0d15]/90 px-5 py-4 text-[12px] font-semibold leading-5 text-[#8d93a5]">
          <strong className="text-[#f3f4f7]">{selectedArtworks} radova u PDF-u</strong>
          <span className="h-1 w-40 overflow-hidden rounded-full bg-white/[0.1]">
            <i className="block h-full rounded-full bg-[#f3f4f7]" style={{ width: `${Math.min(100, selectedArtworks * 5)}%` }} />
          </span>
          <span className="min-w-[220px] flex-1">Preporuka 10–30 · prevuci karticu za redoslijed</span>
          <SecondaryStudioButton disabled={isBusy} onClick={() => fileInputRef.current?.click()}>
            {isUploadingArtwork ? "Dodajem..." : "+ Dodaj rad"}
          </SecondaryStudioButton>
        </div>
        {orderedArtworks.length > 0 ? (
          <div className="-mx-1 pb-3">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 px-1">
              {orderedArtworks.map((artwork) => (
                <ArtworkEditorCard
                  artwork={artwork}
                  isCoverArtwork={coverImageUrl === artwork.imageUrl}
                  isDragTarget={dragOverArtworkId === artwork.id && draggedArtworkId !== artwork.id}
                  isDragging={draggedArtworkId === artwork.id}
                  isBusy={isBusy}
                  key={artwork.id}
                  onDragEnd={() => {
                    setDraggedArtworkId(null);
                    setDragOverArtworkId(null);
                  }}
                  onDragOver={() => setDragOverArtworkId(artwork.id)}
                  onDragStart={() => setDraggedArtworkId(artwork.id)}
                  onDrop={() => {
                    if (draggedArtworkId) {
                      onReorderArtwork(draggedArtworkId, artwork.id);
                    }

                    setDraggedArtworkId(null);
                    setDragOverArtworkId(null);
                  }}
                  onToggle={onToggleArtwork}
                  onSetCover={onSetCoverArtwork}
                  onUpdate={onUpdateArtwork}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState text="Jos nema radova u ovom draftu." />
        )}
      </section>
    </>
  );
}

const artworkAvailabilityOptions: Array<{
  label: string;
  value: PortfolioArtworkAvailability;
}> = [
  { label: "Nepoznato", value: "UNKNOWN" },
  { label: "Dostupno", value: "AVAILABLE" },
  { label: "Prodato", value: "SOLD" },
  { label: "Nije za prodaju", value: "NOT_FOR_SALE" },
];

function ArtworkEditorCard({
  artwork,
  isCoverArtwork,
  isDragging,
  isDragTarget,
  isBusy,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onSetCover,
  onToggle,
  onUpdate,
}: {
  artwork: PortfolioProject["artworks"][number];
  isCoverArtwork: boolean;
  isDragging: boolean;
  isDragTarget: boolean;
  isBusy: boolean;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onSetCover: (artwork: PortfolioProject["artworks"][number]) => void;
  onToggle: (artworkId: string, isSelected: boolean) => void;
  onUpdate: (artworkId: string, payload: UpdatePortfolioArtworkPayload) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(artwork.title ?? "");
  const [collectionName, setCollectionName] = useState(artwork.collectionName ?? "");
  const [year, setYear] = useState(artwork.year ?? "");
  const [technique, setTechnique] = useState(artwork.technique ?? "");
  const [dimensions, setDimensions] = useState(artwork.dimensions ?? "");
  const [price, setPrice] = useState(artwork.price ?? "");
  const [availability, setAvailability] = useState<PortfolioArtworkAvailability>(artwork.availability);
  const [description, setDescription] = useState(artwork.description ?? "");

  function saveDetails() {
    onUpdate(artwork.id, {
      availability,
      collectionName,
      description,
      dimensions,
      price,
      technique,
      title,
      year,
    });
    setIsEditing(false);
  }

  function closeEditor() {
    setTitle(artwork.title ?? "");
    setCollectionName(artwork.collectionName ?? "");
    setYear(artwork.year ?? "");
    setTechnique(artwork.technique ?? "");
    setDimensions(artwork.dimensions ?? "");
    setPrice(artwork.price ?? "");
    setAvailability(artwork.availability);
    setDescription(artwork.description ?? "");
    setIsEditing(false);
  }

  return (
    <>
      <article
        className={`group flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-white/[0.06] bg-[#0b0d15]/95 shadow-[0_10px_26px_rgba(0,0,0,0.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(0,0,0,0.3)] ${
          artwork.isSelected ? "opacity-100" : "opacity-55"
        } ${isDragging ? "scale-[0.98] opacity-45" : ""} ${
          isDragTarget ? "border-[#1a7cff] ring-2 ring-[#1a7cff]/20" : ""
        }`}
        draggable={!isBusy}
        onDragEnd={onDragEnd}
        onDragOver={(event) => {
          event.preventDefault();
          onDragOver();
        }}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", artwork.id);
          onDragStart();
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDrop();
        }}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-[#eef0f4]">
          <img
            alt={artwork.title || "Portfolio artwork"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
            src={artwork.imageUrl}
          />
          <button
            aria-label={isCoverArtwork ? "Naslovna slika" : "Postavi kao naslovnu sliku"}
            className="absolute left-3 top-3 grid h-7 min-w-7 place-items-center rounded-full border-0 bg-[#05060b]/75 px-2 text-[12px] font-black text-[#f3f4f7] shadow-[0_8px_20px_rgba(0,0,0,0.22)] backdrop-blur"
            disabled={isBusy || isCoverArtwork || !artwork.isSelected}
            onClick={() => onSetCover(artwork)}
            type="button"
          >
            {artwork.isSelected ? artwork.orderIndex + 1 : "—"}
          </button>
          {isCoverArtwork && artwork.isSelected ? (
            <span className="absolute right-3 top-3 inline-flex h-7 items-center rounded-full bg-[#f3f4f7] px-3 text-[10px] font-black uppercase text-[#07080d]">
              Naslovna
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-3.5">
          <div>
            <h3 className="truncate text-[14px] font-black text-[#f3f4f7]">
              {artwork.title || `Rad ${artwork.orderIndex + 1}`}
            </h3>
            <p
              className={`mt-1 truncate text-[12px] ${
                artwork.technique || artwork.year ? "text-[#8d93a5]" : "text-[#ff6b85]"
              }`}
            >
              {[artwork.technique, artwork.year].filter(Boolean).join(", ") || "Dodaj naziv, tehniku i dimenzije"}
            </p>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3">
            <button
              aria-pressed={artwork.isSelected}
              className="inline-flex items-center gap-2 bg-transparent p-0 text-[12px] font-bold text-[#c4c8d4]"
              disabled={isBusy}
              onClick={() => onToggle(artwork.id, !artwork.isSelected)}
              type="button"
            >
              <span className={`relative h-5 w-[34px] rounded-full transition ${artwork.isSelected ? "bg-[#f3f4f7]" : "bg-white/20"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-[#05060b] shadow transition ${artwork.isSelected ? "left-4" : "left-0.5"}`} />
              </span>
              U PDF-u
            </button>

            <button
              className="bg-transparent p-0 text-[12px] font-bold text-[#8d93a5] transition hover:text-[#f3f4f7]"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              Uredi
            </button>
          </div>
        </div>
      </article>

      {isEditing ? (
        <ArtworkEditModal
          artwork={artwork}
          availability={availability}
          collectionName={collectionName}
          description={description}
          dimensions={dimensions}
          isBusy={isBusy}
          onAvailabilityChange={setAvailability}
          onClose={closeEditor}
          onCollectionNameChange={setCollectionName}
          onDescriptionChange={setDescription}
          onDimensionsChange={setDimensions}
          onPriceChange={setPrice}
          onSave={saveDetails}
          onTechniqueChange={setTechnique}
          onTitleChange={setTitle}
          onYearChange={setYear}
          price={price}
          technique={technique}
          title={title}
          year={year}
        />
      ) : null}
    </>
  );
}

function ArtworkEditModal({
  artwork,
  availability,
  collectionName,
  description,
  dimensions,
  isBusy,
  onAvailabilityChange,
  onClose,
  onCollectionNameChange,
  onDescriptionChange,
  onDimensionsChange,
  onPriceChange,
  onSave,
  onTechniqueChange,
  onTitleChange,
  onYearChange,
  price,
  technique,
  title,
  year,
}: {
  artwork: PortfolioProject["artworks"][number];
  availability: PortfolioArtworkAvailability;
  collectionName: string;
  description: string;
  dimensions: string;
  isBusy: boolean;
  onAvailabilityChange: (value: PortfolioArtworkAvailability) => void;
  onClose: () => void;
  onCollectionNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDimensionsChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onSave: () => void;
  onTechniqueChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onYearChange: (value: string) => void;
  price: string;
  technique: string;
  title: string;
  year: string;
}) {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    // The artwork editor is a true modal. While it is open, the builder behind it
    // should not keep scrolling because that makes the modal feel like part of the
    // page instead of a focused editing surface.
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const modal = (
    <div
      className="fixed inset-0 z-[99999] flex h-dvh w-dvw items-center justify-center overflow-hidden bg-[#111318]/70 p-4 backdrop-blur-xl sm:p-6"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-label="Detalji rada"
        aria-modal="true"
        className="relative grid h-[min(90dvh,860px)] w-[min(94dvw,1480px)] overflow-hidden rounded-[28px] border border-white/[0.1] bg-[#0b0d15] text-[#f3f4f7] shadow-[0_44px_150px_rgba(0,0,0,0.56)] lg:grid-cols-[minmax(0,0.95fr)_minmax(470px,1.05fr)]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="relative flex min-h-[300px] items-center justify-center border-b border-white/[0.08] bg-[#10121b] p-4 lg:h-full lg:min-h-0 lg:border-b-0 lg:border-r lg:border-white/[0.08] lg:p-8">
          <div className="absolute left-4 top-4 z-10 rounded-full border border-white/[0.1] bg-[#0b0d15]/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#c4c8d4] backdrop-blur">
            Preview rada
          </div>
          <img
            alt={artwork.title || "Portfolio artwork"}
            className="max-h-[34dvh] w-full rounded-2xl object-contain shadow-[0_26px_80px_rgba(0,0,0,0.32)] lg:max-h-[calc(90dvh-96px)]"
            src={artwork.imageUrl}
          />
        </div>

        <div className="portfolio-builder-scroll h-full min-h-0 overflow-y-auto p-5 sm:p-7 lg:p-9">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1764e8]">
                Detalji za PDF
              </p>
              <h2 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.05em] text-[#f3f4f7]">
                {title || "Bez naziva"}
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-[#9aa0ae]">
                Ovi podaci ulaze u PDF stranicu rada i kasnije mogu da se koriste za sales
                template, katalog ili price list.
              </p>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[18px] font-black text-[#9aa0ae] transition hover:border-white/30 hover:text-white"
              onClick={onClose}
              type="button"
            >
              x
            </button>
          </header>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <BuilderInput label="Naziv rada" value={title} onChange={onTitleChange} />
            <BuilderInput
              label="Kolekcija / serija"
              value={collectionName}
              onChange={onCollectionNameChange}
            />
            <BuilderInput label="Godina" value={year} onChange={onYearChange} />
            <BuilderInput label="Tehnika" value={technique} onChange={onTechniqueChange} />
            <BuilderInput label="Dimenzije" value={dimensions} onChange={onDimensionsChange} />
            <BuilderInput label="Cijena" value={price} onChange={onPriceChange} />
            <label className="grid gap-1.5 text-[11px] font-bold text-[#c4c8d4]">
              Status dostupnosti
              <select
                className={studioInputClassName}
                onChange={(event) =>
                  onAvailabilityChange(event.target.value as PortfolioArtworkAvailability)
                }
                value={availability}
              >
                {artworkAvailabilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 grid gap-1.5 text-[11px] font-bold text-[#c4c8d4]">
            Opis rada
            <textarea
              className={`${studioTextareaClassName} min-h-36`}
              onChange={(event) => onDescriptionChange(event.target.value)}
              value={description}
            />
          </label>

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/[0.08] pt-4">
            <button
              className="rounded-full border-2 border-[#f3f4f7] bg-transparent px-5 py-2 text-[12px] font-black text-[#f3f4f7] transition hover:bg-[#f3f4f7] hover:text-[#07080d]"
              onClick={onClose}
              type="button"
            >
              Odustani
            </button>
            <PrimaryButton disabled={isBusy} onClick={onSave}>
              Sacuvaj rad
            </PrimaryButton>
          </div>
        </div>
      </section>
    </div>
  );

  // The editor cards live inside a scrollable grid column. Rendering the modal
  // through a portal keeps it centered against the full browser viewport instead
  // of letting parent layout/scroll containers influence its position.
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(modal, document.body);
}

function DesignWorkspace({
  designConfig,
  fontStyle,
  includeBranding,
  isSaving,
  isPremium,
  language,
  onDesignConfigChange,
  onFontStyleChange,
  onIncludeBrandingChange,
  onLanguageChange,
  onPageFormatChange,
  onSave,
  pageFormat,
  selectedTemplate,
  onTemplateChange,
}: {
  designConfig: PortfolioDesignConfig;
  fontStyle: PortfolioFontStyle;
  includeBranding: boolean;
  isSaving: boolean;
  isPremium: boolean;
  language: PortfolioLanguage;
  onDesignConfigChange: (config: PortfolioDesignConfig) => void;
  onFontStyleChange: (font: PortfolioFontStyle) => void;
  onIncludeBrandingChange: (include: boolean) => void;
  onLanguageChange: (language: PortfolioLanguage) => void;
  onPageFormatChange: (format: PortfolioPageFormat) => void;
  onSave: () => void;
  pageFormat: PortfolioPageFormat;
  selectedTemplate: PortfolioTemplate;
  onTemplateChange: (template: PortfolioTemplate) => void;
}) {
  const templates: Array<{
    id: PortfolioTemplate;
    title: string;
    description: string;
  }> = [
    {
      id: "INSTITUTIONAL_MINIMAL",
      title: "Institutional Minimal",
      description: "Bijelo, smireno, za galerije i open calls.",
    },
    {
      id: "ARTBOARD_EDITORIAL",
      title: "ArtBoard Editorial",
      description: "Brendiraniji katalog sa ArtBoard potpisom.",
    },
    {
      id: "SALES_PRO",
      title: "Sales / Pro",
      description: "Cijene, dostupnost i kontakt u prvom planu.",
    },
  ];

  function setDesignMode(mode: PortfolioDesignConfig["mode"]) {
    if (mode === "CUSTOM" && !isPremium) {
      return;
    }

    onDesignConfigChange(mode === "CUSTOM" ? { ...designConfig, mode } : createPresetDesignConfig(selectedTemplate));
  }

  function updatePageTemplate(page: PortfolioDesignPageKey, template: PortfolioTemplate) {
    onDesignConfigChange({
      ...designConfig,
      mode: "CUSTOM",
      pages: {
        ...designConfig.pages,
        [page]: template,
      },
    });
  }

  function updateFooterTemplate(footer: PortfolioFooterTemplate) {
    onDesignConfigChange({
      ...designConfig,
      mode: "CUSTOM",
      footer,
    });
  }

  return (
    <>
      <WorkspaceHeader
        label="Korak 3 od 4"
        title="Izaberi dizajn PDF-a"
        description="Šablon određuje izgled svih strana. Format, jezik i font možeš promijeniti bilo kad."
      />

      <div className={styles.designTemplateGrid}>
        {templates.map((template) => (
          <button
            className={`${styles.designTemplateCard} ${
              selectedTemplate === template.id ? styles.selectedDesignTemplate : ""
            }`}
            key={template.id}
            onClick={() => onTemplateChange(template.id)}
            type="button"
          >
            {selectedTemplate === template.id ? (
              <span className={`${styles.designTemplateIndicator} ${styles.selectedDesignTemplateIndicator}`}>
                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
                </svg>
              </span>
            ) : (
              <span className={styles.designTemplateIndicator} />
            )}

            <div className={styles.designTemplatePreview}>
              <div className={styles.designTemplatePage}>
                <div className="h-1.5 w-16 rounded-full bg-black/45" />
                <div className="mt-4 grid h-[70%] grid-cols-[1fr_0.7fr] gap-3">
                  <div className="rounded bg-black/12" />
                  <div className="grid gap-2">
                    <span className="rounded bg-black/18" />
                    <span className="rounded bg-black/10" />
                    <span className="rounded bg-black/16" />
                  </div>
                </div>
                <div className="mt-3 flex gap-1">
                  <span className="h-1.5 w-8 rounded-full bg-black/25" />
                  <span className="h-1.5 w-4 rounded-full bg-[#8b5cf6]" />
                </div>
              </div>
            </div>
            <h3>{template.title}</h3>
            <p>{template.description}</p>
          </button>
        ))}
      </div>

      <Panel className={styles.designSettingsPanel} title="Podešavanja PDF-a">
        <div className={styles.designSettingsGrid}>
          <StudioSegmentedControl
            label="Format"
            onChange={(value) => onPageFormatChange(value as PortfolioPageFormat)}
            options={[{ label: "A4", value: "A4" }, { label: "Letter", value: "US_LETTER" }]}
            value={pageFormat}
          />
          <StudioSegmentedControl
            label="Jezik"
            onChange={(value) => onLanguageChange(value as PortfolioLanguage)}
            options={[{ label: "Crnogorski", value: "ME" }, { label: "English", value: "EN" }]}
            value={language}
          />
          <StudioSegmentedControl
            label="Font"
            onChange={(value) => onFontStyleChange(value as PortfolioFontStyle)}
            options={[{ label: "Sans", value: "SANS" }, { label: "Serif", value: "SERIF" }]}
            value={fontStyle}
          />
          <StudioSegmentedControl
            label="ArtBoard potpis"
            onChange={(value) => onIncludeBrandingChange(value === "on")}
            options={[{ label: "Uključen", value: "on" }, { label: "Isključen", value: "off" }]}
            value={includeBranding ? "on" : "off"}
          />
          <div className={styles.designSaveAction}>
            <SecondaryStudioButton disabled={isSaving} onClick={onSave}>
              {isSaving ? "Čuvam..." : "Sačuvaj podešavanja"}
            </SecondaryStudioButton>
          </div>
        </div>
      </Panel>

      <Panel className={styles.designMixPanel} title="Kombinuj šablone">
        <div className="grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-black text-[#f3f4f7]">Mix stranica iz različitih template-a</p>
              <p className="mt-1 max-w-2xl text-[12px] leading-5 text-[#9aa0ae]">
                Preset mode koristi jedan kompletan template. Custom mode dozvoljava Platinum korisniku da
                izabere poseban dizajn za cover, bio, kolekciju, radove, kontakt i footer.
              </p>
            </div>

            <div className="flex rounded-full bg-white/[0.06] p-1">
              <button
                className={`rounded-full px-4 py-2 text-[11px] font-black transition ${
                  designConfig.mode === "PRESET"
                    ? "bg-[#f3f4f7] text-[#07080d] shadow-sm"
                    : "text-[#8d93a5]"
                }`}
                onClick={() => setDesignMode("PRESET")}
                type="button"
              >
                Preset
              </button>
              <button
                className={`rounded-full px-4 py-2 text-[11px] font-black transition ${
                  designConfig.mode === "CUSTOM"
                    ? "bg-[#f3f4f7] text-[#07080d] shadow-sm"
                    : "text-[#8d93a5]"
                } ${!isPremium ? "cursor-not-allowed opacity-45" : ""}`}
                disabled={!isPremium}
                onClick={() => setDesignMode("CUSTOM")}
                type="button"
              >
                Custom mix
              </button>
            </div>
          </div>

          {!isPremium ? (
            <div className="rounded-2xl border border-[#e6b85c]/30 bg-[#e6b85c]/10 p-4 text-[12px] leading-5 text-[#f3d998]">
              Custom kombinovanje stranica je zaključano za Basic plan. Korisnik može i dalje birati
              jedan kompletan template, a nakon prelaska na Platinum dobija page-by-page izbor.
            </div>
          ) : null}

          <div
            className={`grid gap-3 transition ${
              designConfig.mode !== "CUSTOM" ? "pointer-events-none opacity-45" : ""
            }`}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(Object.keys(pageDesignLabels) as PortfolioDesignPageKey[]).map((page) => (
                <label
                  className="grid gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4"
                  key={page}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8d93a5]">
                    {pageDesignLabels[page]}
                  </span>
                  <select
                    className={studioInputClassName}
                    onChange={(event) => updatePageTemplate(page, event.target.value as PortfolioTemplate)}
                    value={designConfig.pages[page]}
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              <label className="grid gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8d93a5]">
                  Footer
                </span>
                <select
                  className={studioInputClassName}
                  onChange={(event) => updateFooterTemplate(event.target.value as PortfolioFooterTemplate)}
                  value={designConfig.footer}
                >
                  {(Object.keys(footerLabels) as PortfolioFooterTemplate[]).map((footer) => (
                    <option key={footer} value={footer}>
                      {footerLabels[footer]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </Panel>
    </>
  );
}

function ExportWorkspace({
  isGeneratingPdf,
  onGeneratePdf,
  onOpenCleanPdf,
  onOpenPayment,
  onOpenPreview,
  project,
}: {
  isGeneratingPdf: boolean;
  onGeneratePdf: () => void;
  onOpenCleanPdf: () => void;
  onOpenPayment: () => void;
  onOpenPreview: () => void;
  project: PortfolioProject;
}) {
  const [linkCopied, setLinkCopied] = useState(false);
  const canGenerateCleanPdf = project.access.canDownloadCleanPdf;
  const isPremium = project.access.reason === "PREMIUM";
  const accessLabel = canGenerateCleanPdf
    ? "Čist PDF bez vodenog žiga je uključen."
    : "Otključaj čist PDF bez vodenog žiga.";

  async function copyShareLink() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/portfolio-builder/${project.id}/preview`,
    );
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1800);
  }

  function downloadLatestPdf() {
    if (project.latestPdfUrl) {
      window.open(project.latestPdfUrl, "_blank", "noopener,noreferrer");
      return;
    }

    onOpenCleanPdf();
  }

  return (
    <>
      <WorkspaceHeader
        label="Korak 4 od 4"
        title="Izvoz i dijeljenje"
        description="Otvori pregled, generiši čist PDF ili pošalji privatni link galeriji i kupcima."
      />

      <div className={styles.exportContent}>
        <section className={styles.exportHero}>
          <div className={styles.exportHeroCopy}>
            <span className={styles.exportStatus}>
              <i aria-hidden="true" />
              {isPremium ? "Premium članstvo" : canGenerateCleanPdf ? "PDF je otključan" : "PDF izvoz"}
            </span>
            <h2>{accessLabel}</h2>
            <p>
              Pregled uvijek ima ArtBoard vodeni žig. Svaki put kad generišeš čist PDF, čuvamo ga kao novu verziju.
            </p>
          </div>
          <button
            className={styles.exportPrimaryButton}
            disabled={isGeneratingPdf}
            onClick={canGenerateCleanPdf ? onGeneratePdf : onOpenPayment}
            type="button"
          >
            {isGeneratingPdf ? "Generišem..." : canGenerateCleanPdf ? "Generiši PDF" : "Otključaj PDF"}
          </button>
        </section>

        <div className={styles.exportActionGrid}>
          <ExportActionCard
            action="Otvori pregled"
            onClick={onOpenPreview}
            text="Pogledaj cijeli portfolio sa ArtBoard vodenim žigom."
            title="Pregled"
          />
          <ExportActionCard
            action={linkCopied ? "Link kopiran" : "Kopiraj link"}
            onClick={() => void copyShareLink()}
            text="Privatni link za galerije, kupce i saradnike."
            title="Link za dijeljenje"
          />
          <ExportActionCard
            action={canGenerateCleanPdf ? (isGeneratingPdf ? "Generišem..." : "Preuzmi") : "Otključaj"}
            disabled={isGeneratingPdf}
            onClick={canGenerateCleanPdf ? downloadLatestPdf : onOpenPayment}
            text={
              canGenerateCleanPdf
                ? "Čist PDF bez vodenog žiga, spreman za slanje."
                : "Otključaj čist PDF spreman za slanje."
            }
            title="Preuzmi PDF"
          />
        </div>

        <div className={styles.exportHistoryGrid}>
          <section className={styles.exportHistoryCard}>
            <h2>Verzije PDF-a</h2>
            {project.versions.length > 0 ? (
              <div className={styles.exportHistoryList}>
                {project.versions.map((version) => (
                  <button
                    className={styles.exportHistoryItem}
                    key={version.id}
                    onClick={() => window.open(version.pdfUrl, "_blank", "noopener,noreferrer")}
                    type="button"
                  >
                    <span>
                      <strong>Verzija {version.versionNumber}</strong>
                      <small>
                        {formatBuilderDate(version.createdAt)} · {templateLabels[version.template]}
                      </small>
                    </span>
                    <b>PDF</b>
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles.exportEmptyState}>
                Još nema verzija. Prva će se pojaviti ovdje nakon što generišeš PDF.
              </p>
            )}
          </section>

          <section className={styles.exportHistoryCard}>
            <h2>Plaćanje</h2>
            {isPremium ? (
              <p className={styles.exportEmptyState}>Nije potrebno — izvoz je uključen u Premium članstvo.</p>
            ) : project.payments.length > 0 ? (
              <div className={styles.exportHistoryList}>
                {project.payments.map((payment) => (
                  <div className={styles.exportPaymentItem} key={payment.id}>
                    <span>
                      <strong>{formatBuilderEnum(payment.status)}</strong>
                      <small>
                        {payment.paidAt
                          ? `Plaćeno: ${formatBuilderDate(payment.paidAt)}`
                          : `Kreirano: ${formatBuilderDate(payment.createdAt)}`}
                      </small>
                    </span>
                    <b>{formatBuilderMoney(payment.amountCents, payment.currency)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.exportEmptyState}>Nema evidentiranih uplata za ovaj portfolio.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function ExportActionCard({
  action,
  disabled = false,
  onClick,
  text,
  title,
}: {
  action: string;
  disabled?: boolean;
  onClick: () => void;
  text: string;
  title: string;
}) {
  return (
    <article className={styles.exportActionCard}>
      <h2>{title}</h2>
      <p>{text}</p>
      <button disabled={disabled} onClick={onClick} type="button">
        {action}
      </button>
    </article>
  );
}

function formatBuilderEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatBuilderDate(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-ME", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBuilderMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", {
    currency,
    style: "currency",
  }).format(amountCents / 100);
}

function StudioPreviewPanel(props: React.ComponentProps<typeof PreviewPanel>) {
  const {
    artistName,
    collectionCoverUrl,
    collectionName,
    coverImage,
    designConfig,
    discipline,
    profileImageUrl,
    project,
    selectedArtworkItems,
    template,
  } = props;
  const selectedItems = selectedArtworkItems
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .filter((artwork) => artwork.isSelected);
  const previewTemplateLabel = designConfig.mode === "CUSTOM" ? "Custom mix" : templateLabels[template];
  const estimatedPages = Math.max(4, selectedItems.length + 4);
  const mainImage = coverImage || selectedItems[0]?.imageUrl || profileImageUrl;
  const collectionImage = collectionCoverUrl || selectedItems[0]?.imageUrl;

  return (
    <aside className={styles.previewPanel}>
      <div className={styles.previewHeader}>
        <div className={styles.previewLabel}>
          Pregled uživo
        </div>
        <p>
          {previewTemplateLabel} · {project.pageFormat === "US_LETTER" ? "Letter" : "A4"} · {estimatedPages} strana
        </p>
      </div>

      <div className={`${styles.previewScroll} portfolio-builder-scroll`}>
        <PreviewThumbnail label="01 · Naslovna" large>
          <div className={styles.previewCoverImage}>
            {mainImage ? <img alt="" src={mainImage} /> : null}
          </div>
          <div className={styles.previewCoverMeta}>
            <div className={styles.previewCoverText}>
              <strong>{artistName || "Ime umjetnika"}</strong>
              <small>{(discipline || "Vizuelna umjetnost").replace(/,\s*/g, " · ")}</small>
            </div>
            {profileImageUrl ? <img alt="" src={profileImageUrl} /> : null}
          </div>
        </PreviewThumbnail>

        <div className={styles.previewGrid}>
          <PreviewThumbnail label="02 · Profil">
            <div className={styles.previewTextLines}>
              <b />
              <span /><span /><span /><span /><i />
            </div>
          </PreviewThumbnail>

          <PreviewThumbnail label="03 · Kolekcija">
            <div className={styles.previewArtworkImage}>
              {collectionImage ? <img alt="" src={collectionImage} /> : null}
            </div>
            <strong className={styles.previewMiniTitle}>{collectionName || "Kolekcija"}</strong>
          </PreviewThumbnail>

          {selectedItems.slice(0, 4).map((artwork, index) => (
            <PreviewThumbnail key={artwork.id} label={`${String(index + 4).padStart(2, "0")} · Rad`}>
              <div className={styles.previewArtworkImage}>
                <img alt={artwork.title || "Rad"} src={artwork.imageUrl} />
              </div>
              <strong className={styles.previewMiniTitle}>{artwork.title || `Rad ${index + 1}`}</strong>
            </PreviewThumbnail>
          ))}
        </div>

        {estimatedPages > 7 ? <p className={styles.morePages}>+ još {estimatedPages - 7} strana</p> : null}
      </div>
    </aside>
  );
}

function PreviewThumbnail({
  children,
  label,
  large = false,
}: {
  children: React.ReactNode;
  label: string;
  large?: boolean;
}) {
  return (
    <section className={large ? styles.previewThumbnailLarge : styles.previewThumbnail}>
      <span>{label}</span>
      <div>{children}</div>
    </section>
  );
}

function PreviewPanel({
  artistName,
  bio,
  collectionCoverUrl,
  collectionDescription,
  collectionName,
  collectionYear,
  coverImage,
  designConfig,
  discipline,
  email,
  profileImageUrl,
  project,
  selectedArtworks,
  selectedArtworkItems,
  template,
}: {
  artistName: string;
  bio: string;
  collectionCoverUrl: string;
  collectionDescription: string;
  collectionName: string;
  collectionYear: string;
  coverImage?: string | null;
  designConfig: PortfolioDesignConfig;
  discipline: string;
  email: string;
  profileImageUrl: string;
  project: PortfolioProject;
  selectedArtworks: number;
  selectedArtworkItems: PortfolioProject["artworks"];
  template: PortfolioTemplate;
}) {
  const selectedItems = selectedArtworkItems
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .filter((artwork) => artwork.isSelected);
  const featuredArtwork = selectedItems[0];
  const trueProfileImage = profileImageUrl || project.profileImageUrl;
  const trueCoverImage = coverImage || featuredArtwork?.imageUrl || trueProfileImage;
  const trueCollectionCover = collectionCoverUrl || project.collectionCoverUrl || project.coverImageUrl;
  const estimatedPages = Math.max(4, selectedItems.length + 4);
  const previewTemplateLabel =
    designConfig.mode === "CUSTOM" ? "Custom mix" : templateLabels[template];

  return (
    <aside className="hidden min-h-0 border-l border-[#d6a94f]/14 bg-[radial-gradient(circle_at_10%_0%,rgba(214,169,79,0.09),transparent_32%),linear-gradient(180deg,#090e18_0%,#05080e_100%)] xl:flex xl:flex-col">
      <div className="flex h-[70px] items-center justify-between border-b border-[#d6a94f]/14 px-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d6a94f]">
            Live preview
          </p>
          <p className="mt-1 text-[12px] font-bold text-[#f8fafc]">A4 document map</p>
        </div>
        <div className="text-right">
          <span className="rounded-lg border border-[#d6a94f]/22 bg-[#15110a]/70 px-2.5 py-1 text-[10px] font-bold text-[#f3d998] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            {previewTemplateLabel}
          </span>
          <p className="mt-1 text-[10px] font-bold text-[#9aa4b5]">
            {estimatedPages} strana
            {designConfig.mode === "CUSTOM" ? ` / footer ${footerLabels[designConfig.footer]}` : ""}
          </p>
        </div>
      </div>

      <div className="portfolio-builder-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <PreviewMetric label="Radovi" value={String(selectedItems.length)} />
          <PreviewMetric label="Strane" value={String(estimatedPages)} />
          <PreviewMetric
            label="Download"
            value={project.access.canDownloadCleanPdf ? "Clean" : "Watermark"}
          />
        </div>

        {designConfig.mode === "CUSTOM" ? (
          <CustomMixMiniPreview
            artistName={artistName}
            bio={bio}
            collectionCoverUrl={trueCollectionCover}
            collectionDescription={collectionDescription}
            collectionName={collectionName}
            collectionYear={collectionYear}
            coverImage={trueCoverImage}
            designConfig={designConfig}
            discipline={discipline}
            email={email}
            project={project}
            profileImageUrl={trueProfileImage}
            selectedItems={selectedItems}
          />
        ) : template === "ARTBOARD_EDITORIAL" ? (
          <EditorialMiniPreview
            artistName={artistName}
            bio={bio}
            collectionCoverUrl={trueCollectionCover}
            collectionDescription={collectionDescription}
            collectionName={collectionName}
            collectionYear={collectionYear}
            coverImage={trueCoverImage}
            discipline={discipline}
            email={email}
            project={project}
            profileImageUrl={trueProfileImage}
            selectedItems={selectedItems}
          />
        ) : template === "SALES_PRO" ? (
          <SalesMiniPreview
            artistName={artistName}
            collectionCoverUrl={trueCollectionCover}
            collectionDescription={collectionDescription}
            collectionName={collectionName}
            collectionYear={collectionYear}
            coverImage={trueCoverImage}
            discipline={discipline}
            email={email}
            project={project}
            profileImageUrl={trueProfileImage}
            selectedItems={selectedItems}
          />
        ) : (
          <div className="space-y-5 rounded-[24px] border border-[#d6a94f]/16 bg-[linear-gradient(145deg,rgba(17,24,39,0.94),rgba(5,8,14,0.96))] p-4 shadow-[0_26px_70px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <MiniPdfPage label="01 / Cover">
            <div className="flex h-full flex-col">
              <div className="h-[64%] bg-[#eef2f7]">
                {trueCoverImage ? (
                  <img
                    alt=""
                    className="h-full w-full object-cover grayscale"
                    src={trueCoverImage}
                  />
                ) : (
                  <MiniPlaceholder label="Cover slika" />
                )}
              </div>

              <div className="flex flex-1 flex-col px-4 py-3">
                <div className="mb-4 flex items-center justify-between border-b border-[#1f2430] pb-1 text-[7px] font-black">
                  <span>{project.location || "Podgorica"}, {new Date(project.updatedAt).getFullYear()}</span>
                  <span>Portfolio</span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="whitespace-pre-line text-[23px] font-black uppercase leading-[1.08] tracking-[-0.05em]">
                      {toMiniStackedName(artistName || "Ime umjetnika")}
                    </h2>
                    <p className="mt-2 text-[7px] font-black uppercase tracking-[0.42em] text-[#1f2430]">
                      {(discipline || "Vizuelni umjetnik").toUpperCase()}
                    </p>
                  </div>

                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#eef2f7]">
                    {trueProfileImage ? (
                      <img
                        alt={artistName}
                        className="h-full w-full object-cover grayscale"
                        src={trueProfileImage}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </MiniPdfPage>

          <MiniPdfPage label="02 / Profil">
            <div className="grid h-full grid-rows-[auto_1fr_auto] gap-4">
              <MiniSectionTitle title="Profil umjetnika" />
              <div className="grid grid-cols-[1fr_88px] gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.16em]">Biografija</p>
                  <p className="mt-1 line-clamp-[12] text-[8px] leading-[1.6] text-[#374151]">
                    {bio || "Biografija i artist statement ce se prikazati ovdje dok ih uredjujes."}
                  </p>
                </div>
                <div className="space-y-2 border-l border-[#1f2430] pl-3">
                  <MiniInfo label="Email" value={email || "Nije unesen"} />
                  <MiniInfo label="Telefon" value={project.phone || "Nije unesen"} />
                  <MiniInfo label="Lokacija" value={project.location || "Nije unesena"} />
                  <MiniInfo label="Template" value={templateLabels[template]} />
                </div>
              </div>
              <MiniInstitutionalFooter artistName={artistName} />
            </div>
          </MiniPdfPage>

          <MiniPdfPage label="03 / Kolekcija">
            <div className="grid h-full grid-rows-[auto_1fr_auto] gap-4">
              <MiniSectionTitle title="Kolekcija" />
              <div>
                <div className="mb-4 h-28 bg-[#eef2f7]">
                  {trueCollectionCover ? (
                    <img
                      alt=""
                      className="h-full w-full object-cover grayscale"
                      src={trueCollectionCover}
                    />
                  ) : (
                    <MiniPlaceholder label="Cover kolekcije" />
                  )}
                </div>
                <h3 className="text-[10px] font-black uppercase">
                  {collectionName || featuredArtwork?.collectionName || "Naziv kolekcije"}{" "}
                  <span className="font-normal">
                    {collectionYear || featuredArtwork?.year || "Godina"}
                  </span>
                </h3>
                <p className="mt-3 line-clamp-[8] text-[8px] leading-[1.65]">
                  {collectionDescription ||
                    featuredArtwork?.description ||
                    "Opis kolekcije ili uvodni tekst za odabrane radove prikazuje se ovdje."}
                </p>
              </div>
              <MiniInstitutionalFooter artistName={artistName} />
            </div>
          </MiniPdfPage>

          {selectedItems.map((artwork, index) => (
            <MiniPdfPage key={artwork.id} label={`${String(index + 4).padStart(2, "0")} / Rad`}>
              <div className="grid h-full grid-rows-[auto_auto_1fr_auto] gap-4">
                <MiniSectionTitle title="Umjetnicki radovi" />
                <div className="h-40 bg-[#eef2f7]">
                  <img
                    alt={artwork.title || "Artwork"}
                    className="h-full w-full object-cover"
                    src={artwork.imageUrl}
                  />
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <MiniInfo label="Naziv rada" value={artwork.title || "Lorem ipsum dolor"} />
                    <MiniInfo label="Godina" value={artwork.year || "Lorem ipsum dolor"} />
                    <MiniInfo label="Kolekcija" value={artwork.collectionName || "Lorem ipsum dolor"} />
                    <MiniInfo
                      label="Tehnika / disciplina"
                      value={artwork.technique || discipline || "Lorem ipsum dolor"}
                    />
                  </div>
                  <h3 className="mt-4 text-[9px] font-black uppercase">
                    {artwork.title || "Naziv rada"}, {artwork.technique || discipline || "disciplina"},{" "}
                    <span className="font-normal">{artwork.year || "godina"}</span>
                  </h3>
                  <p className="mt-2 line-clamp-[6] text-[7.5px] leading-[1.55]">
                    {artwork.description ||
                      "Opis rada se prikazuje ovdje i prati podatke unesene u editoru."}
                  </p>
                </div>

                <MiniInstitutionalFooter artistName={artistName} />
              </div>
            </MiniPdfPage>
          ))}

          <MiniPdfPage label="Final / Kontakt">
            <div className="grid h-full grid-rows-[auto_auto_auto_1fr_auto] gap-4">
              <MiniSectionTitle title="Kontakt" />

              <div className="grid grid-cols-[74px_1fr] gap-6">
                <div className="h-[74px] bg-[#eef2f7]">
                  {trueProfileImage ? (
                    <img
                      alt={artistName}
                      className="h-full w-full object-cover"
                      src={trueProfileImage}
                    />
                  ) : null}
                </div>
                <div>
                  <h3 className="text-[9px] font-black uppercase">{artistName || "Ime umjetnika"}</h3>
                  <div className="mt-3 space-y-1.5 text-[7.5px]">
                    <MiniContactRow value={email || "Nije unesen"} />
                    <MiniContactRow value={project.phone || "+382 67 262 203"} />
                    <MiniContactRow value={project.websiteUrl || "artstudio360.me"} />
                    <MiniContactRow value={project.location || "Podgorica, Crna Gora"} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[9px] font-black uppercase">Zahvalnica</h3>
                <p className="mt-2 text-[7.5px] leading-[1.55]">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
                </p>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[9px] font-black uppercase">Portfolio linkovi</h3>
                  <ul className="mt-2 space-y-1 text-[7px]">
                    <li>- Behance: behance.net/ivonamedenica</li>
                    <li>- Dribbble: dribbble.com/ivonamedenica</li>
                    <li>- LinkedIn: linkedin.com/in/ivonamedenica</li>
                    <li>- Instagram: {project.instagramUrl || "@ivonamedenica"}</li>
                  </ul>
                </div>
                <div className="text-center">
                  <div className="flex h-12 w-12 items-center justify-center bg-[#eeeeee] text-[7px] font-black">
                    QR
                  </div>
                  <p className="mt-1 text-[5px] font-black uppercase">ArtBoard profil</p>
                </div>
              </div>

              <div className="h-24 bg-[#eef2f7]">
                {trueCoverImage ? (
                  <img alt="" className="h-full w-full object-cover" src={trueCoverImage} />
                ) : null}
              </div>

              <MiniInstitutionalFooter artistName={artistName} />
            </div>
          </MiniPdfPage>
        </div>
        )}
      </div>
    </aside>
  );
}

function CustomMixMiniPreview({
  artistName,
  bio,
  collectionCoverUrl,
  collectionDescription,
  collectionName,
  collectionYear,
  coverImage,
  designConfig,
  discipline,
  email,
  profileImageUrl,
  project,
  selectedItems,
}: {
  artistName: string;
  bio: string;
  collectionCoverUrl?: string | null;
  collectionDescription: string;
  collectionName: string;
  collectionYear: string;
  coverImage?: string | null;
  designConfig: PortfolioDesignConfig;
  discipline: string;
  email: string;
  profileImageUrl?: string | null;
  project: PortfolioProject;
  selectedItems: PortfolioProject["artworks"];
}) {
  const firstArtwork = selectedItems[0];
  const collectionImage = collectionCoverUrl || project.collectionCoverUrl || coverImage;

  return (
    <div className="mt-5 space-y-5">
      <CustomPreviewPage
        footer={designConfig.footer}
        label="01 / Cover"
        template={designConfig.pages.cover}
      >
        <TemplateCoverPreview
          artistName={artistName}
          coverImage={coverImage}
          discipline={discipline}
          profileImageUrl={profileImageUrl}
          project={project}
          template={designConfig.pages.cover}
        />
      </CustomPreviewPage>

      <CustomPreviewPage
        footer={designConfig.footer}
        label="02 / Profil"
        template={designConfig.pages.profile}
      >
        <TemplateProfilePreview
          artistName={artistName}
          bio={bio}
          discipline={discipline}
          selectedItems={selectedItems}
          template={designConfig.pages.profile}
        />
      </CustomPreviewPage>

      <CustomPreviewPage
        footer={designConfig.footer}
        label="03 / Kolekcija"
        template={designConfig.pages.collection}
      >
        <TemplateCollectionPreview
          collectionDescription={collectionDescription}
          collectionImage={collectionImage}
          collectionName={collectionName || firstArtwork?.collectionName || "Naziv kolekcije"}
          collectionYear={collectionYear || firstArtwork?.year || "Godina"}
          template={designConfig.pages.collection}
        />
      </CustomPreviewPage>

      {firstArtwork ? (
        <CustomPreviewPage
          footer={designConfig.footer}
          label="04 / Rad"
          template={designConfig.pages.artwork}
        >
          <TemplateArtworkPreview
            artwork={firstArtwork}
            discipline={discipline}
            template={designConfig.pages.artwork}
          />
        </CustomPreviewPage>
      ) : null}

      <CustomPreviewPage
        footer={designConfig.footer}
        label="Final / Kontakt"
        template={designConfig.pages.contact}
      >
        <TemplateContactPreview
          artistName={artistName}
          coverImage={coverImage}
          email={email}
          profileImageUrl={profileImageUrl}
          project={project}
          template={designConfig.pages.contact}
        />
      </CustomPreviewPage>
    </div>
  );
}

function CustomPreviewPage({
  children,
  footer,
  label,
  template,
}: {
  children: React.ReactNode;
  footer: PortfolioFooterTemplate;
  label: string;
  template: PortfolioTemplate;
}) {
  const style = getMiniTemplateStyle(template);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d6a94f]">
            {label}
          </p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/38">
            {templateLabels[template]} / {footerLabels[footer]} footer
          </p>
        </div>
        <span
          className="h-1.5 w-1.5 rounded-full shadow-[0_0_16px_rgba(214,169,79,0.55)]"
          style={{ backgroundColor: style.accent }}
        />
      </div>

      <div
        className={`aspect-[0.707/1] rounded-md p-5 shadow-[0_26px_80px_rgba(0,0,0,0.5)] ring-1 ${style.pageClassName}`}
      >
        {children}
      </div>
    </section>
  );
}

function TemplateCoverPreview({
  artistName,
  coverImage,
  discipline,
  profileImageUrl,
  project,
  template,
}: {
  artistName: string;
  coverImage?: string | null;
  discipline: string;
  profileImageUrl?: string | null;
  project: PortfolioProject;
  template: PortfolioTemplate;
}) {
  if (template === "SALES_PRO") {
    return (
      <div className="h-full bg-[linear-gradient(135deg,#ffc51d_0%,#db1243_52%,#1048c6_100%)] p-2">
        <div className="flex h-full flex-col bg-[#fbfbfa] p-6 text-black">
          <div className="grid grid-cols-[76px_1fr] items-center gap-6">
            <MiniRoundImage alt={artistName} imageUrl={profileImageUrl} />
            <div>
              <h2 className="whitespace-pre-line text-[21px] font-black uppercase leading-[1]">
                {toMiniStackedName(artistName || "Ime umjetnika")}
              </h2>
              <p className="mt-2 text-[6px] font-black uppercase tracking-[0.18em]">
                {(discipline || "Vizuelni umjetnik").toUpperCase()}
              </p>
              <div className="mt-3 flex items-center gap-1">
                <MiniSalesDots />
                <span className="ml-1 text-[5.8px] font-black uppercase">
                  Portfolio, {new Date(project.updatedAt).getFullYear()}
                </span>
              </div>
            </div>
          </div>
          <MiniImageBlock className="mt-8 flex-1" imageUrl={coverImage} label="Cover slika" />
        </div>
      </div>
    );
  }

  if (template === "ARTBOARD_EDITORIAL") {
    return (
      <div className="flex h-full flex-col bg-[#fbfbfa] text-[#111827]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="whitespace-pre-line text-[21px] font-black uppercase leading-[1.08] tracking-[-0.05em]">
              {toMiniStackedName(artistName || "Ime umjetnika")}
            </h2>
            <p className="mt-2 text-[6.5px] font-black uppercase tracking-[0.38em] text-[#7b8494]">
              {(discipline || "Vizuelni umjetnik").toUpperCase()}
            </p>
          </div>
          <div className="h-20 w-16 overflow-hidden rounded-lg bg-[#eef2f7]">
            {profileImageUrl ? (
              <img alt={artistName} className="h-full w-full object-cover grayscale" src={profileImageUrl} />
            ) : (
              <MiniPlaceholder label="Profil" />
            )}
          </div>
        </div>
        <div className="mt-6 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#ffc41d]" />
          <span className="h-2 w-2 rounded-full bg-[#dc1735]" />
          <span className="h-2 w-2 rounded-full bg-[#182fc7]" />
          <span className="ml-2 text-[7px] font-black uppercase tracking-[0.18em]">
            Portfolio, {new Date(project.updatedAt).getFullYear()}
          </span>
        </div>
        <MiniImageBlock className="mt-auto h-[58%]" imageUrl={coverImage} label="Cover slika" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <MiniImageBlock className="h-[64%] grayscale" imageUrl={coverImage} label="Cover slika" />
      <div className="flex flex-1 flex-col px-4 py-3 text-[#1f2430]">
        <div className="mb-4 flex items-center justify-between border-b border-[#1f2430] pb-1 text-[7px] font-black">
          <span>{project.location || "Podgorica"}, {new Date(project.updatedAt).getFullYear()}</span>
          <span>Portfolio</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="whitespace-pre-line text-[23px] font-black uppercase leading-[1.08] tracking-[-0.05em]">
              {toMiniStackedName(artistName || "Ime umjetnika")}
            </h2>
            <p className="mt-2 text-[7px] font-black uppercase tracking-[0.42em]">
              {(discipline || "Vizuelni umjetnik").toUpperCase()}
            </p>
          </div>
          <MiniRoundImage alt={artistName} imageUrl={profileImageUrl} />
        </div>
      </div>
    </div>
  );
}

function TemplateProfilePreview({
  artistName,
  bio,
  discipline,
  selectedItems,
  template,
}: {
  artistName: string;
  bio: string;
  discipline: string;
  selectedItems: PortfolioProject["artworks"];
  template: PortfolioTemplate;
}) {
  const previewWorks = selectedItems.slice(0, template === "ARTBOARD_EDITORIAL" ? 6 : 9);

  return (
    <div className="flex h-full flex-col text-[#1f2430]">
      <TemplateMiniTitle template={template} title={template === "SALES_PRO" ? "O UMJETNIKU" : "Profil umjetnika"} />
      <p className="mt-4 line-clamp-[10] text-[7.5px] leading-[1.58]">
        {bio || "Biografija i artist statement ce se prikazati ovdje dok ih uredjujes."}
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {Array.from({ length: previewWorks.length || 6 }).map((_, index) => {
          const artwork = previewWorks[index];

          return (
            <div
              className="aspect-square overflow-hidden rounded-md bg-[#eef2f7]"
              key={artwork?.id ?? `custom-profile-work-${index}`}
            >
              {artwork?.imageUrl ? (
                <img alt={artwork.title || "Artwork"} className="h-full w-full object-cover" src={artwork.imageUrl} />
              ) : (
                <MiniPlaceholder label="Rad" />
              )}
            </div>
          );
        })}
      </div>
      <TemplateMiniFooter artistName={artistName} template={template} />
    </div>
  );
}

function TemplateCollectionPreview({
  collectionDescription,
  collectionImage,
  collectionName,
  collectionYear,
  template,
}: {
  collectionDescription: string;
  collectionImage?: string | null;
  collectionName: string;
  collectionYear: string;
  template: PortfolioTemplate;
}) {
  return (
    <div className="flex h-full flex-col text-[#1f2430]">
      <TemplateMiniTitle template={template} title="Kolekcija" />
      <MiniImageBlock className="mt-4 h-40" imageUrl={collectionImage} label="Cover kolekcije" />
      <h3 className="mt-5 text-[10px] font-black uppercase">
        {collectionName} <span className="font-normal text-[#6b7280]">{collectionYear}</span>
      </h3>
      <p className="mt-3 line-clamp-[8] text-[7.5px] leading-[1.6]">
        {collectionDescription || "Opis kolekcije ili uvodni tekst za odabrane radove prikazuje se ovdje."}
      </p>
    </div>
  );
}

function TemplateArtworkPreview({
  artwork,
  discipline,
  template,
}: {
  artwork: PortfolioProject["artworks"][number];
  discipline: string;
  template: PortfolioTemplate;
}) {
  return (
    <div className="flex h-full flex-col text-[#1f2430]">
      <TemplateMiniTitle template={template} title="Umjetnicki radovi" />
      <MiniImageBlock className="mt-4 h-40" imageUrl={artwork.imageUrl} label="Rad" />
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
        <MiniInfo label="Naziv rada" value={artwork.title || "Lorem ipsum dolor"} />
        <MiniInfo label="Godina" value={artwork.year || "2026"} />
        <MiniInfo label="Kolekcija" value={artwork.collectionName || "Lorem ipsum dolor"} />
        <MiniInfo label="Tehnika" value={artwork.technique || discipline || "Lorem ipsum dolor"} />
      </div>
      <p className="mt-4 line-clamp-[5] text-[7px] leading-[1.55]">
        {artwork.description || "Opis rada se prikazuje ovdje i prati podatke unesene u editoru."}
      </p>
    </div>
  );
}

function TemplateContactPreview({
  artistName,
  coverImage,
  email,
  profileImageUrl,
  project,
  template,
}: {
  artistName: string;
  coverImage?: string | null;
  email: string;
  profileImageUrl?: string | null;
  project: PortfolioProject;
  template: PortfolioTemplate;
}) {
  return (
    <div className="flex h-full flex-col text-[#1f2430]">
      <TemplateMiniTitle template={template} title="Kontakt" />
      <div className="mt-4 grid grid-cols-[76px_1fr] gap-5">
        <div className="h-[76px] overflow-hidden rounded-lg bg-[#eef2f7]">
          {profileImageUrl ? (
            <img alt={artistName} className="h-full w-full object-cover" src={profileImageUrl} />
          ) : (
            <MiniPlaceholder label="Profil" />
          )}
        </div>
        <div>
          <h3 className="text-[9px] font-black uppercase">{artistName || "Ime umjetnika"}</h3>
          <div className="mt-2 space-y-1.5 text-[7.5px]">
            <MiniContactRow value={email || "Nije unesen"} />
            <MiniContactRow value={project.phone || "+382 67 262 203"} />
            <MiniContactRow value={project.websiteUrl || "artstudio360.me"} />
            <MiniContactRow value={project.location || "Podgorica, Crna Gora"} />
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[9px] font-black uppercase">Portfolio linkovi</h3>
          <ul className="mt-2 space-y-1 text-[7px]">
            <li>- Behance: behance.net/artist</li>
            <li>- Instagram: {project.instagramUrl || "@artist"}</li>
          </ul>
        </div>
        <div className="text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-[#eeeeee] text-[7px] font-black">
            QR
          </div>
          <p className="mt-1 text-[5px] font-black uppercase">ArtBoard profil</p>
        </div>
      </div>
      <MiniImageBlock className="mt-5 h-24" imageUrl={coverImage} label="Rad" />
    </div>
  );
}

function TemplateMiniTitle({ template, title }: { template: PortfolioTemplate; title: string }) {
  if (template === "SALES_PRO") {
    return <MiniSalesSectionTitle title={title} />;
  }

  if (template === "ARTBOARD_EDITORIAL") {
    return (
      <MiniEditorialSection color="#182fc7" title={title}>
        <span className="sr-only">{title}</span>
      </MiniEditorialSection>
    );
  }

  return <MiniSectionTitle title={title} />;
}

function TemplateMiniFooter({ artistName, template }: { artistName: string; template: PortfolioTemplate }) {
  if (template === "SALES_PRO") {
    return <MiniSalesFooter artistName={artistName} />;
  }

  if (template === "ARTBOARD_EDITORIAL") {
    return <MiniEditorialFooter artistName={artistName} />;
  }

  return <MiniInstitutionalFooter artistName={artistName} />;
}

function MiniImageBlock({
  className = "",
  imageUrl,
  label,
}: {
  className?: string;
  imageUrl?: string | null;
  label: string;
}) {
  return (
    <div className={`overflow-hidden bg-[#eef2f7] ${className}`}>
      {imageUrl ? (
        <img alt="" className="h-full w-full object-cover" src={imageUrl} />
      ) : (
        <MiniPlaceholder label={label} />
      )}
    </div>
  );
}

function MiniRoundImage({ alt, imageUrl }: { alt: string; imageUrl?: string | null }) {
  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#eef2f7]">
      {imageUrl ? (
        <img alt={alt} className="h-full w-full object-cover grayscale" src={imageUrl} />
      ) : (
        <MiniPlaceholder label="Profil" />
      )}
    </div>
  );
}

function getMiniTemplateStyle(template: PortfolioTemplate) {
  if (template === "SALES_PRO") {
    return {
      accent: "#db1243",
      pageClassName: "bg-[#fbfbfa] text-[#1f2430] ring-[#db1243]/40",
    };
  }

  if (template === "ARTBOARD_EDITORIAL") {
    return {
      accent: "#182fc7",
      pageClassName: "bg-[#fbfbfa] text-[#1f2430] ring-[#182fc7]/35",
    };
  }

  return {
    accent: "#d6a94f",
    pageClassName: "bg-[#fbfbfa] text-[#1f2430] ring-[#f3d998]/28",
  };
}

function SalesMiniPreview({
  artistName,
  collectionCoverUrl,
  collectionDescription,
  collectionName,
  collectionYear,
  coverImage,
  discipline,
  email,
  profileImageUrl,
  project,
  selectedItems,
}: {
  artistName: string;
  collectionCoverUrl?: string | null;
  collectionDescription: string;
  collectionName: string;
  collectionYear: string;
  coverImage?: string | null;
  discipline: string;
  email: string;
  profileImageUrl?: string | null;
  project: PortfolioProject;
  selectedItems: PortfolioProject["artworks"];
}) {
  const featuredArtwork = selectedItems[0];
  const collectionImage = collectionCoverUrl || project.collectionCoverUrl || coverImage;
  const profileText =
    project.biography ||
    "Ovdje unesite biografiju umjetnika. Tekst treba kratko da predstavi praksu, iskustvo i umjetnicki razvoj.";
  const selectedPreviewWorks = selectedItems.slice(0, 9);

  return (
    <div className="mt-5 space-y-5">
      <MiniPdfPage label="01 / Sales cover">
        <div className="h-full bg-[linear-gradient(135deg,#ffc51d_0%,#db1243_52%,#1048c6_100%)] p-2">
          <div className="flex h-full flex-col bg-[#fbfbfa] p-6">
            <div className="grid grid-cols-[82px_1fr] items-center gap-7">
              <div className="h-[82px] overflow-hidden rounded-full bg-[#eef2f7]">
                {profileImageUrl ? (
                  <img
                    alt={artistName}
                    className="h-full w-full object-cover"
                    src={profileImageUrl}
                  />
                ) : (
                  <MiniPlaceholder label="Profil" />
                )}
              </div>

              <div className="min-w-0">
                <h2 className="whitespace-pre-line text-[22px] font-black uppercase leading-[1] tracking-[-0.05em] text-black">
                  {toMiniStackedName(artistName || "Ime umjetnika")}
                </h2>
                <p className="mt-2 text-[6px] font-black uppercase tracking-[0.18em] text-[#1f2430]">
                  {(discipline || "Vizuelna umjetnica").toUpperCase()}
                </p>
                <div className="mt-3 flex items-center gap-1">
                  <MiniSalesDots />
                  <span className="ml-1 text-[5.8px] font-black uppercase">
                    Portfolio, {new Date(project.updatedAt).getFullYear()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex-1 overflow-hidden rounded-sm bg-[#eef2f7]">
              {coverImage ? (
                <img
                  alt="Cover artwork"
                  className="h-full w-full object-cover"
                  src={coverImage}
                />
              ) : (
                <MiniPlaceholder label="Cover slika" />
              )}
            </div>
          </div>
        </div>
      </MiniPdfPage>

      <MiniPdfPage label="02 / O umjetniku">
        <div className="flex h-full flex-col px-4 py-3">
          <MiniSalesSectionTitle title="O UMJETNIKU" />
          <p className="mt-4 line-clamp-[9] text-[7.5px] leading-[1.55] text-[#1f2430]">
            {profileText}
          </p>
          <p className="mt-3 line-clamp-[7] text-[7.5px] leading-[1.55] text-[#1f2430]">
            {project.artistStatement ||
              "Ovdje se prikazuje artist statement: ideje, motivi, proces i teme koje se ponavljaju u radu."}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, index) => {
              const artwork = selectedPreviewWorks[index];

              return (
                <div
                  className="aspect-square overflow-hidden rounded-sm bg-[#eef2f7]"
                  key={artwork?.id ?? `empty-sales-profile-${index}`}
                >
                  {artwork?.imageUrl ? (
                    <img
                      alt={artwork.title || "Artwork"}
                      className="h-full w-full object-cover"
                      src={artwork.imageUrl}
                    />
                  ) : (
                    <MiniPlaceholder label="Rad" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-auto">
            <MiniSalesFooter artistName={artistName} />
          </div>
        </div>
      </MiniPdfPage>

      <MiniPdfPage label="03 / Kolekcija">
        <div className="flex h-full flex-col px-4 py-3">
          <MiniSalesSectionTitle title="KOLEKCIJA" />
          <div className="mt-4 h-[205px] overflow-hidden rounded-sm bg-[#eef2f7]">
            {collectionImage ? (
              <img
                alt="Collection cover"
                className="h-full w-full object-cover"
                src={collectionImage}
              />
            ) : (
              <MiniPlaceholder label="Cover kolekcije" />
            )}
          </div>

          <h3 className="mt-5 text-[8px] font-black uppercase text-[#1f2430]">
            {collectionName || featuredArtwork?.collectionName || "Naziv kolekcije"}{" "}
            <span className="font-normal">
              {collectionYear || featuredArtwork?.year || "Godina"}
            </span>
          </h3>
          <p className="mt-3 line-clamp-[7] text-[7px] leading-[1.55] text-[#1f2430]">
            {collectionDescription ||
              featuredArtwork?.description ||
              "Opis kolekcije jos nije unesen. Ovdje ce se prikazati uvodni tekst o seriji radova."}
          </p>

          <div className="mt-auto">
            <MiniSalesFooter artistName={artistName} />
          </div>
        </div>
      </MiniPdfPage>

      {selectedItems.map((artwork, index) => (
        <MiniPdfPage key={artwork.id} label={`${String(index + 4).padStart(2, "0")} / Sales rad`}>
          <div className="flex h-full flex-col px-4 py-3">
            <MiniSalesSectionTitle title="UMJETNICKI RADOVI" />
            <div className="mt-4 h-[205px] overflow-hidden rounded-sm bg-[#eef2f7]">
              <img
                alt={artwork.title || "Artwork"}
                className="h-full w-full object-cover"
                src={artwork.imageUrl}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
              <MiniInfo label="Naziv rada" value={artwork.title || "Lorem ipsum dolor"} />
              <MiniInfo label="Godina" value={artwork.year || "Lorem ipsum dolor"} />
              <MiniInfo label="Kolekcija" value={artwork.collectionName || "Lorem ipsum dolor"} />
              <MiniInfo
                label="Tehnika / disciplina"
                value={artwork.technique || discipline || "Lorem ipsum dolor"}
              />
            </div>

            <h3 className="mt-5 text-[8.5px] font-black uppercase">
              {artwork.title || "Naziv rada"}, {artwork.technique || discipline || "disciplina"},{" "}
              <span className="font-normal">{artwork.year || "godina"}</span>
            </h3>
            <p className="mt-3 line-clamp-[5] text-[7px] leading-[1.55]">
              {artwork.description || "Opis rada i prodajni detalji prikazuju se ovdje."}
            </p>

            <div className="mt-auto">
              <MiniSalesFooter artistName={artistName} />
            </div>
          </div>
        </MiniPdfPage>
      ))}

      <MiniPdfPage label="Final / Kontakt">
        <div className="flex h-full flex-col px-4 py-3">
          <MiniSalesSectionTitle title="KONTAKT" />
          <div className="mt-4 grid grid-cols-[84px_1fr] gap-7">
            <div className="h-[84px] overflow-hidden rounded-sm bg-[#eef2f7]">
              {profileImageUrl ? (
                <img
                  alt={artistName}
                  className="h-full w-full object-cover"
                  src={profileImageUrl}
                />
              ) : (
                <MiniPlaceholder label="Profil" />
              )}
            </div>
            <div>
              <h3 className="text-[7px] font-black uppercase">{artistName || "Ime umjetnika"}</h3>
              <div className="mt-3 space-y-1.5 text-[6.8px]">
                <MiniContactRow value={email || "Nije unesen"} />
                <MiniContactRow value={project.phone || "+382 67 262 203"} />
                <MiniContactRow value={project.websiteUrl || "artstudio360.me"} />
                <MiniContactRow value={project.location || "Podgorica, Crna Gora"} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <MiniSalesSectionTitle title="PORTFOLIO LINKOVI" />
              <ul className="mt-3 space-y-1 text-[6.5px]">
                <li>- Behance: behance.net/ivonamedenica</li>
                <li>- Dribbble: dribbble.com/ivonamedenica</li>
                <li>- LinkedIn: linkedin.com/in/ivonamedenica</li>
                <li>- Instagram: {project.instagramUrl || "@ivonamedenica"}</li>
              </ul>
            </div>
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-[#eeeeee] text-[7px] font-black">
                QR
              </div>
              <p className="mt-1 text-[5px] font-black uppercase">ArtBoard profil</p>
            </div>
          </div>

          <div className="mt-6 h-28 overflow-hidden rounded-sm bg-[#eef2f7]">
            {collectionImage ? (
              <img alt="" className="h-full w-full object-cover" src={collectionImage} />
            ) : (
              <MiniPlaceholder label="Rad" />
            )}
          </div>

          <div className="mt-auto">
            <MiniSalesFooter artistName={artistName} />
          </div>
        </div>
      </MiniPdfPage>
    </div>
  );
}

function EditorialMiniPreview({
  artistName,
  bio,
  collectionCoverUrl,
  collectionDescription,
  collectionName,
  collectionYear,
  coverImage,
  discipline,
  email,
  profileImageUrl,
  project,
  selectedItems,
}: {
  artistName: string;
  bio: string;
  collectionCoverUrl?: string | null;
  collectionDescription: string;
  collectionName: string;
  collectionYear: string;
  coverImage?: string | null;
  discipline: string;
  email: string;
  profileImageUrl?: string | null;
  project: PortfolioProject;
  selectedItems: PortfolioProject["artworks"];
}) {
  const featuredArtwork = selectedItems[0];
  const collectionImage = collectionCoverUrl || project.collectionCoverUrl || coverImage;
  const previewArtworks = selectedItems.slice(0, 6);

  return (
    <div className="mt-5 space-y-5">
      <MiniPdfPage label="01 / Editorial cover">
        <div className="flex h-full flex-col bg-[#fbfbfa]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="whitespace-pre-line text-[21px] font-black uppercase leading-[1.08] tracking-[-0.05em] text-[#111827]">
                {toMiniStackedName(artistName || "Ime umjetnika")}
              </h2>
              <p className="mt-2 text-[6.5px] font-black uppercase tracking-[0.38em] text-[#7b8494]">
                {(discipline || "Vizuelni umjetnik").toUpperCase()}
              </p>
            </div>

            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-[#eef2f7]">
              {profileImageUrl ? (
                <img
                  alt={artistName}
                  className="h-full w-full object-cover grayscale"
                  src={profileImageUrl}
                />
              ) : (
                <MiniPlaceholder label="Profil" />
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ffc41d]" />
            <span className="h-2 w-2 rounded-full bg-[#dc1735]" />
            <span className="h-2 w-2 rounded-full bg-[#182fc7]" />
            <span className="ml-2 text-[7px] font-black uppercase tracking-[0.18em] text-[#1f2430]">
              Portfolio, {new Date(project.updatedAt).getFullYear()}
            </span>
          </div>

          <div className="mt-auto h-[58%] overflow-hidden rounded-t-xl bg-[#eef2f7]">
            {coverImage ? (
              <img
                alt="Cover artwork"
                className="h-full w-full object-cover"
                src={coverImage}
              />
            ) : (
              <MiniPlaceholder label="Cover slika" />
            )}
          </div>
        </div>
      </MiniPdfPage>

      <MiniPdfPage label="02 / Bio + izdvojeni radovi">
        <div className="grid h-full grid-rows-[auto_auto_1fr] gap-4">
          <MiniEditorialSection color="#182fc7" title="Biografija umjetnika">
            <p className="line-clamp-[7] text-[7.5px] leading-[1.55] text-[#1f2430]">
              {bio ||
                "Ovdje unesite biografiju umjetnika. Tekst treba kratko da predstavi praksu, iskustvo i umjetnicki razvoj."}
            </p>
          </MiniEditorialSection>

          <MiniEditorialSection color="#dc1735" title="O radu umjetnika">
            <p className="line-clamp-[6] text-[7.5px] leading-[1.55] text-[#1f2430]">
              {project.artistStatement ||
                "Ovdje se prikazuje artist statement: ideje, motivi, proces i teme koje se ponavljaju u radu."}
            </p>
          </MiniEditorialSection>

          <MiniEditorialSection color="#ffc41d" title="Izdvojeni umjetnicki radovi">
            <div className="mt-2 grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, index) => {
                const artwork = previewArtworks[index];

                return (
                  <div
                    className="aspect-square overflow-hidden rounded-md bg-[#edf6fb]"
                    key={artwork?.id ?? `empty-editorial-artwork-${index}`}
                  >
                    {artwork?.imageUrl ? (
                      <img
                        alt={artwork.title || "Artwork"}
                        className="h-full w-full object-cover"
                        src={artwork.imageUrl}
                      />
                    ) : (
                      <MiniPlaceholder label="Rad" />
                    )}
                  </div>
                );
              })}
            </div>
          </MiniEditorialSection>
        </div>
      </MiniPdfPage>

      <MiniPdfPage label="03 / Kolekcija">
        <div className="flex h-full flex-col">
          <MiniEditorialSection color="#dc1735" title="Kolekcija radova">
            <div className="mt-3 h-36 overflow-hidden rounded-lg bg-[#eef2f7]">
              {collectionImage ? (
                <img
                  alt="Collection cover"
                  className="h-full w-full object-cover"
                  src={collectionImage}
                />
              ) : (
                <MiniPlaceholder label="Cover kolekcije" />
              )}
            </div>

            <h3 className="mt-5 text-[11px] font-black uppercase text-[#1f2430]">
              {collectionName || featuredArtwork?.collectionName || "Naziv kolekcije"}{" "}
              <span className="font-normal text-[#6b7280]">
                {collectionYear || featuredArtwork?.year || "Godina"}
              </span>
            </h3>
            <p className="mt-3 line-clamp-[8] text-[7.5px] leading-[1.6] text-[#1f2430]">
              {collectionDescription ||
                featuredArtwork?.description ||
                "Opis kolekcije jos nije unesen. Ovdje ce se prikazati uvodni tekst o seriji radova."}
            </p>
          </MiniEditorialSection>
          <MiniEditorialFooter artistName={artistName} />
        </div>
      </MiniPdfPage>

      {selectedItems.map((artwork, index) => (
        <MiniPdfPage key={artwork.id} label={`${String(index + 4).padStart(2, "0")} / Editorial rad`}>
          <div className="flex h-full flex-col">
            <MiniEditorialSection
              color="#182fc7"
              title={`${String(index + 1).padStart(2, "0")} / Umjetnicki rad`}
            >
              <div className="mt-3 h-36 overflow-hidden rounded-lg bg-[#eef2f7]">
                <img
                  alt={artwork.title || "Artwork"}
                  className="h-full w-full object-contain"
                  src={artwork.imageUrl}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                <MiniInfo label="Naziv rada" value={artwork.title || "Lorem ipsum dolor"} />
                <MiniInfo label="Godina" value={artwork.year || "2026"} />
                <MiniInfo label="Kolekcija" value={artwork.collectionName || "Lorem ipsum dolor"} />
                <MiniInfo
                  label="Tehnika"
                  value={artwork.technique || discipline || "Lorem ipsum dolor"}
                />
              </div>

              <h3 className="mt-4 text-[9px] font-black uppercase">
                {artwork.title || "Naziv rada"},{" "}
                <span className="font-normal text-[#6b7280]">{artwork.year || "godina"}</span>
              </h3>
              <p className="mt-2 line-clamp-[5] text-[7px] leading-[1.55]">
                {artwork.description || "Opis rada se prikazuje ovdje i prati podatke unesene u editoru."}
              </p>
            </MiniEditorialSection>
            <MiniEditorialFooter artistName={artistName} />
          </div>
        </MiniPdfPage>
      ))}

      <MiniPdfPage label="Final / Kontakt">
        <div className="flex h-full flex-col">
          <MiniEditorialSection color="#ffc41d" title="Kontakt">
            <div className="mt-4 grid grid-cols-[76px_1fr] gap-5">
              <div className="h-[76px] overflow-hidden rounded-lg bg-[#eef2f7]">
                {profileImageUrl ? (
                  <img
                    alt={artistName}
                    className="h-full w-full object-cover grayscale"
                    src={profileImageUrl}
                  />
                ) : (
                  <MiniPlaceholder label="Profil" />
                )}
              </div>
              <div>
                <h3 className="text-[9px] font-black uppercase">{artistName || "Ime umjetnika"}</h3>
                <div className="mt-2 space-y-1.5 text-[7.5px]">
                  <MiniContactRow value={email || "Nije unesen"} />
                  <MiniContactRow value={project.phone || "+382 67 262 203"} />
                  <MiniContactRow value={project.websiteUrl || "artstudio360.me"} />
                  <MiniContactRow value={project.location || "Podgorica, Crna Gora"} />
                </div>
              </div>
            </div>

            <h3 className="mt-6 text-[9px] font-black uppercase">Portfolio linkovi</h3>
            <ul className="mt-2 space-y-1 text-[7px]">
              <li>- Behance: behance.net/artist</li>
              <li>- LinkedIn: linkedin.com/in/artist</li>
              <li>- Instagram: {project.instagramUrl || "@artist"}</li>
            </ul>

            <div className="mt-4 h-20 overflow-hidden rounded-md bg-[#eef2f7]">
              {coverImage ? (
                <img alt="" className="h-full w-full object-cover" src={coverImage} />
              ) : (
                <MiniPlaceholder label="Rad" />
              )}
            </div>
          </MiniEditorialSection>
          <MiniEditorialFooter artistName={artistName} />
        </div>
      </MiniPdfPage>
    </div>
  );
}

function MiniEditorialSection({
  children,
  color,
  title,
}: {
  children: React.ReactNode;
  color: string;
  title: string;
}) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-[8.5px] font-black uppercase tracking-[0.06em] text-[#1f2430]">
          {title}
        </h3>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function MiniEditorialFooter({ artistName }: { artistName: string }) {
  return (
    <footer className="mt-auto flex items-center justify-between border-t border-[#1f2430] pt-2 text-[6px] font-black uppercase">
      <span className="max-w-[170px] truncate">{artistName || "Ime umjetnika"}</span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-[#182fc7]" />
        <span className="h-2 w-2 rounded-full bg-[#dc1735]" />
        <span className="h-2 w-2 rounded-full bg-[#ffc41d]" />
        <span className="ml-1">Portfolio</span>
      </span>
    </footer>
  );
}

function MiniSalesSectionTitle({ title }: { title: string }) {
  return (
    <h3 className="bg-[radial-gradient(circle_at_0%_0%,#ffc51d_0%,#db1243_48%,#1048c6_100%)] bg-clip-text text-[10px] font-black uppercase tracking-[0.06em] text-transparent">
      {title}
    </h3>
  );
}

function MiniSalesDots() {
  return (
    <>
      <span className="h-1.5 w-1.5 rounded-full bg-[#182fc7]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#dc1735]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#ffc41d]" />
    </>
  );
}

function MiniSalesFooter({ artistName }: { artistName: string }) {
  return (
    <footer className="flex items-center justify-between pt-2 text-[5.8px] font-black uppercase">
      <span className="max-w-[170px] truncate">{artistName || "Ime umjetnika"}</span>
      <span className="flex items-center gap-1">
        <MiniSalesDots />
        <span className="ml-1">Portfolio</span>
      </span>
    </footer>
  );
}

function SaveNotice({ error, message }: { error: string | null; message: string | null }) {
  if (!error && !message) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-[12px] font-semibold shadow-[0_16px_42px_rgba(17,19,24,0.08)] ${
        error
          ? "border-[#ff4f73]/35 bg-[#fff1f4] text-[#b51638]"
          : "border-[#35d07f]/35 bg-[#effbf4] text-[#147a42]"
      }`}
    >
      {error || message}
    </div>
  );
}

function MiniPdfPage({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d6a94f]">{label}</p>
        <span className="h-1.5 w-1.5 rounded-full bg-[#d6a94f] shadow-[0_0_16px_rgba(214,169,79,0.55)]" />
      </div>
      <div className="aspect-[0.707/1] rounded-md bg-[#fbfbfa] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.5)] ring-1 ring-[#f3d998]/28">
        {children}
      </div>
    </section>
  );
}

function MiniSectionTitle({ title }: { title: string }) {
  return (
    <header className="border-b border-[#1f2430] pb-2">
      <h3 className="text-[10px] font-black uppercase tracking-[0.13em]">{title}</h3>
    </header>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-[#6b7280]">{label}</p>
      <p className="mt-0.5 break-words text-[8px] font-semibold leading-4 text-[#1f2430]">
        {value}
      </p>
    </div>
  );
}

function MiniContactRow({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative h-2.5 w-2.5 shrink-0 rounded-full bg-black">
        <span className="absolute left-1/2 top-[2px] h-[1px] w-[1px] -translate-x-1/2 rounded-full bg-white" />
        <span className="absolute bottom-[2px] left-1/2 h-[3px] w-[1px] -translate-x-1/2 rounded-sm bg-white" />
      </span>
      <span>{value}</span>
    </div>
  );
}

function MiniInstitutionalFooter({ artistName }: { artistName: string }) {
  return (
    <footer className="mt-auto flex items-center justify-between border-t border-[#1f2430] pt-2 text-[6px] font-black uppercase">
      <span className="max-w-[170px] truncate">{artistName || "Ime umjetnika"}</span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-[#182fc7]" />
        <span className="h-2 w-2 rounded-full bg-[#dc1735]" />
        <span className="h-2 w-2 rounded-full bg-[#ffc41d]" />
        <span className="ml-1">Portfolio</span>
      </span>
    </footer>
  );
}

function MiniPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-center text-[9px] font-black uppercase tracking-[0.22em] text-[#8b94a7]">
      {label}
    </div>
  );
}

function MiniPdfFooter({ email, page }: { email: string; page: string }) {
  return (
    <footer className="flex items-end justify-between border-t border-[#d5dbe5] pt-2 text-[8px] font-black">
      <span>ArtBoard</span>
      <span className="max-w-[150px] truncate text-[#6b7280]">{email || "contact@email.com"}</span>
      <span>{page}</span>
    </footer>
  );
}

function toMiniStackedName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return name.toUpperCase();
  }

  return parts.join("\n").toUpperCase();
}

function WorkspaceHeader({
  action,
  description,
  label,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  label: string;
  title: string;
}) {
  return (
    <header className="px-1 pb-2 pt-1">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8d93a5]">
            {label}
          </p>
          <h1 className="mt-3 text-[clamp(2rem,3.2vw,3.25rem)] font-black leading-[0.98] tracking-[-0.055em] text-[#f3f4f7]">
            {title}
          </h1>
          <p className="mt-3 max-w-[760px] text-[15px] leading-6 text-[#9aa0ae]">
            {description}
          </p>
        </div>
        {action}
      </div>
    </header>
  );
}

function Panel({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={`${studioCardClassName} p-5 lg:p-6 ${className}`}>
      <h2 className="mb-5 text-[18px] font-black tracking-[-0.025em] text-[#f3f4f7]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BuilderInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-[11px] font-bold text-[#c4c8d4]">
      {label}
      <input
        className={studioInputClassName}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function BuilderSelect({
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-[11px] font-bold text-[#c4c8d4]">
      {label}
      <select
        className={`${studioInputClassName} appearance-none pr-9`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function BuilderMultiSelect({
  label,
  onToggle,
  options,
  selectedValues,
}: {
  label: string;
  onToggle: (value: string) => void;
  options: string[];
  selectedValues: string[];
}) {
  return (
    <div className="grid gap-2 text-[11px] font-bold text-[#c4c8d4]">
      <div className="flex items-center justify-between gap-4">
        <span>{label}</span>
        <span className="font-semibold text-[#8d93a5]">Tvoje discipline · {selectedValues.length}</span>
      </div>
      <details className="group min-w-0">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
          {selectedValues.map((value) => (
            <span className="inline-flex h-[34px] items-center rounded-full bg-[#f3f4f7] px-4 text-[12px] font-black text-[#07080d]" key={value}>
              {value}
            </span>
          ))}
          <span className="inline-flex h-[34px] items-center rounded-full border border-[#5d8ee7] px-4 text-[12px] font-black text-[#9cc2ff] transition group-open:bg-[#1a7cff]/10">
            + Pogledaj sve ({options.length})
          </span>
        </summary>
        <div className="mt-3 grid gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.035] p-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option);

            return (
              <button
                className={`rounded-full border px-3 py-2 text-left text-[12px] font-bold transition ${
                  isSelected
                    ? "border-[#f3f4f7] bg-[#f3f4f7] text-[#07080d]"
                    : "border-white/[0.1] bg-white/[0.04] text-[#aeb3c1] hover:border-[#1a7cff] hover:bg-white/[0.08] hover:text-[#9cc2ff]"
                }`}
                key={option}
                onClick={() => onToggle(option)}
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-2">
      <p className="text-[14px] font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "green" | "neutral" | "yellow";
}) {
  const toneClassName = {
    blue: "border-[#8b5cf6]/30 bg-[#8b5cf6]/12 text-[#c4b5fd]",
    green: "border-[#79d39b]/30 bg-[#16a34a]/20 text-[#dfffea]",
    neutral: "border-white/10 bg-white/[0.08] text-white/[0.65]",
    yellow: "border-[#e6b85c]/30 bg-[#e6b85c]/10 text-[#f3d998]",
  }[tone];

  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${toneClassName}`}>
      {children}
    </span>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#d6a94f]/16 bg-[#111827]/82 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="truncate text-[11px] font-black text-[#f8fafc]">{value}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#9aa4b5]">
        {label}
      </p>
    </div>
  );
}

function StudioSegmentedControl({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold text-[#c4c8d4]">{label}</p>
      <div className="grid grid-cols-2 rounded-full bg-white/[0.06] p-1">
        {options.map((option) => (
          <button
            className={`min-h-10 rounded-full px-3 text-[11px] font-black transition ${
              value === option.value
                ? "bg-[#f3f4f7] text-[#07080d] shadow-[0_3px_10px_rgba(0,0,0,0.24)]"
                : "text-[#8d93a5] hover:text-[#f3f4f7]"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OptionBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-4 transition hover:border-white/20 hover:bg-white/[0.07]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8d93a5]">{label}</p>
      <p className="mt-2 text-[14px] font-black text-[#f3f4f7]">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.14] bg-white/[0.035] p-8 text-center text-[12px] text-[#8d93a5]">
      {text}
    </div>
  );
}

function PrimaryButton({
  children,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="rounded-full border border-transparent bg-[linear-gradient(100deg,#1d82ff,#7656d4_57%,#dc326a)] px-5 py-2.5 text-[12px] font-black text-white shadow-[0_12px_28px_rgba(79,91,213,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(79,91,213,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2878f6] disabled:cursor-wait disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SecondaryStudioButton({
  children,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="h-10 rounded-full border-2 border-[#f3f4f7] bg-transparent px-4 text-[11px] font-black text-[#f3f4f7] transition hover:bg-[#f3f4f7] hover:text-[#07080d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2878f6] disabled:cursor-wait disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
