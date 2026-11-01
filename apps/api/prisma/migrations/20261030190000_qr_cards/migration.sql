BEGIN;
CREATE TABLE "QrCardDraft" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "artistAccountId" UUID NOT NULL,
  "config" JSONB NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QrCardDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QrCardDraft_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "QrCardDraft_artistAccountId_fkey" FOREIGN KEY ("artistAccountId") REFERENCES "ArtistAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "QrCardDraft_artistAccountId_key" ON "QrCardDraft"("artistAccountId");
CREATE TABLE "QrCardExport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "artistAccountId" UUID NOT NULL, "operationKey" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'PROCESSING', "kind" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL, "contentHash" TEXT NOT NULL, "pdfPath" TEXT, "frontPath" TEXT, "backPath" TEXT, "errorCode" TEXT,
  "downloadCount" INTEGER NOT NULL DEFAULT 0, "lastDownloadedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMPTZ(6), "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "QrCardExport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QrCardExport_artistAccountId_fkey" FOREIGN KEY ("artistAccountId") REFERENCES "ArtistAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QrCardExport_status_check" CHECK ("status" IN ('PROCESSING','READY','FAILED')),
  CONSTRAINT "QrCardExport_kind_check" CHECK ("kind" IN ('FREE','PREMIUM')),
  CONSTRAINT "QrCardExport_counts_check" CHECK ("versionNumber">0 AND "downloadCount">=0),
  CONSTRAINT "QrCardExport_ready_check" CHECK ("status"<>'READY' OR ("pdfPath" IS NOT NULL AND "frontPath" IS NOT NULL AND "backPath" IS NOT NULL AND "completedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "QrCardExport_artistAccountId_operationKey_key" ON "QrCardExport"("artistAccountId","operationKey");
CREATE UNIQUE INDEX "QrCardExport_artistAccountId_versionNumber_key" ON "QrCardExport"("artistAccountId","versionNumber");
CREATE INDEX "QrCardExport_artistAccountId_createdAt_idx" ON "QrCardExport"("artistAccountId","createdAt");
CREATE UNIQUE INDEX "QrCardExport_one_processing" ON "QrCardExport"("artistAccountId") WHERE "status"='PROCESSING';
CREATE UNIQUE INDEX "QrCardExport_one_free" ON "QrCardExport"("artistAccountId") WHERE "kind"='FREE' AND "status" IN ('PROCESSING','READY');
COMMIT;
