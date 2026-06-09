-- CreateTable
CREATE TABLE "ArtistSubmissionDiscipline" (
    "submissionId" UUID NOT NULL,
    "disciplineId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistSubmissionDiscipline_pkey" PRIMARY KEY ("submissionId","disciplineId")
);

-- CreateIndex
CREATE INDEX "ArtistSubmissionDiscipline_disciplineId_idx" ON "ArtistSubmissionDiscipline"("disciplineId");

-- AddForeignKey
ALTER TABLE "ArtistSubmissionDiscipline" ADD CONSTRAINT "ArtistSubmissionDiscipline_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ArtistSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistSubmissionDiscipline" ADD CONSTRAINT "ArtistSubmissionDiscipline_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
