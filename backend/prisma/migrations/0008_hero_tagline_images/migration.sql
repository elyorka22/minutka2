-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN "heroLine1ImageUrls" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "PlatformSettings" ADD COLUMN "heroLine2ImageUrls" JSONB NOT NULL DEFAULT '[]'::jsonb;
