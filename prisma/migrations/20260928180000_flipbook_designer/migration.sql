-- The flipbook designer: published and draft designs on the catalogue, the
-- revision history behind "undo a publish", and uploaded files' bytes (the
-- host has no durable disk).
-- AlterTable
ALTER TABLE "Catalogue" ADD COLUMN     "design" JSONB,
ADD COLUMN     "designPublishedAt" TIMESTAMP(3),
ADD COLUMN     "designVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "draftDesign" JSONB,
ADD COLUMN     "draftUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogueRevision" (
    "id" TEXT NOT NULL,
    "catalogueId" TEXT NOT NULL,
    "design" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "note" TEXT,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogueRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_mediaId_key" ON "MediaFile"("mediaId");

-- CreateIndex
CREATE INDEX "CatalogueRevision_catalogueId_createdAt_idx" ON "CatalogueRevision"("catalogueId", "createdAt");

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueRevision" ADD CONSTRAINT "CatalogueRevision_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "Catalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

