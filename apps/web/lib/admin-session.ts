import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError } from "@/services/api";
import { getAdminSession } from "@/services/auth";

export const ADMIN_SESSION_COOKIE_NAME = "artboard_admin_session";

/**
 * The frontend stores the admin token in an HTTP-only cookie on the Next.js
 * domain. That lets server components and route handlers access it safely.
 */
export async function setAdminSessionToken(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSessionToken() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
}

export async function getAdminSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getAdminSessionUser() {
  const token = await getAdminSessionToken();

  if (!token) {
    return null;
  }

  try {
    const response = await getAdminSession(token);

    return {
      token,
      user: response.user,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      /**
       * Reading session state is used inside Server Components as well.
       * Next.js does not allow mutating cookies during render, so an invalid
       * token simply behaves like "no session" here.
       *
       * Cookie cleanup still happens in places that are allowed to mutate
       * cookies, such as server actions and route handlers.
       */
      return null;
    }

    throw error;
  }
}

export async function requireAdminSession() {
  const session = await getAdminSessionUser();

  if (!session) {
    redirect("/artist/login");
  }

  return session;
}
