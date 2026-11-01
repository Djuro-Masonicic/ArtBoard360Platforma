"use client";
import { useAccountTheme } from "@/lib/use-account-theme";

import Image from "next/image";
import { editorRequest, profileMemoryPreview, type ProfileMemoryAdapter } from "@/lib/portfolio-profile-memory";
import { PortfolioExportWorkspace } from "./portfolio-export-workspace";
import type { GuestPortfolioMemoryAdapter } from "@/lib/guest-portfolio-memory";
import { buildPortfolioDocumentPlan, parsePortfolioCv, readPortfolioCv, getMinimalDesign, getMinimalDesignLabel, type MinimalDesign } from "@artboard/portfolio-document-plan";
import { PortfolioCollectionsWorkspace } from "./portfolio-collections-workspace";
import { PortfolioSourceChanges } from "./portfolio-source-changes";
import { PortfolioLivePdfPreview } from "./portfolio-live-pdf-preview";
import { PortfolioWorksWorkspace } from "./portfolio-works-workspace";
import { PortfolioCvWorkspace, createPortfolioCvDraft, type PortfolioCvDraft } from "./portfolio-cv-workspace";
import { PortfolioDesignWorkspace, MinimalCoverPreview, createPortfolioDesignPreview, type PortfolioDesignPreview } from "./portfolio-design-workspace";
import { commandPortfolioCollections } from "@/services/portfolio-collections";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "@/components/portfolio-builder-editor-shell.module.css";
import { backendPortfolioEditorAdapter, type PortfolioEditorAdapter } from "@/lib/portfolio-editor-adapter";
import { formatBirthDate, parseBirthDateInput } from "@/lib/portfolio-profile-fields";
import { ApiError } from "@/services/api";

import {
  generatePublicPortfolioPdf,
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
  adapter?: PortfolioEditorAdapter;
};

type BuilderStep = "profile" | "collections" | "works" | "cv" | "design" | "export";
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

function getBuilderSteps(project?: PortfolioProject) {
  if (project?.id.startsWith("guest-memory:")) return [steps[0]!, steps[1]!, { id: "cv" as const, label: "CV", helper: "Obrazovanje, iskustvo i izložbe" }, ...steps.slice(2)];
  if (!project?.collectionsAvailable && project?.collectionSchemaVersion !== 2) return steps;
  return [steps[0]!, { id: "collections" as const, label: "Kolekcije", helper: "Izbor kolekcija i radova" }, steps[1]!,
    { id: "cv" as const, label: "CV", helper: "Obrazovanje, iskustvo i izložbe" }, ...steps.slice(2)];
}
function stepNumber(step: BuilderStep, project?: PortfolioProject) {
  return getBuilderSteps(project).findIndex(x => x.id === step) + 1;
}

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

function createPresetDesignConfig(template: PortfolioTemplate, minimal?: MinimalDesign): PortfolioDesignConfig {
  return {
    mode: "PRESET",
    ...(minimal ? { minimal } : {}),
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
  if (!project.designConfig) return createPresetDesignConfig(fallbackTemplate);
  const { documentSelection: _selection, ...design } = project.designConfig as PortfolioDesignConfig & { documentSelection?: unknown };
  const preset = createPresetDesignConfig(fallbackTemplate);
  return { ...preset, ...design, pages: { ...preset.pages, ...design.pages } };
}

function comparableJson(value: unknown) {
  // JSONB may return keys in a different order. That must not turn an unchanged
  // saved design into an unsaved edit and block PDF export after reopening.
  return JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
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

export function PortfolioBuilderEditorShell({ project, adapter = backendPortfolioEditorAdapter }: PortfolioBuilderEditorShellProps) {
  const router = useRouter();
  const isMemoryGuest = adapter.kind === "guest-memory";
  const isMemoryProfile = adapter.kind === "profile-memory";
  const isMemoryEditor = isMemoryGuest || isMemoryProfile;
  const [currentProject, setCurrentProject] = useState(project);
  const [artworkDrafts, setArtworkDrafts] = useState<Record<string, UpdatePortfolioArtworkPayload>>({});
  const [cvDraft, setCvDraft] = useState<PortfolioCvDraft>(() => createPortfolioCvDraft(project.cvSections));
  const [cvEdited, setCvEdited] = useState(false);
  const [replaceLegacyCv, setReplaceLegacyCv] = useState(false);
  const [includeCv, setIncludeCv] = useState(project.includeCv);
  const cvEditVersion = useRef(0);
  useEffect(() => {
    if (!cvEdited) setCvDraft(createPortfolioCvDraft(currentProject.cvSections));
  }, [currentProject.cvSections, cvEdited]);
  const [designPreview, setDesignPreview] = useState<PortfolioDesignPreview>(() => ({ ...createPortfolioDesignPreview(), look: getMinimalDesign(project).style === "BLOCKS" ? "Blocks" : getMinimalDesign(project).style === "CARDS" ? "Cards" : getMinimalDesign(project).style === "EDITORIAL" ? "Editorial" : getMinimalDesign(project).style === "GRADIENT" ? "Gradient" : getMinimalDesign(project).style === "ROUNDED" ? "Rounded" : "Minimal", cover: getMinimalDesign(project).cover }));
  const [designPreviewEdited, setDesignPreviewEdited] = useState(false);
  const [activeStep, setActiveStep] = useState<BuilderStep>("profile");
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
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
  const [phone, setPhone] = useState(project.phone ?? "");
  const [birthDateInput, setBirthDateInput] = useState(() => formatBirthDate(project.dateOfBirth));
  const [behanceUrl, setBehanceUrl] = useState(project.behanceUrl ?? "");
  const [motto, setMotto] = useState(project.motto ?? "");
  const [mottoAuthor, setMottoAuthor] = useState(project.mottoAuthor ?? "");
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
  const [artistStatement, setArtistStatement] = useState(project.artistStatement ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isUploadingCoverImage, setIsUploadingCoverImage] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const exportAttempt = useRef<{ signature: string; key: string } | null>(null);
  function exportKey() {
    const signature = JSON.stringify({ id: currentProject.id, revision: currentProject.revision, liveDraft, artworks: artworksWithDrafts });
    if (exportAttempt.current?.signature !== signature) exportAttempt.current = { signature, key: crypto.randomUUID() };
    return exportAttempt.current.key;
  }
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { theme: studioTheme, changeTheme: changeStudioTheme, error: themeError } = useAccountTheme("dark", !isMemoryGuest, !isMemoryGuest);

  useEffect(() => adapter.retain?.(), [adapter]);

  // In memory mode these fields are just the current document state, with no
  // save operation, persistence, network request or success-as-draft message.
  // Image references belong to the adapter's upload operations. Mirroring them
  // here could overwrite a newer upload with a previous render's image URL.
  useEffect(() => {
    if (!isMemoryEditor) return;
    let active = true;
    void adapter.updateProject(currentProject.id, {
      artistName, discipline, email, phone, location, websiteUrl, instagramUrl,
      dateOfBirth: parseBirthDateInput(birthDateInput) ?? undefined, behanceUrl, motto, mottoAuthor,
      collectionName, collectionYear, collectionDescription, biography: bio, artistStatement,
      template: selectedTemplate, pageFormat, language, fontStyle, includeBranding,
      includeCv, ...(cvEdited ? { cvSections: cvDraft } : {}),
      designConfig: designConfig.mode === "CUSTOM" ? designConfig : createPresetDesignConfig(selectedTemplate, designConfig.minimal),
    }).then((local) => { if (active) setCurrentProject(local); })
      .catch((error: unknown) => { if (active) setSaveError(error instanceof Error ? error.message : "Izmjena nije primijenjena."); });
    return () => { active = false; };
  }, [adapter, isMemoryEditor, currentProject.id, artistName, discipline, email, phone, location, websiteUrl,
    instagramUrl, collectionName, collectionYear, collectionDescription,
    bio, artistStatement, birthDateInput, behanceUrl, motto, mottoAuthor, selectedTemplate, pageFormat, language, fontStyle, includeBranding, designConfig, includeCv, cvDraft, cvEdited]);

  const artworksWithDrafts = useMemo(() => currentProject.artworks.map(artwork => ({ ...artwork, ...artworkDrafts[artwork.id] })), [currentProject.artworks, artworkDrafts]);
  const documentPlan = useMemo(() => buildPortfolioDocumentPlan({ ...currentProject, artworks: artworksWithDrafts }), [currentProject, artworksWithDrafts]);
  const selectedArtworks = documentPlan.selectedArtworks;
  const collectionsMode = !isMemoryGuest && Boolean(currentProject.collectionsAvailable || currentProject.collectionSchemaVersion === 2);
  const liveDraft: UpdatePortfolioProjectPayload = { artistName, discipline, email, phone, location, websiteUrl, instagramUrl,
    dateOfBirth: parseBirthDateInput(birthDateInput) ?? undefined, behanceUrl, motto, mottoAuthor,
    profileImageUrl, biography: bio, artistStatement, template: selectedTemplate, pageFormat, language, fontStyle, includeBranding,
    designConfig: designConfig.mode === "CUSTOM" ? designConfig : createPresetDesignConfig(selectedTemplate, designConfig.minimal), includeCv,
    ...(cvEdited ? { cvSections: cvDraft } : {}) };
  const hasUnsavedMetadata = Object.keys(artworkDrafts).length > 0 || Object.entries(liveDraft).some(([key,value]) => comparableJson(value ?? "") !== comparableJson(key === "designConfig" ? normalizeDesignConfig(currentProject, currentProject.template) : (currentProject as unknown as Record<string,unknown>)[key] ?? ""));
  function adoptCollectionsProject(next: PortfolioProject) {
    setCurrentProject(next); setProfileImageUrl(next.profileImageUrl ?? "");
    setCollectionCoverUrl(next.collectionCoverUrl ?? "");
  }
  function adoptReviewedProject(next: PortfolioProject) {
    adoptCollectionsProject(next); setArtistName(next.artistName); setDiscipline(next.discipline ?? ""); setEmail(next.email ?? "");
    setBirthDateInput(formatBirthDate(next.dateOfBirth)); setBehanceUrl(next.behanceUrl ?? "");
    setBio(next.biography ?? ""); setArtistStatement(next.artistStatement ?? ""); setWebsiteUrl(next.websiteUrl ?? ""); setInstagramUrl(next.instagramUrl ?? "");
  }

  const coverImage =
    currentProject.coverImageUrl || selectedArtworks[0]?.imageUrl || currentProject.profileImageUrl;

  async function saveProject(overrides: UpdatePortfolioProjectPayload = {}) {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const savedCvEditVersion = cvEditVersion.current;
      const hasLegacyCv = currentProject.cvSections != null && !readPortfolioCv(currentProject.cvSections) && Object.keys(Object(currentProject.cvSections)).length > 0;
      if (cvEdited && hasLegacyCv && !replaceLegacyCv) throw new Error("Potvrdi zamjenu prethodnog CV-a novim unosom u koraku CV.");
      const cvSections = cvEdited ? parsePortfolioCv(cvDraft) : undefined;
      const dateOfBirth = parseBirthDateInput(birthDateInput);
      if (dateOfBirth === null) throw new Error("Unesi ispravan datum rođenja (DD.MM.GGGG.), bez datuma u budućnosti.");
      let latest = currentProject;
      for (const [artworkId, payload] of Object.entries(artworkDrafts)) {
        latest = await adapter.updateArtwork(latest.id, artworkId, { ...payload,
          ...(latest.collectionSchemaVersion === 2 ? { expectedRevision: latest.revision } : {}) });
        // Keep the last successful revision if a later request fails. Draft
        // inputs stay available for retry; unrelated artwork fields are omitted.
        setCurrentProject(latest);
      }
      let savedProject = await adapter.updateProject(latest.id, {
        ...(latest.collectionSchemaVersion === 2 ? { expectedRevision: latest.revision } : {}),
        artistName,
        discipline,
        email,
        phone,
        dateOfBirth, behanceUrl, motto, mottoAuthor,
        location,
        websiteUrl,
        instagramUrl,
        profileImageUrl,
        collectionName,
        collectionYear,
        collectionDescription,
        collectionCoverUrl,
        biography: bio,
        artistStatement,
        template: selectedTemplate,
        pageFormat,
        language,
        fontStyle,
        includeBranding,
        includeCv,
        ...(cvSections ? { cvSections } : {}),
        designConfig:
          designConfig.mode === "CUSTOM"
            ? designConfig
            : createPresetDesignConfig(selectedTemplate, designConfig.minimal),
        ...overrides,
      });

      if (isMemoryProfile) {
        savedProject = await (adapter as ProfileMemoryAdapter).save(savedProject);
        router.replace(`/portfolio-builder/${savedProject.id}`);
        router.refresh();
        return savedProject;
      }
      setCurrentProject(savedProject);
      setArtworkDrafts({});
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
      setIncludeCv(savedProject.includeCv);
      if (cvEdited && savedCvEditVersion === cvEditVersion.current) {
        setCvDraft(createPortfolioCvDraft(savedProject.cvSections)); setCvEdited(false); setReplaceLegacyCv(false);
      }
      setSaveMessage(isMemoryGuest ? "Izmjene važe samo u otvorenoj stranici." : designPreviewEdited
        ? `Aktuelni portfolio podaci su sačuvani. ${cvEdited ? "CV unos je takođe sačuvan. " : ""}Novi prikaz stilova i naslovnica ostaje privremen i još nije povezan sa PDF-om.`
        : cvEdited
        ? (savedCvEditVersion === cvEditVersion.current ? "CV i ostali podaci drafta su sačuvani." : "CV je sačuvan, ali imaš novije izmjene koje čekaju čuvanje.")
        : "Draft je sacuvan.");
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
      const latestProject = await adapter.uploadArtworks(currentProject, selectedFiles);

      setCurrentProject(latestProject);
      setSaveMessage(
        isMemoryEditor ? "Slike su privremene i postoje samo u otvorenoj stranici." : selectedFiles.length === 1
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
      const savedProject = await adapter.uploadProfileImage(currentProject.id, file, currentProject.collectionSchemaVersion === 2 ? currentProject.revision : undefined);

      setCurrentProject(savedProject);
      setProfileImageUrl(savedProject.profileImageUrl ?? "");
      setSaveMessage(isMemoryEditor ? "Profilna slika je privremena." : "Profilna slika portfolija je sacuvana.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Profilna slika nije mogla biti uploadovana.");
    } finally {
      setIsUploadingProfileImage(false);
    }
  }

  async function uploadCoverImage(files: FileList | null) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    setIsUploadingCoverImage(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const savedProject = await adapter.uploadCoverImage(currentProject.id, file, currentProject.collectionSchemaVersion === 2 ? currentProject.revision : undefined);

      setCurrentProject(savedProject);
      setSaveMessage(isMemoryEditor ? "Naslovna slika je privremena." : "Naslovna fotografija je sačuvana.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Naslovna fotografija nije mogla biti uploadovana.");
    } finally {
      setIsUploadingCoverImage(false);
    }
  }

  async function saveArtworkSelection(artworkId: string, isSelected: boolean) {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const savedProject = await adapter.updateArtwork(currentProject.id, artworkId, {
        isSelected, ...(currentProject.collectionSchemaVersion === 2 ? { expectedRevision: currentProject.revision } : {}),
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
      const savedProject = await adapter.updateProject(currentProject.id, {
        coverImageUrl: artwork.imageUrl, ...(currentProject.collectionSchemaVersion === 2 ? { expectedRevision: currentProject.revision } : {}),
      });

      setCurrentProject(savedProject);
      setSaveMessage(isMemoryEditor ? "Naslovni rad je izabran u ovoj stranici." : "Pocetni rad je sacuvan.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Pocetni rad nije mogao biti sacuvan.");
    } finally {
      setIsSaving(false);
    }
  }

  function saveArtworkDetails(artworkId: string, payload: UpdatePortfolioArtworkPayload) {
    setSaveMessage(null);
    setSaveError(null);
    if (isMemoryEditor) {
      void adapter.updateArtwork(currentProject.id, artworkId, payload).then(setCurrentProject)
        .catch(error => setSaveError(error instanceof Error ? error.message : "Detalji rada nijesu primijenjeni."));
      return;
    }
    setArtworkDrafts(previous => ({ ...previous, [artworkId]: { ...previous[artworkId], ...payload } }));
  }

  async function reorderArtwork(draggedArtworkId: string, targetArtworkId: string) {
    if (currentProject.collectionSchemaVersion === 2 && draggedArtworkId !== targetArtworkId) {
      const dragged=currentProject.artworks.find(w=>w.id===draggedArtworkId), target=currentProject.artworks.find(w=>w.id===targetArtworkId);
      if(!dragged||!target)return;
      const same=(dragged.portfolioCollectionId??null)===(target.portfolioCollectionId??null);
      if(!same && !window.confirm("Premjesti rad u drugu portfolio kolekciju? Izvorni profil i ru?ni metapodaci ostaju sa?uvani."))return;
      setIsSaving(true);setSaveError(null);
      try {
        if(!same){setCurrentProject(await commandPortfolioCollections(currentProject,{action:"move",artworkIds:[dragged.id],collectionId:target.portfolioCollectionId??null}));return;}
        const group=currentProject.artworks.filter(w=>(w.portfolioCollectionId??null)===(dragged.portfolioCollectionId??null)).sort((a,b)=>dragged.portfolioCollectionId?(a.collectionOrderIndex??a.orderIndex)-(b.collectionOrderIndex??b.orderIndex):a.orderIndex-b.orderIndex);
        const ids=group.filter(w=>w.id!==dragged.id).map(w=>w.id);ids.splice(ids.indexOf(target.id),0,dragged.id);
        setCurrentProject(await commandPortfolioCollections(currentProject,{action:"reorderWorks",artworkIds:ids,collectionId:dragged.portfolioCollectionId??null}));
      }catch(error){setSaveError(error instanceof Error?error.message:"Redosljed nije sa?uvan.");}finally{setIsSaving(false);}
      return;
    }
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
      const changedPositions = reorderedArtworks.flatMap((artwork, index) =>
        artwork.orderIndex === index ? [] : [{ id: artwork.id, orderIndex: index }],
      );
      const latestProject = await adapter.reorderArtworks(currentProject, changedPositions);

      setCurrentProject(latestProject);
      setSaveMessage(isMemoryEditor ? "Redosljed važi samo u otvorenoj stranici." : "Redosljed radova je sacuvan.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Redosljed nije mogao biti sacuvan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function generatePdfVersion() {
    if (isMemoryGuest) return;
    setIsGeneratingPdf(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const generatedProject = await generatePublicPortfolioPdf(currentProject.id, exportKey());
      exportAttempt.current = null;

      setCurrentProject(generatedProject);
      setSaveMessage("Nova PDF verzija je generisana i sacuvana.");
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) exportAttempt.current = null;
      setSaveError(error instanceof Error ? error.message : "PDF nije mogao biti generisan.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  async function generateAndOpenCleanPdf() {
    if (isMemoryGuest) return;
    setIsGeneratingPdf(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const generatedProject = await generatePublicPortfolioPdf(currentProject.id, exportKey());
      exportAttempt.current = null;

      setCurrentProject(generatedProject);
      router.push(`/portfolio-builder/${currentProject.id}/download`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) exportAttempt.current = null;
      setSaveError(error instanceof Error ? error.message : "PDF nije mogao biti generisan.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  async function downloadEditorPdf(clean: boolean) {
    setIsGeneratingPdf(true); setSaveError(null); setSaveMessage(null);
    try {
      if (parseBirthDateInput(birthDateInput) === null) throw Error("Unesi ispravan datum ro\u0111enja.");
      const response = await editorRequest(clean ? "test-export" : "preview", { ...currentProject, ...liveDraft, artworks: artworksWithDrafts } as PortfolioProject);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url;
      link.download = `${clean ? "test-" : "preview-"}portfolio.pdf`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (clean) setSaveMessage("Testni PDF je preuzet. Kvota, draft i istorija verzija nijesu promijenjeni.");
    } catch (error) { setSaveError(error instanceof Error ? error.message : "PDF nije dostupan."); }
    finally { setIsGeneratingPdf(false); }
  }

  function changeDocumentSelection(payload: UpdatePortfolioProjectPayload) {
    if (payload.includeCv !== undefined) setIncludeCv(payload.includeCv);
    if (isMemoryEditor) void adapter.updateProject(currentProject.id, payload).then(setCurrentProject)
      .catch(error => setSaveError(error instanceof Error ? error.message : "Izbor nije primijenjen."));
    else void saveProject(payload);
  }

  function openPreviewPage() {
    if (isMemoryProfile) { void downloadEditorPdf(false); return; }
    if (isMemoryGuest) return;
    router.push(`/portfolio-builder/${currentProject.id}/preview`);
  }

  function openPaymentPage() {
    if (isMemoryGuest) return;
    router.push(`/portfolio-builder/${currentProject.id}/payment`);
  }

  function changePresetTemplate(template: PortfolioTemplate) {
    setSelectedTemplate(template);

    if (designConfig.mode === "PRESET") {
      setDesignConfig(createPresetDesignConfig(template, designConfig.minimal));
    }
  }


  return (
    <main className={styles.studio} data-theme={studioTheme} inert={isMemoryProfile && isSaving ? true : undefined}>
      {themeError ? <p role="alert">{themeError}</p> : null}
      <StudioTopbar
        isMemoryProfile={isMemoryProfile}
        isMemoryGuest={isMemoryGuest}
        isSaving={isSaving}
        cvIsTemporary={isMemoryGuest && (activeStep === "cv" || cvEdited)}
        cvHasChanges={cvEdited || includeCv !== currentProject.includeCv}
        designIsTemporary={designPreviewEdited}
        onOpenPreview={openPreviewPage}
        onSave={() => void saveProject()}
        onThemeChange={changeStudioTheme}
        project={currentProject}
        template={selectedTemplate}
        designLabel={selectedTemplate === "INSTITUTIONAL_MINIMAL" ? getMinimalDesignLabel({ designConfig }) : templateLabels[selectedTemplate]}
        hasUnsavedChanges={isMemoryProfile || hasUnsavedMetadata}
        theme={studioTheme}
      />

      <div className={styles.workspaceLayout}>
        <StudioSidebar
          activeStep={activeStep}
          project={currentProject}
          selectedArtworks={activeStep === "export" && !documentPlan.pages.some(page => ["artwork", "featured", "collection"].includes(page.kind)) ? 0 : selectedArtworks.length}
          actualPages={currentProject.collectionSchemaVersion === 2 ? pdfPageCount ?? undefined : undefined}
          plannedPages={currentProject.collectionSchemaVersion === 2 ? documentPlan.pageCount : undefined}
          setActiveStep={setActiveStep}
        />

        <section className={styles.editorColumn}>
          <MobileSteps activeStep={activeStep} setActiveStep={setActiveStep} project={currentProject} />

          <div className={`${styles.editorContent} ${activeStep === "profile" || activeStep === "collections" || activeStep === "works" || activeStep === "cv" || activeStep === "design" ? styles.profileEditorContent : ""}`}>
            <SaveNotice error={saveError} message={saveMessage ?? (isMemoryGuest
              ? "Privremeni rad u otvorenoj stranici. Refresh briše nezavršeni rad. PDF pregled i priprema narudžbine dostupni su u Izvozu."
              : null)} />

            {!isMemoryProfile && collectionsMode && currentProject.collectionSchemaVersion === 2 ? <PortfolioSourceChanges project={currentProject} theme={studioTheme} onProject={adoptReviewedProject}
              onPrepare={() => hasUnsavedMetadata ? saveProject() : Promise.resolve(currentProject)} /> : null}
            {activeStep === "collections" && collectionsMode ? <PortfolioCollectionsWorkspace project={currentProject} onProject={adoptCollectionsProject} theme={studioTheme} /> : null}
            {activeStep === "profile" ? (
              <ProfileWorkspace
                totalSteps={getBuilderSteps(currentProject).length}
                isMemoryGuest={isMemoryGuest}
                artistName={artistName}
                artistStatement={artistStatement}
                bio={bio}
                coverImageUrl={currentProject.coverImageUrl ?? ""}
                discipline={discipline}
                email={email}
                phone={phone}
                birthDateInput={birthDateInput}
                behanceUrl={behanceUrl}
                motto={motto}
                mottoAuthor={mottoAuthor}
                onBirthDateChange={setBirthDateInput}
                onBehanceChange={setBehanceUrl}
                onMottoChange={setMotto}
                onMottoAuthorChange={setMottoAuthor}
                language={language}
                instagramUrl={instagramUrl}
                isUploadingCoverImage={isUploadingCoverImage}
                isUploadingProfileImage={isUploadingProfileImage}
                location={location}
                onArtistNameChange={setArtistName}
                onArtistStatementChange={setArtistStatement}
                onBioChange={setBio}
                onCoverImageUpload={uploadCoverImage}
                onDisciplineChange={setDiscipline}
                onEmailChange={setEmail}
                onPhoneChange={setPhone}
                onLanguageChange={setLanguage}
                onInstagramUrlChange={setInstagramUrl}
                onLocationChange={setLocation}
                onProfileImageUpload={uploadProfileImage}
                profileImageUrl={profileImageUrl}
              />
            ) : null}

            {activeStep === "works" ? (
              <PortfolioWorksWorkspace
                collectionsMode={collectionsMode}
                isMemoryGuest={isMemoryGuest}
                artworks={currentProject.collectionSchemaVersion === 2 ? [...(currentProject.collections ?? []).flatMap(c => artworksWithDrafts.filter(w => w.portfolioCollectionId === c.id).sort((a,b)=>(a.collectionOrderIndex??a.orderIndex)-(b.collectionOrderIndex??b.orderIndex))), ...artworksWithDrafts.filter(w=>!w.portfolioCollectionId).sort((a,b)=>a.orderIndex-b.orderIndex)] : [...artworksWithDrafts].sort((a,b)=>a.orderIndex-b.orderIndex)}
                isBusy={isSaving || isUploadingArtwork}
                isUploadingArtwork={isUploadingArtwork}
                onReorderArtwork={reorderArtwork}
                onChooseArtworks={() => setActiveStep("collections")}
                onPrevious={() => setActiveStep(collectionsMode ? "collections" : "profile")}
                onNext={() => setActiveStep(collectionsMode || isMemoryGuest ? "cv" : "design")}
                nextStepLabel={collectionsMode || isMemoryGuest ? "CV" : "Dizajn"}
                onUploadArtworks={uploadArtworks}
                onToggleArtwork={saveArtworkSelection}
                onUpdateArtwork={saveArtworkDetails}
                selectedArtworks={selectedArtworks}
              />
            ) : null}

            {activeStep === "cv" ? <PortfolioCvWorkspace value={cvDraft}
              onChange={value => { cvEditVersion.current++; setCvDraft(value); setCvEdited(true); setSaveMessage(null); }}
              previousCv={currentProject.cvSections}
              includeInPdf={includeCv} onIncludeChange={setIncludeCv} isMemoryGuest={isMemoryGuest}
              isBusy={isSaving}
              replaceLegacy={replaceLegacyCv} onReplaceLegacy={setReplaceLegacyCv}
              onPrevious={() => setActiveStep("works")} onNext={() => setActiveStep("design")} /> : null}

            {activeStep === "design" ? (
              <PortfolioDesignWorkspace value={designPreview} onChange={value => {
                setDesignPreview(value); setSaveMessage(null);
                const activeMinimal = (value.look === "Minimal" || value.look === "Rounded" || value.look === "Gradient" || value.look === "Editorial" || value.look === "Cards" || value.look === "Blocks") && value.mode === "single";
                setDesignPreviewEdited(!activeMinimal);
                if (activeMinimal) { setSelectedTemplate("INSTITUTIONAL_MINIMAL"); setDesignConfig(createPresetDesignConfig("INSTITUTIONAL_MINIMAL", { version: 1, cover: value.cover, ...(value.look === "Blocks" ? { style: "BLOCKS" } : value.look === "Cards" ? { style: "CARDS" } : value.look === "Editorial" ? { style: "EDITORIAL" } : value.look === "Gradient" ? { style: "GRADIENT" } : value.look === "Rounded" ? { style: "ROUNDED" } : {}) })); }
              }}
                isSaving={isSaving} isMemoryGuest={isMemoryGuest}
                hasChanges={isMemoryProfile || selectedTemplate !== currentProject.template || comparableJson(designConfig) !== comparableJson(normalizeDesignConfig(currentProject, currentProject.template))}
                onSave={() => void saveProject()}
                isPremium={isPremiumProject(currentProject)} collectionsMode={collectionsMode}
                data={{ artistName, discipline, coverImage, profileImage: profileImageUrl, artworkCount: selectedArtworks.length, qrTarget: currentProject.artboardProfileUrl || websiteUrl || behanceUrl || instagramUrl, location, year: new Date(currentProject.updatedAt).getFullYear(), includeBranding }}
                onPrevious={() => setActiveStep(collectionsMode || isMemoryGuest ? "cv" : "works")} onNext={() => setActiveStep("export")}
                settings={<DesignWorkspace
                hideHeader
                collectionsMode={collectionsMode}
                isMemoryGuest={isMemoryGuest}
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
              />} />
            ) : null}

            {activeStep === "export" ? (
              <PortfolioExportWorkspace
                isMemoryProfile={isMemoryProfile}
                onTestExport={() => void downloadEditorPdf(true)}
                guestAdapter={isMemoryGuest ? adapter as GuestPortfolioMemoryAdapter : undefined}
                onPageCount={setPdfPageCount}
                isSaving={isSaving}
                hasUnsavedChanges={hasUnsavedMetadata || parseBirthDateInput(birthDateInput) === null}
                temporaryContent={designPreviewEdited}
                onIncludeCvChange={value => changeDocumentSelection({ includeCv: value })}
                onDocumentSelectionChange={selection => changeDocumentSelection({ documentSelection: selection, includeCv: selection.scope === "CV" || selection.sections.cv })}
                onSave={() => void saveProject()}
                onPrevious={() => setActiveStep("design")}
                collectionsMode={collectionsMode}
                isMemoryGuest={isMemoryGuest}
                isGeneratingPdf={isGeneratingPdf}
                onGeneratePdf={() => void generatePdfVersion()}
                onOpenCleanPdf={() => void generateAndOpenCleanPdf()}
                onOpenPayment={openPaymentPage}
                onOpenPreview={openPreviewPage}
                project={isMemoryEditor ? { ...currentProject, ...liveDraft, artworks: artworksWithDrafts } as PortfolioProject : currentProject}
              />
            ) : null}

            {activeStep !== "works" && activeStep !== "cv" && activeStep !== "design" && activeStep !== "export" ? <StepNavigation activeStep={activeStep} setActiveStep={setActiveStep} project={currentProject} /> : null}
          </div>
        </section>

        {activeStep !== "export" ? (currentProject.collectionSchemaVersion === 2 && !isMemoryGuest ? <PortfolioLivePdfPreview renderDocument={isMemoryProfile ? profileMemoryPreview : undefined} project={isMemoryProfile ? { ...currentProject, artworks: artworksWithDrafts } : currentProject} draft={liveDraft} valid={parseBirthDateInput(birthDateInput) !== null} onPageCount={setPdfPageCount}
          onSave={() => void saveProject()} onOpenPreview={openPreviewPage} isSaving={isSaving}
          saveStatus={saveMessage ?? (isMemoryProfile ? "Portfolio nije sačuvan." : hasUnsavedMetadata ? "Imaš nesačuvane izmjene." : "Draft je sačuvan.")} /> : <StudioPreviewPanel
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
          project={{ ...currentProject, phone, artistStatement }}
          designConfig={designConfig}
          selectedArtworks={selectedArtworks.length}
          selectedArtworkItems={selectedArtworks}
          template={selectedTemplate}
        />) : null}
      </div>
    </main>
  );
}

function StudioTopbar({
  isMemoryProfile = false,
  isMemoryGuest = false,
  isSaving,
  saveDisabled = false,
  cvIsTemporary = false,
  cvHasChanges = false,
  designIsTemporary = false,
  designLabel,
  hasUnsavedChanges = false,
  onOpenPreview,
  onSave,
  onThemeChange,
  project,
  template,
  theme,
}: {
  isMemoryProfile?: boolean;
  isMemoryGuest?: boolean;
  isSaving: boolean;
  saveDisabled?: boolean;
  cvIsTemporary?: boolean;
  cvHasChanges?: boolean;
  designIsTemporary?: boolean;
  designLabel?: string;
  hasUnsavedChanges?: boolean;
  onOpenPreview: () => void;
  onSave: () => void;
  onThemeChange: (theme: StudioTheme) => void;
  project: PortfolioProject;
  template: PortfolioTemplate;
  theme: StudioTheme;
}) {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarInner}>
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
                <strong title={`${project.artistName} - Portfolio`}>Portfolio Builder</strong>
                <span className={styles.savedBadge}>
                  <i aria-hidden="true" />
                  {isSaving ? "Čuvanje..." : isMemoryProfile ? "Nije sa\u010duvano" : cvIsTemporary ? "CV · privremeno" : cvHasChanges ? "CV · izmijenjeno" : designIsTemporary ? "Dizajn · prikaz" : isMemoryGuest ? "Privremeno" : hasUnsavedChanges ? "Nesačuvano" : "Sačuvano"}
                </span>
              </div>
              <span className={styles.projectSubtitle}>
                {designLabel ?? templateLabels[template]} <b>{isMemoryGuest ? "Gost" : isMemoryProfile ? "Novi portfolio" : project.status === "DRAFT" ? "Draft" : project.status}</b>
              </span>
            </div>
          </div>

          <div className={styles.topbarActions}>
            <Link className={styles.mobileAccountLink} href="/nalog" aria-label="Nazad na nalog"><ArrowLeft aria-hidden="true" size={18} /></Link>
            <button className={styles.mobileThemeButton} type="button" aria-label={theme === "light" ? "Tamna tema" : "Svijetla tema"}
              onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon aria-hidden="true" size={17} /> : <Sun aria-hidden="true" size={17} />}</button>
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
            {!isMemoryGuest ? <button className={styles.outlineButton} disabled={isSaving || saveDisabled}
              title={saveDisabled ? "CV unos je privremen. Serversko čuvanje CV-a još nije povezano." : undefined} onClick={onSave} type="button">
              {isSaving ? "Čuvam..." : "Sačuvaj draft"}
            </button> : null}
            <button aria-label="Otvori pregled" className={styles.gradientButton} disabled={isMemoryGuest}
              title={isMemoryGuest ? "Guest PDF pregled je u koraku Izvoz." : undefined} onClick={onOpenPreview} type="button">
              Otvori pregled
            </button>
          </div>
      </div>
    </header>
  );
}

function StudioSidebar({
  activeStep,
  project,
  selectedArtworks,
  actualPages,
  plannedPages,
  setActiveStep,
}: {
  activeStep: BuilderStep;
  project: PortfolioProject;
  selectedArtworks: number;
  actualPages?: number;
  plannedPages?: number;
  setActiveStep: (step: BuilderStep) => void;
}) {
  const navSteps = getBuilderSteps(project);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const reveal = () => {
      if (!window.matchMedia("(max-width: 640px)").matches) return;
      const nav = navRef.current, active = nav?.querySelector<HTMLElement>('[aria-current="step"]');
      if (!nav || !active) return;
      const bounds = nav.getBoundingClientRect(), item = active.getBoundingClientRect();
      nav.scrollTo({ left: nav.scrollLeft + item.left - bounds.left - (bounds.width - item.width) / 2 });
    };
    reveal(); window.addEventListener("resize", reveal);
    return () => window.removeEventListener("resize", reveal);
  }, [activeStep]);
  const estimatedPages = actualPages ?? plannedPages ?? Math.max(4, selectedArtworks + 4);
  const nameParts = project.artistName.trim().split(/\s+/);
  const nextStep = navSteps[navSteps.findIndex((step) => step.id === activeStep) + 1];
  const isPremium = isPremiumProject(project);
  const accessLabel = isPremium
    ? "Premium nalog"
    : project.access.reason === "PAID"
      ? "PDF otključan"
      : project.source === "GUEST" ? "Gost" : "Free korisnik";

  return (
    <aside className={styles.sidebar}>
      <div className={styles.profileSummary}>
        <div className={`${styles.sourceLabel} sr-only`}>
          {project.source === "ARTBOARD_PROFILE" ? "Iz ArtBoard profila" : "Portfolio bez profila"}
        </div>
        <div className={styles.profileIdentity}>
          <div className={styles.sidebarAvatar}>
            {project.profileImageUrl ? <img alt="" src={project.profileImageUrl} /> : <span>{nameParts.slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase()}</span>}
          </div>
          <h1 aria-label={project.artistName}>
            <span>{nameParts[0]}</span>
            {nameParts.length > 1 ? <> <span>{nameParts.slice(1).join(" ")}</span></> : null}
          </h1>
        </div>
        <div className={styles.planBadges}>
          <span className={isPremium ? styles.premiumBadge : styles.planBadge}>
            <strong>
              {isPremium ? (
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.2 4.2L19 7" />
                </svg>
              ) : null}
              {accessLabel}
            </strong>
          </span>
        </div>
      </div>

      <nav ref={navRef} className={styles.stepNav} aria-label="Koraci izrade portfolija">
        {navSteps.map((step, index) => {
          const isActive = activeStep === step.id;
          return (
            <button
              aria-current={isActive ? "step" : undefined}
              className={isActive ? styles.activeStep : undefined}
              style={navSteps.length === 6 ? { order: stepNumber(step.id, project) } : undefined}
              data-step={step.id}
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              type="button"
            >
              <span className={styles.stepIcon}><BuilderStepIcon step={step.id} /></span>
              <span className={styles.stepCopy}>
                <strong><i>{String(stepNumber(step.id, project)).padStart(2, "0")}</i>{step.label}</strong>
                <small className="sr-only">{step.helper}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <div className={styles.sidebarMetrics}>
        <div><strong>{selectedArtworks}<span>/{project.artworks.length}</span></strong><small>Radova u PDF‑u</small></div>
        <div><strong>{estimatedPages}</strong><small>Strana u PDF‑u <span>({actualPages == null ? "procjena" : "PDF pregled"})</span></small></div>
      </div>
      {nextStep ? (
        <button className={styles.sidebarPreviewButton} onClick={() => setActiveStep(nextStep.id)} type="button">
          Dalje: {nextStep.label} →
        </button>
      ) : null}
    </aside>
  );
}

function BuilderStepIcon({ step }: { step: BuilderStep }) {
  if (step === "cv") return <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 11h6M9 14h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (step === "collections") return <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="M3 7h18v14H3zM5 3h14M4 5h16M8 11h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (step === "profile") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 11.4a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4zM4.6 20.2c.9-3.7 3.8-5.7 7.4-5.7s6.5 2 7.4 5.7"
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
          d="M5.4 4.2h13.2a1.8 1.8 0 0 1 1.8 1.8v12a1.8 1.8 0 0 1-1.8 1.8H5.4A1.8 1.8 0 0 1 3.6 18V6a1.8 1.8 0 0 1 1.8-1.8zM3.8 16.2l4.6-4.4 3.6 3.4 2.6-2.4 5.6 5M15.6 9.2a1.2 1.2 0 1 0 0-.01"
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
          d="M5.4 3.8h13.2a1.8 1.8 0 0 1 1.8 1.8v12.8a1.8 1.8 0 0 1-1.8 1.8H5.4a1.8 1.8 0 0 1-1.8-1.8V5.6a1.8 1.8 0 0 1 1.8-1.8zM3.6 9.2h16.8M9.6 9.2v11"
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
        d="M12 3.8v11M7.6 10.6 12 15l4.4-4.4M4.4 16.4v1.8a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2v-1.8"
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
  project,
}: {
  project?: PortfolioProject;
  activeStep: BuilderStep;
  setActiveStep: (step: BuilderStep) => void;
}) {
  const navSteps = getBuilderSteps(project);
  return (
    <div className={`${styles.mobileSteps} border-b border-white/[0.08] bg-[#07080d]/95 px-3 py-2 backdrop-blur-xl xl:hidden`}>
      <div className="flex gap-2 overflow-x-auto">
        {navSteps.map((step, index) => (
          <button
            className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-bold ${
              activeStep === step.id
                ? "bg-[#111318] text-white shadow-[0_10px_28px_rgba(17,19,24,0.14)]"
                : "border border-white/[0.1] bg-white/[0.04] text-[#8d93a5]"
            }`}
            key={step.id}
            style={navSteps.length === 6 ? { order: stepNumber(step.id, project) } : undefined}
            onClick={() => setActiveStep(step.id)}
            type="button"
          >
            {stepNumber(step.id, project)}. {step.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepNavigation({
  activeStep,
  setActiveStep,
  project,
}: {
  project?: PortfolioProject;
  activeStep: BuilderStep;
  setActiveStep: (step: BuilderStep) => void;
}) {
  const navSteps = getBuilderSteps(project);
  const currentIndex = navSteps.findIndex((step) => step.id === activeStep);
  const previousStep = currentIndex > 0 ? navSteps[currentIndex - 1] : null;
  const nextStep = currentIndex < navSteps.length - 1 ? navSteps[currentIndex + 1] : null;

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
  totalSteps = 4,
  isMemoryGuest = false,
  artistName,
  artistStatement,
  bio,
  discipline,
  email,
  phone,
  birthDateInput, behanceUrl, motto, mottoAuthor,
  onBirthDateChange, onBehanceChange, onMottoChange, onMottoAuthorChange,
  coverImageUrl,
  language,
  instagramUrl,
  isUploadingCoverImage,
  isUploadingProfileImage,
  location,
  onArtistNameChange,
  onArtistStatementChange,
  onBioChange,
  onCoverImageUpload,
  onDisciplineChange,
  onEmailChange,
  onPhoneChange,
  onLanguageChange,
  onInstagramUrlChange,
  onLocationChange,
  onProfileImageUpload,
  profileImageUrl,
}: {
  totalSteps?: number;
  isMemoryGuest?: boolean;
  artistName: string;
  artistStatement: string;
  bio: string;
  discipline: string;
  email: string;
  phone: string;
  birthDateInput: string; behanceUrl: string; motto: string; mottoAuthor: string;
  onBirthDateChange: (value: string) => void; onBehanceChange: (value: string) => void;
  onMottoChange: (value: string) => void; onMottoAuthorChange: (value: string) => void;
  coverImageUrl: string;
  language: PortfolioLanguage;
  instagramUrl: string;
  isUploadingCoverImage: boolean;
  isUploadingProfileImage: boolean;
  location: string;
  onArtistNameChange: (value: string) => void;
  onArtistStatementChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onCoverImageUpload: (files: FileList | null) => void;
  onDisciplineChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onLanguageChange: (value: PortfolioLanguage) => void;
  onInstagramUrlChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onProfileImageUpload: (files: FileList | null) => void;
  profileImageUrl: string;
}) {
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.profileWorkspace}>
      <header className={styles.profileHeader}>
        <div>
          <span>Korak 1 od {totalSteps}</span>
          <h1>Uredi podatke za PDF</h1>
          <p>{isMemoryGuest ? "Unesi podatke za privremeni portfolio — izmjene se odmah vide u pregledu."
            : "Podatke povlačimo sa tvog ArtBoard profila. Provjeri ih i dopuni, izmjene se odmah vide u pregledu."}</p>
        </div>
      </header>

      <div className={styles.profileSections}>
        <section className={styles.profileBasics} aria-labelledby="profile-basics-title">
          <div className={styles.profileBasicsHeader}>
            <h2 id="profile-basics-title">Osnovni podaci</h2>
            <div className={styles.profileLanguage} role="group" aria-label="Jezik PDF-a">
              <span>Jezik PDF-a</span>
              <div>
                {([{value: "ME", label: "Crnogorski"}, {value: "EN", label: "English"}] as const).map((option) => (
                  <button aria-pressed={language === option.value} key={option.value}
                    onClick={() => onLanguageChange(option.value)} type="button">{option.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.profileFieldGrid}>
            <ProfileTextInput label="Ime i prezime" value={artistName} onChange={onArtistNameChange} />
            <ProfileTextInput label="E-mail" type="email" value={email} onChange={onEmailChange} />
            <ProfileTextInput label="Telefon" type="tel" placeholder="npr. +382 67 123 456" value={phone} onChange={onPhoneChange} />
            <ProfileTextInput label="Datum rođenja" placeholder="DD.MM.GGGG."
              value={birthDateInput} onChange={onBirthDateChange} />
            <ProfileTextInput
              label="Lokacija"
              placeholder="npr. Podgorica, Crna Gora"
              value={location}
              onChange={onLocationChange}
            />
            <ProfileTextInput label="Behance" placeholder="behance.net/imeprezime"
              value={behanceUrl} onChange={onBehanceChange} maxLength={500} />
            <ProfileTextInput label="Instagram" placeholder="instagram.com/imeprezime" value={instagramUrl} onChange={onInstagramUrlChange} />
          </div>

          <ProfileDisciplines value={discipline} onChange={onDisciplineChange} />

          <label className={styles.profileField}>
            <span className={styles.profileTextHeading}>
              <span>Biografija</span>
              <span>{bio.length} / 1200 karaktera</span>
            </span>
            <textarea
              aria-label="Biografija"
              className={styles.profileTextarea}
              maxLength={1200}
              onChange={(event) => onBioChange(event.target.value)}
              rows={6}
              value={bio}
            />
          </label>
          <label className={styles.profileField}>
            <span className={styles.profileTextHeading}>
              <span>Umjetnički iskaz <small>· opciono</small></span>
              <span>{artistStatement.trim().split(/\s+/).filter(Boolean).length} riječi</span>
            </span>
            <textarea aria-label="Umjetnički iskaz" className={styles.profileTextarea} rows={3}
              placeholder="Kratko o tvom radu: teme, tehnike i pristup."
              value={artistStatement} onChange={(event) => onArtistStatementChange(event.target.value)} />
            <span className={styles.profileHint}>Biografija govori o tebi, a iskaz o tvom radu.</span>
          </label>
          <div className={styles.profileFieldGrid}>
            <ProfileTextInput label="Moto" optional placeholder="Citat koji predstavlja tvoj rad"
              value={motto} onChange={onMottoChange} maxLength={1000} />
            <ProfileTextInput label="Autor citata" optional placeholder="npr. ime autora citata"
              value={mottoAuthor} onChange={onMottoAuthorChange} maxLength={160} />
          </div>
        </section>

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
                <ProfilePhotoIcon />
                {isUploadingProfileImage ? "Upload..." : "Izmijeni fotografiju"}
              </button>
            </div>
          </section>

          <section className={styles.profileImageCard}>
            <input accept="image/jpeg,image/png,image/webp,image/avif" className="hidden"
              onChange={(event) => { onCoverImageUpload(event.target.files); event.target.value = ""; }}
              ref={coverInputRef} type="file" />
            <button className={styles.profileCoverButton} disabled={isUploadingCoverImage}
              onClick={() => coverInputRef.current?.click()} aria-label="Izmijeni naslovnu fotografiju" type="button">
              {coverImageUrl ? <img alt="Naslovna fotografija" src={coverImageUrl} /> : <span>Naslovna</span>}
            </button>
            <div className={styles.profileCardCopy}>
              <h2>Naslovna fotografija</h2>
              <p>Velika slika na naslovnoj strani portfolija, nezavisna od izabranih radova.</p>
              <button className={styles.changeProfileImageButton} disabled={isUploadingCoverImage}
                onClick={() => coverInputRef.current?.click()} type="button">
                <ProfilePhotoIcon />{isUploadingCoverImage ? "Upload..." : "Izmijeni fotografiju"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ProfileTextInput({ label, onChange, placeholder, type = "text", value, optional = false, maxLength }: {
  label: string; onChange: (value: string) => void; placeholder?: string;
  type?: "text" | "email" | "tel"; value: string;
  optional?: boolean; maxLength?: number;
}) {
  return <label className={styles.profileField}><span>{label}{optional ? <small> · opciono</small> : null}</span>
    <input aria-label={label} maxLength={maxLength} className={styles.profileInput} onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder} type={type} value={value} />
  </label>;
}

function ProfilePhotoIcon() {
  return <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />
  </svg>;
}

function ProfileDisciplines({value, onChange}: {value: string; onChange: (value: string) => void}) {
  const [expanded, setExpanded] = useState(false);
  const selected = parseDisciplineList(value);
  const options = getPortfolioDisciplineOptions(value);
  const toggle = (option: string) => onChange(formatDisciplineList(toggleDisciplineValue(selected, option)));
  return <div className={styles.profileDisciplines}>
    <div><span>Discipline</span><span>Tvoje discipline · {selected.length}</span></div>
    <div className={styles.profileDisciplineChips}>
      {selected.map((option) => <button aria-pressed="true" key={option} onClick={() => toggle(option)} type="button">{option}</button>)}
      <button aria-expanded={expanded} aria-controls="profile-discipline-options" className={styles.profileMoreDisciplines}
        onClick={() => setExpanded((current) => !current)} type="button">{expanded ? "− Sakrij" : "+ Pogledaj sve"} ({options.length})</button>
    </div>
    {expanded ? <div id="profile-discipline-options" className={styles.profileDisciplineOptions}>
      {options.map((option) => <button aria-pressed={selected.includes(option)} key={option}
        onClick={() => toggle(option)} type="button">{option}</button>)}
    </div> : null}
  </div>;
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
  collectionsMode = false,
  isMemoryGuest = false,
  hideHeader = false,
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
  collectionsMode?: boolean;
  isMemoryGuest?: boolean;
  hideHeader?: boolean;
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

    onDesignConfigChange(mode === "CUSTOM" ? { ...designConfig, mode } : createPresetDesignConfig(selectedTemplate, designConfig.minimal));
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
      {!hideHeader ? <WorkspaceHeader
        label={collectionsMode ? "Korak 5 od 6" : "Korak 3 od 4"}
        title="Izaberi dizajn PDF-a"
        description="Šablon određuje izgled svih strana. Format, jezik i font možeš promijeniti bilo kad."
      /> : null}

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
          {!isMemoryGuest ? <div className={styles.designSaveAction}>
            <SecondaryStudioButton disabled={isSaving} onClick={onSave}>
              {isSaving ? "Čuvam..." : "Sačuvaj podešavanja"}
            </SecondaryStudioButton>
          </div> : null}
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
  const previewTemplateLabel = designConfig.mode === "CUSTOM" ? "Custom mix" : template === "INSTITUTIONAL_MINIMAL" ? getMinimalDesignLabel({ designConfig }) : templateLabels[template];
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
        <PreviewThumbnail label="01 · Naslovna" large flush={template === "INSTITUTIONAL_MINIMAL"}>
          {template === "INSTITUTIONAL_MINIMAL" ? <MinimalCoverPreview printStyle={getMinimalDesign({ designConfig }).style} cover={getMinimalDesign({ designConfig }).cover} data={{ artistName, discipline, coverImage: mainImage, profileImage: profileImageUrl, artworkCount: selectedItems.length, qrTarget: project.artboardProfileUrl || project.websiteUrl || project.behanceUrl || project.instagramUrl, location: project.location, year: new Date(project.updatedAt).getFullYear(), includeBranding: project.includeBranding }} /> : <>
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
          </>}
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
  flush = false,
}: {
  children: React.ReactNode;
  label: string;
  large?: boolean;
  flush?: boolean;
}) {
  return (
    <section className={large ? styles.previewThumbnailLarge : styles.previewThumbnail}>
      <span>{label}</span>
      <div style={flush ? { padding: 0 } : undefined}>{children}</div>
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
