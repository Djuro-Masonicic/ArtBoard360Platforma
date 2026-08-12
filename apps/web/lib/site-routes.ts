/**
 * Central route map for the public ArtBoard website.
 *
 * The app still has older English routes like /artists. New public navigation
 * should use the Montenegrin route aliases here, while old routes remain
 * available during the migration.
 */
export const siteRoutes = {
  home: "/",
  about: "/#o-nama",
  artboard: "/artboard",
  artists: "/umjetnici",
  artistProfileBase: "/umjetnik",
  portfolioBuilder: "/portfolio-builder",
  services: "/usluge",
  opportunities: "/oglasi",
  pricing: "/paketi",
  contact: "/kontakt",
  application: "/prijava",
  artistApplication: "/prijava-umjetnika",
  registration: "/registracija",
  login: "/artist/login",
  account: "/nalog",
  subscription: "/pretplata",
} as const;

export const publicNavigationItems = [
  {
    href: siteRoutes.about,
    label: "O nama",
    activePrefixes: ["/#o-nama"],
  },
  {
    href: siteRoutes.artboard,
    label: "ArtBoard",
    activePrefixes: ["/artboard"],
  },
  {
    href: siteRoutes.artists,
    label: "Umjetnici",
    activePrefixes: ["/umjetnici", "/umjetnik", "/artists"],
  },
  {
    href: siteRoutes.portfolioBuilder,
    label: "Portfolio builder",
    activePrefixes: ["/portfolio-builder"],
  },
  {
    href: siteRoutes.services,
    label: "Usluge",
    activePrefixes: ["/usluge"],
  },
  {
    href: siteRoutes.pricing,
    label: "Paketi",
    activePrefixes: ["/paketi", "/pretplata", "/artist/subscription", "/artist/subscribe"],
  },
  {
    href: siteRoutes.contact,
    label: "Kontakt",
    activePrefixes: ["/kontakt"],
  },
] as const;

/**
 * Art Studio 360 is now treated as a sibling unit to ArtBoard.
 * These links are intentionally shorter than the ArtBoard navigation because
 * the studio site should feel focused: homepage, services and contact.
 */
export const artStudioNavigationItems = [
  {
    href: siteRoutes.home,
    label: "Homepage",
    activePrefixes: [siteRoutes.home],
  },
  {
    href: siteRoutes.services,
    label: "Usluge",
    activePrefixes: [siteRoutes.services],
  },
  {
    href: siteRoutes.contact,
    label: "Kontakt",
    activePrefixes: [siteRoutes.contact],
  },
] as const;

/**
 * ArtBoard has its own product navigation.
 *
 * This is intentionally separate from the Art Studio 360 menu because the two
 * units now have different jobs:
 * - Art Studio 360 explains services and studio work.
 * - ArtBoard explains artist tools, profiles, packages and opportunities.
 */
export const artBoardNavigationItems = [
  {
    href: `${siteRoutes.artboard}#alati`,
    label: "Alati",
    activePrefixes: [],
  },
  {
    href: `${siteRoutes.artboard}#portfolio-builder`,
    label: "Portfolio Builder",
    activePrefixes: [siteRoutes.portfolioBuilder],
  },
  {
    href: siteRoutes.artists,
    label: "Umjetnici",
    activePrefixes: [siteRoutes.artists, siteRoutes.artistProfileBase, "/artists"],
  },
  {
    href: `${siteRoutes.artboard}#paketi`,
    label: "Paketi",
    activePrefixes: [siteRoutes.pricing, siteRoutes.subscription, "/artist/subscription", "/artist/subscribe"],
  },
  {
    href: siteRoutes.opportunities,
    label: "Oglasi",
    activePrefixes: [siteRoutes.opportunities],
  },
  {
    href: siteRoutes.application,
    label: "Prijavi se",
    activePrefixes: [siteRoutes.application, siteRoutes.artistApplication],
  },
] as const;
