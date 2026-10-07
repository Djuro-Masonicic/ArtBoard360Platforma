export type SiteSurface = "artboard" | "studio";

export const SITE_SURFACE_STORAGE_KEY = "artboard:last-site-surface";

const artBoardPrefixes = [
  "/artboard",
  "/umjetnici",
  "/umjetnik",
  "/artists",
  "/portfolio-builder",
  "/oglasi",
  "/paketi",
  "/prijava",
  "/prijava-umjetnika",
  "/registracija",
  "/artist",
  "/login",
  "/nalog",
  "/pretplata",
  "/admin",
  "/upload",
  "/uredi-profil",
] as const;

const artStudioPrefixes = ["/usluge", "/kontakt", "/uslovi-koriscenja"] as const;

export function getSiteSurface(pathname: string): SiteSurface | null {
  if (pathname === "/") {
    return "studio";
  }

  if (matchesRoute(pathname, artBoardPrefixes)) {
    return "artboard";
  }

  if (matchesRoute(pathname, artStudioPrefixes)) {
    return "studio";
  }

  return null;
}

export function shouldOpenArtBoardInNewTab(currentPathname: string, href: string) {
  if (getSiteSurface(currentPathname) !== "studio" || !href.startsWith("/")) {
    return false;
  }

  const targetPathname = href.split(/[?#]/, 1)[0] || "/";
  return getSiteSurface(targetPathname) === "artboard";
}

function matchesRoute(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
