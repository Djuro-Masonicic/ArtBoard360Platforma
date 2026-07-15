import { ApiError } from "./api";

interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export function requestArtistPasswordReset(email: string) {
  return postPasswordResetRequest("/api/auth/artist/forgot-password", { email });
}

export function resetArtistPassword(token: string, password: string) {
  return postPasswordResetRequest("/api/auth/artist/reset-password", {
    token,
    password,
  });
}

async function postPasswordResetRequest(path: string, payload: object) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const responsePayload = (await response.json().catch(() => null)) as
    | PasswordResetResponse
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new ApiError(
      responsePayload?.message ?? "Zahtjev nije mogao biti obradjen.",
      response.status,
      responsePayload,
    );
  }

  return responsePayload as PasswordResetResponse;
}
