CREATE TABLE IF NOT EXISTS "PartnershipApplication" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT,
    "details" TEXT,
    "contactMethod" TEXT,

    CONSTRAINT "PartnershipApplication_pkey" PRIMARY KEY ("id")
);
