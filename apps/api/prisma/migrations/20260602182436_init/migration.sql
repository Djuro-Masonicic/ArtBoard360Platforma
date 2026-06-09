-- CreateTable
CREATE TABLE "ArtistSubmissionPortfolioLink" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submissionId" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ArtistSubmissionPortfolioLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistSubmissionPortfolioLink_url_key" ON "ArtistSubmissionPortfolioLink"("url");

-- CreateIndex
CREATE INDEX "ArtistSubmissionPortfolioLink_submissionId_idx" ON "ArtistSubmissionPortfolioLink"("submissionId");

-- AddForeignKey
ALTER TABLE "ArtistSubmissionPortfolioLink" ADD CONSTRAINT "ArtistSubmissionPortfolioLink_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ArtistSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
