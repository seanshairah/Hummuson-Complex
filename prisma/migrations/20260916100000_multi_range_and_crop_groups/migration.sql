-- A product can belong to several ranges, and a crop can sit under a parent group.
--
-- The range change is the reason for the data step below: `Product.categoryId`
-- held one range per product, so the import had to pick a winner out of the
-- several the old shop recorded. Copy what is there into the join table before
-- dropping the column, so a database that is not about to be re-seeded keeps
-- every assignment it already had.

-- CreateTable
CREATE TABLE "ProductCategoryLink" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ProductCategoryLink_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateIndex
CREATE INDEX "ProductCategoryLink_categoryId_idx" ON "ProductCategoryLink"("categoryId");

-- AddForeignKey
ALTER TABLE "ProductCategoryLink" ADD CONSTRAINT "ProductCategoryLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategoryLink" ADD CONSTRAINT "ProductCategoryLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry the existing single assignment across.
INSERT INTO "ProductCategoryLink" ("productId", "categoryId")
SELECT "id", "categoryId" FROM "Product" WHERE "categoryId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Product_categoryId_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categoryId";

-- AlterTable: crop groups
ALTER TABLE "Crop" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Crop_parentId_idx" ON "Crop"("parentId");

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Crop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
