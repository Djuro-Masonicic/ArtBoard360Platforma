ALTER TYPE "OpportunityType" ADD VALUE IF NOT EXISTS 'FREELANCE';
ALTER TYPE "OpportunityType" ADD VALUE IF NOT EXISTS 'SCHOLARSHIP';
ALTER TYPE "OpportunityType" ADD VALUE IF NOT EXISTS 'WORKSHOP';

CREATE TYPE "OpportunityApplicationMethod" AS ENUM ('EMAIL', 'LINK');
CREATE TYPE "OpportunityOrganizerType" AS ENUM (
  'INDIVIDUAL',
  'INFORMAL_GROUP',
  'NGO',
  'ENTREPRENEUR',
  'COMPANY',
  'INSTITUTION',
  'EDUCATIONAL_INSTITUTION'
);
CREATE TYPE "OpportunitySubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Opportunity"
  ADD COLUMN "organizerType" "OpportunityOrganizerType",
  ADD COLUMN "countryCode" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "conditions" TEXT,
  ADD COLUMN "compensation" TEXT,
  ADD COLUMN "additionalInformation" TEXT,
  ADD COLUMN "applicationMethod" "OpportunityApplicationMethod",
  ADD COLUMN "applyEmail" TEXT,
  ADD COLUMN "isOpenEnded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "coverImageStoragePath" TEXT,
  ADD COLUMN "consentAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "submissionStatus" "OpportunitySubmissionStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewNotes" TEXT;

CREATE INDEX "Opportunity_submissionStatus_createdAt_idx"
  ON "Opportunity"("submissionStatus", "createdAt");
