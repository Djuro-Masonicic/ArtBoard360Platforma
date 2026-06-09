CREATE TABLE "ArtistAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artistId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArtistAccountSetupToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artistAccountId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistAccountSetupToken_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ArtistSubmission"
ADD COLUMN "approvedArtistId" UUID;

CREATE UNIQUE INDEX "ArtistAccount_artistId_key" ON "ArtistAccount"("artistId");
CREATE UNIQUE INDEX "ArtistAccount_email_key" ON "ArtistAccount"("email");
CREATE INDEX "ArtistAccount_email_idx" ON "ArtistAccount"("email");
CREATE UNIQUE INDEX "ArtistAccountSetupToken_tokenHash_key" ON "ArtistAccountSetupToken"("tokenHash");
CREATE INDEX "ArtistAccountSetupToken_artistAccountId_expiresAt_idx" ON "ArtistAccountSetupToken"("artistAccountId", "expiresAt");
CREATE UNIQUE INDEX "ArtistSubmission_approvedArtistId_key" ON "ArtistSubmission"("approvedArtistId");

ALTER TABLE "ArtistAccount"
ADD CONSTRAINT "ArtistAccount_artistId_fkey"
FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtistAccountSetupToken"
ADD CONSTRAINT "ArtistAccountSetupToken_artistAccountId_fkey"
FOREIGN KEY ("artistAccountId") REFERENCES "ArtistAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtistSubmission"
ADD CONSTRAINT "ArtistSubmission_approvedArtistId_fkey"
FOREIGN KEY ("approvedArtistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
