import { ApiError } from "./api";
import type { PortfolioProject } from "@/types/api";

export interface SourceArtwork { id: string; title: string | null; description: string | null; imageUrl: string; artistCollectionId: string | null; collectionOrderIndex: number | null; orderIndex: number; }
export interface SourceCollection { id: string; title: string; description: string | null; year: string | null; members: string[]; }
export interface PortfolioCatalog { version: string; artworks: SourceArtwork[]; collections: SourceCollection[]; }
export interface SourceChange { key: string; scope: string; id: string; field: string; label: string; before: unknown; local: unknown; source: unknown; conflict: boolean; actionable: boolean; }
export interface SourceReview { changes: SourceChange[]; sourceVersion: string; revision: number; historyUnknown: boolean; }
export interface PublishPlan { sourceVersion: string; revision: number; title: string; alreadyPublished: boolean;
  unsupported: Array<{ id: string; title: string | null }>; moves: Array<{ artworkId: string; title: string | null; from: string; to: string }>; }
type LocalCollections = { catalog(): PortfolioCatalog; command(payload: Record<string, unknown>): Promise<PortfolioProject>; upload(id: string, file: File): Promise<PortfolioProject> };
const localEditors = new Map<string, LocalCollections>();
export function registerLocalCollections(id: string, editor: LocalCollections) { localEditors.set(id, editor); return () => { if (localEditors.get(id) === editor) localEditors.delete(id); }; }

async function fetchCollections<T>(id: string, operation: string, init: RequestInit = {}) {
  if (id.startsWith("profile-memory:")) throw Error("Sačuvaj draft prije operacije nad izvornim profilom.");
  const response = await fetch(`/api/portfolio-projects/${id}/actions/collections/${operation}`, { ...init, cache: "no-store" });
  const data: unknown = await response.json();
  if (!response.ok) throw new ApiError(data && typeof data === "object" && "message" in data ? String(data.message) : "Kolekcije nijesu dostupne.", response.status, data);
  return data as T;
}

export const getPortfolioCatalog = (id: string) => localEditors.has(id) ? Promise.resolve(localEditors.get(id)!.catalog()) : fetchCollections<PortfolioCatalog>(id, "catalog");
export const getPortfolioSourceChanges = (id: string) => fetchCollections<SourceReview>(id, "source-changes");
export const getPortfolioPublishPlan = (id: string, collectionId: string) => fetchCollections<PublishPlan>(id, `${collectionId}/publish-plan`);
export function commandPortfolioCollections(project: PortfolioProject, payload: Record<string, unknown>) {
  if (localEditors.has(project.id)) return localEditors.get(project.id)!.command(payload);
  return fetchCollections<PortfolioProject>(project.id, "commands", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expectedRevision: project.revision ?? 0, ...payload }) });
}
export function uploadPortfolioSnapshotCover(project: PortfolioProject, collectionId: string, file: File) {
  if (localEditors.has(project.id)) return localEditors.get(project.id)!.upload(collectionId, file);
  const body = new FormData(); body.set("expectedRevision", String(project.revision ?? 0)); body.set("file", file);
  return fetchCollections<PortfolioProject>(project.id, `${collectionId}/cover`, { method: "POST", body });
}
