import type { FaqQuestion, PaginatedResponse } from "@/types/api";

import { apiFetch, buildQueryString } from "./api";

export function getFaqs(query?: Record<string, string | number | boolean | undefined>) {
  return apiFetch<PaginatedResponse<FaqQuestion>>(`/faqs${buildQueryString(query)}`);
}
