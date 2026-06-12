/**
 * This file centralizes environment parsing so the rest of the codebase can
 * rely on strongly shaped values instead of reading process.env everywhere.
 */

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }

  return parsed;
}

function readFirstNumberEnv(names: string[], fallback: number): number {
  for (const name of names) {
    const rawValue = process.env[name];

    if (!rawValue) {
      continue;
    }

    const parsed = Number(rawValue);

    if (Number.isNaN(parsed)) {
      throw new Error(`Environment variable ${name} must be a number.`);
    }

    return parsed;
  }

  return fallback;
}

function readCsvList(name: string, fallback: string[]): string[] {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readAuthSecretEnv(): string {
  const configuredValue = readOptionalEnv("ADMIN_AUTH_SECRET");

  if (configuredValue) {
    return configuredValue;
  }

  if ((process.env.NODE_ENV ?? "development") !== "production") {
    return "dev-admin-auth-secret-change-me";
  }

  throw new Error("Missing required environment variable: ADMIN_AUTH_SECRET");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  apiPort: readFirstNumberEnv(["PORT", "API_PORT"], 4000),
  webOrigins: readCsvList("WEB_ORIGIN", ["http://localhost:3000"]),
  databaseUrl: requireEnv("DATABASE_URL"),
  directUrl: process.env.DIRECT_URL ?? requireEnv("DATABASE_URL"),
  r2AccountId: requireEnv("R2_ACCOUNT_ID"),
  r2AccessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
  r2SecretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  r2BucketName: requireEnv("R2_BUCKET_NAME"),
  r2PublicUrl: requireEnv("R2_PUBLIC_URL"),
  gmailFromEmail: readOptionalEnv("GMAIL_FROM_EMAIL") ?? readOptionalEnv("RESEND_FROM_EMAIL"),
  gmailAppPassword: readOptionalEnv("GMAIL_APP_PASSWORD"),
  resendApiKey: readOptionalEnv("RESEND_API_KEY"),
  resendFromEmail: readOptionalEnv("RESEND_FROM_EMAIL"),
  adminNotificationEmail: readOptionalEnv("ADMIN_NOTIFICATION_EMAIL"),
  adminAuthSecret: readAuthSecretEnv(),
  adminAuthTokenTtlHours: readNumberEnv("ADMIN_AUTH_TOKEN_TTL_HOURS", 12),
  adminSeedEmail: readOptionalEnv("ADMIN_SEED_EMAIL") ?? "admin@artboard.local",
  adminSeedPassword: readOptionalEnv("ADMIN_SEED_PASSWORD") ?? "change-me-admin",
  adminSeedName: readOptionalEnv("ADMIN_SEED_NAME") ?? "ArtBoard Admin",
  siteBaseUrl: readOptionalEnv("SITE_BASE_URL") ?? "http://localhost:3000",
  maxUploadFileSizeBytes: readFirstNumberEnv(
    ["MAX_UPLOAD_FILE_SIZE_BYTES", "MAX_IMAGE_FILE_SIZE_BYTES"],
    10 * 1024 * 1024,
  ),
  maxSignedUploadExpirySeconds: readNumberEnv("MAX_SIGNED_UPLOAD_EXPIRY_SECONDS", 900),
  artistsCsvPath: process.env.ARTISTS_CSV_PATH,
  testimonialsCsvPath: process.env.TESTIMONIALS_CSV_PATH,
} as const;
