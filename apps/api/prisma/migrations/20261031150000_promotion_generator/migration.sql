-- Additive Generator foundation. No user records, files or old tables are removed.
ALTER TABLE "PortfolioPurchase" DROP CONSTRAINT "PortfolioPurchase_product_check";
ALTER TABLE "PortfolioPurchase" ADD CONSTRAINT "PortfolioPurchase_product_check"
  CHECK ("product" IN ('PORTFOLIO', 'CV', 'GENERATOR_PACK'));

CREATE TABLE "PromotionDraft" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "artistAccountId" UUID NOT NULL UNIQUE REFERENCES "ArtistAccount"("id") ON DELETE RESTRICT,
  "config" JSONB NOT NULL CHECK(jsonb_typeof("config")='object'),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK("revision">0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE "PromotionGeneration" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "artistAccountId" UUID NOT NULL REFERENCES "ArtistAccount"("id") ON DELETE RESTRICT,
  "operationKey" UUID NOT NULL, "versionNumber" INTEGER NOT NULL CHECK("versionNumber">0),
  "contentHash" TEXT NOT NULL CHECK("contentHash" ~ '^[a-f0-9]{64}$'),
  "snapshot" JSONB NOT NULL CHECK(jsonb_typeof("snapshot")='object'),
  "status" TEXT NOT NULL DEFAULT 'QUEUED' CHECK("status" IN ('QUEUED','PROCESSING','READY','FAILED')),
  "kind" TEXT NOT NULL CHECK("kind" IN ('FREE','PREMIUM','PAID')),
  "periodStart" TIMESTAMPTZ, "periodEnd" TIMESTAMPTZ,
  "leaseToken" UUID, "leaseUntil" TIMESTAMPTZ, "attempts" INTEGER NOT NULL DEFAULT 0 CHECK("attempts">=0),
  "errorCode" TEXT, "downloadCount" INTEGER NOT NULL DEFAULT 0 CHECK("downloadCount">=0),
  "lastDownloadedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "completedAt" TIMESTAMPTZ,
  UNIQUE("artistAccountId","operationKey"), UNIQUE("artistAccountId","versionNumber"),
  CHECK (("kind"='PREMIUM')=("periodStart" IS NOT NULL AND "periodEnd" IS NOT NULL)),
  CHECK ("periodEnd" IS NULL OR "periodEnd">"periodStart"),
  CHECK ("status" NOT IN ('READY','FAILED') OR "completedAt" IS NOT NULL)
);
CREATE INDEX "PromotionGeneration_status_leaseUntil_createdAt_idx" ON "PromotionGeneration"("status","leaseUntil","createdAt");
CREATE INDEX "PromotionGeneration_artistAccountId_createdAt_idx" ON "PromotionGeneration"("artistAccountId","createdAt");
CREATE UNIQUE INDEX "PromotionGeneration_one_free" ON "PromotionGeneration"("artistAccountId") WHERE "kind"='FREE' AND "status"<>'FAILED';
CREATE UNIQUE INDEX "PromotionGeneration_same_content" ON "PromotionGeneration"("artistAccountId","contentHash") WHERE "status"<>'FAILED';
CREATE TABLE "PromotionGeneratedFile" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "generationId" UUID NOT NULL REFERENCES "PromotionGeneration"("id") ON DELETE RESTRICT,
  "slide" INTEGER NOT NULL CHECK("slide">=0 AND "slide"<11),
  "storagePath" TEXT NOT NULL, "contentHash" TEXT NOT NULL CHECK("contentHash" ~ '^[a-f0-9]{64}$'),
  "width" INTEGER NOT NULL DEFAULT 1080 CHECK("width"=1080),
  "height" INTEGER NOT NULL DEFAULT 1440 CHECK("height"=1440),
  "sizeBytes" INTEGER NOT NULL CHECK("sizeBytes">0 AND "sizeBytes"<=12582912),
  UNIQUE("generationId","slide")
);
CREATE TABLE "PromotionCreditLedger" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "artistAccountId" UUID NOT NULL REFERENCES "ArtistAccount"("id") ON DELETE RESTRICT,
  "purchaseId" UUID NOT NULL UNIQUE REFERENCES "PortfolioPurchase"("id") ON DELETE RESTRICT,
  "credits" INTEGER NOT NULL DEFAULT 10 CHECK("credits"=10),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE FUNCTION promotion_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='PromotionCreditLedger' OR TG_TABLE_NAME='PromotionGeneratedFile' THEN
    RAISE EXCEPTION 'Generator records are immutable' USING ERRCODE='23514';
  END IF;
  IF ROW(NEW."artistAccountId",NEW."operationKey",NEW."contentHash",NEW."snapshot",NEW."kind",NEW."periodStart",NEW."periodEnd",NEW."versionNumber")
    IS DISTINCT FROM ROW(OLD."artistAccountId",OLD."operationKey",OLD."contentHash",OLD."snapshot",OLD."kind",OLD."periodStart",OLD."periodEnd",OLD."versionNumber")
    OR (OLD."status" IN ('READY','FAILED') AND NEW."status"<>OLD."status") THEN
    RAISE EXCEPTION 'Generator snapshot and terminal status are immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "PromotionGeneration_immutable" BEFORE UPDATE ON "PromotionGeneration" FOR EACH ROW EXECUTE FUNCTION promotion_immutable();
CREATE TRIGGER "PromotionGeneratedFile_immutable" BEFORE UPDATE OR DELETE ON "PromotionGeneratedFile" FOR EACH ROW EXECUTE FUNCTION promotion_immutable();
CREATE TRIGGER "PromotionCreditLedger_immutable" BEFORE UPDATE OR DELETE ON "PromotionCreditLedger" FOR EACH ROW EXECUTE FUNCTION promotion_immutable();
