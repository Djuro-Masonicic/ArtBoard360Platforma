import type {
  ArtistSubmissionListItem,
  ArtistSubmissionResponse,
  ArtistSubmissionStatus,
  PaginatedResponse,
} from "@/types/api";

import { ApiError, apiFetch, buildQueryString } from "./api";

function buildAdminHeaders(authToken?: string) {
  if (!authToken) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${authToken}`,
  };
}

export interface SubmitArtistSubmissionPayload {
  fullName: string;
  email: string;
  phone?: string;
  biography: string;
  motto?: string;
  blogUrl?: string;
  notes?: string;
  confirmedRules: boolean;
  disciplines: string[];
  portfolioLinks: string[];
  socialLinks: string[];
  portfolioPdf?: File | null;
  profilePhoto: File;
  featuredWorks: File[];
}

/**
 * The frontend sends one multipart request so the backend can validate the
 * entire submission, upload files to R2, store metadata, and send email.
 */
export function submitArtistSubmission(payload: SubmitArtistSubmissionPayload) {
  const formData = new FormData();
  formData.set("fullName", payload.fullName);
  formData.set("email", payload.email);
  formData.set("biography", payload.biography);
  formData.set("confirmedRules", String(payload.confirmedRules));
  formData.set("disciplines", JSON.stringify(payload.disciplines));
  formData.set("portfolioLinks", JSON.stringify(payload.portfolioLinks));
  formData.set("socialLinks", JSON.stringify(payload.socialLinks));
  formData.set("profilePhoto", payload.profilePhoto);

  if (payload.phone) {
    formData.set("phone", payload.phone);
  }

  if (payload.motto) {
    formData.set("motto", payload.motto);
  }

  if (payload.blogUrl) {
    formData.set("blogUrl", payload.blogUrl);
  }

  if (payload.notes) {
    formData.set("notes", payload.notes);
  }

  if (payload.portfolioPdf) {
    formData.set("portfolioPdf", payload.portfolioPdf);
  }

  for (const artwork of payload.featuredWorks) {
    formData.append("featuredWorks", artwork);
  }

  return apiFetch<ArtistSubmissionResponse>(
    "/artist-submissions",
    {
      method: "POST",
      body: formData,
    },
    "browser",
  );
}

export function getArtistSubmissions(query?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ArtistSubmissionStatus | "";
}, authToken?: string) {
  return apiFetch<PaginatedResponse<ArtistSubmissionListItem>>(
    `/artist-submissions${buildQueryString(query)}`,
    {
      headers: buildAdminHeaders(authToken),
    },
  );
}

export function getArtistSubmissionById(id: string, authToken?: string) {
  return apiFetch<ArtistSubmissionListItem>(`/artist-submissions/${id}`, {
    headers: buildAdminHeaders(authToken),
  });
}

export function updateArtistSubmission(
  id: string,
  payload: {
    fullName: string;
    email: string;
    phone?: string;
    biography: string;
    motto?: string;
    blogUrl?: string;
    notes?: string;
    adminNotes?: string;
    confirmedRules: boolean;
    status: ArtistSubmissionStatus;
    disciplines: string[];
    portfolioLinks: string[];
    socialLinks: string[];
    keptArtworkIds?: string[];
  },
) {
  return fetchAdminSubmissionUpdate(id, payload);
}

async function fetchAdminSubmissionUpdate(
  id: string,
  payload: {
    fullName: string;
    email: string;
    phone?: string;
    biography: string;
    motto?: string;
    blogUrl?: string;
    notes?: string;
    adminNotes?: string;
    confirmedRules: boolean;
    status: ArtistSubmissionStatus;
    disciplines: string[];
    portfolioLinks: string[];
    socialLinks: string[];
    keptArtworkIds?: string[];
  },
) {
  const response = await fetch(`/api/admin/submissions/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    let responsePayload: unknown = undefined;

    try {
      responsePayload = await response.json();
    } catch {
      responsePayload = undefined;
    }

    const message =
      typeof responsePayload === "object" && responsePayload !== null && "message" in responsePayload
        ? String((responsePayload as { message: string }).message)
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, responsePayload);
  }

  return response.json() as Promise<ArtistSubmissionListItem>;
}
