-- Preserve any existing submission name data before we reshape the table.
ALTER TABLE "ArtistSubmission" RENAME COLUMN "fullname" TO "fullName";

-- Existing rows may come from the earlier partial submission prototype.
-- We backfill safe defaults before making the columns stricter.
UPDATE "ArtistSubmission"
SET
  "biography" = COALESCE("biography", ''),
  "updatedAt" = COALESCE("updatedAt", "createdAt");

ALTER TABLE "ArtistSubmission"
ADD COLUMN "confirmedRules" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "portfolioPdfStoragePath" TEXT,
ADD COLUMN "portfolioPdfUrl" TEXT,
ADD COLUMN "profilePhotoStoragePath" TEXT,
ADD COLUMN "profilePhotoUrl" TEXT,
ALTER COLUMN "biography" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

UPDATE "ArtistSubmissionPortfolioLink"
SET "updatedAt" = COALESCE("updatedAt", "createdAt");

ALTER TABLE "ArtistSubmissionPortfolioLink"
DROP COLUMN "platform",
ALTER COLUMN "updatedAt" SET NOT NULL;

DROP INDEX "ArtistSubmissionPortfolioLink_url_key";

CREATE TABLE "ArtistSubmissionSocialLink" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submissionId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistSubmissionSocialLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArtistSubmissionArtwork" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submissionId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistSubmissionArtwork_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArtistSubmissionSocialLink_submissionId_idx" ON "ArtistSubmissionSocialLink"("submissionId");
CREATE UNIQUE INDEX "ArtistSubmissionSocialLink_submissionId_url_key" ON "ArtistSubmissionSocialLink"("submissionId", "url");
CREATE INDEX "ArtistSubmissionArtwork_submissionId_orderIndex_idx" ON "ArtistSubmissionArtwork"("submissionId", "orderIndex");
CREATE UNIQUE INDEX "ArtistSubmissionArtwork_submissionId_imageUrl_key" ON "ArtistSubmissionArtwork"("submissionId", "imageUrl");
CREATE INDEX "ArtistSubmission_email_idx" ON "ArtistSubmission"("email");
CREATE INDEX "ArtistSubmission_status_createdAt_idx" ON "ArtistSubmission"("status", "createdAt");
CREATE UNIQUE INDEX "ArtistSubmissionPortfolioLink_submissionId_url_key" ON "ArtistSubmissionPortfolioLink"("submissionId", "url");

ALTER TABLE "ArtistSubmissionSocialLink"
ADD CONSTRAINT "ArtistSubmissionSocialLink_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "ArtistSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtistSubmissionArtwork"
ADD CONSTRAINT "ArtistSubmissionArtwork_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "ArtistSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
