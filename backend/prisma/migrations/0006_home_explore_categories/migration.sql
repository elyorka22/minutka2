-- CreateTable
CREATE TABLE "HomeExploreCategory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "searchQuery" TEXT,

    CONSTRAINT "HomeExploreCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeExploreCategory_isActive_sortOrder_idx" ON "HomeExploreCategory"("isActive", "sortOrder");
