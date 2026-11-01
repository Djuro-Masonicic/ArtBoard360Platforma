ALTER TABLE "ArtistSubmission"
ADD COLUMN "city" TEXT,
ADD COLUMN "artistStatement" TEXT,
ADD COLUMN "mottoAuthor" TEXT,
ADD COLUMN "showEmailPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "presentationForms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "containsNsfw" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "coverPhotoUrl" TEXT,
ADD COLUMN "coverPhotoStoragePath" TEXT;
