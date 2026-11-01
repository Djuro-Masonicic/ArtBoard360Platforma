import type { GuestPortfolioMemoryAdapter } from "./guest-portfolio-memory";
import type { PortfolioProject } from "@/types/api";
const normalized = new WeakMap<File, Promise<Blob>>();
export async function forTransport(file: File) {
  if (file.size <= 1024 * 1024) return file;
  let pending = normalized.get(file);
  if (!pending) {
    pending = (async () => {
      const bitmap = await createImageBitmap(file);
      try {
        const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.9, 0.75, 0.55, 0.35]) {
          const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error("Slika nije obrađena.")), "image/jpeg", quality));
          if (blob.size <= 1024 * 1024) return blob;
        }
        throw Error("Slika je prevelika za slanje. Dodaj manju verziju.");
      } finally { bitmap.close(); }
    })();
    normalized.set(file, pending);
  }
  return pending;
}
export async function guestDocumentForm(project: PortfolioProject, adapter: GuestPortfolioMemoryAdapter, operationKey: string, deliverySecret: string) {
  const fields = ["title", "artistName", "discipline", "location", "email", "phone", "dateOfBirth", "behanceUrl", "motto", "mottoAuthor", "websiteUrl", "instagramUrl", "profileImageUrl", "coverImageUrl", "collectionCoverUrl", "collectionName", "collectionYear", "collectionDescription", "biography", "artistStatement", "template", "language", "pageFormat", "fontStyle", "includeBranding", "includeCv", "includePrices", "cvSections", "documentSelection"];
  const data: Record<string, unknown> = {};
  if (project.designConfig?.minimal) data.designConfig = { mode: "PRESET", minimal: project.designConfig.minimal };
  for (const key of fields) { const value = (project as unknown as Record<string, unknown>)[key]; if (value != null && value !== "") data[key] = value; }
  const artworkFields = ["title", "collectionName", "year", "technique", "dimensions", "description", "price", "availability", "isSelected", "orderIndex"];
  const files = adapter.getFiles(), form = new FormData(), references = new Map<string, string>();
  async function image(url?: string | null) {
    if (!url) return undefined;
    if (references.has(url)) return references.get(url);
    const file = files.get(url); if (!file) throw Error("Slika ne pripada trenutnoj stranici.");
    const reference = `upload:${references.size}`; references.set(url, reference);
    const body = await forTransport(file); form.append("images", body, `image-${references.size}.${body.type === "image/jpeg" ? "jpg" : "image"}`); return reference;
  }
  for (const key of ["profileImageUrl", "coverImageUrl", "collectionCoverUrl"]) { const ref = await image(data[key] as string); if (ref) data[key] = ref; }
  const artworks = [];
  for (const row of project.artworks) artworks.push({ ...Object.fromEntries(artworkFields.filter(key => (row as any)[key] != null).map(key => [key, (row as any)[key]])), imageUrl: await image(row.imageUrl) });
  form.append("document", JSON.stringify({ project: data, artworks })); form.append("operationKey", operationKey); form.append("deliverySecret", deliverySecret);
  return form;
}
export const newDeliverySecret = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, "0")).join("");
