ALTER TABLE "Artwork"
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isBackground" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Artwork_artistId_isFeatured_idx" ON "Artwork"("artistId", "isFeatured");
CREATE INDEX "Artwork_artistId_isBackground_idx" ON "Artwork"("artistId", "isBackground");
