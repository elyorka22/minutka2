-- AlterTable
ALTER TABLE "HomeExploreCategory" ADD COLUMN "carouselRow" INTEGER NOT NULL DEFAULT 1;

-- DropIndex
DROP INDEX IF EXISTS "HomeExploreCategory_isActive_sortOrder_idx";

-- CreateIndex
CREATE INDEX "HomeExploreCategory_isActive_carouselRow_sortOrder_idx" ON "HomeExploreCategory"("isActive", "carouselRow", "sortOrder");
