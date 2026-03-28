-- Supabase Storage: bucket для загрузок админки (имя как в SUPABASE_STORAGE_BUCKET / коде).
-- Выполнить в SQL Editor после создания проекта (или создайте bucket через UI: Storage → New bucket).
--
-- Загрузка с бэкенда идёт через service_role — обычно обходит RLS.
-- Политика ниже даёт всем чтение публичных URL картинок.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-images',
  'food-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Публичное чтение объектов в этом bucket
DROP POLICY IF EXISTS "Public read food-images" ON storage.objects;
CREATE POLICY "Public read food-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'food-images');
