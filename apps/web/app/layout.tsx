import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import { getAdminSessionUser } from "@/lib/admin-session";
import { getArtistSessionUser } from "@/lib/artist-session";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
          <SiteHeader session={headerSession} />
          <main className="mx-auto w-full max-w-[100vw] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
