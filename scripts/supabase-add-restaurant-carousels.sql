-- Add homepage carousel flags to existing Supabase DB (run once if schema already exists).
ALTER TABLE "Restaurant"
  ADD COLUMN IF NOT EXISTS "carouselNational" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "carouselNationalSort" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "carouselFastFood" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "carouselFastFoodSort" INTEGER NOT NULL DEFAULT 0;
