import type {
  PaginatedResponse,
  PortfolioArtworkAvailability,
  PortfolioFontStyle,
  PortfolioLanguage,
  PortfolioPageFormat,
  PortfolioProject,
  PortfolioTemplate,
} from "@/types/api";

import { ApiError, apiFetch, buildQueryString } from "./api";
import { publicEnv } from "@/lib/env";

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
};

export type UpdatePortfolioArtworkPayload = {
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

export function getPublicPortfolioProject(id: string) {
  return apiFetch<PortfolioProject>(`/portfolio-projects/public/${id}`);
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
  return apiFetch<PortfolioProject>(
    `/portfolio-projects/public/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "browser",
  );
}

export function updatePortfolioArtwork(
  portfolioId: string,
  artworkId: string,
  payload: UpdatePortfolioArtworkPayload,
) {
  return apiFetch<PortfolioProject>(
    `/portfolio-projects/public/${portfolioId}/artworks/${artworkId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "browser",
  );
}

export function uploadPortfolioArtwork(portfolioId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<PortfolioProject>(
    `/portfolio-projects/public/${portfolioId}/artworks/upload`,
    {
      method: "POST",
      body: formData,
    },
    "browser",
  );
}

export function uploadPortfolioProfileImage(portfolioId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<PortfolioProject>(
    `/portfolio-projects/public/${portfolioId}/profile-image`,
    {
      method: "POST",
      body: formData,
    },
    "browser",
  );
}

export function uploadPortfolioCollectionCover(portfolioId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<PortfolioProject>(
    `/portfolio-projects/public/${portfolioId}/collection-cover`,
    {
      method: "POST",
      body: formData,
    },
    "browser",
  );
}

export function completePortfolioDemoPayment(portfolioId: string) {
  return apiFetch<PortfolioProject>(
    `/portfolio-projects/public/${portfolioId}/demo-payment`,
    {
      method: "POST",
    },
    "browser",
  );
}

export function generatePublicPortfolioPdf(portfolioId: string) {
  return apiFetch<PortfolioProject>(
    `/portfolio-projects/public/${portfolioId}/generate-pdf`,
    {
      method: "POST",
    },
    "browser",
  );
}

export function getPortfolioPreviewPdfUrl(portfolioId: string) {
  const requestUrl = new URL(
    `/portfolio-projects/public/${portfolioId}/preview-pdf`,
    publicEnv.apiBaseUrl,
  );

  return requestUrl.toString();
}

export async function downloadPortfolioCoverTestPdf(portfolioId: string) {
  const requestUrl = new URL(
    `/portfolio-projects/public/${portfolioId}/cover-test-pdf`,
    publicEnv.apiBaseUrl,
  );
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
