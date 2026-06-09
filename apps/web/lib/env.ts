function withFallback(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

/**
 * Server and browser environments differ in Next.js.
 * Keeping both shapes here avoids environment access logic leaking into UI code.
 */
export const publicEnv = {
  apiBaseUrl: withFallback(process.env.NEXT_PUBLIC_API_BASE_URL, "http://localhost:4000"),
} as const;

export const serverEnv = {
  apiBaseUrl: withFallback(
    process.env.INTERNAL_API_BASE_URL ?? process.env.API_BASE_URL,
    publicEnv.apiBaseUrl,
  ),
} as const;
