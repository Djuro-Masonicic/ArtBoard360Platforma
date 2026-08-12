-- Opportunities are the first lightweight CMS table for future ArtBoard calls,
-- jobs, grants and collaboration listings.
CREATE TYPE "OpportunityType" AS ENUM (
  'OPEN_CALL',
  'JOB',
  'RESIDENCY',
  'EXHIBITION',
  'COLLABORATION',
  'GRANT',
  'OTHER'
);

CREATE TABLE "Opportunity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" "OpportunityType" NOT NULL DEFAULT 'OPEN_CALL',
  "organization" TEXT,
  "location" TEXT,
  "summary" TEXT,
  "description" TEXT NOT NULL,
  "applyUrl" TEXT,
  "contactEmail" TEXT,
  "deadlineAt" TIMESTAMP(3),
  "isPaid" BOOLEAN NOT NULL DEFAULT false,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "isDraft" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Opportunity_slug_key" ON "Opportunity"("slug");
CREATE INDEX "Opportunity_type_idx" ON "Opportunity"("type");
CREATE INDEX "Opportunity_deadlineAt_idx" ON "Opportunity"("deadlineAt");
CREATE INDEX "Opportunity_isArchived_isDraft_isFeatured_deadlineAt_idx"
  ON "Opportunity"("isArchived", "isDraft", "isFeatured", "deadlineAt");
