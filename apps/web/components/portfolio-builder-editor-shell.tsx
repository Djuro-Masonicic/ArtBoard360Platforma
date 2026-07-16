"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

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
import type { PortfolioArtworkAvailability, PortfolioProject, PortfolioTemplate } from "@/types/api";

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

export function PortfolioBuilderEditorShell({ project }: PortfolioBuilderEditorShellProps) {
  const router = useRouter();
  const [currentProject, setCurrentProject] = useState(project);
  const [activeStep, setActiveStep] = useState<BuilderStep>("profile");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PortfolioTemplate>(project.template);
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
        ...overrides,
      });

      setCurrentProject(savedProject);
      setProfileImageUrl(savedProject.profileImageUrl ?? "");
      setCollectionName(savedProject.collectionName ?? "");
      setCollectionYear(savedProject.collectionYear ?? "");
      setCollectionDescription(savedProject.collectionDescription ?? "");
      setCollectionCoverUrl(savedProject.collectionCoverUrl ?? "");
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

  return (
    <main className="flex h-screen min-h-screen flex-col overflow-hidden bg-[#e7ecf4] text-[#1f2430]">
      <StudioTopbar
        isSaving={isSaving}
        onOpenPreview={openPreviewPage}
        onSave={() => void saveProject()}
        project={currentProject}
        template={selectedTemplate}
      />

      <div
        className={`grid min-h-0 flex-1 grid-cols-1 ${
          isSidebarCollapsed
            ? "xl:grid-cols-[72px_minmax(0,1fr)_460px]"
            : "xl:grid-cols-[280px_minmax(0,1fr)_460px]"
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

        <section className="min-h-0 overflow-y-auto border-x border-[#cfd8e6]/80 bg-[#f5f7fb]">
          <MobileSteps activeStep={activeStep} setActiveStep={setActiveStep} />

          <div className="mx-auto grid w-full max-w-[1160px] gap-4 px-4 py-4 lg:px-6">
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
                isSaving={isSaving}
                onSave={() => void saveProject()}
                selectedTemplate={selectedTemplate}
                onTemplateChange={setSelectedTemplate}
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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#202a3a] bg-[#0b1220] px-4 text-white">
      <div className="flex min-w-0 items-center gap-3">
        <Link className="flex shrink-0 items-center gap-3" href="/portfolio-builder">
          <img
            alt="Art Studio 360"
            className="h-5 w-auto"
            src="https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/68c978c51b6638fa49b92f6b_360%20Logo%20White.svg"
          />
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.22em] text-white/55 md:inline">
            Portfolio Builder
          </span>
        </Link>

        <div className="hidden h-5 w-px bg-white/15 md:block" />

        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold leading-none">{project.title}</p>
          <p className="mt-1 truncate text-[10px] text-white/50">
            {templateLabels[template]} / {project.status} / {project.paymentStatus}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="hidden rounded-md border border-[#ffc41d] bg-[#ffc41d] px-3 py-1.5 text-[11px] font-bold text-[#141923] transition hover:bg-[#ffd65b] disabled:cursor-wait disabled:opacity-70 sm:inline-flex"
          disabled={isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? "Cuvam..." : "Sacuvaj draft"}
        </button>
        <button
          className="rounded-md border border-[#dc1735] bg-[#dc1735] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#bd102a]"
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
      className={`hidden min-h-0 bg-[#0b1220] text-white transition-[width] duration-300 xl:flex xl:flex-col ${
        isCollapsed ? "items-center" : ""
      }`}
    >
      <div
        className={`w-full border-b border-white/10 ${
          isCollapsed ? "flex flex-col items-center gap-3 p-3" : "p-4"
        }`}
      >
        <button
          aria-label={isCollapsed ? "Rasiri sidebar" : "Skupi sidebar"}
          className={`grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white hover:text-[#0b1220] ${
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
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-[10px] font-black uppercase tracking-[0.12em] text-white/70">
            AB
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-white/40">
              Project
            </p>
            <h1 className="mt-2 truncate text-[17px] font-bold">{project.artistName}</h1>
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

      <nav className={`flex-1 ${isCollapsed ? "w-full px-2 py-3" : "p-3"}`}>
        <div className="space-y-1">
          {steps.map((step) => {
            const isActive = activeStep === step.id;

            return (
              <button
                className={`group relative grid w-full rounded-xl text-left transition ${
                  isCollapsed ? "place-items-center px-0 py-3" : "grid-cols-[28px_1fr] gap-3 px-3 py-3"
                } ${
                  isActive
                    ? "bg-white text-[#101827] shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
                    : "text-white/68 hover:bg-white/8 hover:text-white"
                }`}
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                type="button"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                    isActive
                      ? "border-[#101827] bg-[#101827] text-white"
                      : "border-white/20 text-white/55"
                  }`}
                >
                  <BuilderStepIcon step={step.id} />
                </span>

                {isCollapsed ? (
                  <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 min-w-[170px] -translate-y-1/2 rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-left opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition group-hover:opacity-100">
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

      <div className={`w-full border-t border-white/10 ${isCollapsed ? "p-2" : "p-3"}`}>
        {isCollapsed ? (
          <div className="grid gap-2">
            <CollapsedMetric label="Odabrani radovi" value={String(selectedArtworks)} />
            <CollapsedMetric label="PDF verzije" value={String(project.counts.versions)} />
          </div>
        ) : (
          <div className="rounded-xl bg-white/[0.06] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
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
    <div className="group relative grid h-10 place-items-center rounded-xl bg-white/[0.06] text-[12px] font-black text-white/75">
      {value}
      <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 min-w-[140px] -translate-y-1/2 rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-[10px] font-bold text-white/70 opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition group-hover:opacity-100">
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
    <div className="border-b border-[#d8e0ec] bg-white px-3 py-2 xl:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {steps.map((step, index) => (
          <button
            className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-bold ${
              activeStep === step.id
                ? "bg-[#182fc7] text-white"
                : "border border-[#d8e0ec] text-[#667085]"
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Panel title="Artist profile">
          <div className="grid gap-3 md:grid-cols-2">
            <BuilderInput label="Ime umjetnika" value={artistName} onChange={onArtistNameChange} />
            <BuilderInput label="Disciplina" value={discipline} onChange={onDisciplineChange} />
            <BuilderInput label="Email" value={email} onChange={onEmailChange} />
            <BuilderInput label="Lokacija" value={location} onChange={onLocationChange} />
            <BuilderInput label="Website" value={websiteUrl} onChange={onWebsiteUrlChange} />
            <BuilderInput label="Instagram" value={instagramUrl} onChange={onInstagramUrlChange} />
          </div>

          <label className="mt-4 grid gap-1.5 text-[11px] font-bold text-[#4c5566]">
            Biografija / artist statement
            <textarea
              className="min-h-48 resize-y rounded-lg border border-[#cfd8e6] bg-white px-3 py-2 text-[13px] font-normal leading-6 text-[#1f2430] outline-none transition focus:border-[#182fc7] focus:ring-4 focus:ring-[#182fc7]/8"
              onChange={(event) => onBioChange(event.target.value)}
              value={bio}
            />
          </label>

          <div className="mt-4 rounded-xl border border-[#d8e0ec] bg-[#f8fafc] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7280]">
                  Profilna slika
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#667085]">
                  Ova slika se koristi na cover strani i kontakt strani portfolija.
                </p>
              </div>
              <div className="h-16 w-16 overflow-hidden rounded-full border border-[#cfd8e6] bg-white">
                {profileImageUrl ? (
                  <img alt="" className="h-full w-full object-cover" src={profileImageUrl} />
                ) : null}
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
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

          <div className="mt-4 rounded-xl border border-[#d8e0ec] bg-[#f8fafc] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6a7280]">
                  Kolekcija
                </p>
                <p className="mt-1 max-w-xl text-[12px] leading-5 text-[#667085]">
                  Ovi podaci pune uvodnu stranu kolekcije u PDF-u: naziv, godina, opis i cover.
                </p>
              </div>
              <div className="h-16 w-24 overflow-hidden rounded-xl border border-[#cfd8e6] bg-white">
                {collectionCoverUrl ? (
                  <img alt="" className="h-full w-full object-cover" src={collectionCoverUrl} />
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-[#8b94a7]">
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

            <label className="mt-3 grid gap-1.5 text-[11px] font-bold text-[#4c5566]">
              Opis kolekcije
              <textarea
                className="min-h-28 resize-y rounded-lg border border-[#cfd8e6] bg-white px-3 py-2 text-[13px] font-normal leading-6 text-[#1f2430] outline-none transition focus:border-[#182fc7] focus:ring-4 focus:ring-[#182fc7]/8"
                onChange={(event) => onCollectionDescriptionChange(event.target.value)}
                value={collectionDescription}
              />
            </label>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
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
        </Panel>

        <div className="grid gap-4">
          <Panel title="Readiness">
            <div className="space-y-2">
            {checks.map((check) => (
              <div
                className="flex items-center justify-between rounded-lg border border-[#e1e7f0] bg-[#f8fafc] px-3 py-2"
                key={check.label}
              >
                <span className="text-[12px] font-semibold text-[#4c5566]">{check.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    check.done
                      ? "bg-[#e9f8ef] text-[#137a3a]"
                      : "bg-[#fff3d8] text-[#9a6a00]"
                  }`}
                >
                  {check.done ? "OK" : "Needs work"}
                </span>
              </div>
            ))}
            </div>
          </Panel>
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
        <div className="mb-4 rounded-xl border border-[#dbe3ef] bg-[#f8fafc] p-3 text-[12px] leading-5 text-[#667085]">
          Biraj 10-30 radova za finalni PDF. MVP trenutno cuva izbor rada, a redosljed je vezan
          za broj rada iz drafta.
        </div>
        {orderedArtworks.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
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
        className={`overflow-hidden rounded-xl border bg-white transition ${
          artwork.isSelected
            ? "border-[#182fc7]/35 shadow-[0_16px_38px_rgba(24,47,199,0.08)]"
            : "border-[#dbe3ef]"
        } ${isDragging ? "scale-[0.98] opacity-45" : ""} ${
          isDragTarget ? "border-[#182fc7] bg-[#f3f6ff] ring-2 ring-[#182fc7]/20" : ""
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
        <div className="grid grid-cols-[116px_1fr]">
          <img
            alt={artwork.title || "Portfolio artwork"}
            className="h-full min-h-[132px] w-full object-cover"
            src={artwork.imageUrl}
          />
          <div className="min-w-0 p-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-[13px] font-bold">{artwork.title || "Bez naziva"}</h3>
              <span className="rounded-full bg-[#eef2f7] px-2 py-0.5 text-[10px] font-bold text-[#667085]">
                {artwork.orderIndex + 1}
              </span>
            </div>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a0a8b5]">
              Prevuci za promjenu redosljeda
            </p>
            <p className="mt-1 truncate text-[11px] text-[#7a8494]">
              {artwork.technique || artwork.year || "Detalji rada nisu uneseni"}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                className={`rounded-full px-2 py-1 text-[10px] font-bold transition ${
                  artwork.isSelected
                    ? "bg-[#eef2ff] text-[#182fc7] hover:bg-[#dfe6ff]"
                    : "bg-[#f2f4f7] text-[#7a8494] hover:bg-[#e9edf3]"
                }`}
                disabled={isBusy}
                onClick={() => onToggle(artwork.id, !artwork.isSelected)}
                type="button"
              >
                {artwork.isSelected ? "U PDF-u" : "Van PDF-a"}
              </button>
              <button
                className={`rounded-full px-2 py-1 text-[10px] font-bold transition ${
                  isCoverArtwork
                    ? "bg-[#fff3d8] text-[#9a6a00] ring-1 ring-[#ffc41d]"
                    : "bg-[#f2f4f7] text-[#7a8494] hover:bg-[#fff3d8] hover:text-[#9a6a00]"
                }`}
                disabled={isBusy || isCoverArtwork}
                onClick={() => onSetCover(artwork)}
                type="button"
              >
                {isCoverArtwork ? "Pocetni rad" : "Postavi pocetni"}
              </button>
              <button
                className="rounded-full border border-[#dbe3ef] px-2 py-1 text-[10px] font-bold text-[#4f5967] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                disabled={isBusy || !canMoveUp}
                onClick={() => onMove(artwork.id, "up")}
                type="button"
              >
                Gore
              </button>
              <button
                className="rounded-full border border-[#dbe3ef] px-2 py-1 text-[10px] font-bold text-[#4f5967] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                disabled={isBusy || !canMoveDown}
                onClick={() => onMove(artwork.id, "down")}
                type="button"
              >
                Dolje
              </button>
              <button
                className="ml-auto rounded-full bg-[#10131b] px-3 py-1 text-[10px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#182fc7]"
                onClick={() => setIsEditing(true)}
                type="button"
              >
                Uredi detalje
              </button>
            </div>
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
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-[#090b10]/80 px-4 py-5 backdrop-blur-sm">
      <section className="grid max-h-[92vh] w-full max-w-[1180px] overflow-hidden rounded-3xl border border-white/10 bg-[#f6f8fc] shadow-[0_40px_120px_rgba(0,0,0,0.45)] lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <div className="relative min-h-[300px] bg-[#10131b] p-4 lg:min-h-0">
          <div className="absolute left-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
            Preview rada
          </div>
          <img
            alt={artwork.title || "Portfolio artwork"}
            className="h-full max-h-[86vh] min-h-[300px] w-full rounded-2xl object-contain"
            src={artwork.imageUrl}
          />
        </div>

        <div className="min-h-0 overflow-y-auto p-5 sm:p-7">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8b94a7]">
                Detalji za PDF
              </p>
              <h2 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.05em] text-[#1f2430]">
                {title || "Bez naziva"}
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-[#667085]">
                Ovi podaci ulaze u PDF stranicu rada i kasnije mogu da se koriste za sales
                template, katalog ili price list.
              </p>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dbe3ef] bg-white text-[22px] font-light text-[#4f5967] transition hover:border-[#e91435] hover:text-[#e91435]"
              onClick={onClose}
              type="button"
            >
              ×
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
            <label className="grid gap-1.5 text-[11px] font-bold text-[#4c5566]">
              Status dostupnosti
              <select
                className="h-10 rounded-lg border border-[#cfd8e6] bg-white px-3 text-[13px] font-normal text-[#1f2430] outline-none transition focus:border-[#182fc7] focus:ring-4 focus:ring-[#182fc7]/8"
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

          <label className="mt-4 grid gap-1.5 text-[11px] font-bold text-[#4c5566]">
            Opis rada
            <textarea
              className="min-h-36 resize-y rounded-lg border border-[#cfd8e6] bg-white px-3 py-2 text-[13px] font-normal leading-5 text-[#1f2430] outline-none transition focus:border-[#182fc7] focus:ring-4 focus:ring-[#182fc7]/8"
              onChange={(event) => onDescriptionChange(event.target.value)}
              value={description}
            />
          </label>

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[#dbe3ef] pt-4">
            <button
              className="rounded-full border border-[#dbe3ef] bg-white px-5 py-2 text-[12px] font-black text-[#4f5967] transition hover:border-[#10131b] hover:text-[#10131b]"
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
}

function DesignWorkspace({
  isSaving,
  onSave,
  selectedTemplate,
  onTemplateChange,
}: {
  isSaving: boolean;
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
            className={`rounded-xl border bg-white p-3 text-left transition hover:-translate-y-0.5 ${
              selectedTemplate === template.id
                ? "border-[#182fc7] shadow-[0_18px_44px_rgba(24,47,199,0.12)]"
                : "border-[#dbe3ef] shadow-[0_10px_28px_rgba(31,46,86,0.04)]"
            }`}
            key={template.id}
            onClick={() => onTemplateChange(template.id)}
            type="button"
          >
            <div className="aspect-[4/3] rounded-lg border border-[#e2e8f2] bg-[#f8fafc] p-3">
              <div className="h-2 w-20 rounded-full bg-[#20242d]" />
              <div className="mt-4 h-20 rounded-md bg-white shadow-inner" />
              <div className="mt-3 grid grid-cols-3 gap-2">
                <span className="h-8 rounded bg-[#dfe7f2]" />
                <span className="h-8 rounded bg-[#dfe7f2]" />
                <span className="h-8 rounded bg-[#dfe7f2]" />
              </div>
            </div>
            <h3 className="mt-3 text-[14px] font-bold">{template.title}</h3>
            <p className="mt-1 text-[12px] leading-5 text-[#667085]">{template.description}</p>
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

      <section className="overflow-hidden rounded-2xl border border-[#131722] bg-[#10131b] text-white shadow-[0_24px_70px_rgba(16,19,27,0.18)]">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
              PDF status
            </p>
            <h2 className="mt-3 max-w-2xl text-[26px] font-black leading-tight tracking-[-0.05em]">
              {accessLabel}
            </h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-white/65">
              Preview ostaje dostupan sa velikim ArtBoard watermarkom. Clean PDF se generise i
              cuva kao verzija tek kada je portfolio placen ili kada je umjetnik premium clan.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-full border border-white/20 px-4 py-2 text-[12px] font-black text-white transition hover:bg-white hover:text-[#10131b]"
                onClick={onOpenPreview}
                type="button"
              >
                Otvori preview
              </button>

              <button
                className="rounded-full border border-white/20 px-4 py-2 text-[12px] font-black text-white transition hover:bg-white hover:text-[#10131b] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDownloadingCoverTest}
                onClick={onDownloadCoverTest}
                type="button"
              >
                {isDownloadingCoverTest ? "Generisem cover..." : "Download cover test"}
              </button>

              {canGenerateCleanPdf ? (
                <button
                  className="rounded-full bg-[#ffc41d] px-4 py-2 text-[12px] font-black text-[#10131b] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isGeneratingPdf}
                  onClick={onGeneratePdf}
                  type="button"
                >
                  {isGeneratingPdf ? "Generisem..." : "Generisi novu PDF verziju"}
                </button>
              ) : (
                <button
                  className="rounded-full bg-[#e91435] px-4 py-2 text-[12px] font-black text-white transition hover:-translate-y-0.5"
                  onClick={onOpenPayment}
                  type="button"
                >
                  Plati i otkljucaj PDF
                </button>
              )}

              {project.latestPdfUrl ? (
                <button
                  className="rounded-full bg-[#ffc41d] px-4 py-2 text-[12px] font-black text-[#10131b] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#dbe3ef] bg-white px-4 py-3 text-left text-[12px] transition hover:-translate-y-0.5 hover:border-[#182fc7]"
                  key={version.id}
                  onClick={() => window.open(version.pdfUrl, "_blank", "noopener,noreferrer")}
                  type="button"
                >
                  <span>
                    <strong className="block text-[13px] text-[#1f2430]">
                      Verzija {version.versionNumber}
                    </strong>
                    <span className="text-[#667085]">
                      {formatBuilderDate(version.createdAt)} - {templateLabels[version.template]}
                    </span>
                  </span>
                  <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#182fc7]">
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
                  className="rounded-xl border border-[#dbe3ef] bg-white px-4 py-3"
                  key={payment.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-black text-[#1f2430]">
                      {formatBuilderEnum(payment.status)}
                    </p>
                    <p className="text-[13px] font-black text-[#182fc7]">
                      {formatBuilderMoney(payment.amountCents, payment.currency)}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-[#667085]">
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
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
      <p className="text-[20px] font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>
    </div>
  );
}

function EmptyExportState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#d8e0ec] bg-[#f8fbff] px-4 py-5 text-[12px] font-semibold leading-5 text-[#667085]">
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

  return (
    <aside className="hidden min-h-0 bg-[#dfe5ef] xl:flex xl:flex-col">
      <div className="flex h-14 items-center justify-between border-b border-[#c5cfdd] px-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#6a7280]">
            Live preview
          </p>
          <p className="text-[11px] font-semibold text-[#1f2430]">A4 document map</p>
        </div>
        <div className="text-right">
          <span className="rounded-md bg-white px-2.5 py-1 text-[10px] font-bold text-[#4f5967]">
            {templateLabels[template]}
          </span>
          <p className="mt-1 text-[10px] font-bold text-[#6a7280]">{estimatedPages} strana</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-3 gap-2">
          <PreviewMetric label="Radovi" value={String(selectedItems.length)} />
          <PreviewMetric label="Strane" value={String(estimatedPages)} />
          <PreviewMetric
            label="Download"
            value={project.access.canDownloadCleanPdf ? "Clean" : "Watermark"}
          />
        </div>

        <div className="mt-5 space-y-5">
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
      </div>
    </aside>
  );
}

function SaveNotice({ error, message }: { error: string | null; message: string | null }) {
  if (!error && !message) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-[12px] font-semibold ${
        error
          ? "border-[#f0b8c2] bg-[#fff5f6] text-[#b4132c]"
          : "border-[#bfe7ce] bg-[#f0fff5] text-[#137a3a]"
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
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7a8494]">{label}</p>
        <span className="h-1.5 w-1.5 rounded-full bg-[#182fc7]" />
      </div>
      <div className="aspect-[0.707/1] rounded-md bg-[#fbfbfa] p-5 shadow-[0_24px_70px_rgba(31,46,86,0.22)] ring-1 ring-[#cfd8e6]">
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
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#d8e0ec] bg-white px-4 py-3 shadow-[0_10px_30px_rgba(31,46,86,0.04)]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8b94a7]">{label}</p>
        <h1 className="mt-1 text-[24px] font-bold tracking-[-0.04em]">{title}</h1>
        <p className="mt-1 max-w-[760px] text-[12px] leading-5 text-[#667085]">{description}</p>
      </div>
      {action}
    </header>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-xl border border-[#d8e0ec] bg-white p-4 shadow-[0_10px_30px_rgba(31,46,86,0.04)]">
      <h2 className="mb-4 text-[13px] font-bold uppercase tracking-[0.18em] text-[#6a7280]">
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
    <label className="grid gap-1.5 text-[11px] font-bold text-[#4c5566]">
      {label}
      <input
        className="h-9 rounded-lg border border-[#cfd8e6] bg-white px-3 text-[13px] font-normal text-[#1f2430] outline-none transition focus:border-[#182fc7] focus:ring-4 focus:ring-[#182fc7]/8"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.06] p-2">
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
    blue: "border-[#7c91ff]/30 bg-[#182fc7]/20 text-[#dbe3ff]",
    green: "border-[#79d39b]/30 bg-[#16a34a]/20 text-[#dfffea]",
    neutral: "border-white/10 bg-white/8 text-white/65",
    yellow: "border-[#ffd56a]/30 bg-[#ffc41d]/18 text-[#fff0b8]",
  }[tone];

  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${toneClassName}`}>
      {children}
    </span>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#c5cfdd] bg-white/70 p-2">
      <p className="truncate text-[11px] font-bold">{value}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#7a8494]">
        {label}
      </p>
    </div>
  );
}

function OptionBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dbe3ef] bg-[#f8fafc] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b94a7]">{label}</p>
      <p className="mt-1 text-[13px] font-bold">{value}</p>
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
    "mt-4 inline-flex rounded-md border border-[#10131b] bg-[#10131b] px-3 py-2 text-[11px] font-bold text-white transition hover:-translate-y-0.5 hover:border-[#dc1735] hover:bg-[#dc1735]";

  return (
    <article className="rounded-xl border border-[#d8e0ec] bg-white p-4 shadow-[0_10px_30px_rgba(31,46,86,0.04)]">
      <h2 className="text-[16px] font-bold">{title}</h2>
      <p className="mt-2 min-h-10 text-[12px] leading-5 text-[#667085]">{text}</p>
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
    <div className="rounded-xl border border-dashed border-[#cfd8e6] bg-[#f8fafc] p-8 text-center text-[12px] text-[#667085]">
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
      className="rounded-md bg-[#dc1735] px-3 py-2 text-[11px] font-bold text-white shadow-[0_10px_24px_rgba(220,23,53,0.2)] transition hover:bg-[#bd102a] disabled:cursor-wait disabled:opacity-60"
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
      className="h-9 rounded-lg border border-[#cfd8e6] bg-white px-3 text-[11px] font-bold text-[#182fc7] transition hover:border-[#182fc7] hover:bg-[#f2f5ff] disabled:cursor-wait disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
