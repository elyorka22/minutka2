-- CreateTable
CREATE TABLE "PwaInstall" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PwaInstall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PwaInstall_createdAt_idx" ON "PwaInstall"("createdAt" DESC);
