import type {
  PaginatedResponse,
  PortfolioArtworkAvailability,
  PortfolioDesignConfig,
  PortfolioFontStyle,
  PortfolioLanguage,
  PortfolioPageFormat,
  PortfolioProject,
  PortfolioTemplate,
} from "@/types/api";

import { ApiError, apiFetch, buildQueryString } from "./api";

type PortfolioProjectQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CreateGuestPortfolioProjectPayload = {
  artistName: string;
  email: string;
  discipline?: string;
  location?: string;
};

export type UpdatePortfolioProjectPayload = {
  documentSelection?: import("@artboard/portfolio-document-plan").DocumentSelection;
  cvSections?: import("@artboard/portfolio-document-plan").PortfolioCvData;
  expectedRevision?: number;
  dateOfBirth?: string;
  behanceUrl?: string;
  motto?: string;
  mottoAuthor?: string;
  title?: string;
  artistName?: string;
  discipline?: string;
  location?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  collectionName?: string;
  collectionYear?: string;
  collectionDescription?: string;
  collectionCoverUrl?: string;
  biography?: string;
  artistStatement?: string;
  template?: PortfolioTemplate;
  language?: PortfolioLanguage;
  pageFormat?: PortfolioPageFormat;
  fontStyle?: PortfolioFontStyle;
  includeBranding?: boolean;
  includeCv?: boolean;
  includePrices?: boolean;
  designConfig?: PortfolioDesignConfig;
};

export type UpdatePortfolioArtworkPayload = {
  expectedRevision?: number;
  title?: string;
  collectionName?: string;
  year?: string;
  technique?: string;
  dimensions?: string;
  description?: string;
  availability?: PortfolioArtworkAvailability;
  price?: string;
  isSelected?: boolean;
  orderIndex?: number;
};

export function getPublicPortfolioProject(id: string, token?: string) {
  return apiFetch<PortfolioProject>(`/portfolio-projects/public/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

async function portfolioFetch<T>(path: string, init: RequestInit) {
  const headers = new Headers(init.headers);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(String(payload.message ?? "Portfolio request failed."), response.status, payload);
  return payload as T;
}

export function createPortfolioShareLink(id: string) {
  return portfolioFetch<{ token: string }>(`/api/portfolio-projects/${id}/actions/share`, { method: "POST" });
}
export function revokePortfolioShareLink(id: string) {
  return portfolioFetch<{ revoked: boolean }>(`/api/portfolio-projects/${id}/actions/share`, { method: "DELETE" });
}
export function getPortfolioVersions(id: string, page = 1) {
  return portfolioFetch<import("@/types/api").PaginatedResponse<import("@/types/api").PortfolioVersion>>(`/api/portfolio-projects/${id}/actions/versions?page=${page}&pageSize=12`, { method: "GET" });
}

export function getArtistPortfolioProjects(token: string, query?: PortfolioProjectQuery) {
  return apiFetch<PaginatedResponse<PortfolioProject>>(
    `/portfolio-projects/me${buildQueryString(query)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export async function getCurrentArtistPortfolioProjects(query?: PortfolioProjectQuery) {
  const response = await fetch(`/api/artist/portfolio-projects${buildQueryString(query)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message: string }).message)
        : "Portfolio projekti nijesu mogli biti ucitani.";

    throw new ApiError(message, response.status, payload);
  }

  return response.json() as Promise<PaginatedResponse<PortfolioProject>>;
}

export async function deleteCurrentArtistPortfolioDraft(id: string) {
  const response = await fetch(`/api/artist/portfolio-projects/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message: string }).message)
        : "Portfolio draft nije mogao biti obrisan.";

    throw new ApiError(message, response.status, payload);
  }

  return response.json() as Promise<{ id: string; deleted: boolean }>;
}

export function getAdminPortfolioProjects(token: string, query?: PortfolioProjectQuery) {
  return apiFetch<PaginatedResponse<PortfolioProject>>(
    `/admin/portfolio-projects${buildQueryString(query)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function getAdminPortfolioProject(token: string, id: string) {
  return apiFetch<PortfolioProject>(`/admin/portfolio-projects/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function createPortfolioProjectFromProfile() {
  const response = await fetch("/api/artist/portfolio-projects/from-profile", {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message: string }).message)
        : "Portfolio nije mogao biti kreiran iz profila.";

    throw new ApiError(message, response.status, payload);
  }

  return response.json() as Promise<PortfolioProject>;
}

export function createGuestPortfolioProject(payload: CreateGuestPortfolioProjectPayload) {
  return apiFetch<PortfolioProject>(
    "/portfolio-projects/guest",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "browser",
  );
}

export function updatePortfolioProject(id: string, payload: UpdatePortfolioProjectPayload) {
  return portfolioFetch<PortfolioProject>(
    `/api/portfolio-projects/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function updatePortfolioArtwork(
  portfolioId: string,
  artworkId: string,
  payload: UpdatePortfolioArtworkPayload,
) {
  return portfolioFetch<PortfolioProject>(
    `/api/portfolio-projects/${portfolioId}/actions/artworks/${artworkId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function uploadPortfolioArtwork(portfolioId: string, file: File, expectedRevision?: number) {
  const formData = new FormData();
  formData.append("file", file);
  if (expectedRevision !== undefined) formData.append("expectedRevision", String(expectedRevision));

  return portfolioFetch<PortfolioProject>(
    `/api/portfolio-projects/${portfolioId}/actions/artworks/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function uploadPortfolioCoverImage(portfolioId: string, file: File, expectedRevision?: number) {
  const body = new FormData();
  body.append("file", file);
  if (expectedRevision !== undefined) body.append("expectedRevision", String(expectedRevision));
  return portfolioFetch<PortfolioProject>(`/api/portfolio-projects/${portfolioId}/actions/cover-image`, { method: "POST", body });
}

export function uploadPortfolioProfileImage(portfolioId: string, file: File, expectedRevision?: number) {
  const formData = new FormData();
  formData.append("file", file);
  if (expectedRevision !== undefined) formData.append("expectedRevision", String(expectedRevision));

  return portfolioFetch<PortfolioProject>(
    `/api/portfolio-projects/${portfolioId}/actions/profile-image`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function uploadPortfolioCollectionCover(portfolioId: string, file: File, expectedRevision?: number) {
  const formData = new FormData();
  formData.append("file", file);
  if (expectedRevision !== undefined) formData.append("expectedRevision", String(expectedRevision));

  return portfolioFetch<PortfolioProject>(
    `/api/portfolio-projects/${portfolioId}/actions/collection-cover`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function completePortfolioDemoPayment(portfolioId: string) {
  return portfolioFetch<PortfolioProject>(
    `/api/portfolio-projects/${portfolioId}/actions/demo-payment`,
    {
      method: "POST",
    },
  );
}

export function generatePublicPortfolioPdf(portfolioId: string, operationKey = crypto.randomUUID()) {
  return portfolioFetch<PortfolioProject>(
    `/api/portfolio-projects/${portfolioId}/actions/generate-pdf`,
    {
      method: "POST",
        headers: { "Idempotency-Key": operationKey },
    },
  );
}

export function getPortfolioPreviewPdfUrl(portfolioId: string) {
  return `/api/portfolio-projects/${portfolioId}/pdf?mode=preview`;
}

export async function downloadPortfolioCoverTestPdf(portfolioId: string) {
  const requestUrl = `/api/portfolio-projects/${portfolioId}/actions/cover-test-pdf`;
  const response = await fetch(requestUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message: string }).message)
        : "Cover PDF nije mogao biti generisan.";

    throw new ApiError(message, response.status, payload);
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `portfolio-cover-test-${portfolioId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
}

export function generateAdminPortfolioPdf(token: string, portfolioId: string) {
  return apiFetch<PortfolioProject>(
    `/admin/portfolio-projects/${portfolioId}/generate-pdf`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: "POST",
    },
    "browser",
  );
}
