CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'PLATINUM');

CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

CREATE TABLE "ArtistSubscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artistAccountId" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "requestedPlan" "SubscriptionPlan",
    "requestedAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "provider" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArtistSubscription_artistAccountId_key"
ON "ArtistSubscription"("artistAccountId");

CREATE UNIQUE INDEX "ArtistSubscription_providerCustomerId_key"
ON "ArtistSubscription"("providerCustomerId");

CREATE UNIQUE INDEX "ArtistSubscription_providerSubscriptionId_key"
ON "ArtistSubscription"("providerSubscriptionId");

CREATE INDEX "ArtistSubscription_plan_status_idx"
ON "ArtistSubscription"("plan", "status");

CREATE INDEX "ArtistSubscription_requestedPlan_requestedAt_idx"
ON "ArtistSubscription"("requestedPlan", "requestedAt");

ALTER TABLE "ArtistSubscription"
ADD CONSTRAINT "ArtistSubscription_artistAccountId_fkey"
FOREIGN KEY ("artistAccountId") REFERENCES "ArtistAccount"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ArtistSubscription" (
    "artistAccountId",
    "plan",
    "status",
    "currentPeriodStart",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    'BASIC'::"SubscriptionPlan",
    'ACTIVE'::"SubscriptionStatus",
    "createdAt",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ArtistAccount"
ON CONFLICT ("artistAccountId") DO NOTHING;
