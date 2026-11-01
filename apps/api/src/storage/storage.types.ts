/**
 * Shared upload entity types live in a tiny standalone file so DTOs and the
 * storage service can depend on the same values without awkward import cycles.
 */
export type UploadEntityType =
  | "promotion-png"
  | "qr-card-pdf"
  | "qr-card-png"
  | "artwork"
  | "artist-collection-cover"
  | "profile"
  | "portfolio-artwork"
  | "portfolio-collection-cover"
  | "portfolio-pdf"
  | "portfolio-profile"
  | "portfolio-cover"
  | "submission-artwork"
  | "submission-portfolio-pdf"
  | "submission-cover"
  | "submission-profile"
  | "opportunity-cover";
