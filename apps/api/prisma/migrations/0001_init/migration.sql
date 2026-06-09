CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "SocialPlatform" AS ENUM (
  'ARTSTATION',
  'BEHANCE',
  'DEVIANTART',
  'DRIBBBLE',
  'FACEBOOK',
  'INSTAGRAM',
  'LINKEDIN',
  'MEDIUM',
  'PERSONAL_WEBSITE',
  'PDF',
  'PINTEREST',
  'TELEGRAM',
  'THREADS',
  'VIMEO',
  'X_TWITTER',
  'YOUTUBE'
);

CREATE TYPE "TestimonialAccentColor" AS ENUM ('BLUE', 'RED', 'YELLOW');

CREATE TABLE "Artist" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "bio" TEXT,
  "quote" TEXT,
  "email" TEXT,
  "profileImageUrl" TEXT,
  "profileThumbnailUrl" TEXT,
  "coverImageUrl" TEXT,
  "thumbnailUrl" TEXT,
  "isNsfw" BOOLEAN NOT NULL DEFAULT false,
  "darkenCoverOverlay" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "isDraft" BOOLEAN NOT NULL DEFAULT false,
  "sourceItemId" TEXT,
  "sourceCollectionId" TEXT,
  "sourceLocaleId" TEXT,
  "sourceCreatedAt" TIMESTAMP(3),
  "sourceUpdatedAt" TIMESTAMP(3),
  "sourcePublishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Discipline" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArtistDiscipline" (
  "artistId" UUID NOT NULL,
  "disciplineId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArtistDiscipline_pkey" PRIMARY KEY ("artistId", "disciplineId")
);

CREATE TABLE "Artwork" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "artistId" UUID NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "storagePath" TEXT,
  "title" TEXT,
  "description" TEXT,
  "altText" TEXT,
  "mimeType" TEXT,
  "fileSizeBytes" INTEGER,
  "width" INTEGER,
  "height" INTEGER,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialLink" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "artistId" UUID NOT NULL,
  "platform" "SocialPlatform" NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Testimonial" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "artistId" UUID,
  "author" TEXT NOT NULL,
  "sourceSlug" TEXT,
  "company" TEXT,
  "avatarUrl" TEXT,
  "content" TEXT NOT NULL,
  "accentColor" "TestimonialAccentColor",
  "isBottomRow" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "isDraft" BOOLEAN NOT NULL DEFAULT false,
  "sourceItemId" TEXT,
  "sourceCollectionId" TEXT,
  "sourceLocaleId" TEXT,
  "sourceCreatedAt" TIMESTAMP(3),
  "sourceUpdatedAt" TIMESTAMP(3),
  "sourcePublishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist"("slug");
CREATE UNIQUE INDEX "Artist_sourceItemId_key" ON "Artist"("sourceItemId");
CREATE INDEX "Artist_name_idx" ON "Artist"("name");
CREATE INDEX "Artist_isNsfw_isArchived_isDraft_idx" ON "Artist"("isNsfw", "isArchived", "isDraft");

CREATE UNIQUE INDEX "Discipline_name_key" ON "Discipline"("name");
CREATE UNIQUE INDEX "Discipline_slug_key" ON "Discipline"("slug");

CREATE INDEX "ArtistDiscipline_disciplineId_idx" ON "ArtistDiscipline"("disciplineId");

CREATE UNIQUE INDEX "Artwork_artistId_imageUrl_key" ON "Artwork"("artistId", "imageUrl");
CREATE INDEX "Artwork_artistId_orderIndex_idx" ON "Artwork"("artistId", "orderIndex");

CREATE UNIQUE INDEX "SocialLink_artistId_platform_key" ON "SocialLink"("artistId", "platform");
CREATE INDEX "SocialLink_platform_idx" ON "SocialLink"("platform");

CREATE UNIQUE INDEX "Testimonial_sourceSlug_key" ON "Testimonial"("sourceSlug");
CREATE UNIQUE INDEX "Testimonial_sourceItemId_key" ON "Testimonial"("sourceItemId");
CREATE INDEX "Testimonial_artistId_idx" ON "Testimonial"("artistId");
CREATE INDEX "Testimonial_author_idx" ON "Testimonial"("author");
CREATE INDEX "Testimonial_isArchived_isDraft_idx" ON "Testimonial"("isArchived", "isDraft");

ALTER TABLE "ArtistDiscipline"
ADD CONSTRAINT "ArtistDiscipline_artistId_fkey"
FOREIGN KEY ("artistId") REFERENCES "Artist"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtistDiscipline"
ADD CONSTRAINT "ArtistDiscipline_disciplineId_fkey"
FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Artwork"
ADD CONSTRAINT "Artwork_artistId_fkey"
FOREIGN KEY ("artistId") REFERENCES "Artist"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SocialLink"
ADD CONSTRAINT "SocialLink_artistId_fkey"
FOREIGN KEY ("artistId") REFERENCES "Artist"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Testimonial"
ADD CONSTRAINT "Testimonial_artistId_fkey"
FOREIGN KEY ("artistId") REFERENCES "Artist"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
