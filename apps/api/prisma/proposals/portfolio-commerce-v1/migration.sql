-- REVIEW PROPOSAL ONLY. Do not apply to the working database without approval.
-- Additive commerce foundation; does not rewrite projects, images or old PDFs.
BEGIN;

CREATE TABLE "PortfolioPurchase" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "artistAccountId" UUID REFERENCES "ArtistAccount"("id") ON DELETE RESTRICT,
  "portfolioId" UUID REFERENCES "PortfolioProject"("id") ON DELETE SET NULL,
  "product" TEXT NOT NULL CHECK ("product" IN ('PORTFOLIO', 'CV')),
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED')),
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" >= 0),
  "currency" TEXT NOT NULL DEFAULT 'EUR' CHECK ("currency" = 'EUR'),
  "snapshot" JSONB NOT NULL CHECK (jsonb_typeof("snapshot") = 'object'),
  "snapshotHash" TEXT NOT NULL CHECK ("snapshotHash" ~ '^[a-f0-9]{64}$'),
  "provider" TEXT,
  "providerOrderRef" TEXT,
  "providerPaymentRef" TEXT,
  "buyerEmail" TEXT,
  "paidAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ("status" NOT IN ('PAID', 'REFUNDED') OR "paidAt" IS NOT NULL),
  UNIQUE ("provider", "providerOrderRef"),
  UNIQUE ("provider", "providerPaymentRef")
);
CREATE INDEX "PortfolioPurchase_status_createdAt_idx" ON "PortfolioPurchase"("status", "createdAt");
CREATE INDEX "PortfolioPurchase_artistAccountId_createdAt_idx" ON "PortfolioPurchase"("artistAccountId", "createdAt");

CREATE FUNCTION "keepPortfolioPurchaseContentImmutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."snapshot", NEW."snapshotHash", NEW."amountCents", NEW."currency", NEW."product", NEW."artistAccountId", NEW."buyerEmail")
     IS DISTINCT FROM ROW(OLD."snapshot", OLD."snapshotHash", OLD."amountCents", OLD."currency", OLD."product", OLD."artistAccountId", OLD."buyerEmail") THEN
    RAISE EXCEPTION 'Purchase content, buyer and price are immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD."status" = 'PAID' AND NEW."status" NOT IN ('PAID', 'REFUNDED') THEN
    RAISE EXCEPTION 'A paid purchase cannot become unpaid' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "PortfolioPurchase_immutable_content" BEFORE UPDATE ON "PortfolioPurchase"
  FOR EACH ROW EXECUTE FUNCTION "keepPortfolioPurchaseContentImmutable"();

CREATE TABLE "PortfolioPaymentEvent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchaseId" UUID NOT NULL REFERENCES "PortfolioPurchase"("id") ON DELETE RESTRICT,
  "provider" TEXT NOT NULL,
  "deduplicationKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL CHECK ("payloadHash" ~ '^[a-f0-9]{64}$'),
  "status" TEXT NOT NULL DEFAULT 'RECEIVED' CHECK ("status" IN ('RECEIVED', 'VERIFIED', 'REJECTED')),
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "verifiedAt" TIMESTAMPTZ,
  UNIQUE ("provider", "deduplicationKey"),
  CHECK ("status" <> 'VERIFIED' OR "verifiedAt" IS NOT NULL)
);

CREATE TABLE "PortfolioDeliveryGrant" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchaseId" UUID NOT NULL REFERENCES "PortfolioPurchase"("id") ON DELETE RESTRICT,
  "tokenHash" TEXT NOT NULL UNIQUE CHECK ("tokenHash" ~ '^[a-f0-9]{64}$'),
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "maximumDownloads" INTEGER NOT NULL DEFAULT 5 CHECK ("maximumDownloads" > 0),
  "downloads" INTEGER NOT NULL DEFAULT 0 CHECK ("downloads" >= 0 AND "downloads" <= "maximumDownloads"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE "PortfolioQuotaPeriod" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "artistAccountId" UUID NOT NULL REFERENCES "ArtistAccount"("id") ON DELETE RESTRICT,
  "periodStart" TIMESTAMPTZ NOT NULL,
  "periodEnd" TIMESTAMPTZ NOT NULL,
  "limit" INTEGER NOT NULL DEFAULT 5 CHECK ("limit" = 5),
  "reserved" INTEGER NOT NULL DEFAULT 0 CHECK ("reserved" >= 0),
  "committed" INTEGER NOT NULL DEFAULT 0 CHECK ("committed" >= 0),
  CHECK ("periodEnd" > "periodStart"),
  CHECK ("reserved" + "committed" <= "limit"),
  UNIQUE ("artistAccountId", "periodStart", "periodEnd")
);

ALTER TABLE "PortfolioVersion"
  ADD COLUMN "documentScope" TEXT CHECK ("documentScope" IN ('PORTFOLIO', 'CV')),
  ADD COLUMN "manifest" JSONB,
  ADD COLUMN "contentHash" TEXT CHECK ("contentHash" ~ '^[a-f0-9]{64}$'),
  ADD COLUMN "pageCount" INTEGER CHECK ("pageCount" > 0),
  ADD COLUMN "artworkCount" INTEGER CHECK ("artworkCount" >= 0),
  ADD COLUMN "sourceRevision" INTEGER CHECK ("sourceRevision" >= 0),
  ADD COLUMN "purchaseId" UUID UNIQUE REFERENCES "PortfolioPurchase"("id") ON DELETE RESTRICT;
-- Old files have no inferred scope/manifest/count. Do not fabricate metadata.

CREATE TABLE "PortfolioExportUsage" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "artistAccountId" UUID NOT NULL REFERENCES "ArtistAccount"("id") ON DELETE RESTRICT,
  "portfolioId" UUID NOT NULL REFERENCES "PortfolioProject"("id") ON DELETE RESTRICT,
  "operationKey" UUID NOT NULL UNIQUE,
  "contentHash" TEXT NOT NULL CHECK ("contentHash" ~ '^[a-f0-9]{64}$'),
  "kind" TEXT NOT NULL CHECK ("kind" IN ('FREE', 'PREMIUM', 'PAID')),
  "status" TEXT NOT NULL DEFAULT 'RESERVED' CHECK ("status" IN ('RESERVED', 'COMMITTED', 'RELEASED')),
  "quotaPeriodId" UUID REFERENCES "PortfolioQuotaPeriod"("id") ON DELETE RESTRICT,
  "purchaseId" UUID UNIQUE REFERENCES "PortfolioPurchase"("id") ON DELETE RESTRICT,
  "versionId" UUID UNIQUE REFERENCES "PortfolioVersion"("id") ON DELETE RESTRICT,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (("kind" = 'PREMIUM') = ("quotaPeriodId" IS NOT NULL)),
  CHECK (("kind" = 'PAID') = ("purchaseId" IS NOT NULL)),
  CHECK ("status" <> 'COMMITTED' OR "versionId" IS NOT NULL),
  CHECK ("expiresAt" > "createdAt")
);
CREATE UNIQUE INDEX "PortfolioExportUsage_one_free_lifetime" ON "PortfolioExportUsage"("artistAccountId")
  WHERE "kind" = 'FREE' AND "status" IN ('RESERVED', 'COMMITTED');
CREATE INDEX "PortfolioExportUsage_expiring_reservations" ON "PortfolioExportUsage"("status", "expiresAt");

-- Application reservation must execute the quota UPDATE and usage INSERT in
-- ONE transaction. The conditional UPDATE is atomic under concurrent requests:
-- UPDATE "PortfolioQuotaPeriod" SET "reserved" = "reserved" + 1
-- WHERE id = $period AND "reserved" + "committed" < "limit" RETURNING id;
-- No returned row => request a separately confirmed 490-cent purchase.
-- FREE uses the partial unique index; PAID requires a server-verified purchase.
-- COMMIT/RELEASE must update BOTH usage and period counters in one transaction.
-- Retrying the same operationKey returns the existing result, never a new charge.

COMMIT;
