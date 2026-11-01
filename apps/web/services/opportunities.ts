import { apiFetch, buildQueryString } from "./api";

export type OpportunityType =
  | "OPEN_CALL"
  | "JOB"
  | "FREELANCE"
  | "RESIDENCY"
  | "EXHIBITION"
  | "COLLABORATION"
  | "GRANT"
  | "SCHOLARSHIP"
  | "WORKSHOP"
  | "OTHER";

export type OpportunityApplicationMethod = "EMAIL" | "LINK";
export type OpportunityOrganizerType =
  | "INDIVIDUAL"
  | "INFORMAL_GROUP"
  | "NGO"
  | "ENTREPRENEUR"
  | "COMPANY"
  | "INSTITUTION"
  | "EDUCATIONAL_INSTITUTION";
export type OpportunitySubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type OpportunityWorkMode = "ONSITE" | "REMOTE" | "HYBRID";
export type OpportunityCompensationKind = "PRIZE" | "STIPEND" | "FEE" | "SALARY" | "NONE" | "OTHER";
export type OpportunityDetailsPayload = {
  workMode?: OpportunityWorkMode | null;
  disciplines?: string[];
  compensationKind?: OpportunityCompensationKind | null;
  compensationAmount?: number | null;
  compensationCurrency?: string;
  applicationFee?: number | null;
  maxAge?: number | null;
  eligibleCountries?: string[];
  applicationLanguages?: string[];
  requiredDocuments?: string[];
  coveredCosts?: string[];
};

export type Opportunity = {
  workMode: OpportunityWorkMode | null;
  disciplines: string[];
  compensationKind: OpportunityCompensationKind | null;
  compensationAmount: string | null;
  compensationCurrency: string;
  applicationFee: string | null;
  maxAge: number | null;
  eligibleCountries: string[];
  applicationLanguages: string[];
  requiredDocuments: string[];
  coveredCosts: string[];
  viewCount: number;
  isDemo: boolean;
  hasArtboardApplication?: boolean;
  id: string;
  title: string;
  slug: string;
  type: OpportunityType;
  organization: string | null;
  organizerType: OpportunityOrganizerType | null;
  location: string | null;
  countryCode: string | null;
  city: string | null;
  summary: string | null;
  description: string;
  conditions: string | null;
  compensation: string | null;
  additionalInformation: string | null;
  applicationMethod: OpportunityApplicationMethod | null;
  applyUrl: string | null;
  applyEmail: string | null;
  contactEmail?: string | null;
  deadlineAt: string | null;
  isOpenEnded: boolean;
  coverImageUrl: string | null;
  coverImageStoragePath?: string | null;
  consentAcceptedAt?: string | null;
  submissionStatus: OpportunitySubmissionStatus;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  isPaid: boolean;
  isFeatured: boolean;
  isArchived: boolean;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
};

type PaginatedOpportunities = {
  items: Opportunity[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type GetOpportunitiesQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: OpportunityType;
  status?: OpportunitySubmissionStatus;
  includeDrafts?: boolean;
};

export type OpportunityMutationPayload = OpportunityDetailsPayload & {
  title: string;
  slug?: string;
  type?: OpportunityType;
  organization?: string;
  location?: string;
  summary?: string;
  description: string;
  applyUrl?: string;
  contactEmail?: string;
  deadlineAt?: string;
  conditions?: string;
  compensation?: string;
  countryCode?: string;
  city?: string;
  isOpenEnded?: boolean;
  applicationMethod?: OpportunityApplicationMethod;
  applyEmail?: string;
  additionalInformation?: string;
  organizerType?: OpportunityOrganizerType;
  submissionStatus?: OpportunitySubmissionStatus;
  reviewNotes?: string;
  isPaid?: boolean;
  isFeatured?: boolean;
  isArchived?: boolean;
  isDraft?: boolean;
};

/**
 * Public opportunities API helper.
 *
 * Keeping this in the service layer means the page does not need to know where
 * the backend lives or how query strings are serialized.
 */
export function getOpportunities(query?: GetOpportunitiesQuery) {
  return apiFetch<PaginatedOpportunities>(`/opportunities${buildQueryString(query)}`);
}

export async function submitPublicOpportunity(formData: FormData) {
  const response = await fetch("/api/opportunities/submit", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join(" ") : payload?.message;
    throw new Error(message || "Oglas nije mogao biti poslat.");
  }

  return payload as {
    success: true;
    submissionId: string;
    status: OpportunitySubmissionStatus;
    emailNotificationSent: boolean;
    message: string;
  };
}

/**
 * Server-side admin list helper.
 *
 * Admin pages run on the Next server, so they can safely read the HTTP-only
 * token cookie and forward it to the Nest API.
 */
export function getAdminOpportunities(token: string, query?: GetOpportunitiesQuery) {
  return apiFetch<PaginatedOpportunities>(`/opportunities/admin${buildQueryString(query)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getAdminOpportunityById(id: string, token: string) {
  return apiFetch<Opportunity>(`/opportunities/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Browser-side admin writes go to Next route handlers first.
 *
 * That route handler attaches the admin token from the secure cookie, so the
 * browser code never needs to know where that token is stored.
 */
export async function createOpportunity(payload: OpportunityMutationPayload) {
  const response = await fetch("/api/admin/opportunities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseOpportunityMutationResponse(response);
}

export async function updateOpportunity(id: string, payload: OpportunityMutationPayload) {
  const response = await fetch(`/api/admin/opportunities/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseOpportunityMutationResponse(response);
}

export async function deleteOpportunity(id: string) {
  const response = await fetch(`/api/admin/opportunities/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || "Oglas nije mogao biti obrisan.");
  }
}

async function parseOpportunityMutationResponse(response: Response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || "Oglas nije mogao biti sacuvan.");
  }

  return payload as Opportunity;
}

/**
 * Browser-side artist application helper.
 *
 * The request goes through a Next route handler first because the artist auth
 * token is stored in an HTTP-only cookie. The route handler forwards the token
 * to the Nest API and the API sends the application email to the publisher.
 */
export async function applyToOpportunity(id: string) {
  const response = await fetch(`/api/artist/opportunities/${id}/apply`, {
    method: "POST",
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || "Prijava nije mogla biti poslata.") as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  return payload as { message: string };
}

export function getPublicOpportunity(identifier: string) {
  return apiFetch<Opportunity>(`/opportunities/public/${encodeURIComponent(identifier)}`);
}
