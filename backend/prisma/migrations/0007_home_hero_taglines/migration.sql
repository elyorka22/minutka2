-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN "heroLine1Texts" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "PlatformSettings" ADD COLUMN "heroLine2Texts" JSONB NOT NULL DEFAULT '[]'::jsonb;
