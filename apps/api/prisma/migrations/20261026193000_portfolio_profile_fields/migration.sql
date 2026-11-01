-- Additive only. Existing artist, artwork and collection data are preserved.
-- Prepared for review; applying this migration requires separate approval.
ALTER TABLE "Artist" ADD COLUMN "dateOfBirth" DATE;

ALTER TABLE "PortfolioProject"
  ADD COLUMN "dateOfBirth" DATE,
  ADD COLUMN "behanceUrl" TEXT,
  ADD COLUMN "motto" TEXT,
  ADD COLUMN "mottoAuthor" TEXT,
  ADD COLUMN "coverImageStoragePath" TEXT;
