import type { Metadata } from "next";
import localFont from "next/font/local";

import { getAdminSessionUser } from "@/lib/admin-session";
import { getArtistSessionUser } from "@/lib/artist-session";
import { SiteChrome } from "@/components/site-chrome";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";
import { UiFeedbackProvider } from "@/components/ui-feedback-provider";
import { getArtistBySlug } from "@/services/artists";

import "lenis/dist/lenis.css";
import "./globals.css";

const alcyone = localFont({
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  preload: false,
  src: [
    { path: "./fonts/Alcyone-Thin.woff2", style: "normal", weight: "100" },
    { path: "./fonts/Alcyone-ExtraLight.woff2", style: "normal", weight: "200" },
    { path: "./fonts/Alcyone-Light.woff2", style: "normal", weight: "300" },
    { path: "./fonts/Alcyone-Regular.woff2", style: "normal", weight: "400" },
    { path: "./fonts/Alcyone-Medium.woff2", style: "normal", weight: "500" },
    { path: "./fonts/Alcyone-SemiBold.woff2", style: "normal", weight: "600" },
    { path: "./fonts/Alcyone-Bold.woff2", style: "normal", weight: "700" },
    { path: "./fonts/Alcyone-Black.woff2", style: "normal", weight: "900" },
    { path: "./fonts/Alcyone-ThinItalic.woff2", style: "italic", weight: "100" },
    { path: "./fonts/Alcyone-ExtraLightItalic.woff2", style: "italic", weight: "200" },
    { path: "./fonts/Alcyone-LightItalic.woff2", style: "italic", weight: "300" },
    { path: "./fonts/Alcyone-RegularItalic.woff2", style: "italic", weight: "400" },
    { path: "./fonts/Alcyone-MediumItalic.woff2", style: "italic", weight: "500" },
    { path: "./fonts/Alcyone-SemiBoldItalic.woff2", style: "italic", weight: "600" },
    { path: "./fonts/Alcyone-BoldItalic.woff2", style: "italic", weight: "700" },
    { path: "./fonts/Alcyone-BlackItalic.woff2", style: "italic", weight: "900" },
  ],
  variable: "--font-alcyone",
});

export const metadata: Metadata = {
  title: "ArtBoard Platforma",
  description: "Minimal scaffold for the ArtBoard artist platform.",
  icons: {
    icon: "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/681b5f1cb811f54718bd2d75_360%20Logo%20Symbols%20Only%2032.png",
    shortcut:
      "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/681b5f1cb811f54718bd2d75_360%20Logo%20Symbols%20Only%2032.png",
    apple:
      "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/681b5f1cb811f54718bd2d75_360%20Logo%20Symbols%20Only%2032.png",
  },
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
        primaryHref: "/admin",
        primaryLabel: "Admin panel",
      }
    : artistSession
      ? {
          kind: "artist" as const,
          email: artistSession.user.email,
          name: artistSession.user.artistName,
          avatarUrl: artistProfileImageUrl,
          primaryHref: "/artist/dashboard",
          primaryLabel: "Moj nalog",
          publicProfileHref: `/artists/${artistSession.user.artistSlug}`,
        }
      : null;

  return (
    <html lang="sr">
      <body className={`${alcyone.className} ${alcyone.variable}`}>
        <UiFeedbackProvider>
          <SmoothScrollProvider>
            <SiteChrome session={headerSession}>{children}</SiteChrome>
          </SmoothScrollProvider>
        </UiFeedbackProvider>
      </body>
    </html>
  );
}
