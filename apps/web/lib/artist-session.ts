import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError } from "@/services/api";
import { getArtistSession } from "@/services/auth";

export const ARTIST_SESSION_COOKIE_NAME = "artboard_artist_session";

/**
 * Artist sessions are stored separately from admin sessions so the two areas
 * can stay independent and safe even on the same browser.
 */
export async function setArtistSessionToken(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(ARTIST_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearArtistSessionToken() {
  const cookieStore = await cookies();
  cookieStore.delete(ARTIST_SESSION_COOKIE_NAME);
}

export async function getArtistSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ARTIST_SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getArtistSessionUser() {
  const token = await getArtistSessionToken();

  if (!token) {
    return null;
  }

  try {
    const response = await getArtistSession(token);

    return {
      token,
      user: response.user,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      /**
       * This helper is also called while rendering Server Components.
       * Cookie mutation is not allowed there, so an expired/invalid token
       * is treated as an anonymous session instead of deleting the cookie.
       */
      return null;
    }

    throw error;
  }
}

export async function requireArtistSession() {
  const session = await getArtistSessionUser();

  if (!session) {
    redirect("/artist/login");
  }

  return session;
}
