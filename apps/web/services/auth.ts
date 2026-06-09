import type {
  AdminLoginResponse,
  AdminSessionResponse,
  ArtistLoginResponse,
  ArtistSessionResponse,
  ArtistSetupTokenPreview,
} from "@/types/api";

import { apiFetch } from "./api";

/**
 * These helpers keep admin auth traffic explicit and close to the backend
 * contract, instead of scattering raw fetch calls across login/admin pages.
 */
export function loginAdmin(payload: { email: string; password: string }) {
  return apiFetch<AdminLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAdminSession(token: string) {
  return apiFetch<AdminSessionResponse>("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function loginArtist(payload: { email: string; password: string }) {
  return apiFetch<ArtistLoginResponse>("/auth/artist/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getArtistSession(token: string) {
  return apiFetch<ArtistSessionResponse>("/auth/artist/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function inspectArtistSetupToken(token: string) {
  return apiFetch<ArtistSetupTokenPreview>(`/auth/artist/setup/${encodeURIComponent(token)}`);
}

export function completeArtistSetup(payload: { token: string; password: string }) {
  return apiFetch<ArtistLoginResponse>("/auth/artist/setup-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
