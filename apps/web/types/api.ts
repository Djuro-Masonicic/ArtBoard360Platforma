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
  isFeatured: boolean;
  isBackground: boolean;
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

export interface FaqQuestion {
  id: string;
  question: string;
  answer: string;
  slug: string;
  orderIndex: number;
  isArchived: boolean;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
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
  mustChangePassword: boolean;
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

export type SubscriptionPlan = "BASIC" | "PLATINUM";

export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";

export interface ArtistSubscription {
  id: string;
  artistAccountId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  requestedPlan?: SubscriptionPlan | null;
  requestedAt?: string | null;
  currentPeriodStart: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
  provider?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PortfolioProjectSource = "ARTBOARD_PROFILE" | "GUEST";
export type PortfolioProjectStatus = "DRAFT" | "READY" | "GENERATED" | "PAID";
export type PortfolioTemplate = "INSTITUTIONAL_MINIMAL" | "ARTBOARD_EDITORIAL" | "SALES_PRO";
export type PortfolioLanguage = "ME" | "EN";
export type PortfolioPageFormat = "A4" | "US_LETTER";
export type PortfolioFontStyle = "SANS" | "SERIF";
export type PortfolioArtworkAvailability = "AVAILABLE" | "SOLD" | "NOT_FOR_SALE" | "UNKNOWN";
export type PortfolioPaymentStatus =
  | "NOT_REQUIRED"
  | "REQUIRED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export interface PortfolioArtwork {
  id: string;
  portfolioId: string;
  sourceArtworkId?: string | null;
  imageUrl: string;
  storagePath?: string | null;
  title?: string | null;
  collectionName?: string | null;
  year?: string | null;
  technique?: string | null;
  dimensions?: string | null;
  description?: string | null;
  availability: PortfolioArtworkAvailability;
  price?: string | null;
  isSelected: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioVersion {
  id: string;
  portfolioId: string;
  versionNumber: number;
  pdfUrl: string;
  storagePath: string;
  template: PortfolioTemplate;
  language: PortfolioLanguage;
  includeBranding: boolean;
  createdAt: string;
}

export interface PortfolioPayment {
  id: string;
  portfolioId: string;
  status: PortfolioPaymentStatus;
  amountCents: number;
  currency: string;
  provider?: string | null;
  providerRef?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioProject {
  id: string;
  artistAccountId?: string | null;
  sourceArtistId?: string | null;
  source: PortfolioProjectSource;
  status: PortfolioProjectStatus;
  paymentStatus: PortfolioPaymentStatus;
  title: string;
  artistName: string;
  discipline?: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  artboardProfileUrl?: string | null;
  profileImageUrl?: string | null;
  profileImageStoragePath?: string | null;
  coverImageUrl?: string | null;
  collectionName?: string | null;
  collectionYear?: string | null;
  collectionDescription?: string | null;
  collectionCoverUrl?: string | null;
  collectionCoverStoragePath?: string | null;
  biography?: string | null;
  artistStatement?: string | null;
  cvSections?: unknown;
  template: PortfolioTemplate;
  language: PortfolioLanguage;
  pageFormat: PortfolioPageFormat;
  fontStyle: PortfolioFontStyle;
  includeBranding: boolean;
  includeCv: boolean;
  includePrices: boolean;
  publicShareToken?: string | null;
  latestPdfUrl?: string | null;
  latestPdfStoragePath?: string | null;
  createdAt: string;
  updatedAt: string;
  artworks: PortfolioArtwork[];
  versions: PortfolioVersion[];
  payments: PortfolioPayment[];
  artistAccount?: {
    id: string;
    email: string;
    subscription?: ArtistSubscription | null;
  } | null;
  sourceArtist?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  access: {
    canDownloadCleanPdf: boolean;
    requiresPayment: boolean;
    reason: "PAID" | "PREMIUM" | "PAYMENT_REQUIRED";
  };
  counts: {
    artworks: number;
    selectedArtworks: number;
    versions: number;
    payments: number;
  };
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
