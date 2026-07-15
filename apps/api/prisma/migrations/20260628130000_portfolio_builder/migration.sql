CREATE TYPE "PortfolioProjectSource" AS ENUM ('ARTBOARD_PROFILE', 'GUEST');
CREATE TYPE "PortfolioProjectStatus" AS ENUM ('DRAFT', 'READY', 'GENERATED', 'PAID');
CREATE TYPE "PortfolioTemplate" AS ENUM ('INSTITUTIONAL_MINIMAL', 'ARTBOARD_EDITORIAL', 'SALES_PRO');
CREATE TYPE "PortfolioLanguage" AS ENUM ('ME', 'EN');
CREATE TYPE "PortfolioPageFormat" AS ENUM ('A4', 'US_LETTER');
CREATE TYPE "PortfolioFontStyle" AS ENUM ('SANS', 'SERIF');
CREATE TYPE "PortfolioArtworkAvailability" AS ENUM ('AVAILABLE', 'SOLD', 'NOT_FOR_SALE', 'UNKNOWN');
CREATE TYPE "PortfolioPaymentStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');

CREATE TABLE "PortfolioProject" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artistAccountId" UUID,
    "sourceArtistId" UUID,
    "source" "PortfolioProjectSource" NOT NULL,
    "status" "PortfolioProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PortfolioPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "title" TEXT NOT NULL DEFAULT 'Portfolio',
    "artistName" TEXT NOT NULL,
    "discipline" TEXT,
    "location" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "instagramUrl" TEXT,
    "artboardProfileUrl" TEXT,
    "profileImageUrl" TEXT,
    "coverImageUrl" TEXT,
    "biography" TEXT,
    "artistStatement" TEXT,
    "cvSections" JSONB,
    "template" "PortfolioTemplate" NOT NULL DEFAULT 'INSTITUTIONAL_MINIMAL',
    "language" "PortfolioLanguage" NOT NULL DEFAULT 'ME',
    "pageFormat" "PortfolioPageFormat" NOT NULL DEFAULT 'A4',
    "fontStyle" "PortfolioFontStyle" NOT NULL DEFAULT 'SANS',
    "includeBranding" BOOLEAN NOT NULL DEFAULT true,
    "includeCv" BOOLEAN NOT NULL DEFAULT false,
    "includePrices" BOOLEAN NOT NULL DEFAULT false,
    "publicShareToken" TEXT,
    "latestPdfUrl" TEXT,
    "latestPdfStoragePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortfolioArtwork" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolioId" UUID NOT NULL,
    "sourceArtworkId" UUID,
    "imageUrl" TEXT NOT NULL,
    "storagePath" TEXT,
    "title" TEXT,
    "collectionName" TEXT,
    "year" TEXT,
    "technique" TEXT,
    "dimensions" TEXT,
    "description" TEXT,
    "availability" "PortfolioArtworkAvailability" NOT NULL DEFAULT 'UNKNOWN',
    "price" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioArtwork_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortfolioVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolioId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "template" "PortfolioTemplate" NOT NULL,
    "language" "PortfolioLanguage" NOT NULL,
    "includeBranding" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortfolioPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolioId" UUID NOT NULL,
    "status" "PortfolioPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "provider" TEXT,
    "providerRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortfolioProject_publicShareToken_key"
ON "PortfolioProject"("publicShareToken");

CREATE INDEX "PortfolioProject_artistAccountId_createdAt_idx"
ON "PortfolioProject"("artistAccountId", "createdAt");

CREATE INDEX "PortfolioProject_sourceArtistId_idx"
ON "PortfolioProject"("sourceArtistId");

CREATE INDEX "PortfolioProject_source_status_idx"
ON "PortfolioProject"("source", "status");

CREATE INDEX "PortfolioProject_paymentStatus_idx"
ON "PortfolioProject"("paymentStatus");

CREATE INDEX "PortfolioArtwork_portfolioId_orderIndex_idx"
ON "PortfolioArtwork"("portfolioId", "orderIndex");

CREATE INDEX "PortfolioArtwork_sourceArtworkId_idx"
ON "PortfolioArtwork"("sourceArtworkId");

CREATE UNIQUE INDEX "PortfolioVersion_portfolioId_versionNumber_key"
ON "PortfolioVersion"("portfolioId", "versionNumber");

CREATE INDEX "PortfolioVersion_portfolioId_createdAt_idx"
ON "PortfolioVersion"("portfolioId", "createdAt");

CREATE INDEX "PortfolioPayment_portfolioId_status_idx"
ON "PortfolioPayment"("portfolioId", "status");

CREATE INDEX "PortfolioPayment_provider_providerRef_idx"
ON "PortfolioPayment"("provider", "providerRef");

ALTER TABLE "PortfolioProject"
ADD CONSTRAINT "PortfolioProject_artistAccountId_fkey"
FOREIGN KEY ("artistAccountId") REFERENCES "ArtistAccount"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PortfolioProject"
ADD CONSTRAINT "PortfolioProject_sourceArtistId_fkey"
FOREIGN KEY ("sourceArtistId") REFERENCES "Artist"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PortfolioArtwork"
ADD CONSTRAINT "PortfolioArtwork_portfolioId_fkey"
FOREIGN KEY ("portfolioId") REFERENCES "PortfolioProject"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortfolioArtwork"
ADD CONSTRAINT "PortfolioArtwork_sourceArtworkId_fkey"
FOREIGN KEY ("sourceArtworkId") REFERENCES "Artwork"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PortfolioVersion"
ADD CONSTRAINT "PortfolioVersion_portfolioId_fkey"
FOREIGN KEY ("portfolioId") REFERENCES "PortfolioProject"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortfolioPayment"
ADD CONSTRAINT "PortfolioPayment_portfolioId_fkey"
FOREIGN KEY ("portfolioId") REFERENCES "PortfolioProject"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
