import {
  updatePortfolioArtwork,
  updatePortfolioProject,
  uploadPortfolioArtwork,
  uploadPortfolioCollectionCover,
  uploadPortfolioProfileImage,
  uploadPortfolioCoverImage,
  type UpdatePortfolioArtworkPayload,
  type UpdatePortfolioProjectPayload,
} from "@/services/portfolio-projects";
import type { PortfolioProject } from "@/types/api";

export interface PortfolioEditorAdapter {
  readonly kind: "backend" | "guest-memory" | "profile-memory";
  updateProject(id: string, payload: UpdatePortfolioProjectPayload): Promise<PortfolioProject>;
  updateArtwork(id: string, artworkId: string, payload: UpdatePortfolioArtworkPayload): Promise<PortfolioProject>;
  uploadArtworks(project: PortfolioProject, files: readonly File[]): Promise<PortfolioProject>;
  uploadProfileImage(id: string, file: File, expectedRevision?: number): Promise<PortfolioProject>;
  uploadCoverImage(id: string, file: File, expectedRevision?: number): Promise<PortfolioProject>;
  uploadCollectionCover(id: string, file: File, expectedRevision?: number): Promise<PortfolioProject>;
  reorderArtworks(project: PortfolioProject, items: readonly { id: string; orderIndex: number }[]): Promise<PortfolioProject>;
  retain?(): () => void;
}

// Saved account projects use the existing owner-protected endpoints. Anonymous
// entry explicitly creates a memory adapter and never sends draft writes.
export const backendPortfolioEditorAdapter: PortfolioEditorAdapter = {
  kind: "backend",
  updateProject: updatePortfolioProject,
  updateArtwork: updatePortfolioArtwork,
  uploadProfileImage: uploadPortfolioProfileImage,
  uploadCoverImage: uploadPortfolioCoverImage,
  uploadCollectionCover: uploadPortfolioCollectionCover,
  async uploadArtworks(project, files) {
    let latest = project;
    for (const file of files) latest = await uploadPortfolioArtwork(project.id, file, latest.collectionSchemaVersion === 2 ? latest.revision : undefined);
    return latest;
  },
  async reorderArtworks(project, items) {
    let latest = project;
    for (const item of items) latest = await updatePortfolioArtwork(project.id, item.id, { orderIndex: item.orderIndex,
      ...(latest.collectionSchemaVersion === 2 ? { expectedRevision: latest.revision } : {}) });
    return latest;
  },
};
