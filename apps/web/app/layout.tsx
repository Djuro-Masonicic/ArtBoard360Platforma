import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import { getAdminSessionUser } from "@/lib/admin-session";
import { getArtistSessionUser } from "@/lib/artist-session";
import { SiteChrome } from "@/components/site-chrome";
import { UiFeedbackProvider } from "@/components/ui-feedback-provider";
import { getArtistBySlug } from "@/services/artists";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "ArtBoard Platforma",
  description: "Minimal scaffold for the ArtBoard artist platform.",
};

/**
 * The layout deliberately stays simple.
 * This is developer scaffolding that can be redesigned later without changing the data flow.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [adminSession, artistSession] = await Promise.all([
    getAdminSessionUser(),
    getArtistSessionUser(),
  ]);

  let artistProfileImageUrl: string | null = null;

  if (artistSession) {
    try {
      const artist = await getArtistBySlug(artistSession.user.artistSlug);
      artistProfileImageUrl = artist.profileImageUrl ?? artist.profileThumbnailUrl ?? null;
    } catch {
      artistProfileImageUrl = null;
    }
  }

  const headerSession = adminSession
    ? {
        kind: "admin" as const,
        email: adminSession.user.email,
        name: adminSession.user.name,
        avatarUrl: null,
        primaryHref: "/admin/admissions",
        primaryLabel: "Prijave",
      }
    : artistSession
      ? {
          kind: "artist" as const,
          email: artistSession.user.email,
          name: artistSession.user.artistName,
          avatarUrl: artistProfileImageUrl,
          primaryHref: "/artist/dashboard",
          primaryLabel: "Moj nalog",
        }
      : null;

  return (
    <html lang="sr">
      <body className={dmSans.className}>
        <UiFeedbackProvider>
          <SiteChrome session={headerSession}>{children}</SiteChrome>
        </UiFeedbackProvider>
      </body>
    </html>
  );
}
