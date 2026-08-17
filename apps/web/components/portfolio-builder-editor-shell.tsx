"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  downloadPortfolioCoverTestPdf,
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
  PortfolioProject,
  PortfolioTemplate,
} from "@/types/api";

type PortfolioBuilderEditorShellProps = {
  project: PortfolioProject;
};

type BuilderStep = "profile" | "works" | "design" | "export";

const steps: Array<{
  id: BuilderStep;
  label: string;
  helper: string;
}> = [
  { id: "profile", label: "Podaci", helper: "Ime, bio, kontakt" },
  { id: "works", label: "Radovi", helper: "Upload, izbor, detalji" },
  { id: "design", label: "Template", helper: "Stil, format, branding" },
  { id: "export", label: "Preview / PDF", helper: "Watermark, download, placanje" },
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
  "rounded-2xl border border-white/[0.08] bg-[#0e1522]/88 shadow-[0_18px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl";

const studioInputClassName =
  "h-10 rounded-xl border border-[#3b4658] bg-[#121b2a] px-3 text-[13px] font-semibold text-[#f8fafc] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition placeholder:text-[#8490a4] hover:border-[#566276] hover:bg-[#162033] focus:border-[#d6a94f]/90 focus:bg-[#172235] focus:ring-4 focus:ring-[#d6a94f]/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d6a94f]/70";

const studioTextareaClassName =
  "resize-y rounded-xl border border-[#3b4658] bg-[#121b2a] px-3 py-3 text-[13px] font-semibold leading-6 text-[#f8fafc] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition placeholder:text-[#8490a4] hover:border-[#566276] hover:bg-[#162033] focus:border-[#d6a94f]/90 focus:bg-[#172235] focus:ring-4 focus:ring-[#d6a94f]/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d6a94f]/70";

export function PortfolioBuilderEditorShell({ project }: PortfolioBuilderEditorShellProps) {
  const router = useRouter();
  const [currentProject, setCurrentProject] = useState(project);
  const [activeStep, setActiveStep] = useState<BuilderStep>("profile");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PortfolioTemplate>(project.template);
  const [designConfig, setDesignConfig] = useState<PortfolioDesignConfig>(() =>
    normalizeDesignConfig(project, project.template),
  );
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
  const [isDownloadingCoverTest, setIsDownloadingCoverTest] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  async function moveArtwork(artworkId: string, direction: "up" | "down") {
    const orderedArtworks = [...currentProject.artworks].sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = orderedArtworks.findIndex((artwork) => artwork.id === artworkId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const currentArtwork = orderedArtworks[currentIndex];
    const targetArtwork = orderedArtworks[targetIndex];

    if (!currentArtwork || !targetArtwork) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      await updatePortfolioArtwork(currentProject.id, currentArtwork.id, {
        orderIndex: targetArtwork.orderIndex,
      });

      const savedProject = await updatePortfolioArtwork(currentProject.id, targetArtwork.id, {
        orderIndex: currentArtwork.orderIndex,
      });

      setCurrentProject(savedProject);
      setSaveMessage("Redosljed radova je azuriran.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Redosljed nije mogao biti azuriran.");
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

  async function downloadCoverTestPdf() {
    setIsDownloadingCoverTest(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      await downloadPortfolioCoverTestPdf(currentProject.id);
      setSaveMessage("Cover test PDF je generisan.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Cover PDF nije mogao biti generisan.");
    } finally {
      setIsDownloadingCoverTest(false);
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

  return (
    <main className="relative flex h-screen min-h-screen flex-col overflow-hidden bg-[#080d16] text-[#f3f5f8]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(139,92,246,0.08),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(59,130,246,0.055),transparent_22%),linear-gradient(135deg,#080d16_0%,#0b111d_54%,#070b13_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px]"
      />
      <StudioTopbar
        isSaving={isSaving}
        onOpenPreview={openPreviewPage}
        onSave={() => void saveProject()}
        project={currentProject}
        template={selectedTemplate}
      />

      <div
        className={`relative z-10 grid min-h-0 flex-1 grid-cols-1 ${
          isSidebarCollapsed
            ? "xl:grid-cols-[72px_minmax(650px,1fr)_minmax(410px,470px)]"
            : "xl:grid-cols-[290px_minmax(650px,1fr)_minmax(410px,470px)]"
        }`}
      >
        <StudioSidebar
          activeStep={activeStep}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)}
          project={currentProject}
          selectedArtworks={selectedArtworks.length}
          setActiveStep={setActiveStep}
        />

        <section className="portfolio-builder-scroll min-h-0 overflow-y-auto border-x border-white/[0.07] bg-[#080d16]/42">
          <MobileSteps activeStep={activeStep} setActiveStep={setActiveStep} />

          <div className="mx-auto grid w-full max-w-[1240px] gap-5 px-4 py-5 lg:px-6">
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
                isSaving={isSaving}
                location={location}
                onArtistNameChange={setArtistName}
                onBioChange={setBio}
                onCollectionCoverChange={setCollectionCoverUrl}
                onCollectionCoverUpload={uploadCollectionCover}
                onCollectionDescriptionChange={setCollectionDescription}
                onCollectionNameChange={setCollectionName}
                onCollectionYearChange={setCollectionYear}
                onDisciplineChange={setDiscipline}
                onEmailChange={setEmail}
                onInstagramUrlChange={setInstagramUrl}
                onLocationChange={setLocation}
                onProfileImageChange={setProfileImageUrl}
                onProfileImageUpload={uploadProfileImage}
                onSave={() => void saveProject()}
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
                isSidebarCollapsed={isSidebarCollapsed}
                isUploadingArtwork={isUploadingArtwork}
                onMoveArtwork={moveArtwork}
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
                isSaving={isSaving}
                isPremium={isPremiumProject(currentProject)}
                onSave={() => void saveProject()}
                onDesignConfigChange={setDesignConfig}
                selectedTemplate={selectedTemplate}
                onTemplateChange={changePresetTemplate}
              />
            ) : null}

            {activeStep === "export" ? (
              <ExportWorkspace
                isDownloadingCoverTest={isDownloadingCoverTest}
                isGeneratingPdf={isGeneratingPdf}
                onDownloadCoverTest={() => void downloadCoverTestPdf()}
                onGeneratePdf={() => void generatePdfVersion()}
                onOpenCleanPdf={() => void generateAndOpenCleanPdf()}
                onOpenPayment={openPaymentPage}
                onOpenPreview={openPreviewPage}
                project={currentProject}
              />
            ) : null}
          </div>
        </section>

        <PreviewPanel
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
  project,
  template,
}: {
  isSaving: boolean;
  onOpenPreview: () => void;
  onSave: () => void;
  project: PortfolioProject;
  template: PortfolioTemplate;
}) {
  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#080d16]/94 px-5 text-[#f3f5f8] backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8b5cf6]/80"
          href="/portfolio-builder"
        >
          <img
            alt="Art Studio 360"
            className="h-5 w-auto"
            src="https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68c978c51b6638fa49b92f6b_360%20Logo%20White.svg"
          />
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.34em] text-[#a3adbd] md:inline">
            Portfolio Builder
          </span>
        </Link>

        <div className="hidden h-5 w-px bg-white/15 md:block" />

        <div className="min-w-0">
          <p className="truncate text-[14px] font-black leading-none tracking-[-0.02em] text-white">{project.title}</p>
          <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6f7a8c]">
            {templateLabels[template]} / {project.status} / {project.paymentStatus}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          className="hidden rounded-xl border border-white/[0.11] bg-white/[0.035] px-5 py-3 text-[12px] font-black !text-[#f3f5f8] transition hover:-translate-y-0.5 hover:border-white/[0.2] hover:!bg-white/[0.075] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]/80 md:inline-flex"
          href={project.sourceArtist?.slug ? `/artists/${project.sourceArtist.slug}` : "/"}
        >
          {project.sourceArtist?.slug ? "Nazad na profil" : "Nazad na sajt"}
        </Link>
        <button
          className="hidden rounded-xl border border-white/[0.11] bg-white/[0.035] px-5 py-3 text-[12px] font-black text-[#f3f5f8] transition hover:-translate-y-0.5 hover:border-white/[0.2] hover:bg-white/[0.075] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]/80 disabled:cursor-wait disabled:opacity-70 sm:inline-flex"
          disabled={isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? "Cuvam..." : "Sacuvaj draft"}
        </button>
        <button
          className="rounded-xl border border-[#8b5cf6]/70 bg-[#8b5cf6] px-5 py-3 text-[12px] font-black text-white shadow-[0_14px_38px_rgba(139,92,246,0.18)] transition hover:-translate-y-0.5 hover:border-[#9c72f8] hover:bg-[#9c72f8] hover:shadow-[0_18px_48px_rgba(139,92,246,0.26)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]/80"
          onClick={onOpenPreview}
          type="button"
        >
          Otvori preview
        </button>
      </div>
    </header>
  );
}

function StudioSidebar({
  activeStep,
  isCollapsed,
  onToggleCollapsed,
  project,
  selectedArtworks,
  setActiveStep,
}: {
  activeStep: BuilderStep;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  project: PortfolioProject;
  selectedArtworks: number;
  setActiveStep: (step: BuilderStep) => void;
}) {
  return (
    <aside
      className={`relative hidden min-h-0 overflow-hidden border-r border-white/[0.07] bg-[#090f19]/95 text-[#f3f5f8] shadow-[18px_0_60px_rgba(0,0,0,0.3)] transition-[width] duration-300 xl:flex xl:flex-col ${
        isCollapsed ? "items-center" : ""
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 top-8 h-72 w-72 rounded-full bg-[#8b5cf6]/4 blur-3xl"
      />
      <div
        className={`relative w-full border-b border-white/10 ${
          isCollapsed ? "flex flex-col items-center gap-3 p-3" : "p-4"
        }`}
      >
        <button
          aria-label={isCollapsed ? "Rasiri sidebar" : "Skupi sidebar"}
          className={`grid h-10 w-10 place-items-center rounded-full border border-white/[0.11] bg-white/[0.04] text-[#a3adbd] shadow-[0_12px_34px_rgba(0,0,0,0.2)] transition hover:bg-white/[0.09] hover:text-white ${
            isCollapsed ? "" : "ml-auto"
          }`}
          onClick={onToggleCollapsed}
          type="button"
        >
          <svg
            aria-hidden="true"
            className={`h-4 w-4 transition ${isCollapsed ? "" : "rotate-180"}`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="m9 6 6 6-6 6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </svg>
        </button>

        {isCollapsed ? (
          <div className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.11] bg-white/[0.045] text-[10px] font-black uppercase tracking-[0.12em] text-[#a78bfa]">
            AB
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#a78bfa]">
              Project
            </p>
            <h1 className="mt-2 truncate text-[18px] font-black tracking-[-0.03em]">{project.artistName}</h1>
            <p className="mt-1 text-[11px] text-white/45">
              {project.source === "ARTBOARD_PROFILE" ? "Iz ArtBoard profila" : "Guest portfolio"}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StatusPill tone={project.access.canDownloadCleanPdf ? "green" : "yellow"}>
                {project.access.canDownloadCleanPdf ? "PDF otkljucan" : "Watermark preview"}
              </StatusPill>
              <StatusPill tone={project.access.reason === "PREMIUM" ? "blue" : "neutral"}>
                {project.access.reason === "PREMIUM"
                  ? "Premium"
                  : project.access.reason === "PAID"
                    ? "Placeno"
                    : "Basic"}
              </StatusPill>
            </div>
          </div>
        )}
      </div>

      <nav className={`relative flex-1 ${isCollapsed ? "w-full px-2 py-3" : "p-3"}`}>
        <div className="space-y-1">
          {steps.map((step) => {
            const isActive = activeStep === step.id;

            return (
              <button
                className={`group relative grid w-full rounded-2xl text-left transition ${
                  isCollapsed ? "place-items-center px-0 py-3" : "grid-cols-[28px_1fr] gap-3 px-3 py-3"
                } ${
                  isActive
                    ? "border border-[#8b5cf6]/24 bg-[#8b5cf6]/[0.075] text-white before:absolute before:bottom-3 before:left-0 before:top-3 before:w-[3px] before:rounded-r-full before:bg-[#8b5cf6]"
                    : "border border-transparent text-[#a3adbd] hover:border-white/[0.1] hover:bg-white/[0.045] hover:text-white"
                }`}
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                type="button"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                    isActive
                      ? "border-[#8b5cf6]/55 bg-[#8b5cf6]/14 text-[#c4b5fd]"
                      : "border-white/[0.12] bg-white/[0.03] text-[#a3adbd]"
                  }`}
                >
                  <BuilderStepIcon step={step.id} />
                </span>

                {isCollapsed ? (
                  <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 min-w-[170px] -translate-y-1/2 rounded-xl border border-white/[0.1] bg-[#0e1522] px-3 py-2 text-left opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition group-hover:opacity-100">
                    <span className="block text-[12px] font-black text-white">{step.label}</span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-white/55">
                      {step.helper}
                    </span>
                  </span>
                ) : (
                  <span>
                    <span className="block text-[13px] font-bold">{step.label}</span>
                    <span className="mt-0.5 block text-[11px] opacity-60">{step.helper}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className={`relative w-full border-t border-white/10 ${isCollapsed ? "p-2" : "p-3"}`}>
        {isCollapsed ? (
          <div className="grid gap-2">
            <CollapsedMetric label="Odabrani radovi" value={String(selectedArtworks)} />
            <CollapsedMetric label="PDF verzije" value={String(project.counts.versions)} />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a78bfa]">
              Status
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <MiniMetric label="Odabrani" value={`${selectedArtworks}/${project.artworks.length}`} />
              <MiniMetric label="Verzije" value={String(project.counts.versions)} />
            </div>
          </div>
        )}
      </div>
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
    <div className="border-b border-white/[0.08] bg-[#080d16]/94 px-3 py-2 backdrop-blur-xl xl:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {steps.map((step, index) => (
          <button
            className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-bold ${
              activeStep === step.id
                ? "bg-[#8b5cf6] text-white shadow-[0_10px_28px_rgba(139,92,246,0.18)]"
                : "border border-white/[0.1] text-[#a3adbd]"
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
  isSaving,
  location,
  onArtistNameChange,
  onBioChange,
  onCollectionCoverChange,
  onCollectionCoverUpload,
  onCollectionDescriptionChange,
  onCollectionNameChange,
  onCollectionYearChange,
  onDisciplineChange,
  onEmailChange,
  onInstagramUrlChange,
  onLocationChange,
  onProfileImageChange,
  onProfileImageUpload,
  onSave,
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
  isSaving: boolean;
  location: string;
  onArtistNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onCollectionCoverChange: (value: string) => void;
  onCollectionCoverUpload: (files: FileList | null) => void;
  onCollectionDescriptionChange: (value: string) => void;
  onCollectionNameChange: (value: string) => void;
  onCollectionYearChange: (value: string) => void;
  onDisciplineChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onInstagramUrlChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onProfileImageChange: (value: string) => void;
  onProfileImageUpload: (files: FileList | null) => void;
  onSave: () => void;
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
        label="Sadrzaj portfolija"
        title="Uredi podatke koji ulaze u PDF"
        description="Ovo je centralni tekstualni sloj portfolija: cover, profil, statement i kontakt."
        action={
          <PrimaryButton disabled={isSaving} onClick={onSave}>
            {isSaving ? "Cuvam..." : "Sacuvaj"}
          </PrimaryButton>
        }
      />

      <section className={`${studioCardClassName} p-5`}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a78bfa]">
            Readiness
          </p>
          <p className="mt-1 text-[12px] font-semibold text-[#a3adbd]">
            Brza provjera da li portfolio ima osnovne podatke prije preview-a i exporta.
          </p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {checks.map((check) => (
            <div
              className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0b121e]/72 px-3 py-2"
              key={check.label}
            >
              <span className="min-w-0 text-[12px] font-semibold leading-4 text-[#cbd5e1]">
                {check.label}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  check.done
                    ? "bg-[#4cc98a]/14 text-[#9df0c2]"
                    : "bg-[#ef6471]/12 text-[#ff9aa5]"
                }`}
              >
                {check.done ? "OK" : "Popuni"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4">
        <Panel title="Artist profile">
          <div className="grid gap-3 lg:grid-cols-3">
            <BuilderInput label="Ime umjetnika" value={artistName} onChange={onArtistNameChange} />
            <BuilderInput label="Disciplina" value={discipline} onChange={onDisciplineChange} />
            <BuilderInput label="Email" value={email} onChange={onEmailChange} />
            <BuilderInput label="Lokacija" value={location} onChange={onLocationChange} />
            <BuilderInput label="Website" value={websiteUrl} onChange={onWebsiteUrlChange} />
            <BuilderInput label="Instagram" value={instagramUrl} onChange={onInstagramUrlChange} />
          </div>

          <label className="mt-4 grid gap-1.5 text-[11px] font-bold text-[#a3adbd]">
            Biografija / artist statement
            <textarea
              className={`${studioTextareaClassName} min-h-48`}
              onChange={(event) => onBioChange(event.target.value)}
              value={bio}
            />
          </label>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0b121e]/70 p-4">
              <div className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)]">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.05] shadow-[0_14px_36px_rgba(0,0,0,0.22)]">
                  {profileImageUrl ? (
                    <img alt="" className="h-full w-full object-cover" src={profileImageUrl} />
                  ) : null}
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#a78bfa]">
                    Profilna slika
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[#a3adbd]">
                    Ova slika se koristi na cover strani i kontakt strani portfolija.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <BuilderInput
                  label="URL profilne slike"
                  value={profileImageUrl}
                  onChange={onProfileImageChange}
                />
                <div className="flex items-end">
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
                  <SecondaryStudioButton
                    disabled={isUploadingProfileImage}
                    onClick={() => profileImageInputRef.current?.click()}
                  >
                    {isUploadingProfileImage ? "Upload..." : "Upload sliku"}
                  </SecondaryStudioButton>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0b121e]/70 p-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_128px]">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#a78bfa]">
                    Kolekcija
                  </p>
                  <p className="mt-1 max-w-xl text-[12px] leading-5 text-[#a3adbd]">
                    Ovi podaci pune uvodnu stranu kolekcije u PDF-u: naziv, godina, opis i cover.
                  </p>
                </div>
                <div className="h-20 w-full overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.05]">
                  {collectionCoverUrl ? (
                    <img alt="" className="h-full w-full object-cover" src={collectionCoverUrl} />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-[#6f7a8c]">
                      Cover
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <BuilderInput
                  label="Ime kolekcije"
                  value={collectionName}
                  onChange={onCollectionNameChange}
                />
                <BuilderInput
                  label="Godina"
                  value={collectionYear}
                  onChange={onCollectionYearChange}
                />
              </div>

              <label className="mt-3 grid gap-1.5 text-[11px] font-bold text-[#a3adbd]">
                Opis kolekcije
                <textarea
                  className={`${studioTextareaClassName} min-h-28`}
                  onChange={(event) => onCollectionDescriptionChange(event.target.value)}
                  value={collectionDescription}
                />
              </label>

              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <BuilderInput
                  label="URL cover slike"
                  value={collectionCoverUrl}
                  onChange={onCollectionCoverChange}
                />
                <div className="flex items-end">
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
                  <SecondaryStudioButton
                    disabled={isUploadingCollectionCover}
                    onClick={() => collectionCoverInputRef.current?.click()}
                  >
                    {isUploadingCollectionCover ? "Upload..." : "Upload cover"}
                  </SecondaryStudioButton>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function WorksWorkspace({
  artworks,
  coverImageUrl,
  isBusy,
  isSidebarCollapsed,
  isUploadingArtwork,
  onMoveArtwork,
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
  isSidebarCollapsed: boolean;
  isUploadingArtwork: boolean;
  onMoveArtwork: (artworkId: string, direction: "up" | "down") => void;
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
        label="Portfolio radovi"
        title="Izbor radova i redosljed"
        description="Dodaj radove, ukljuci ih u PDF i kasnije uredi podatke rada. MVP limit je 30 radova po portfoliju."
        action={
          <div className="flex items-center gap-2">
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
            <PrimaryButton
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploadingArtwork ? "Dodajem..." : "Dodaj rad"}
            </PrimaryButton>
          </div>
        }
      />

      <Panel title={`Radovi (${selectedArtworks}/${artworks.length})`}>
        <div className="mb-5 rounded-2xl border border-white/[0.08] bg-[#080d16]/72 p-4 text-[12px] leading-5 text-[#a3adbd]">
          Biraj 10-30 radova za finalni PDF. MVP trenutno cuva izbor rada, a redosljed je vezan
          za broj rada iz drafta.
        </div>
        {orderedArtworks.length > 0 ? (
          <div className="-mx-1 pb-3">
            <div className={`grid gap-4 px-1 ${isSidebarCollapsed ? "grid-cols-3" : "grid-cols-2"}`}>
              {orderedArtworks.map((artwork, index) => (
                <ArtworkEditorCard
                  artwork={artwork}
                  canMoveDown={index < orderedArtworks.length - 1}
                  canMoveUp={index > 0}
                  isCoverArtwork={coverImageUrl === artwork.imageUrl}
                  isDragTarget={dragOverArtworkId === artwork.id && draggedArtworkId !== artwork.id}
                  isDragging={draggedArtworkId === artwork.id}
                  isBusy={isBusy}
                  key={artwork.id}
                  onMove={onMoveArtwork}
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
      </Panel>
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
  canMoveDown,
  canMoveUp,
  isCoverArtwork,
  isDragging,
  isDragTarget,
  isBusy,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onMove,
  onSetCover,
  onToggle,
  onUpdate,
}: {
  artwork: PortfolioProject["artworks"][number];
  canMoveDown: boolean;
  canMoveUp: boolean;
  isCoverArtwork: boolean;
  isDragging: boolean;
  isDragTarget: boolean;
  isBusy: boolean;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onMove: (artworkId: string, direction: "up" | "down") => void;
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
        className={`group flex min-h-[432px] min-w-0 flex-col overflow-hidden rounded-[18px] border bg-[#0b121e]/94 shadow-[0_18px_44px_rgba(0,0,0,0.28)] transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-[#101827] ${
          artwork.isSelected
            ? "border-[#8b5cf6]/55 ring-1 ring-[#8b5cf6]/16"
            : "border-white/[0.09]"
        } ${isDragging ? "scale-[0.98] opacity-45" : ""} ${
          isDragTarget ? "border-[#8b5cf6] bg-[#111a2b] ring-2 ring-[#8b5cf6]/20" : ""
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
        <div className="relative aspect-[4/3] overflow-hidden bg-[#050912]">
          <img
            alt={artwork.title || "Portfolio artwork"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
            src={artwork.imageUrl}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b121e] via-[#0b121e]/45 to-transparent" />
          <span className="absolute left-3 top-3 grid h-7 min-w-7 place-items-center rounded-md bg-[#8b5cf6] px-2 text-[12px] font-black text-white shadow-[0_10px_26px_rgba(139,92,246,0.24)]">
            {artwork.orderIndex + 1}
          </span>
          <button
            aria-label="Uredi detalje rada"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/55 text-white shadow-[0_10px_26px_rgba(0,0,0,0.32)] backdrop-blur transition hover:bg-[#f3f5f8] hover:text-[#0b121e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]/80"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            <span className="text-lg leading-none">...</span>
          </button>
        </div>

        <div className="flex flex-1 flex-col space-y-3 p-4">
          <div>
            <h3 className="truncate text-[14px] font-black text-white">
              {artwork.title || `Rad ${artwork.orderIndex + 1}`}
            </h3>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#6f7a8c]">
              Prevuci za promjenu redosljeda
            </p>
            <p className="mt-2 truncate text-[12px] text-[#a3adbd]">
              {artwork.technique || artwork.year || "Detalji rada nisu uneseni"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              className={`min-h-10 rounded-lg border px-3 py-2 text-[11px] font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]/80 ${
                artwork.isSelected
                  ? "border-[#8b5cf6]/70 bg-[#8b5cf6] text-white shadow-[0_10px_22px_rgba(139,92,246,0.16)]"
                  : "border-white/10 bg-white/[0.045] text-[#a3adbd] hover:border-[#8b5cf6]/60 hover:text-white"
              }`}
              disabled={isBusy}
              onClick={() => onToggle(artwork.id, !artwork.isSelected)}
              type="button"
            >
              {artwork.isSelected ? "U PDF-u" : "Van PDF-a"}
            </button>

            <button
              className={`min-h-10 rounded-lg border px-3 py-2 text-[11px] font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]/80 ${
                isCoverArtwork
                  ? "border-[#4cc98a]/70 bg-[#4cc98a]/16 text-[#b9f7d4]"
                  : "border-white/10 bg-white/[0.045] text-[#a3adbd] hover:border-[#4cc98a]/60 hover:bg-[#4cc98a]/12 hover:text-[#dfffea]"
              }`}
              disabled={isBusy || isCoverArtwork}
              onClick={() => onSetCover(artwork)}
              type="button"
            >
              {isCoverArtwork ? "Pocetni" : "Pocetni"}
            </button>
          </div>

          <div className="mt-auto flex items-center gap-2 border-t border-white/10 pt-3">
            <button
              className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-[11px] font-black text-white transition hover:border-white/[0.18] hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]/80"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              Detalji
              <span aria-hidden="true" className="ml-2">
                -&gt;
              </span>
            </button>
            <button
              aria-label="Pomjeri rad gore"
              className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-white/[0.12] bg-white/[0.035] text-[10px] font-black text-[#a3adbd] transition hover:border-[#8b5cf6] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]/80 disabled:cursor-not-allowed disabled:opacity-30"
              disabled={isBusy || !canMoveUp}
              onClick={() => onMove(artwork.id, "up")}
              type="button"
            >
              <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <path d="m6 14 6-6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
              </svg>
            </button>
            <button
              aria-label="Pomjeri rad dolje"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.12] bg-white/[0.035] text-[10px] font-black text-[#a3adbd] transition hover:border-[#8b5cf6] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]/80 disabled:cursor-not-allowed disabled:opacity-30"
              disabled={isBusy || !canMoveDown}
              onClick={() => onMove(artwork.id, "down")}
              type="button"
            >
              <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <path d="m6 10 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
              </svg>
            </button>
            <button
              aria-label="Ukloni iz PDF-a"
              className="grid h-8 w-8 place-items-center rounded-full border border-[#dc1735]/35 bg-[#dc1735]/[0.08] text-[#ff6f83] transition hover:bg-[#dc1735] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc1735]/80 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isBusy || !artwork.isSelected}
              onClick={() => onToggle(artwork.id, false)}
              type="button"
            >
              <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
              </svg>
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
  const modal = (
    <div
      className="fixed inset-0 z-[999] flex min-h-screen items-center justify-center bg-[#02040a]/92 px-4 py-5 backdrop-blur-xl"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-label="Detalji rada"
        aria-modal="true"
        className="grid max-h-[92vh] w-full max-w-[1180px] overflow-hidden rounded-3xl border border-white/[0.09] bg-[#080d16] text-white shadow-[0_40px_120px_rgba(0,0,0,0.65)] lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="relative min-h-[300px] bg-[#050912] p-4 lg:min-h-0">
          <div className="absolute left-4 top-4 z-10 rounded-full border border-white/[0.12] bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#a78bfa] backdrop-blur">
            Preview rada
          </div>
          <img
            alt={artwork.title || "Portfolio artwork"}
            className="h-full max-h-[86vh] min-h-[300px] w-full rounded-2xl object-contain"
            src={artwork.imageUrl}
          />
        </div>

        <div className="portfolio-builder-scroll min-h-0 overflow-y-auto p-5 sm:p-7">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a78bfa]">
                Detalji za PDF
              </p>
              <h2 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.05em] text-white">
                {title || "Bez naziva"}
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-white/[0.58]">
                Ovi podaci ulaze u PDF stranicu rada i kasnije mogu da se koriste za sales
                template, katalog ili price list.
              </p>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.12] bg-white/[0.04] text-[18px] font-black text-white/70 transition hover:border-white hover:bg-white hover:text-[#0b121e]"
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
            <label className="grid gap-1.5 text-[11px] font-bold text-white/[0.62]">
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

          <label className="mt-4 grid gap-1.5 text-[11px] font-bold text-white/[0.62]">
            Opis rada
            <textarea
              className={`${studioTextareaClassName} min-h-36`}
              onChange={(event) => onDescriptionChange(event.target.value)}
              value={description}
            />
          </label>

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
            <button
              className="rounded-full border border-white/[0.12] bg-white/[0.04] px-5 py-2 text-[12px] font-black text-white/70 transition hover:border-white hover:bg-white hover:text-[#0b121e]"
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
  isSaving,
  isPremium,
  onDesignConfigChange,
  onSave,
  selectedTemplate,
  onTemplateChange,
}: {
  designConfig: PortfolioDesignConfig;
  isSaving: boolean;
  isPremium: boolean;
  onDesignConfigChange: (config: PortfolioDesignConfig) => void;
  onSave: () => void;
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
        label="Dizajn sistema"
        title="Odaberi strukturu PDF-a"
        description="Ove opcije kontrolisu vizuelni ton, format i sta ulazi u finalni export."
        action={
          <PrimaryButton disabled={isSaving} onClick={onSave}>
            {isSaving ? "Cuvam..." : "Sacuvaj dizajn"}
          </PrimaryButton>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {templates.map((template) => (
          <button
            className={`relative overflow-hidden rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-0.5 ${
              selectedTemplate === template.id
                ? "border-[#8b5cf6]/80 bg-[#8b5cf6]/[0.075] shadow-[0_18px_44px_rgba(0,0,0,0.26)]"
                : "border-white/[0.09] bg-[#0b121e]/78 shadow-[0_16px_42px_rgba(0,0,0,0.22)] hover:border-white/[0.17] hover:bg-[#121b2a]"
            }`}
            key={template.id}
            onClick={() => onTemplateChange(template.id)}
            type="button"
          >
            {selectedTemplate === template.id ? (
              <span className="absolute left-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-[#8b5cf6] text-white shadow-[0_12px_30px_rgba(139,92,246,0.2)]">
                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
                </svg>
              </span>
            ) : (
              <span className="absolute left-4 top-4 h-7 w-7 rounded-full border border-white/20 bg-black/30" />
            )}

            <div className="aspect-[4/3] rounded-xl border border-white/[0.08] bg-[#050912] p-4">
              <div className="h-full rounded-lg bg-[#f3f4f6] p-4 text-black/70 shadow-[0_14px_34px_rgba(0,0,0,0.25)]">
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
            <h3 className="mt-4 text-[16px] font-black text-white">{template.title}</h3>
            <p className="mt-2 text-[12px] leading-5 text-white/[0.52]">{template.description}</p>
          </button>
        ))}
      </div>

      <Panel title="PDF settings">
        <div className="grid gap-3 md:grid-cols-4">
          <OptionBox label="Format" value="A4" />
          <OptionBox label="Jezik" value="ME" />
          <OptionBox label="Font" value="Sans" />
          <OptionBox label="Branding" value="ArtBoard" />
        </div>
      </Panel>

      <Panel title="Premium custom design">
        <div className="grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-black text-white">Mix stranica iz razlicitih template-a</p>
              <p className="mt-1 max-w-2xl text-[12px] leading-5 text-white/[0.52]">
                Preset mode koristi jedan kompletan template. Custom mode dozvoljava Platinum korisniku da
                izabere poseban dizajn za cover, bio, kolekciju, radove, kontakt i footer.
              </p>
            </div>

            <div className="flex rounded-full border border-white/[0.1] bg-black/25 p-1">
              <button
                className={`rounded-full px-4 py-2 text-[11px] font-black transition ${
                  designConfig.mode === "PRESET"
                    ? "bg-white text-[#080d16]"
                    : "text-white/58 hover:text-white"
                }`}
                onClick={() => setDesignMode("PRESET")}
                type="button"
              >
                Preset
              </button>
              <button
                className={`rounded-full px-4 py-2 text-[11px] font-black transition ${
                  designConfig.mode === "CUSTOM"
                    ? "bg-[#d6a94f] text-[#080d16]"
                    : "text-white/58 hover:text-white"
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
            <div className="rounded-2xl border border-[#d6a94f]/22 bg-[#d6a94f]/[0.07] p-4 text-[12px] leading-5 text-[#f6e3ad]">
              Custom kombinovanje stranica je zakljucano za Basic plan. Korisnik moze i dalje birati
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
                  className="grid gap-2 rounded-2xl border border-white/[0.08] bg-[#0b121e]/72 p-4"
                  key={page}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#d6a94f]">
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

              <label className="grid gap-2 rounded-2xl border border-white/[0.08] bg-[#0b121e]/72 p-4">
                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#d6a94f]">
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
  isDownloadingCoverTest,
  isGeneratingPdf,
  onDownloadCoverTest,
  onGeneratePdf,
  onOpenCleanPdf,
  onOpenPayment,
  onOpenPreview,
  project,
}: {
  isDownloadingCoverTest: boolean;
  isGeneratingPdf: boolean;
  onDownloadCoverTest: () => void;
  onGeneratePdf: () => void;
  onOpenCleanPdf: () => void;
  onOpenPayment: () => void;
  onOpenPreview: () => void;
  project: PortfolioProject;
}) {
 
  const accessLabel =
    project.access.reason === "PREMIUM"
      ? "Premium clan - cisti PDF je ukljucen"
      : project.access.reason === "PAID"
        ? "Jednokratno placanje evidentirano"
        : "Download je zakljucan dok se ne odradi placanje";
  const canGenerateCleanPdf = project.access.canDownloadCleanPdf;

  return (
    <>
      <WorkspaceHeader
        label="Isporuka"
        title="Export i dijeljenje portfolija"
        description="Preview uvijek ima ArtBoard watermark. Cisti PDF se otkljucava placanjem ili premium statusom."
      />

      <section className={`${studioCardClassName} overflow-hidden text-white`}>
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a78bfa]">
              PDF status
            </p>
            <h2 className="mt-3 max-w-2xl text-[26px] font-black leading-tight tracking-[-0.05em]">
              {accessLabel}
            </h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-white/[0.65]">
              Preview ostaje dostupan sa velikim ArtBoard watermarkom. Clean PDF se generise i
              cuva kao verzija tek kada je portfolio placen ili kada je umjetnik premium clan.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
              className="rounded-full border border-white/[0.12] bg-white/[0.035] px-4 py-2 text-[12px] font-black text-white transition hover:border-white hover:bg-white hover:text-[#0b121e]"
                onClick={onOpenPreview}
                type="button"
              >
                Otvori preview
              </button>

              <button
                className="rounded-full border border-white/[0.12] bg-white/[0.035] px-4 py-2 text-[12px] font-black text-white transition hover:border-white hover:bg-white hover:text-[#0b121e] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDownloadingCoverTest}
                onClick={onDownloadCoverTest}
                type="button"
              >
                {isDownloadingCoverTest ? "Generisem test..." : "Download cover test"}
              </button>

              {canGenerateCleanPdf ? (
                <button
                  className="rounded-full border border-[#8b5cf6]/70 bg-[#8b5cf6] px-4 py-2 text-[12px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#9c72f8] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isGeneratingPdf}
                  onClick={onGeneratePdf}
                  type="button"
                >
                  {isGeneratingPdf ? "Generisem..." : "Generisi novu PDF verziju"}
                </button>
              ) : (
                <button
                  className="rounded-full border border-[#8b5cf6]/70 bg-[#8b5cf6] px-4 py-2 text-[12px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#9c72f8]"
                  onClick={onOpenPayment}
                  type="button"
                >
                  Plati i otkljucaj PDF
                </button>
              )}

              {project.latestPdfUrl ? (
                <button
                  className="rounded-full border border-[#8b5cf6]/70 bg-[#8b5cf6] px-4 py-2 text-[12px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#9c72f8] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => window.open(project.latestPdfUrl!, "_blank", "noopener,noreferrer")}
                  type="button"
                >
                  Download zadnje verzije
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <ExportMetric label="Payment" value={formatBuilderEnum(project.paymentStatus)} />
            <ExportMetric label="PDF verzije" value={String(project.versions.length)} />
            <ExportMetric
              label="Clean access"
              value={project.access.canDownloadCleanPdf ? "Otkljucan" : "Zakljucan"}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <ExportBox
          title="PDF preview"
          text="Otvori pregled portfolija sa ArtBoard watermarkom."
          action="Otvori preview"
          onClick={onOpenPreview}
        />
        <ExportBox title="Share link" text="Posalji privatni link galeriji ili kupcu." action="Kopiraj" />
        <ExportBox
          title="Download PDF"
          text={
            project.access.canDownloadCleanPdf
              ? "Cisti PDF bez watermarka je otkljucan."
              : "Basic i guest korisnici prvo otkljucavaju jednokratno placanje."
          }
          action={
            project.access.canDownloadCleanPdf
              ? isGeneratingPdf
                ? "Generisem PDF..."
                : "Otvori cisti PDF"
              : "Plati i otkljucaj"
          }
          disabled={project.access.canDownloadCleanPdf ? isGeneratingPdf : false}
          onClick={project.access.canDownloadCleanPdf ? onOpenCleanPdf : onOpenPayment}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="PDF verzije">
          {project.versions.length > 0 ? (
            <div className="space-y-2">
              {project.versions.map((version) => (
                <button
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#0b121e]/70 px-4 py-3 text-left text-[12px] transition hover:-translate-y-0.5 hover:border-[#8b5cf6]/45"
                  key={version.id}
                  onClick={() => window.open(version.pdfUrl, "_blank", "noopener,noreferrer")}
                  type="button"
                >
                  <span>
                    <strong className="block text-[13px] text-white">
                      Verzija {version.versionNumber}
                    </strong>
                    <span className="text-white/50">
                      {formatBuilderDate(version.createdAt)} - {templateLabels[version.template]}
                    </span>
                  </span>
                  <span className="rounded-full border border-[#8b5cf6]/30 bg-[#8b5cf6]/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#c4b5fd]">
                    PDF
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyExportState text="Jos nema generisanih clean PDF verzija. Kada korisnik dobije pristup, ovdje ce se cuvati svaka generisana verzija." />
          )}
        </Panel>

        <Panel title="Placanja">
          {project.payments.length > 0 ? (
            <div className="space-y-2">
              {project.payments.map((payment) => (
                <div
                  className="rounded-2xl border border-white/[0.08] bg-[#0b121e]/70 px-4 py-3"
                  key={payment.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-black text-white">
                      {formatBuilderEnum(payment.status)}
                    </p>
                    <p className="text-[13px] font-black text-[#c4b5fd]">
                      {formatBuilderMoney(payment.amountCents, payment.currency)}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-white/50">
                    {payment.paidAt
                      ? `Placeno: ${formatBuilderDate(payment.paidAt)}`
                      : `Kreirano: ${formatBuilderDate(payment.createdAt)}`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyExportState text="Nema evidentiranih uplata za ovaj portfolio." />
          )}
        </Panel>
      </div>
    </>
  );
}

function ExportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0b121e]/70 p-3">
      <p className="text-[20px] font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#a78bfa]">
        {label}
      </p>
    </div>
  );
}

function EmptyExportState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.025] px-4 py-5 text-[12px] font-semibold leading-5 text-[#a3adbd]">
      {text}
    </div>
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
      className={`rounded-2xl border px-4 py-3 text-[12px] font-semibold shadow-[0_16px_42px_rgba(0,0,0,0.16)] ${
        error
          ? "border-[#ff4f73]/35 bg-[#dc1735]/14 text-[#ffd6de]"
          : "border-[#35d07f]/35 bg-[#16a34a]/14 text-[#dfffea]"
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
    <header className={`${studioCardClassName} px-6 py-6 lg:px-7`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.38em] text-[#a78bfa]">
            {label}
          </p>
          <h1 className="mt-3 text-[clamp(1.7rem,2.35vw,2.15rem)] font-black tracking-[-0.055em] text-white">
            {title}
          </h1>
          <p className="mt-2 max-w-[760px] text-[13px] leading-6 text-white/[0.56]">
            {description}
          </p>
        </div>
        {action}
      </div>
    </header>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className={`${studioCardClassName} p-5 lg:p-6`}>
      <h2 className="mb-4 text-[13px] font-black uppercase tracking-[0.28em] text-[#a78bfa]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BuilderInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-[11px] font-bold text-white/[0.62]">
      {label}
      <input
        className={studioInputClassName}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
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

function OptionBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0b121e]/70 p-4 transition hover:border-white/[0.15] hover:bg-[#121b2a]/72">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a78bfa]">{label}</p>
      <p className="mt-2 text-[14px] font-black text-white">{value}</p>
    </div>
  );
}

function ExportBox({
  action,
  disabled = false,
  onClick,
  text,
  title,
}: {
  action: string;
  disabled?: boolean;
  onClick?: () => void;
  text: string;
  title: string;
}) {
  const actionClassName =
    "mt-4 inline-flex rounded-lg border border-white/[0.11] bg-white/[0.04] px-3 py-2 text-[11px] font-bold text-white transition hover:-translate-y-0.5 hover:border-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-white";

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#0b121e]/70 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <h2 className="text-[16px] font-black text-white">{title}</h2>
      <p className="mt-2 min-h-10 text-[12px] leading-5 text-white/[0.52]">{text}</p>
      <button
        className={`${actionClassName} disabled:cursor-wait disabled:opacity-60`}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {action}
      </button>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.025] p-8 text-center text-[12px] text-[#a3adbd]">
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
      className="rounded-lg border border-[#8b5cf6]/70 bg-[#8b5cf6] px-4 py-2.5 text-[12px] font-black text-white shadow-[0_12px_28px_rgba(139,92,246,0.16)] transition hover:-translate-y-0.5 hover:bg-[#9c72f8] hover:shadow-[0_16px_38px_rgba(139,92,246,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]/80 disabled:cursor-wait disabled:opacity-60"
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
      className="h-10 rounded-xl border border-white/[0.11] bg-white/[0.04] px-3 text-[11px] font-bold text-white transition hover:border-white/[0.2] hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]/80 disabled:cursor-wait disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
