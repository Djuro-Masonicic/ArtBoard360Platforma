import { createGuestPortfolioMemoryAdapter, type GuestPortfolioMemoryAdapter } from "./guest-portfolio-memory";
import type { PortfolioProject, PortfolioCollection } from "@/types/api";
import type { PortfolioCatalog } from "@/services/portfolio-collections";
import { registerLocalCollections } from "@/services/portfolio-collections";
import { forTransport } from "./portfolio-guest-transport";
import type { UpdatePortfolioProjectPayload } from "@/services/portfolio-projects";

export type ProfileEditorSeed = { project: PortfolioProject; sourceVersion: string; catalog: PortfolioCatalog };
export type ProfileMemoryAdapter = Omit<GuestPortfolioMemoryAdapter, "kind"> & { kind: "profile-memory"; save(project: PortfolioProject): Promise<PortfolioProject> };
const active = new Map<string, ProfileMemoryAdapter>();
const projectFields = ["title", "artistName", "discipline", "location", "email", "phone", "dateOfBirth", "behanceUrl", "motto", "mottoAuthor", "websiteUrl", "instagramUrl", "profileImageUrl", "coverImageUrl", "collectionCoverUrl", "collectionName", "collectionYear", "collectionDescription", "biography", "artistStatement", "template", "language", "pageFormat", "fontStyle", "includeBranding", "includeCv", "includePrices", "cvSections", "documentSelection"];
const artworkFields = ["id", "sourceArtworkId", "portfolioCollectionId", "collectionOrderIndex", "title", "collectionName", "year", "technique", "dimensions", "description", "price", "availability", "isSelected", "orderIndex"];
const pick = (value: any, keys: string[]) => Object.fromEntries(keys.filter(k => value[k] != null).map(k => [k, value[k]]));

export async function editorDocumentForm(project: PortfolioProject, files: ReadonlyMap<string, File>, context: Record<string, string> = {}) {
  const form = new FormData(), refs = new Map<string, string>();
  async function image(url?: string | null) {
    if (!url) return null; if (!url.startsWith("blob:")) return url;
    if (refs.has(url)) return refs.get(url);
    const file = files.get(url); if (!file) throw Error("Privremena slika više nije dostupna.");
    const ref = `upload:${refs.size}`; refs.set(url, ref); const body = await forTransport(file); form.append("images", body, `image-${refs.size}.image`); return ref;
  }
  const metadata: any = pick(project, projectFields);
  metadata.designConfig = { mode: "PRESET", ...(project.designConfig?.minimal ? { minimal: project.designConfig.minimal } : {}) };
  for (const field of ["profileImageUrl", "coverImageUrl", "collectionCoverUrl"]) metadata[field] = await image((project as any)[field]);
  const artworks = []; for (const w of project.artworks) artworks.push({ ...pick(w, artworkFields), imageUrl: await image(w.imageUrl) });
  const collections = []; for (const c of project.collections ?? []) collections.push({ ...pick(c, ["id", "sourceCollectionId", "title", "description", "year", "orderIndex", "isIncluded"]), coverImageUrl: await image(c.coverImageUrl) });
  form.set("document", JSON.stringify({ ...context, project: metadata, artworks, collections, includeUncollectedArtworks: project.includeUncollectedArtworks !== false })); return form;
}
export async function editorRequest(action: "preview" | "test-export" | "save", project: PortfolioProject, signal?: AbortSignal) {
  const adapter = active.get(project.id), context = adapter ? (adapter as any).context : { baseProjectId: project.id };
  const response = await fetch(`/api/portfolio-editor/${action}`, { method: "POST", cache: "no-store", signal, body: await editorDocumentForm(project, adapter?.getFiles() ?? new Map(), context) });
  if (!response.ok) { const error = await response.json(); throw Error(error.message || "Portfolio nije obrađen."); } return response;
}
export const profileMemoryPreview = (project: PortfolioProject, draft: UpdatePortfolioProjectPayload, signal?: AbortSignal) => editorRequest("preview", { ...project, ...draft } as PortfolioProject, signal);

export function createProfileMemoryAdapter(seed: ProfileEditorSeed): ProfileMemoryAdapter {
  const core = createGuestPortfolioMemoryAdapter({}, URL, seed.project);
  const catalog = structuredClone(seed.catalog); let pending: Promise<PortfolioProject> | null = null;
  const local = {
    catalog: () => structuredClone(catalog),
    async upload(id: string, file: File) { const result = await core.uploadCollectionCover(seed.project.id, file); const c = result.collections?.find(c => c.id === id); if (!c) throw Error("Kolekcija nije pronađena."); c.coverImageUrl = result.collectionCoverUrl; return core.replaceSnapshot(result); },
    async command(payload: Record<string, unknown>) {
      const p = core.getSnapshot(), dto: any = payload; p.collections ??= [];
      const collection = (id: string) => { const c = p.collections!.find(c => c.id === id); if (!c) throw Error("Kolekcija nije pronađena."); return c; };
      const works = (ids: string[]) => ids.map(id => { const w = p.artworks.find(w => w.id === id); if (!w) throw Error("Rad nije pronađen."); return w; });
      const move = (ids: string[], target: string | null) => { if (target) collection(target); let next = Math.max(-1, ...p.artworks.filter(w => (w.portfolioCollectionId ?? null) === target).map(w => w.collectionOrderIndex ?? 0)) + 1; for (const w of works(ids)) { w.portfolioCollectionId = target; w.collectionOrderIndex = next++; } };
      const create = (data: any) => { if (!data.title?.trim()) throw Error("Naziv kolekcije je obavezan."); const c: PortfolioCollection = { id: crypto.randomUUID(), portfolioId: p.id, title: data.title.trim(), description: data.description ?? null, year: data.year ?? null, orderIndex: p.collections!.length, isIncluded: true, sourceCollectionId: data.sourceCollectionId ?? null }; p.collections!.push(c); return c; };
      if (dto.action === "create") create(dto);
      else if (dto.action === "update") { const c = collection(dto.collectionId); for (const key of ["title", "description", "year"] as const) if (dto[key] !== undefined) (c as any)[key] = dto[key]; if (dto.coverArtworkId) c.coverImageUrl = works([dto.coverArtworkId])[0]!.imageUrl; }
      else if (dto.action === "toggle") collection(dto.collectionId).isIncluded = dto.included;
      else if (dto.action === "toggleOutside") p.includeUncollectedArtworks = dto.included;
      else if (dto.action === "select") works(dto.artworkIds).forEach(w => { w.isSelected = dto.selected; });
      else if (dto.action === "move") move(dto.artworkIds, dto.collectionId ?? null);
      else if (dto.action === "delete") { collection(dto.collectionId); move(p.artworks.filter(w => w.portfolioCollectionId === dto.collectionId).map(w => w.id), null); p.collections = p.collections.filter(c => c.id !== dto.collectionId); }
      else if (dto.action === "reorder") { if (dto.collectionIds.length !== p.collections.length || new Set(dto.collectionIds).size !== p.collections.length) throw Error("Neispravan redosljed."); dto.collectionIds.forEach((id: string, i: number) => { collection(id).orderIndex = i; }); p.collections.sort((a, b) => a.orderIndex - b.orderIndex); }
      else if (dto.action === "reorderWorks") works(dto.artworkIds).forEach((w, i) => { w.collectionOrderIndex = i; if (!w.portfolioCollectionId) w.orderIndex = i; });
      else if (dto.action === "addWorks" || dto.action === "import") {
        const importWorks = (ids: string[], target: string | null) => { for (const id of ids) { const source = catalog.artworks.find(w => w.id === id); if (!source) throw Error("Izvorni rad nije pronađen."); let w = p.artworks.find(w => w.sourceArtworkId === id);
          if (w && (w.portfolioCollectionId ?? null) !== target && !dto.confirmedMoves?.includes(w.id)) throw Error("Potvrdi premještanje postojećeg rada.");
          if (!w) { if (p.artworks.length >= 30) throw Error("Najviše 30 radova."); const now = new Date().toISOString(); w = { id: crypto.randomUUID(), portfolioId: p.id, sourceArtworkId: id, title: source.title, description: source.description, imageUrl: source.imageUrl, orderIndex: p.artworks.length, isSelected: true, availability: "UNKNOWN", createdAt: now, updatedAt: now }; p.artworks.push(w); }
          move([w.id], target); w.isSelected = true;
        } };
        if (dto.action === "addWorks") importWorks(dto.artworkIds, dto.collectionId ?? null);
        else for (const id of dto.collectionIds) { const source = catalog.collections.find(c => c.id === id); if (!source) throw Error("Izvorna kolekcija nije pronađena."); const c = p.collections.find(c => c.sourceCollectionId === id) ?? create({ ...source, sourceCollectionId: id }); importWorks(source.members, c.id); }
      } else throw Error("Sačuvaj draft prije izmjene izvornog profila.");
      p.revision = (p.revision ?? 0) + 1; return core.replaceSnapshot(p);
    },
  };
  const adapter: ProfileMemoryAdapter = { ...core, kind: "profile-memory", async save(project) {
    if (!pending) pending = editorRequest("save", project).then(r => r.json()).finally(() => { pending = null; }); return pending;
  }, retain() {
    active.set(seed.project.id, adapter); const unregister = registerLocalCollections(seed.project.id, local), release = core.retain();
    return () => { unregister(); if (active.get(seed.project.id) === adapter) active.delete(seed.project.id); release(); };
  } };
  Object.assign(adapter, { context: { sourceVersion: seed.sourceVersion, saveKey: seed.project.id.split(":")[1]! } }); return adapter;
}
