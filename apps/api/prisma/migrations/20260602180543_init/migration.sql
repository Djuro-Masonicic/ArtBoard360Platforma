-- CreateEnum
CREATE TYPE "ArtistSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ArtistSubmission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fullname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "biography" TEXT,
    "motto" TEXT,
    "blogUrl" TEXT,
    "notes" TEXT,
    "status" "ArtistSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "adminNotes" TEXT,

    CONSTRAINT "ArtistSubmission_pkey" PRIMARY KEY ("id")
);
