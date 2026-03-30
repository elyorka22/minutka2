-- Mavjud bazada Banner.title ni ixtiyoriy qilish (yangi o‘rnatishlar uchun supabase-init-schema.sql yangilangan).
ALTER TABLE "Banner" ALTER COLUMN "title" DROP NOT NULL;
