import { createHash, createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);

interface SignedTokenPayload {
  sub: string;
  email: string;
  exp: number;
  kind: "admin" | "artist";
}

/**
 * These helpers keep auth-related crypto explicit and reusable across
 * admin auth, artist auth, and one-time setup token flows.
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) {
    return false;
  }

  const [algorithm, salt, storedHash] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (derivedKey.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedBuffer);
}

export function signSessionToken(payload: SignedTokenPayload, secret: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string, secret: string): SignedTokenPayload {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new Error("Session token shape is invalid.");
  }

  const expectedSignature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error("Session token signature is invalid.");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SignedTokenPayload;

  if (!payload.sub || !payload.email || !payload.exp || !payload.kind) {
    throw new Error("Session token payload is invalid.");
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Session token is expired.");
  }

  return payload;
}

export function createOneTimeToken() {
  return randomBytes(32).toString("hex");
}

export function hashOneTimeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
