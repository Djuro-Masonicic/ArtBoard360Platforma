BEGIN;
ALTER TABLE "Artist" ADD COLUMN "artistStatement" TEXT, ADD COLUMN "presentationForm" TEXT;
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_presentationForm_check" CHECK ("presentationForm" IS NULL OR "presentationForm" IN ('FEMININE','MASCULINE','NEUTRAL'));
ALTER TABLE "ArtistAccount" ADD COLUMN "uiTheme" TEXT NOT NULL DEFAULT 'light';
ALTER TABLE "ArtistAccount" ADD CONSTRAINT "ArtistAccount_uiTheme_check" CHECK ("uiTheme" IN ('light','dark'));

CREATE TABLE "ArtistDeletionRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "artistAccountId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMPTZ(6) NOT NULL,
  "acknowledgedEmailAt" TIMESTAMPTZ(6),
  "adminNotifiedAt" TIMESTAMPTZ(6),
  "reviewedAt" TIMESTAMPTZ(6),
  "adminNotes" TEXT,
  CONSTRAINT "ArtistDeletionRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ArtistDeletionRequest_account_fkey" FOREIGN KEY ("artistAccountId") REFERENCES "ArtistAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ArtistDeletionRequest_status_check" CHECK ("status" IN ('PENDING','IN_REVIEW','REJECTED','COMPLETED'))
);
CREATE INDEX "ArtistDeletionRequest_status_createdAt_idx" ON "ArtistDeletionRequest"("status","createdAt");
CREATE INDEX "ArtistDeletionRequest_artistAccountId_createdAt_idx" ON "ArtistDeletionRequest"("artistAccountId","createdAt");
CREATE UNIQUE INDEX "ArtistDeletionRequest_one_open" ON "ArtistDeletionRequest"("artistAccountId") WHERE "status" IN ('PENDING','IN_REVIEW');
COMMIT;
