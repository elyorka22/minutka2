DO $$
DECLARE
  orders_count integer;
BEGIN
  SELECT COUNT(*) INTO orders_count FROM "Order";
  IF orders_count > 9000 THEN
    RAISE EXCEPTION 'Cannot assign unique 4-digit shortCode: total orders (%) exceed 9000', orders_count;
  END IF;
END $$;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shortCode" INTEGER;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) AS rn
  FROM "Order"
)
UPDATE "Order" o
SET "shortCode" = 1000 + r.rn - 1
FROM ranked r
WHERE o.id = r.id AND o."shortCode" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "shortCode" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_shortCode_key" ON "Order"("shortCode");
