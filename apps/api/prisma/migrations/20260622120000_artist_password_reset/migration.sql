CREATE TABLE "ArtistPasswordResetToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artistAccountId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistPasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArtistPasswordResetToken_tokenHash_key"
ON "ArtistPasswordResetToken"("tokenHash");

CREATE INDEX "ArtistPasswordResetToken_artistAccountId_expiresAt_idx"
ON "ArtistPasswordResetToken"("artistAccountId", "expiresAt");

ALTER TABLE "ArtistPasswordResetToken"
ADD CONSTRAINT "ArtistPasswordResetToken_artistAccountId_fkey"
FOREIGN KEY ("artistAccountId") REFERENCES "ArtistAccount"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
