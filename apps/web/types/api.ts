export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export type SocialPlatform =
  | "ARTSTATION"
  | "BEHANCE"
  | "DEVIANTART"
  | "DRIBBBLE"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "LINKEDIN"
  | "MEDIUM"
  | "PERSONAL_WEBSITE"
  | "PDF"
  | "PINTEREST"
  | "TELEGRAM"
  | "THREADS"
  | "VIMEO"
  | "X_TWITTER"
  | "YOUTUBE";

export type TestimonialAccentColor = "BLUE" | "RED" | "YELLOW";

export interface Discipline {
  id: string;
  name: string;
  slug: string;
}

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface Artwork {
  id: string;
  artistId: string;
  imageUrl: string;
  storagePath?: string | null;
  title?: string | null;
  description?: string | null;
  altText?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  id: string;
  artistId?: string | null;
  author: string;
  sourceSlug?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  content: string;
  accentColor?: TestimonialAccentColor | null;
  isBottomRow: boolean;
  createdAt: string;
  updatedAt: string;
  artist?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio?: string | null;
  quote?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
  profileThumbnailUrl?: string | null;
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;
  isNsfw: boolean;
  darkenCoverOverlay: boolean;
  createdAt: string;
  updatedAt: string;
  disciplines: Discipline[];
  socialLinks: SocialLink[];
  artworks: Artwork[];
  testimonials: Testimonial[];
  counts?: {
    artworks: number;
    testimonials: number;
  };
}

export interface SignedUploadResponse {
  bucket: string;
  token: string;
  path: string;
  signedUrl: string;
  publicUrl: string;
}

export interface ArtistSubmissionResponse {
  success: boolean;
  submissionId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  emailNotificationSent: boolean;
  message: string;
}

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface AdminLoginResponse {
  token: string;
  user: AdminSessionUser;
}

export interface AdminSessionResponse {
  user: AdminSessionUser;
}

export interface ArtistSessionUser {
  id: string;
  email: string;
  name: string;
  artistId: string;
  artistSlug: string;
  artistName: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface ArtistLoginResponse {
  token: string;
  user: ArtistSessionUser;
}

export interface ArtistSessionResponse {
  user: ArtistSessionUser;
}

export interface ArtistSetupTokenPreview {
  token: string;
  email: string;
  artistName: string;
  expiresAt: string;
  hasPassword: boolean;
}

export type ArtistSubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ArtistSubmissionListItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  biography: string;
  motto?: string | null;
  blogUrl?: string | null;
  notes?: string | null;
  confirmedRules: boolean;
  portfolioPdfUrl?: string | null;
  profilePhotoUrl?: string | null;
  status: ArtistSubmissionStatus;
  createdAt: string;
  updatedAt: string;
  adminNotes?: string | null;
  approvedArtist?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  portfolioLinks: Array<{
    id: string;
    url: string;
  }>;
  socialLinks: Array<{
    id: string;
    url: string;
  }>;
  disciplines: Discipline[];
  artworks: Array<{
    id: string;
    imageUrl: string;
    originalFileName: string;
    mimeType: string;
    fileSizeBytes: number;
    orderIndex: number;
  }>;
  counts: {
    artworks: number;
    disciplines: number;
    portfolioLinks: number;
    socialLinks: number;
  };
}
