-- Package 2: prepared only. Requires separate approval before applying to the working database.
BEGIN;

-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "artistCollectionId" UUID,
ADD COLUMN     "collectionOrderIndex" INTEGER;

-- AlterTable
ALTER TABLE "PortfolioProject" ADD COLUMN     "collectionSchemaVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "includeUncollectedArtworks" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourceProfileBaseline" JSONB;

-- AlterTable
ALTER TABLE "PortfolioArtwork" ADD COLUMN     "collectionOrderIndex" INTEGER,
ADD COLUMN     "portfolioCollectionId" UUID,
ADD COLUMN     "sourceBaseline" JSONB;

-- CreateTable
CREATE TABLE "ArtistCollection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artistId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "year" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "coverImageStoragePath" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioCollection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolioId" UUID NOT NULL,
    "sourceCollectionId" UUID,
    "title" TEXT NOT NULL,
    "year" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "coverImageStoragePath" TEXT,
    "isIncluded" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "sourceBaseline" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistCollection_artistId_orderIndex_idx" ON "ArtistCollection"("artistId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistCollection_id_artistId_key" ON "ArtistCollection"("id", "artistId");

-- CreateIndex
CREATE INDEX "PortfolioCollection_portfolioId_orderIndex_idx" ON "PortfolioCollection"("portfolioId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioCollection_id_portfolioId_key" ON "PortfolioCollection"("id", "portfolioId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioCollection_portfolioId_sourceCollectionId_key" ON "PortfolioCollection"("portfolioId", "sourceCollectionId");

-- CreateIndex
CREATE INDEX "Artwork_artistCollectionId_collectionOrderIndex_idx" ON "Artwork"("artistCollectionId", "collectionOrderIndex");

-- CreateIndex
CREATE INDEX "PortfolioArtwork_portfolioCollectionId_collectionOrderIndex_idx" ON "PortfolioArtwork"("portfolioCollectionId", "collectionOrderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioArtwork_portfolioId_sourceArtworkId_key" ON "PortfolioArtwork"("portfolioId", "sourceArtworkId");

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_artistCollectionId_artistId_fkey" FOREIGN KEY ("artistCollectionId", "artistId") REFERENCES "ArtistCollection"("id", "artistId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PortfolioArtwork" ADD CONSTRAINT "PortfolioArtwork_portfolioCollectionId_portfolioId_fkey" FOREIGN KEY ("portfolioCollectionId", "portfolioId") REFERENCES "PortfolioCollection"("id", "portfolioId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ArtistCollection" ADD CONSTRAINT "ArtistCollection_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioCollection" ADD CONSTRAINT "PortfolioCollection_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "PortfolioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioCollection" ADD CONSTRAINT "PortfolioCollection_sourceCollectionId_fkey" FOREIGN KEY ("sourceCollectionId") REFERENCES "ArtistCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
