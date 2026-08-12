import { apiFetch, buildQueryString } from "./api";

export type OpportunityType =
  | "OPEN_CALL"
  | "JOB"
  | "RESIDENCY"
  | "EXHIBITION"
  | "COLLABORATION"
  | "GRANT"
  | "OTHER";

export type Opportunity = {
  id: string;
  title: string;
  slug: string;
  type: OpportunityType;
  organization: string | null;
  location: string | null;
  summary: string | null;
  description: string;
  applyUrl: string | null;
  contactEmail: string | null;
  deadlineAt: string | null;
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
  includeDrafts?: boolean;
};

export type OpportunityMutationPayload = {
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
