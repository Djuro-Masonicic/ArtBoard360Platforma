/**
 * Shared upload entity types live in a tiny standalone file so DTOs and the
 * storage service can depend on the same values without awkward import cycles.
 */
export type UploadEntityType =
  | "artwork"
  | "profile"
  | "submission-artwork"
  | "submission-portfolio-pdf"
  | "submission-profile";
