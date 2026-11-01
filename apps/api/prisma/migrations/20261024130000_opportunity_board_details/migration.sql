CREATE TYPE "OpportunityWorkMode" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');
CREATE TYPE "OpportunityCompensationKind" AS ENUM ('PRIZE', 'STIPEND', 'FEE', 'SALARY', 'NONE', 'OTHER');

ALTER TABLE "Opportunity"
  ADD COLUMN "workMode" "OpportunityWorkMode",
  ADD COLUMN "disciplines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "compensationKind" "OpportunityCompensationKind",
  ADD COLUMN "compensationAmount" DECIMAL(12,2),
  ADD COLUMN "compensationCurrency" TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN "applicationFee" DECIMAL(12,2),
  ADD COLUMN "maxAge" INTEGER,
  ADD COLUMN "eligibleCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "applicationLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "requiredDocuments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "coveredCosts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
