import type { PortfolioEditorAdapter } from "@/lib/portfolio-editor-adapter";
import type { UpdatePortfolioArtworkPayload, UpdatePortfolioProjectPayload } from "@/services/portfolio-projects";
import type { PortfolioArtwork, PortfolioProject } from "@/types/api";
import { parseDocumentSelection } from "@artboard/portfolio-document-plan";

export type GuestPortfolioInitialData = Pick<Partial<PortfolioProject>, "artistName" | "email" | "discipline" | "location">;
type ObjectUrls = Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;

export interface GuestPortfolioMemoryAdapter extends PortfolioEditorAdapter {
  readonly kind: "guest-memory";
  getSnapshot(): PortfolioProject;
  getFiles(): ReadonlyMap<string, File>;
  retain(): () => void;
  dispose(): void;
  replaceSnapshot(project: PortfolioProject): PortfolioProject;
}

const imageTypes = new Set(["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp", "image/avif"]);
const projectFields = [
  "title", "artistName", "discipline", "location", "email", "phone", "websiteUrl", "instagramUrl",
  "profileImageUrl", "coverImageUrl", "collectionName", "collectionYear", "collectionDescription",
  "collectionCoverUrl", "biography", "artistStatement", "template", "language", "pageFormat", "fontStyle",
  "includeBranding", "includeCv", "includePrices", "designConfig",
  "dateOfBirth", "behanceUrl", "motto", "mottoAuthor", "cvSections",
] as const;
const artworkTextFields = ["title", "collectionName", "year", "technique", "dimensions", "description", "price"] as const;

// This is an editor view model only. Its deliberately non-UUID id cannot be
// mistaken for a saved project. There are no runtime API or storage imports.
export function createGuestPortfolioMemoryAdapter(
  initial: GuestPortfolioInitialData = {},
  objectUrls: ObjectUrls = URL,
  seed?: PortfolioProject,
): GuestPortfolioMemoryAdapter {
  const now = new Date().toISOString();
  let project: PortfolioProject = {
    id: `guest-memory:${crypto.randomUUID()}`, artistAccountId: null, sourceArtistId: null,
    source: "GUEST", status: "DRAFT", paymentStatus: "REQUIRED", title: "Portfolio",
    artistName: initial.artistName ?? "", email: initial.email ?? null,
    discipline: initial.discipline ?? null, location: initial.location ?? null,
    template: "INSTITUTIONAL_MINIMAL", language: "ME", pageFormat: "A4", fontStyle: "SANS",
    includeBranding: true, includeCv: false, includePrices: false,
    createdAt: now, updatedAt: now, artworks: [], versions: [], payments: [],
    artistAccount: null, sourceArtist: null, publicShareToken: null,
    latestPdfUrl: null, latestPdfStoragePath: null,
    access: { canDownloadCleanPdf: false, requiresPayment: true, reason: "PAYMENT_REQUIRED" },
    counts: { artworks: 0, selectedArtworks: 0, versions: 0, payments: 0 },
  };
  if (seed) project = structuredClone(seed);
  const sourceImages = new Set(seed ? [seed.profileImageUrl, seed.coverImageUrl, seed.collectionCoverUrl,
    ...seed.artworks.map(w => w.imageUrl), ...(seed.collections ?? []).map(c => c.coverImageUrl)].filter(Boolean) : []);
  const files = new Map<string, File>();
  let disposed = false;
  let leases = 0;
  let releaseVersion = 0;

  function active(id = project.id) {
    if (disposed) throw new Error("Privremena sesija je zatvorena.");
    if (id !== project.id) throw new Error("Privremeni portfolio nije pronađen.");
  }
  function snapshot() { active(); return structuredClone(project); }
  function releaseUrl(url: string) {
    objectUrls.revokeObjectURL(url);
    files.delete(url);
  }
  function commit() {
    project.updatedAt = new Date().toISOString();
    project.counts = {
      artworks: project.artworks.length,
      selectedArtworks: project.artworks.filter((artwork) => artwork.isSelected).length,
      versions: 0, payments: 0,
    };
    const referenced = new Set([
      project.profileImageUrl, project.coverImageUrl, project.collectionCoverUrl,
      ...project.artworks.map((artwork) => artwork.imageUrl),
      ...(project.collections ?? []).map(c => c.coverImageUrl),
    ]);
    for (const url of files.keys()) if (!referenced.has(url)) releaseUrl(url);
    return snapshot();
  }
  function validateFile(file: File) {
    if (!imageTypes.has(file.type)) throw new Error("Podržane su JPEG, PNG, WebP i AVIF slike.");
    if (file.size === 0 || file.size > 10 * 1024 * 1024) throw new Error("Slika mora imati između 1 bajta i 10 MB.");
  }
  function addFile(file: File) {
    const url = objectUrls.createObjectURL(file);
    files.set(url, file);
    return url;
  }
  function validateImageReference(value: string | undefined) {
    if (value && !files.has(value) && !sourceImages.has(value)) throw new Error("Slika mora pripadati ovoj privremenoj sesiji.");
  }
  async function replaceImage(id: string, file: File, field: "profileImageUrl" | "coverImageUrl" | "collectionCoverUrl") {
    active(id); validateFile(file);
    project[field] = addFile(file);
    return commit();
  }

  const adapter: GuestPortfolioMemoryAdapter = {
    kind: "guest-memory",
    getSnapshot: snapshot,
    getFiles() { active(); return new Map(files); },
    replaceSnapshot(next) { active(next.id); project = structuredClone(next); return commit(); },
    async updateProject(id, payload: UpdatePortfolioProjectPayload) {
      active(id);
      if (payload.designConfig?.mode === "CUSTOM") throw new Error("Kombinovanje dizajna zahtijeva Premium pristup.");
      for (const field of ["profileImageUrl", "coverImageUrl", "collectionCoverUrl"] as const) validateImageReference(payload[field]);
      for (const field of projectFields) {
        if (payload[field] !== undefined) Object.assign(project, { [field]: structuredClone(payload[field]) });
      }
      if (payload.documentSelection) {
        project.documentSelection = parseDocumentSelection(payload.documentSelection);
      }
      return commit();
    },
    async updateArtwork(id, artworkId, payload: UpdatePortfolioArtworkPayload) {
      active(id);
      const artwork = project.artworks.find((item) => item.id === artworkId);
      if (!artwork) throw new Error("Rad nije pronađen u ovoj sesiji.");
      for (const field of artworkTextFields) if (payload[field] !== undefined) artwork[field] = payload[field]!.trim() || null;
      if (payload.isSelected !== undefined) artwork.isSelected = payload.isSelected;
      if (payload.availability !== undefined) artwork.availability = payload.availability;
      if (payload.orderIndex !== undefined) artwork.orderIndex = payload.orderIndex;
      artwork.updatedAt = new Date().toISOString();
      return commit();
    },
    async uploadArtworks(current, selectedFiles) {
      active(current.id);
      if (project.artworks.length + selectedFiles.length > 30) throw new Error("Portfolio može sadržati najviše 30 radova.");
      selectedFiles.forEach(validateFile);
      const addedUrls: string[] = [];
      try {
        const start = Math.max(-1, ...project.artworks.map((item) => item.orderIndex)) + 1;
        const artworks: PortfolioArtwork[] = selectedFiles.map((file, index) => {
          const url = addFile(file); addedUrls.push(url);
          const timestamp = new Date().toISOString();
          return {
            id: seed ? crypto.randomUUID() : `memory-artwork:${crypto.randomUUID()}`, portfolioId: project.id, imageUrl: url,
            storagePath: null, sourceArtworkId: null,
            title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(),
            availability: "UNKNOWN", isSelected: true, orderIndex: start + index,
            createdAt: timestamp, updatedAt: timestamp,
          };
        });
        project.artworks.push(...artworks);
        return commit();
      } catch (error) {
        addedUrls.forEach(releaseUrl);
        throw error;
      }
    },
    uploadProfileImage: (id, file) => replaceImage(id, file, "profileImageUrl"),
    uploadCoverImage: (id, file) => replaceImage(id, file, "coverImageUrl"),
    uploadCollectionCover: (id, file) => replaceImage(id, file, "collectionCoverUrl"),
    async reorderArtworks(current, items) {
      active(current.id);
      if (new Set(items.map((item) => item.id)).size !== items.length ||
        items.some((item) => !project.artworks.some((artwork) => artwork.id === item.id) || !Number.isInteger(item.orderIndex) || item.orderIndex < 0)) {
        throw new Error("Redosljed mora sadržati radove ove sesije i ispravne pozicije.");
      }
      for (const item of items) project.artworks.find((artwork) => artwork.id === item.id)!.orderIndex = item.orderIndex;
      project.artworks.sort((a, b) => a.orderIndex - b.orderIndex);
      return commit();
    },
    retain() {
      active(); leases++; releaseVersion++;
      let released = false;
      return () => {
        if (released) return;
        released = true; leases--;
        const version = ++releaseVersion;
        // React StrictMode replays effects immediately. A reacquired lease
        // cancels this cleanup; a real unmount still releases every URL.
        queueMicrotask(() => { if (leases === 0 && version === releaseVersion) adapter.dispose(); });
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const url of files.keys()) releaseUrl(url);
    },
  };
  return adapter;
}
