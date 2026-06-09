import type { PaginatedResponse, Testimonial } from "@/types/api";

import { apiFetch, buildQueryString } from "./api";

export function getTestimonials(query?: Record<string, string | number | boolean | undefined>) {
  return apiFetch<PaginatedResponse<Testimonial>>(`/testimonials${buildQueryString(query)}`);
}
