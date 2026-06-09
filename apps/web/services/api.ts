import { publicEnv, serverEnv } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type QueryValue = string | number | boolean | undefined | null;

/**
 * One small fetch helper gives both server and client code the same error shape.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  mode: "server" | "browser" = "server",
): Promise<T> {
  const baseUrl = mode === "browser" ? publicEnv.apiBaseUrl : serverEnv.apiBaseUrl;
  const requestUrl = new URL(path, baseUrl);
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(requestUrl, {
    ...init,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    let payload: unknown = undefined;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message: string }).message)
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, payload);
  }

  return response.json() as Promise<T>;
}

export function buildQueryString(query?: Record<string, QueryValue>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}
