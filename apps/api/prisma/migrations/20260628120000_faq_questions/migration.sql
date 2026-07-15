CREATE TABLE "FaqQuestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "sourceItemId" TEXT,
    "sourceCollectionId" TEXT,
    "sourceLocaleId" TEXT,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "sourcePublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FaqQuestion_slug_key"
ON "FaqQuestion"("slug");

CREATE UNIQUE INDEX "FaqQuestion_sourceItemId_key"
ON "FaqQuestion"("sourceItemId");

CREATE INDEX "FaqQuestion_orderIndex_idx"
ON "FaqQuestion"("orderIndex");

CREATE INDEX "FaqQuestion_isArchived_isDraft_orderIndex_idx"
ON "FaqQuestion"("isArchived", "isDraft", "orderIndex");
