import type { ArtistSubscription } from "@/types/api";

import { ApiError, apiFetch } from "./api";

export function getArtistSubscription(token: string) {
  return apiFetch<ArtistSubscription>("/artist-subscriptions/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function requestPlatinumSubscription() {
  return requestSubscriptionRoute("POST");
}

export function cancelPlatinumSubscriptionRequest() {
  return requestSubscriptionRoute("DELETE");
}

export async function completeDemoPlatinumCheckout() {
  const response = await fetch("/api/artist/subscription/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentToken: "demo_card_approved",
    }),
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
        : "Testna uplata nije mogla biti obradjena.";

    throw new ApiError(message, response.status, payload);
  }

  return response.json() as Promise<ArtistSubscription>;
}

async function requestSubscriptionRoute(method: "POST" | "DELETE") {
  const response = await fetch("/api/artist/subscription", {
    method,
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
        : "Pretplata nije mogla biti azurirana.";

    throw new ApiError(message, response.status, payload);
  }

  return response.json() as Promise<ArtistSubscription>;
}
